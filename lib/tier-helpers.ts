/**
 * Client-Side Tier Validation Helpers
 * DO NOT use for security - always validate on server
 * Use only for UI/UX (showing/hiding features, displaying upgrade prompts)
 */

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface TierFeatures {
  dailyQueryLimit: number;
  searchResultLimit: number;
  canSyncHistory: boolean;
  canUploadProtocols: boolean;
  canManageAgency: boolean;
  canAccessAdvancedSearch: boolean;
  maxStates: number;
  maxAgencies: number;
  modelAccess: readonly string[];
}

export interface UserTierInfo {
  tier: SubscriptionTier;
  features: TierFeatures;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | string | null;
  isActive: boolean;
}

/**
 * Check if user's subscription is active
 * Client-side check only - always validate on server
 */
export function isSubscriptionActive(tierInfo: UserTierInfo): boolean {
  // Free tier is always "active"
  if (tierInfo.tier === "free") {
    return true;
  }

  // Check isActive flag from server
  return tierInfo.isActive;
}

/**
 * Check if user can access a feature based on their tier
 * Client-side check only - always validate on server
 */
export function canAccessFeature(
  tierInfo: UserTierInfo,
  feature: keyof TierFeatures
): boolean {
  if (!isSubscriptionActive(tierInfo)) {
    return false;
  }

  const value = tierInfo.features[feature];

  // Boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // Numeric features (limits)
  if (typeof value === "number") {
    return value > 0;
  }

  // Array features
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return false;
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  feature: string
): string {
  if (currentTier === "free") {
    return `Upgrade to Pro to unlock ${feature}`;
  }
  if (currentTier === "pro") {
    return `Upgrade to Enterprise to unlock ${feature}`;
  }
  return "";
}

/**
 * Check if tier meets or exceeds required tier
 */
export function meetsRequiredTier(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    enterprise: 2,
  };

  return tierHierarchy[currentTier] >= tierHierarchy[requiredTier];
}

/**
 * Get days until subscription expires
 */
export function getDaysUntilExpiration(
  subscriptionEndDate: Date | string | null
): number | null {
  if (!subscriptionEndDate) {
    return null;
  }

  const endDate = new Date(subscriptionEndDate);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isExpiringSoon(
  subscriptionEndDate: Date | string | null
): boolean {
  const days = getDaysUntilExpiration(subscriptionEndDate);
  return days !== null && days > 0 && days <= 7;
}

/**
 * Check if subscription has expired
 */
export function isExpired(
  subscriptionEndDate: Date | string | null
): boolean {
  const days = getDaysUntilExpiration(subscriptionEndDate);
  return days !== null && days <= 0;
}

/**
 * Get tier badge color for UI
 */
export function getTierBadgeColor(tier: SubscriptionTier): string {
  switch (tier) {
    case "free":
      return "gray";
    case "pro":
      return "blue";
    case "enterprise":
      return "purple";
    default:
      return "gray";
  }
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
    default:
      return "Unknown";
  }
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string | null): string {
  if (!status) return "No subscription";

  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past Due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "Expired";
    case "unpaid":
      return "Unpaid";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
