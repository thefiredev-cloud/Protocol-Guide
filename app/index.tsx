/**
 * Landing Page - Marketing page for unauthenticated users
 *
 * If authenticated → redirect to (tabs) main app
 * If not authenticated → show marketing landing page
 */

import React, { useEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";
import {
  HeroSection,
  SimulationSection,
  TimeCalculatorSection,
  FeaturesSection,
  EmailCaptureSection,
  FooterSection,
} from "@/components/landing";
import { signInWithGoogle } from "@/lib/supabase";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("[Landing] Sign-in error:", error);
    }
  };

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  // If authenticated, don't render (we're redirecting)
  if (isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <HeroSection onSignIn={handleSignIn} />

        {/* Simulation Section - The Cognitive Load Gap */}
        <View nativeID="simulation-section">
          <SimulationSection />
        </View>

        {/* Time Calculator Section */}
        <TimeCalculatorSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* Email Capture CTA */}
        <EmailCaptureSection />

        {/* Footer */}
        <FooterSection />
      </ScrollView>
    </ScreenContainer>
  );
}
