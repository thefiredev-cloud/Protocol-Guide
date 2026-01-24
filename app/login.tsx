/**
 * Login Page - Beta access gate with OAuth sign-in
 *
 * Flow:
 * 1. User enters access code
 * 2. If valid, Google/Apple sign-in buttons appear
 * 3. OAuth flow proceeds normally
 */

import { useState, useEffect } from "react";
import { View, Text, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";
import { signInWithGoogle, signInWithApple } from "@/lib/supabase";
import { ProtocolGuideLogo } from "@/components/icons/protocol-guide-logo";

const COLORS = {
  primaryRed: "#EF4444",
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  border: "#334155",
  success: "#22C55E",
  error: "#EF4444",
};

// Beta access code - stored in env for easy rotation
// If env var is not set, beta access is disabled (empty string will never match)
const BETA_ACCESS_CODE = process.env.EXPO_PUBLIC_BETA_ACCESS_CODE || "";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading]);

  const handleUnlock = () => {
    if (accessCode.toUpperCase().trim() === BETA_ACCESS_CODE.toUpperCase()) {
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Invalid access code");
      setIsUnlocked(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("[Login] Google sign-in error:", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithApple();
    } catch (err) {
      console.error("[Login] Apple sign-in error:", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgDark }}>
        <ActivityIndicator size="large" color={COLORS.primaryRed} />
      </View>
    );
  }

  // If authenticated, show loading (redirecting)
  if (isAuthenticated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgDark }}>
        <ActivityIndicator size="large" color={COLORS.primaryRed} />
      </View>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.bgDark }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          {/* Logo and Title */}
          <View style={{ alignItems: "center", marginBottom: 48 }}>
            <ProtocolGuideLogo size={64} color={COLORS.primaryRed} />
            <Text style={{ color: COLORS.textWhite, fontSize: 28, fontWeight: "700", marginTop: 16 }}>
              Protocol Guide
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 16, marginTop: 8, textAlign: "center" }}>
              Beta Access
            </Text>
          </View>

          {/* Access Code Section */}
          {!isUnlocked ? (
            <View style={{ width: "100%", maxWidth: 360 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 8 }}>
                Enter access code
              </Text>
              <TextInput
                value={accessCode}
                onChangeText={(text) => {
                  setAccessCode(text);
                  setError("");
                }}
                onSubmitEditing={handleUnlock}
                placeholder="ACCESS CODE"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  backgroundColor: COLORS.bgSurface,
                  borderWidth: 1,
                  borderColor: error ? COLORS.error : COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 18,
                  color: COLORS.textWhite,
                  textAlign: "center",
                  letterSpacing: 2,
                  fontWeight: "600",
                }}
              />
              {error ? (
                <Text style={{ color: COLORS.error, fontSize: 14, marginTop: 8, textAlign: "center" }}>
                  {error}
                </Text>
              ) : null}
              <View
                style={{
                  backgroundColor: COLORS.primaryRed,
                  borderRadius: 12,
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <Text
                  onPress={handleUnlock}
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  Unlock
                </Text>
              </View>

              {/* Back to Home */}
              <Text
                onPress={() => router.back()}
                style={{
                  color: COLORS.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 24,
                  textDecorationLine: "underline",
                }}
              >
                Back to Home
              </Text>
            </View>
          ) : (
            /* OAuth Sign-In Buttons */
            <View style={{ width: "100%", maxWidth: 360 }}>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <View
                  style={{
                    backgroundColor: COLORS.success,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
                    Access Granted
                  </Text>
                </View>
              </View>

              <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                Sign in to continue
              </Text>

              {isSigningIn ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <ActivityIndicator size="large" color={COLORS.primaryRed} />
                  <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Signing in...</Text>
                </View>
              ) : (
                <>
                  {/* Google Sign-In */}
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <Text
                      onPress={handleGoogleSignIn}
                      style={{
                        color: "#1F2937",
                        fontSize: 16,
                        fontWeight: "600",
                        textAlign: "center",
                        paddingVertical: 16,
                      }}
                    >
                      Continue with Google
                    </Text>
                  </View>

                  {/* Apple Sign-In */}
                  <View
                    style={{
                      backgroundColor: "#000000",
                      borderRadius: 12,
                      marginTop: 12,
                      overflow: "hidden",
                    }}
                  >
                    <Text
                      onPress={handleAppleSignIn}
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "600",
                        textAlign: "center",
                        paddingVertical: 16,
                      }}
                    >
                      Continue with Apple
                    </Text>
                  </View>

                  {error ? (
                    <Text style={{ color: COLORS.error, fontSize: 14, marginTop: 12, textAlign: "center" }}>
                      {error}
                    </Text>
                  ) : null}

                  {/* Reset / Use Different Code */}
                  <Text
                    onPress={() => {
                      setIsUnlocked(false);
                      setAccessCode("");
                      setError("");
                    }}
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 14,
                      textAlign: "center",
                      marginTop: 24,
                      textDecorationLine: "underline",
                    }}
                  >
                    Use a different access code
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
