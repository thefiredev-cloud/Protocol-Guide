/**
 * Supabase Client - Client-side auth and database access
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auto-refresh to prevent race conditions with our custom refresh logic
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined"
        ? `${window.location.origin}/oauth/callback`
        : undefined,
    },
  });

  if (error) {
    console.error("[Supabase] Google sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: typeof window !== "undefined"
        ? `${window.location.origin}/oauth/callback`
        : undefined,
    },
  });

  if (error) {
    console.error("[Supabase] Apple sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[Supabase] Sign out error:", error);
    throw error;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[Supabase] Get session error:", error);
    return null;
  }
  return data.session;
}

/**
 * Get current user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[Supabase] Get user error:", error);
    return null;
  }
  return data.user;
}
