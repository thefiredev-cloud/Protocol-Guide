/**
 * useCountyRestriction Hook
 *
 * Checks user's tier and enforces county limit restrictions.
 * Free users are limited to 1 county, Pro/Enterprise users have unlimited.
 */

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// Tier configuration - mirrors server/db.ts TIER_CONFIG
const TIER_LIMITS = {
  free: {
    maxCounties: 1,
  },
  pro: {
    maxCounties: Infinity,
  },
  enterprise: {
    maxCounties: Infinity,
  },
} as const;

type Tier = keyof typeof TIER_LIMITS;

export interface CountyRestrictionState {
  /** Whether the user can add another county */
  canAddCounty: boolean;
  /** Number of counties the user currently has selected (tracked locally) */
  currentCounties: number;
  /** Maximum allowed counties for user's tier */
  maxCounties: number;
  /** Whether to show the upgrade modal */
  showUpgradeModal: boolean;
  /** User's current tier */
  tier: Tier;
  /** Whether the restriction data is loading */
  isLoading: boolean;
  /** Open the upgrade modal */
  openUpgradeModal: () => void;
  /** Close the upgrade modal */
  closeUpgradeModal: () => void;
  /** Check if user can add a county, opens modal if not */
  checkCanAddCounty: () => boolean;
  /** Increment the county count (call after successfully adding a county) */
  incrementCountyCount: () => void;
  /** Decrement the county count (call after removing a county) */
  decrementCountyCount: () => void;
  /** Reset the county count */
  resetCountyCount: () => void;
}

/**
 * Hook for managing county selection restrictions based on user tier.
 *
 * Usage:
 * ```tsx
 * const { canAddCounty, checkCanAddCounty, showUpgradeModal, closeUpgradeModal } = useCountyRestriction();
 *
 * const handleSelectCounty = () => {
 *   if (!checkCanAddCounty()) {
 *     return; // Modal will be shown automatically
 *   }
 *   // Proceed with county selection
 * };
 * ```
 */
export function useCountyRestriction(initialCountyCount = 0): CountyRestrictionState {
  const { isAuthenticated } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentCounties, setCurrentCounties] = useState(initialCountyCount);

  // Fetch user usage data which includes tier and features
  const { data: usage, isLoading } = trpc.user.usage.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Determine user's tier (default to free if not authenticated or loading)
  const tier: Tier = useMemo(() => {
    if (!usage?.tier) return "free";
    return usage.tier as Tier;
  }, [usage?.tier]);

  // Get the maximum counties allowed for the user's tier
  const maxCounties = useMemo(() => {
    return TIER_LIMITS[tier].maxCounties;
  }, [tier]);

  // Check if user can add another county
  const canAddCounty = useMemo(() => {
    if (!isAuthenticated) return false;
    if (maxCounties === Infinity) return true;
    return currentCounties < maxCounties;
  }, [isAuthenticated, maxCounties, currentCounties]);

  // Open the upgrade modal
  const openUpgradeModal = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  // Close the upgrade modal
  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
  }, []);

  // Check if user can add a county, showing modal if they cannot
  const checkCanAddCounty = useCallback((): boolean => {
    // Pro/Enterprise users can always add counties
    if (maxCounties === Infinity) return true;

    // Free users check: if they already have a county, show upgrade modal
    if (currentCounties >= maxCounties) {
      openUpgradeModal();
      return false;
    }

    return true;
  }, [maxCounties, currentCounties, openUpgradeModal]);

  // Increment county count after successfully adding
  const incrementCountyCount = useCallback(() => {
    setCurrentCounties((prev) => prev + 1);
  }, []);

  // Decrement county count after removing
  const decrementCountyCount = useCallback(() => {
    setCurrentCounties((prev) => Math.max(0, prev - 1));
  }, []);

  // Reset county count
  const resetCountyCount = useCallback(() => {
    setCurrentCounties(0);
  }, []);

  return {
    canAddCounty,
    currentCounties,
    maxCounties,
    showUpgradeModal,
    tier,
    isLoading,
    openUpgradeModal,
    closeUpgradeModal,
    checkCanAddCounty,
    incrementCountyCount,
    decrementCountyCount,
    resetCountyCount,
  };
}

export default useCountyRestriction;
