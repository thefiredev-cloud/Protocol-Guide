/**
 * Token Cache Manager
 * Provides synchronized access to auth tokens, preventing race conditions
 * during concurrent token refresh operations
 */

import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface TokenCacheEntry {
  session: Session;
  expiresAt: number;
  refreshedAt: number;
}

/**
 * Singleton cache to prevent multiple concurrent getSession() calls
 */
class TokenCache {
  private cache: TokenCacheEntry | null = null;
  private refreshInProgress: Promise<Session | null> | null = null;
  private fetchInProgress: Promise<Session | null> | null = null;
  private cleared = false; // Flag to signal cache was cleared
  private readonly CACHE_BUFFER_MS = 30000; // 30 seconds buffer before expiry

  /**
   * Get current session from cache or Supabase
   * Ensures only one thread accesses the session at a time
   */
  async getSession(): Promise<Session | null> {
    // If refresh is in progress, wait for it
    if (this.refreshInProgress) {
      console.log("[TokenCache] Refresh in progress, waiting...");
      return this.refreshInProgress;
    }

    // If fetch is in progress, wait for it
    if (this.fetchInProgress) {
      console.log("[TokenCache] Fetch in progress, waiting...");
      return this.fetchInProgress;
    }

    // Check cache validity
    if (this.cache && this.isValidCache(this.cache)) {
      console.log("[TokenCache] Returning cached session");
      return this.cache.session;
    }

    // Cache is invalid or doesn't exist - fetch from Supabase with mutex
    console.log("[TokenCache] Cache miss or expired, fetching session");

    this.fetchInProgress = (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[TokenCache] Error fetching session:", error);
          this.cache = null;
          return null;
        }

        if (data.session) {
          this.updateCache(data.session);
          return data.session;
        }

        this.cache = null;
        return null;
      } finally {
        this.fetchInProgress = null;
      }
    })();

    return this.fetchInProgress;
  }

  /**
   * Refresh session with mutex lock to prevent concurrent refreshes
   */
  async refreshSession(): Promise<Session | null> {
    // If refresh already in progress, return that promise
    if (this.refreshInProgress) {
      console.log("[TokenCache] Refresh already in progress, reusing promise");
      return this.refreshInProgress;
    }

    // Create new refresh promise with mutex lock
    this.refreshInProgress = (async () => {
      try {
        console.log("[TokenCache] Starting token refresh");

        const { data, error } = await supabase.auth.refreshSession();

        // Check if cache was cleared during refresh
        if (this.cleared) {
          console.log("[TokenCache] Cache was cleared during refresh, ignoring result");
          return null;
        }

        if (error) {
          console.error("[TokenCache] Refresh failed:", error.message);
          this.cache = null;
          return null;
        }

        if (!data.session) {
          console.error("[TokenCache] No session returned from refresh");
          this.cache = null;
          return null;
        }

        console.log("[TokenCache] Refresh successful");
        this.updateCache(data.session);
        return data.session;
      } catch (err) {
        console.error("[TokenCache] Refresh exception:", err);
        this.cache = null;
        return null;
      } finally {
        // Release the lock
        this.refreshInProgress = null;
      }
    })();

    return this.refreshInProgress;
  }

  /**
   * Check if session needs refresh based on expiration time
   */
  needsRefresh(session: Session): boolean {
    if (!session.expires_at) return false;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh if less than 5 minutes until expiry
    return timeUntilExpiry < 5 * 60 * 1000;
  }

  /**
   * Get session and refresh if needed (atomic operation)
   */
  async getSessionWithRefresh(): Promise<Session | null> {
    // Check if refresh is already in progress
    if (this.refreshInProgress) {
      console.log("[TokenCache] Refresh in progress, waiting...");
      return this.refreshInProgress;
    }

    const session = await this.getSession();

    // Check AGAIN after async operation (another thread could have started refresh)
    if (this.refreshInProgress) {
      console.log("[TokenCache] Refresh started during getSession, waiting...");
      return this.refreshInProgress;
    }

    if (!session) {
      return null;
    }

    // Check if refresh is needed
    if (this.needsRefresh(session)) {
      console.log("[TokenCache] Session needs refresh");
      return this.refreshSession();
    }

    return session;
  }

  /**
   * Clear cache (on logout or auth error)
   */
  clear(): void {
    console.log("[TokenCache] Clearing cache");
    this.cache = null;
    this.refreshInProgress = null;
    this.fetchInProgress = null;
  }

  /**
   * Update cache with new session
   */
  private updateCache(session: Session): void {
    this.cache = {
      session,
      expiresAt: session.expires_at ? session.expires_at * 1000 : 0,
      refreshedAt: Date.now(),
    };
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidCache(entry: TokenCacheEntry): boolean {
    const now = Date.now();

    // Cache is invalid if expired or close to expiry
    if (entry.expiresAt === 0) return false;
    if (entry.expiresAt - now < this.CACHE_BUFFER_MS) return false;

    return true;
  }

  /**
   * Get cache status for debugging
   */
  getStatus() {
    return {
      hasCachedSession: !!this.cache,
      refreshInProgress: !!this.refreshInProgress,
      fetchInProgress: !!this.fetchInProgress,
      cacheExpiry: this.cache?.expiresAt,
      cacheAge: this.cache ? Date.now() - this.cache.refreshedAt : null,
    };
  }
}

// Singleton instance
export const tokenCache = new TokenCache();

/**
 * Get current access token (convenience function)
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await tokenCache.getSessionWithRefresh();
  return session?.access_token || null;
}

/**
 * Get current session with automatic refresh if needed
 */
export async function getSession(): Promise<Session | null> {
  return tokenCache.getSessionWithRefresh();
}

/**
 * Force refresh the current session
 */
export async function refreshSession(): Promise<Session | null> {
  return tokenCache.refreshSession();
}

/**
 * Clear token cache (call on logout)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
