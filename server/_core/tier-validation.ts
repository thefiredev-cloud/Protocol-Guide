/**
 * Tier Validation Middleware
 * Validates user subscription tier and ensures users cannot access features above their tier
 * Validates both tier level and active subscription status
 */

import { TRPCError } from "@trpc/server";
import type { Context } from "./trpc";
import * as db from "../db";

export type SubscriptionTier = "free" | "pro" | "enterprise";

// Valid tier values for runtime validation
const VALID_TIERS: SubscriptionTier[] = ["free", "pro", "enterprise"];

/**
 * Validates that a tier value is one of the allowed subscription tiers
 * SECURITY: Prevents tier bypass attacks by validating tier values before use
 * @param tier - The tier value to validate (from database or user input)
 * @returns A validated SubscriptionTier, defaulting to "free" for invalid values
 */
export function validateTierValue(tier: string | null | undefined): SubscriptionTier {
  if (tier && VALID_TIERS.includes(tier as SubscriptionTier)) {
    return tier as SubscriptionTier;
  }
  // Invalid or missing tier defaults to free (safe default)
  return "free";
}

// Feature flags per tier
export const TIER_FEATURES = {
  free: {
    dailyQueryLimit: 10,
    searchResultLimit: 5,
    canSyncHistory: false,
    canUploadProtocols: false,
    canManageAgency: false,
    canAccessAdvancedSearch: false,
    maxStates: 0,
    maxAgencies: 1,
    modelAccess: ["haiku"] as const,
  },
  pro: {
    dailyQueryLimit: Infinity,
    searchResultLimit: 20,
    canSyncHistory: true,
    canUploadProtocols: false,
    canManageAgency: false,
    canAccessAdvancedSearch: true,
    maxStates: 1,
    maxAgencies: 10,
    modelAccess: ["haiku", "sonnet"] as const,
  },
  enterprise: {
    dailyQueryLimit: Infinity,
    searchResultLimit: 50,
    canSyncHistory: true,
    canUploadProtocols: true,
    canManageAgency: true,
    canAccessAdvancedSearch: true,
    maxStates: Infinity,
    maxAgencies: Infinity,
    modelAccess: ["haiku", "sonnet", "opus"] as const,
  },
} as const;

/**
 * Validate user has required tier or higher
 * Also validates subscription is active for paid tiers
 */
export async function validateTier(
  ctx: Context,
  requiredTier: SubscriptionTier
): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const user = await db.getUserById(ctx.user.id);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  const userTier = validateTierValue(user.tier);

  // Check tier hierarchy: free < pro < enterprise
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    enterprise: 2,
  };

  if (tierHierarchy[userTier] < tierHierarchy[requiredTier]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This feature requires ${requiredTier} subscription. Your current tier: ${userTier}`,
    });
  }

  // For paid tiers, validate subscription is active
  if (userTier !== "free") {
    await validateSubscriptionActive(user);
  }
}

/**
 * Validate subscription status is active
 * Checks both subscription status and expiration date
 */
export async function validateSubscriptionActive(user: {
  id: number;
  tier: string;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | string | null;
}): Promise<void> {
  const userTier = user.tier as SubscriptionTier;

  // Free tier doesn't need subscription validation
  if (userTier === "free") {
    return;
  }

  // Check subscription status
  const validStatuses = ["active", "trialing"];
  if (!user.subscriptionStatus || !validStatuses.includes(user.subscriptionStatus)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your ${userTier} subscription is not active. Status: ${user.subscriptionStatus || "none"}. Please update your payment method.`,
    });
  }

  // Check subscription hasn't expired
  if (user.subscriptionEndDate) {
    const endDate = new Date(user.subscriptionEndDate);
    const now = new Date();

    if (endDate < now) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your ${userTier} subscription expired on ${endDate.toLocaleDateString()}. Please renew your subscription.`,
      });
    }
  }
}

/**
 * Get user's tier features
 */
export async function getUserTierFeatures(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) {
    return TIER_FEATURES.free;
  }

  const tier = validateTierValue(user.tier);

  // Validate subscription is active for paid tiers
  if (tier !== "free") {
    try {
      await validateSubscriptionActive(user);
    } catch (error) {
      // If subscription is invalid, return free tier features
      console.warn(`[TierValidation] User ${userId} has tier ${tier} but invalid subscription, downgrading to free`);
      return TIER_FEATURES.free;
    }
  }

  return TIER_FEATURES[tier];
}

/**
 * Check if user can access a specific feature
 */
export async function canAccessFeature(
  userId: number,
  feature: keyof typeof TIER_FEATURES.free
): Promise<boolean> {
  const features = await getUserTierFeatures(userId);
  const value = features[feature];

  // Boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // Numeric features (limits) - return true if has access
  if (typeof value === "number") {
    return value > 0;
  }

  // Array features (like modelAccess) - return true if has any access
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return false;
}

/**
 * Validate and limit search results based on user tier
 */
export async function validateSearchLimit(
  userId: number | null,
  requestedLimit: number
): Promise<number> {
  // Unauthenticated users get free tier limits
  if (!userId) {
    return Math.min(requestedLimit, TIER_FEATURES.free.searchResultLimit);
  }

  const features = await getUserTierFeatures(userId);
  return Math.min(requestedLimit, features.searchResultLimit);
}

/**
 * Validate user hasn't exceeded daily query limit
 */
export async function validateQueryLimit(userId: number): Promise<void> {
  const features = await getUserTierFeatures(userId);

  // No limit for pro/enterprise
  if (features.dailyQueryLimit === Infinity) {
    return;
  }

  const user = await db.getUserById(userId);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const lastQueryDate = user.lastQueryDate;

  // Reset count if it's a new day
  if (lastQueryDate !== today) {
    return;
  }

  const currentCount = user.queryCountToday || 0;

  if (currentCount >= features.dailyQueryLimit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Daily query limit reached (${features.dailyQueryLimit}). Upgrade to Pro for unlimited queries.`,
    });
  }
}

/**
 * Get user tier information for client
 */
export async function getUserTierInfo(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) {
    return {
      tier: "free" as const,
      features: TIER_FEATURES.free,
      subscriptionStatus: null,
      subscriptionEndDate: null,
      isActive: true,
    };
  }

  const tier = validateTierValue(user.tier);
  const features = await getUserTierFeatures(userId);

  // Check if subscription is active
  let isActive = true;
  if (tier !== "free") {
    try {
      await validateSubscriptionActive(user);
    } catch (error) {
      isActive = false;
    }
  }

  return {
    tier,
    features,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEndDate: user.subscriptionEndDate,
    isActive,
  };
}
