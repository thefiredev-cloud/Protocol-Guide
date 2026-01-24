/**
 * Subscription Access Service
 * Handles user access control based on subscriptions, states, and agencies
 */

import { eq, and, sql, gt } from "drizzle-orm";
import { getDb } from "./db";
import { users, userStates, userAgencies } from "../drizzle/schema";
import { validateTierValue } from "./_core/tier-validation";

// Tier configuration with state/agency limits
export const TIER_ACCESS_CONFIG = {
  free: {
    maxAgencies: 1,
    maxStates: 0,
    canUploadProtocols: false,
    canManageAgency: false,
  },
  pro: {
    maxAgencies: 10,
    maxStates: 1,
    canUploadProtocols: false,
    canManageAgency: false,
  },
  enterprise: {
    maxAgencies: Infinity,
    maxStates: Infinity,
    canUploadProtocols: true,
    canManageAgency: true,
  },
} as const;

export interface UserAccess {
  subscribedStates: string[];
  subscribedAgencies: number[];
  adminAgencies: number[];
  tier: "free" | "pro" | "enterprise";
  canUploadProtocols: boolean;
  canManageAgency: boolean;
}

/**
 * Get user's access permissions including subscribed states and agencies
 */
export async function getUserAccess(userId: number): Promise<UserAccess> {
  const db = await getDb();
  if (!db) {
    return {
      subscribedStates: [],
      subscribedAgencies: [],
      adminAgencies: [],
      tier: "free",
      canUploadProtocols: false,
      canManageAgency: false,
    };
  }

  // Get user tier
  const [user] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, userId)).limit(1);
  const tier = validateTierValue(user?.tier);
  const tierConfig = TIER_ACCESS_CONFIG[tier];

  // Get subscribed states (not expired)
  const states = await db
    .select({ stateCode: userStates.stateCode })
    .from(userStates)
    .where(
      and(
        eq(userStates.userId, userId),
        sql`(${userStates.expiresAt} IS NULL OR ${userStates.expiresAt} > NOW())`
      )
    );

  // Get subscribed agencies (not expired)
  const agencies = await db
    .select({
      agencyId: userAgencies.agencyId,
      accessLevel: userAgencies.accessLevel,
    })
    .from(userAgencies)
    .where(
      and(
        eq(userAgencies.userId, userId),
        sql`(${userAgencies.expiresAt} IS NULL OR ${userAgencies.expiresAt} > NOW())`
      )
    );

  const subscribedStates = states.map((s) => s.stateCode);
  const subscribedAgencies = agencies.map((a) => a.agencyId);
  const adminAgencies = agencies
    .filter((a) => a.accessLevel === "admin")
    .map((a) => a.agencyId);

  return {
    subscribedStates,
    subscribedAgencies,
    adminAgencies,
    tier,
    canUploadProtocols: tierConfig.canUploadProtocols,
    canManageAgency: tierConfig.canManageAgency,
  };
}

/**
 * Check if user can access a specific state's protocols
 * SECURITY: Validates subscription status before granting access to paid tiers
 */
export async function canUserAccessState(userId: number, stateCode: string): Promise<boolean> {
  const access = await getUserAccess(userId);

  // For paid tiers, validate subscription is active BEFORE checking tier privileges
  if (access.tier !== "free") {
    const db = await getDb();
    if (!db) return false;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return false;

    // Validate subscription status and expiration
    try {
      const { validateSubscriptionActive } = await import("./_core/tier-validation.js");
      await validateSubscriptionActive(user);
    } catch (error) {
      // Subscription invalid/expired - deny access
      console.warn(`[SubscriptionAccess] User ${userId} has tier ${access.tier} but invalid subscription`);
      return false;
    }
  }

  // Now safe to check tier privileges
  // Enterprise users have full access (only if subscription is active)
  if (access.tier === "enterprise") return true;

  // Check if state is in subscribed states
  return access.subscribedStates.includes(stateCode);
}

/**
 * Check if user can access a specific agency's protocols
 * SECURITY: Validates subscription status before granting access to paid tiers
 */
export async function canUserAccessAgency(userId: number, agencyId: number): Promise<boolean> {
  const access = await getUserAccess(userId);

  // For paid tiers, validate subscription is active BEFORE checking tier privileges
  if (access.tier !== "free") {
    const db = await getDb();
    if (!db) return false;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return false;

    // Validate subscription status and expiration
    try {
      const { validateSubscriptionActive } = await import("./_core/tier-validation.js");
      await validateSubscriptionActive(user);
    } catch (error) {
      // Subscription invalid/expired - deny access
      console.warn(`[SubscriptionAccess] User ${userId} has tier ${access.tier} but invalid subscription`);
      return false;
    }
  }

  // Now safe to check tier privileges
  // Enterprise users have full access (only if subscription is active)
  if (access.tier === "enterprise") return true;

  // Check if agency is in subscribed agencies
  return access.subscribedAgencies.includes(agencyId);
}

/**
 * Add state subscription for user
 * Validates tier limits and subscription status
 */
export async function addStateSubscription(
  userId: number,
  stateCode: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const access = await getUserAccess(userId);
  const tierConfig = TIER_ACCESS_CONFIG[access.tier];

  // Validate subscription is active for paid tiers
  if (access.tier !== "free") {
    const { validateSubscriptionActive } = await import("./_core/tier-validation.js");
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user) {
      try {
        await validateSubscriptionActive(user);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Subscription validation failed",
        };
      }
    }
  }

  // Check if user can add more states
  if (access.subscribedStates.length >= tierConfig.maxStates) {
    return {
      success: false,
      error: `Your ${access.tier} plan allows only ${tierConfig.maxStates} state subscriptions. Upgrade to add more.`,
    };
  }

  // Check if already subscribed
  if (access.subscribedStates.includes(stateCode)) {
    return { success: true }; // Already subscribed
  }

  try {
    await db.insert(userStates).values({
      userId,
      stateCode,
      accessLevel: "view",
      expiresAt,
    });
    return { success: true };
  } catch (error) {
    console.error("[SubscriptionAccess] Failed to add state subscription:", error);
    return { success: false, error: "Failed to add subscription" };
  }
}

/**
 * Add agency subscription for user
 * Validates tier limits and subscription status
 */
export async function addAgencySubscription(
  userId: number,
  agencyId: number,
  options?: {
    accessLevel?: "view" | "contribute" | "admin";
    isPrimary?: boolean;
    role?: string;
    expiresAt?: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const access = await getUserAccess(userId);
  const tierConfig = TIER_ACCESS_CONFIG[access.tier];

  // Validate subscription is active for paid tiers
  if (access.tier !== "free") {
    const { validateSubscriptionActive } = await import("./_core/tier-validation.js");
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user) {
      try {
        await validateSubscriptionActive(user);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Subscription validation failed",
        };
      }
    }
  }

  // Check if user can add more agencies
  if (access.subscribedAgencies.length >= tierConfig.maxAgencies) {
    return {
      success: false,
      error: `Your ${access.tier} plan allows only ${tierConfig.maxAgencies} agency subscriptions. Upgrade to add more.`,
    };
  }

  // Check if already subscribed
  if (access.subscribedAgencies.includes(agencyId)) {
    return { success: true }; // Already subscribed
  }

  try {
    await db.insert(userAgencies).values({
      userId,
      agencyId,
      accessLevel: options?.accessLevel || "view",
      isPrimary: options?.isPrimary || false,
      role: options?.role,
      expiresAt: options?.expiresAt,
    });
    return { success: true };
  } catch (error) {
    console.error("[SubscriptionAccess] Failed to add agency subscription:", error);
    return { success: false, error: "Failed to add subscription" };
  }
}

/**
 * Remove state subscription
 */
export async function removeStateSubscription(userId: number, stateCode: string): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    await db
      .delete(userStates)
      .where(and(eq(userStates.userId, userId), eq(userStates.stateCode, stateCode)));
    return { success: true };
  } catch (error) {
    console.error("[SubscriptionAccess] Failed to remove state subscription:", error);
    return { success: false };
  }
}

/**
 * Remove agency subscription
 */
export async function removeAgencySubscription(userId: number, agencyId: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    await db
      .delete(userAgencies)
      .where(and(eq(userAgencies.userId, userId), eq(userAgencies.agencyId, agencyId)));
    return { success: true };
  } catch (error) {
    console.error("[SubscriptionAccess] Failed to remove agency subscription:", error);
    return { success: false };
  }
}

/**
 * Build access filter parameters for search queries
 * Returns params to pass to Supabase RPC for access-controlled search
 * SECURITY: Validates subscription status before granting full access
 */
export async function buildAccessFilterParams(userId: number): Promise<{
  userStates: string[];
  userAgencies: number[];
  userTier: string;
  hasFullAccess: boolean;
}> {
  const access = await getUserAccess(userId);

  // For paid tiers, validate subscription is active before granting full access
  let hasFullAccess = false;
  if (access.tier === "enterprise") {
    const db = await getDb();
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user) {
        try {
          const { validateSubscriptionActive } = await import("./_core/tier-validation.js");
          await validateSubscriptionActive(user);
          // Only grant full access if subscription is valid
          hasFullAccess = true;
        } catch (error) {
          // Subscription invalid/expired - no full access
          console.warn(`[SubscriptionAccess] User ${userId} has enterprise tier but invalid subscription`);
          hasFullAccess = false;
        }
      }
    }
  }

  return {
    userStates: access.subscribedStates,
    userAgencies: access.subscribedAgencies,
    userTier: access.tier,
    hasFullAccess,
  };
}
