/**
 * useAuth Hook - Supabase Auth integration with token refresh
 * FIXED: Uses token cache to prevent race conditions
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
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Use cached session to prevent race conditions
      const cachedSession = await getCachedSession();

      if (cachedSession) {
        console.log("[useAuth] Session found:", cachedSession.user?.email);
        setSession(cachedSession);
        setUser(mapSupabaseUser(cachedSession.user));
      } else {
        console.log("[useAuth] No session");
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
    console.log("[useAuth] logout called");
    try {
      setLoading(true);
      await supabaseSignOut();
      // Clear token cache to prevent stale tokens
      clearTokenCache();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
      // Clear state and cache anyway
      clearTokenCache();
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
        console.log("[useAuth] Auth state changed:", event);

        if (newSession) {
          setSession(newSession);
          setUser(mapSupabaseUser(newSession.user));
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Start session monitor for automatic refresh
    const stopMonitor = startSessionMonitor(
      (refreshedSession) => {
        console.log("[useAuth] Session refreshed automatically");
        setSession(refreshedSession);
        setUser(mapSupabaseUser(refreshedSession.user));
      },
      () => {
        console.log("[useAuth] Session expired, logging out");
        setSession(null);
        setUser(null);
      }
    );

    return () => {
      subscription.unsubscribe();
      stopMonitor();
    };
  }, [autoFetch, fetchUser, mapSupabaseUser]);

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
