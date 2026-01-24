/**
 * OAuth Callback - Handles Supabase Auth redirects
 */

import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase";
import { validateOAuthState } from "@/lib/oauth-state-validation";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Helper to track timers for cleanup
    const addTimer = (timer: ReturnType<typeof setTimeout>) => {
      timersRef.current.push(timer);
    };

    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered");

      try {
        // Validate OAuth state parameter first
        const url = new URL(window.location.href);
        const receivedState = url.searchParams.get("state");

        if (receivedState) {
          const validation = await validateOAuthState(receivedState);

          if (!validation.valid) {
            console.error("[OAuth] State validation failed:", validation.error);
            setStatus("error");
            setErrorMessage(validation.error || "OAuth state validation failed");
            return;
          }

          console.log("[OAuth] State validated successfully");
        }

        // Supabase handles the OAuth callback automatically via URL hash
        // We just need to check if there's a session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[OAuth] Session error:", error);
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          console.log("[OAuth] Session found:", data.session.user?.email);
          setStatus("success");

          // Redirect to main app after brief delay
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1000);
        } else {
          // No session yet - Supabase may still be processing
          // Wait a moment and check again
          console.log("[OAuth] No session yet, waiting...");

          setTimeout(async () => {
            const { data: retryData, error: retryError } = await supabase.auth.getSession();

            if (retryError || !retryData.session) {
              console.error("[OAuth] Still no session after retry");
              setStatus("error");
              setErrorMessage("Authentication failed - no session created");
              return;
            }

            console.log("[OAuth] Session found on retry:", retryData.session.user?.email);
            setStatus("success");
            setTimeout(() => {
              router.replace("/(tabs)");
            }, 500);
          }, 1500);
        }
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication"
        );
      }
    };

    handleCallback();
  }, [router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Authentication failed
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
