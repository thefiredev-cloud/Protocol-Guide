/**
 * useAuth Hook - Supabase Auth integration with token refresh
 */

import { supabase, signOut as supabaseSignOut } from "@/lib/supabase";
import { startSessionMonitor } from "@/lib/auth-refresh";
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

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[useAuth] Session error:", sessionError);
        setError(sessionError);
        setUser(null);
        setSession(null);
        return;
      }

      if (data.session) {
        console.log("[useAuth] Session found:", data.session.user?.email);
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
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
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
      // Clear state anyway
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

    return () => {
      subscription.unsubscribe();
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
