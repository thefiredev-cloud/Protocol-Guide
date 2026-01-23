/**
 * Token Refresh Handler
 * Manages automatic token refresh with fallback and error recovery
 */

import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";

const REFRESH_BUFFER_MINUTES = 5; // Refresh when less than 5 minutes until expiry
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds

interface RefreshStatus {
  isRefreshing: boolean;
  lastRefresh: number | null;
  consecutiveFailures: number;
}

const refreshStatus: RefreshStatus = {
  isRefreshing: false,
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
 * Check if session needs refresh
 */
function needsRefresh(session: Session | null): boolean {
  if (!session) return false;

  const minutesUntilExpiry = getMinutesUntilExpiry(session);
  return minutesUntilExpiry < REFRESH_BUFFER_MINUTES;
}

/**
 * Refresh session token with error handling
 */
export async function refreshSession(): Promise<{
  success: boolean;
  session: Session | null;
  error?: string;
}> {
  // Prevent concurrent refresh attempts
  if (refreshStatus.isRefreshing) {
    console.log("[Auth] Refresh already in progress, skipping");
    return { success: false, session: null, error: "Refresh in progress" };
  }

  refreshStatus.isRefreshing = true;

  try {
    console.log("[Auth] Attempting token refresh");

    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      refreshStatus.consecutiveFailures++;
      console.error("[Auth] Token refresh failed:", error.message);

      // After 3 consecutive failures, force logout
      if (refreshStatus.consecutiveFailures >= 3) {
        console.error("[Auth] Max refresh failures reached, forcing logout");
        await supabase.auth.signOut();
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
        error: error.message,
      };
    }

    if (!data.session) {
      refreshStatus.consecutiveFailures++;
      console.error("[Auth] No session returned from refresh");

      return {
        success: false,
        session: null,
        error: "No session returned",
      };
    }

    // Success - reset failure counter
    refreshStatus.consecutiveFailures = 0;
    refreshStatus.lastRefresh = Date.now();

    console.log("[Auth] Token refresh successful", {
      expiresAt: data.session.expires_at,
      minutesUntilExpiry: getMinutesUntilExpiry(data.session),
    });

    return {
      success: true,
      session: data.session,
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
  } finally {
    refreshStatus.isRefreshing = false;
  }
}

/**
 * Check session and refresh if needed
 */
export async function checkAndRefreshSession(): Promise<{
  session: Session | null;
  refreshed: boolean;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, refreshed: false };
  }

  // Check if refresh is needed
  if (needsRefresh(session)) {
    console.log("[Auth] Session needs refresh", {
      minutesUntilExpiry: getMinutesUntilExpiry(session),
    });

    const result = await refreshSession();

    return {
      session: result.session,
      refreshed: result.success,
    };
  }

  return { session, refreshed: false };
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
  return { ...refreshStatus };
}

/**
 * Reset refresh status (for testing)
 */
export function resetRefreshStatus(): void {
  refreshStatus.isRefreshing = false;
  refreshStatus.lastRefresh = null;
  refreshStatus.consecutiveFailures = 0;
}
