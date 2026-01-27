/**
 * useAuth Hook - Supabase Auth Integration
 *
 * Provides authentication state and methods for the Protocol Guide app.
 * Handles Supabase auth with automatic token refresh, session monitoring,
 * and E2E test mocking support.
 *
 * Key features:
 * - Automatic session refresh before token expiration
 * - Token cache to prevent race conditions on concurrent requests
 * - E2E test mocking via localStorage injection
 * - Full TypeScript support with proper User type mapping
 *
 * @module hooks/use-auth
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, loading, logout } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!isAuthenticated) return <LoginButton />;
 *
 *   return <Text>Welcome, {user?.name}</Text>;
 * }
 * ```
 */

import { supabase, signOut as supabaseSignOut } from "@/lib/supabase";
import { startSessionMonitor } from "@/lib/auth-refresh";
import { getSession as getCachedSession, clearTokenCache, tokenCache } from "@/lib/token-cache";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

/**
 * Check for E2E mock session in localStorage (browser only)
 * Returns mock user data if E2E auth is injected
 */
function getE2EMockUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const isE2EAuthenticated = localStorage.getItem("e2e-authenticated");
    if (isE2EAuthenticated !== "true") return null;

    const userJson = localStorage.getItem("protocol-guide-user");
    if (!userJson) return null;

    const userData = JSON.parse(userJson);
    return {
      id: userData.id,
      email: userData.email ?? null,
      name: userData.name ?? null,
      avatarUrl: userData.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Create a mock session object for E2E testing
 */
function createE2EMockSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const isE2EAuthenticated = localStorage.getItem("e2e-authenticated");
    if (isE2EAuthenticated !== "true") return null;

    const userJson = localStorage.getItem("protocol-guide-user");
    if (!userJson) return null;

    const userData = JSON.parse(userJson);
    const now = Math.floor(Date.now() / 1000);

    // Create a minimal mock session that satisfies the Session type
    return {
      access_token: `e2e-mock-token-${now}`,
      refresh_token: `e2e-mock-refresh-${now}`,
      expires_at: now + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: userData.id,
        email: userData.email,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { provider: "google", providers: ["google"] },
        user_metadata: {
          full_name: userData.name,
          avatar_url: userData.avatarUrl,
          email: userData.email,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as Session;
  } catch {
    return null;
  }
}

/**
 * Clear E2E mock session from localStorage
 */
function clearE2EMockSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("e2e-authenticated");
    localStorage.removeItem("e2e-user-tier");
    localStorage.removeItem("protocol-guide-user");
  } catch {
    // Ignore errors
  }
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mapSupabaseUser = useCallback((supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
    };
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for E2E mock session first (browser only)
      const e2eMockUser = getE2EMockUser();
      if (e2eMockUser) {
        const mockSession = createE2EMockSession();
        setSession(mockSession);
        setUser(e2eMockUser);
        setLoading(false);
        return;
      }

      // Use cached session to prevent race conditions
      const cachedSession = await getCachedSession();

      if (cachedSession) {
        setSession(cachedSession);
        setUser(mapSupabaseUser(cachedSession.user));
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [mapSupabaseUser]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await supabaseSignOut();
      // Clear token cache to prevent stale tokens
      clearTokenCache();
      // Clear E2E mock session if present
      clearE2EMockSession();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
      // Clear state and cache anyway
      clearTokenCache();
      clearE2EMockSession();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(session), [session]);

  // Initial fetch and auth state listener
  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }

    // Get initial session
    fetchUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession) {
          setSession(newSession);
          setUser(mapSupabaseUser(newSession.user));
          // Update token cache to prevent stale cache
          tokenCache.updateCache(newSession);
        } else {
          setSession(null);
          setUser(null);
          // Clear cache on logout/session end
          clearTokenCache();
        }
        setLoading(false);
      }
    );

    // Start session monitor for automatic refresh
    const stopMonitor = startSessionMonitor(
      (refreshedSession) => {
        setSession(refreshedSession);
        setUser(mapSupabaseUser(refreshedSession.user));
        // Update token cache when session is refreshed
        tokenCache.updateCache(refreshedSession);
      },
      () => {
        setSession(null);
        setUser(null);
        clearTokenCache();
      }
    );

    return () => {
      subscription.unsubscribe();
      stopMonitor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Only re-run if autoFetch changes, not on fetchUser/mapSupabaseUser recreation

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
