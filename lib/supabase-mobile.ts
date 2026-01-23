/**
 * Supabase Mobile OAuth
 * Handles Google and Apple OAuth flows for Expo/React Native
 */

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import Constants from "expo-constants";
import { generateOAuthState, validateOAuthState, clearOAuthState } from "./oauth-state-validation";

// Ensure web browser auth sessions are completed
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URI for OAuth callbacks
const getRedirectUri = () => {
  // Use the scheme from app.json/app.config.js
  const scheme = Constants.expoConfig?.scheme || "manus20260110193545";

  if (Platform.OS === "web") {
    // For web, use the current origin
    return typeof window !== "undefined"
      ? `${window.location.origin}/oauth/callback`
      : "http://localhost:8082/oauth/callback";
  }

  // For native apps, use the deep link scheme
  return `${scheme}://oauth/callback`;
};

/**
 * Sign in with Google on mobile
 * Uses Supabase OAuth with Expo AuthSession
 */
export async function signInWithGoogleMobile(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const redirectUri = getRedirectUri();
    const state = await generateOAuthState("google");

    console.log("[GoogleAuth] Starting OAuth flow with redirect:", redirectUri);

    // For native platforms, use Supabase's signInWithOAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: Platform.OS !== "web",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("[GoogleAuth] Supabase OAuth error:", error);
      return { success: false, error: error.message };
    }

    if (Platform.OS === "web") {
      // On web, Supabase handles the redirect automatically
      return { success: true };
    }

    // On native, open the auth URL in a web browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      if (result.type === "success" && result.url) {
        // Extract the tokens from the callback URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1) || url.search);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken) {
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (sessionError) {
            console.error("[GoogleAuth] Session error:", sessionError);
            return { success: false, error: sessionError.message };
          }

          return { success: true };
        }

        // Check for error in callback
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");
        if (errorParam) {
          return { success: false, error: errorDescription || errorParam };
        }
      }

      if (result.type === "cancel") {
        await clearOAuthState();
        return { success: false, error: "Sign in was cancelled" };
      }
    }

    await clearOAuthState();
    return { success: false, error: "Failed to start authentication" };
  } catch (error) {
    await clearOAuthState();
    console.error("[GoogleAuth] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Sign in with Apple on mobile
 * Uses Supabase OAuth with native Apple Sign-In on iOS
 */
export async function signInWithAppleMobile(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const redirectUri = getRedirectUri();

    console.log("[AppleAuth] Starting OAuth flow with redirect:", redirectUri);

    // Use Supabase's signInWithOAuth for Apple
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error) {
      console.error("[AppleAuth] Supabase OAuth error:", error);
      return { success: false, error: error.message };
    }

    if (Platform.OS === "web") {
      // On web, Supabase handles the redirect automatically
      return { success: true };
    }

    // On native, open the auth URL in a web browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      if (result.type === "success" && result.url) {
        // Extract the tokens from the callback URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1) || url.search);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken) {
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (sessionError) {
            console.error("[AppleAuth] Session error:", sessionError);
            return { success: false, error: sessionError.message };
          }

          return { success: true };
        }

        // Check for error in callback
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");
        if (errorParam) {
          return { success: false, error: errorDescription || errorParam };
        }
      }

      if (result.type === "cancel") {
        return { success: false, error: "Sign in was cancelled" };
      }
    }

    return { success: false, error: "Failed to start authentication" };
  } catch (error) {
    console.error("[AppleAuth] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Link an additional OAuth provider to existing account
 */
export async function linkProvider(
  provider: "google" | "apple"
): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUri = getRedirectUri();

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: "Must be signed in to link accounts" };
    }

    // Use Supabase's linkIdentity (requires Supabase v2.38+)
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (Platform.OS !== "web" && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === "success") {
        return { success: true };
      }

      if (result.type === "cancel") {
        return { success: false, error: "Linking was cancelled" };
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`[LinkProvider] Error linking ${provider}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link account",
    };
  }
}

/**
 * Get list of linked identities for current user
 */
export async function getLinkedProviders(): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.identities) return [];

    return user.identities.map((identity) => identity.provider);
  } catch (error) {
    console.error("[GetLinkedProviders] Error:", error);
    return [];
  }
}

/**
 * Unlink a provider from the current user
 * Note: Requires at least one provider to remain linked
 */
export async function unlinkProvider(
  provider: "google" | "apple"
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.identities) {
      return { success: false, error: "No linked identities found" };
    }

    // Find the identity to unlink
    const identity = user.identities.find((i) => i.provider === provider);

    if (!identity) {
      return { success: false, error: `${provider} is not linked to this account` };
    }

    // Ensure at least one provider remains
    if (user.identities.length <= 1) {
      return { success: false, error: "Cannot unlink the only authentication method" };
    }

    // Unlink the identity using Supabase
    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error(`[UnlinkProvider] Error unlinking ${provider}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlink account",
    };
  }
}
