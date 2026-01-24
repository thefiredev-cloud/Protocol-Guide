import { useState, useEffect, useCallback, useMemo } from "react";
import { OfflineCache, CachedProtocol, formatCacheSize } from "@/lib/offline-cache";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// Tier configuration - mirrors server/db.ts TIER_CONFIG
const TIER_OFFLINE_ACCESS = {
  free: false,
  pro: true,
  enterprise: true,
} as const;

type Tier = keyof typeof TIER_OFFLINE_ACCESS;

type CacheState = {
  isOnline: boolean;
  cachedProtocols: CachedProtocol[];
  cacheSize: string;
  itemCount: number;
  isLoading: boolean;
};

export type OfflineCacheResult =
  | { success: true; data?: CachedProtocol[] }
  | { success: false; reason: "upgrade_required" | "not_authenticated" | "error"; message?: string };

/**
 * Hook for managing offline cache state and operations
 */
export function useOfflineCache() {
  const [state, setState] = useState<CacheState>({
    isOnline: true,
    cachedProtocols: [],
    cacheSize: "0 B",
    itemCount: 0,
    isLoading: true,
  });

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState((prev) => ({
        ...prev,
        isOnline: netState.isConnected ?? true,
      }));
    });

    return () => unsubscribe();
  }, []);

  // Load cached protocols on mount
  useEffect(() => {
    loadCache();
  }, [loadCache]);

  const loadCache = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const protocols = await OfflineCache.getAllProtocols();
      const metadata = await OfflineCache.getMetadata();
      
      setState((prev) => ({
        ...prev,
        cachedProtocols: protocols,
        cacheSize: metadata ? formatCacheSize(metadata.totalSize) : "0 B",
        itemCount: protocols.length,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading cache:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const saveToCache = useCallback(async (
    query: string,
    response: string,
    protocolRefs: string[] | undefined,
    countyId: number,
    countyName: string
  ) => {
    await OfflineCache.saveProtocol({
      query,
      response,
      protocolRefs,
      countyId,
      countyName,
    });
    await loadCache();
  }, [loadCache]);

  const searchCache = useCallback(async (searchText: string, countyId?: number) => {
    return OfflineCache.searchCachedProtocols(searchText, countyId);
  }, []);

  const getRecentProtocols = useCallback(async (limit?: number) => {
    return OfflineCache.getRecentProtocols(limit);
  }, []);

  const clearCache = useCallback(async () => {
    await OfflineCache.clearCache();
    await loadCache();
  }, [loadCache]);

  const removeFromCache = useCallback(async (id: string) => {
    await OfflineCache.removeProtocol(id);
    await loadCache();
  }, [loadCache]);

  return {
    ...state,
    saveToCache,
    searchCache,
    getRecentProtocols,
    clearCache,
    removeFromCache,
    refreshCache: loadCache,
  };
}

/**
 * Hook for checking network status only
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}

/**
 * Hook for checking if user has offline access based on their tier.
 * Free users do not have offline access; Pro/Enterprise users do.
 *
 * Usage:
 * ```tsx
 * const { hasOfflineAccess, tier, checkOfflineAccess } = useOfflineAccess();
 *
 * const handleSaveOffline = async () => {
 *   const result = checkOfflineAccess();
 *   if (!result.success) {
 *     // Show upgrade modal
 *     return;
 *   }
 *   // Proceed with saving
 * };
 * ```
 */
export function useOfflineAccess() {
  const { isAuthenticated } = useAuth();

  // Fetch user usage data which includes tier
  const { data: usage, isLoading } = trpc.user.usage.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Determine user's tier (default to free if not authenticated or loading)
  const tier: Tier = useMemo(() => {
    if (!usage?.tier) return "free";
    return usage.tier as Tier;
  }, [usage?.tier]);

  // Check if user has offline access based on tier
  const hasOfflineAccess = useMemo(() => {
    if (!isAuthenticated) return false;
    return TIER_OFFLINE_ACCESS[tier];
  }, [isAuthenticated, tier]);

  /**
   * Check if user can use offline features.
   * Returns a result object indicating success or failure with reason.
   */
  const checkOfflineAccess = useCallback((): OfflineCacheResult => {
    if (!isAuthenticated) {
      return {
        success: false,
        reason: "not_authenticated",
        message: "Please sign in to use offline features",
      };
    }

    if (!TIER_OFFLINE_ACCESS[tier]) {
      return {
        success: false,
        reason: "upgrade_required",
        message: "Upgrade to Pro for offline access to protocols",
      };
    }

    return { success: true };
  }, [isAuthenticated, tier]);

  return {
    hasOfflineAccess,
    tier,
    isLoading,
    checkOfflineAccess,
  };
}

/**
 * Combined hook for offline cache with tier-based access control.
 * This wraps useOfflineCache with tier checking.
 */
export function useOfflineCacheWithAccess() {
  const cache = useOfflineCache();
  const access = useOfflineAccess();

  // Extract just the functions we need to avoid dependency on entire objects
  const cacheableFunc = cache.saveToCache;
  const checkAccess = access.checkOfflineAccess;

  // Wrap save function to check access first
  const saveToCache = useCallback(
    async (
      query: string,
      response: string,
      protocolRefs: string[] | undefined,
      countyId: number,
      countyName: string
    ): Promise<OfflineCacheResult> => {
      const accessResult = checkAccess();
      if (!accessResult.success) {
        return accessResult;
      }

      try {
        await cacheableFunc(query, response, protocolRefs, countyId, countyName);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          reason: "error",
          message: error instanceof Error ? error.message : "Failed to save to cache",
        };
      }
    },
    [cacheableFunc, checkAccess]
  );

  return {
    ...cache,
    ...access,
    saveToCache,
  };
}
