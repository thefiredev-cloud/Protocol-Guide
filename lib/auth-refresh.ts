/**
 * Token Refresh Handler
 * Manages automatic token refresh with fallback and error recovery
 * FIXED: Now uses tokenCache to prevent race conditions during concurrent requests
 */

import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  tokenCache,
  getSession as getCachedSession,
  refreshSession as refreshCachedSession,
  clearTokenCache
} from "./token-cache";

const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds

interface RefreshStatus {
  lastRefresh: number | null;
  consecutiveFailures: number;
}

const refreshStatus: RefreshStatus = {
  lastRefresh: null,
  consecutiveFailures: 0,
};

/**
 * Calculate minutes until token expires
 */
function getMinutesUntilExpiry(session: Session): number {
  if (!session.expires_at) return 0;

  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  return (expiresAt.getTime() - now.getTime()) / 60000;
}

/**
 * Refresh session token with error handling
 * Uses tokenCache mutex to prevent race conditions
 */
export async function refreshSession(): Promise<{
  success: boolean;
  session: Session | null;
  error?: string;
}> {
  try {
    console.log("[Auth] Attempting token refresh via cache");

    // Use token cache which has built-in mutex
    const session = await refreshCachedSession();

    if (!session) {
      refreshStatus.consecutiveFailures++;
      console.error("[Auth] Token refresh failed");

      // After 3 consecutive failures, force logout
      if (refreshStatus.consecutiveFailures >= 3) {
        console.error("[Auth] Max refresh failures reached, forcing logout");
        await supabase.auth.signOut();
        clearTokenCache();
        refreshStatus.consecutiveFailures = 0;
        return {
          success: false,
          session: null,
          error: "Session expired - please sign in again",
        };
      }

      return {
        success: false,
        session: null,
        error: "Token refresh failed",
      };
    }

    // Success - reset failure counter
    refreshStatus.consecutiveFailures = 0;
    refreshStatus.lastRefresh = Date.now();

    console.log("[Auth] Token refresh successful", {
      expiresAt: session.expires_at,
      minutesUntilExpiry: getMinutesUntilExpiry(session),
    });

    return {
      success: true,
      session,
    };
  } catch (err) {
    refreshStatus.consecutiveFailures++;
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("[Auth] Token refresh exception:", error);

    return {
      success: false,
      session: null,
      error: error.message,
    };
  }
}

/**
 * Check session and refresh if needed
 * FIXED: Uses cached session to prevent race conditions
 */
export async function checkAndRefreshSession(): Promise<{
  session: Session | null;
  refreshed: boolean;
}> {
  // Use token cache which handles refresh automatically
  const session = await getCachedSession();

  if (!session) {
    return { session: null, refreshed: false };
  }

  // Check if session was recently refreshed by comparing with cache status
  const cacheStatus = tokenCache.getStatus();
  const wasRecentlyRefreshed = cacheStatus.cacheAge !== null && cacheStatus.cacheAge < 5000;

  return {
    session,
    refreshed: wasRecentlyRefreshed
  };
}

/**
 * Start periodic session check
 */
export function startSessionMonitor(
  onSessionRefreshed?: (session: Session) => void,
  onSessionExpired?: () => void
): () => void {
  console.log("[Auth] Starting session monitor");

  const intervalId = setInterval(async () => {
    try {
      const { session, refreshed } = await checkAndRefreshSession();

      if (refreshed && session && onSessionRefreshed) {
        onSessionRefreshed(session);
      }

      if (!session && onSessionExpired) {
        onSessionExpired();
      }
    } catch (error) {
      console.error("[Auth] Session monitor error:", error);
    }
  }, CHECK_INTERVAL_MS);

  // Return cleanup function
  return () => {
    console.log("[Auth] Stopping session monitor");
    clearInterval(intervalId);
  };
}

/**
 * Manual refresh trigger (for user-initiated actions)
 */
export async function forceRefresh(): Promise<boolean> {
  const result = await refreshSession();
  return result.success;
}

/**
 * Get refresh status (for debugging/monitoring)
 */
export function getRefreshStatus(): Readonly<RefreshStatus> {
  return {
    ...refreshStatus,
    cacheStatus: tokenCache.getStatus()
  };
}

/**
 * Reset refresh status (for testing)
 */
export function resetRefreshStatus(): void {
  clearTokenCache();
  refreshStatus.lastRefresh = null;
  refreshStatus.consecutiveFailures = 0;
}
