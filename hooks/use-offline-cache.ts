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
  }, []);

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
