/**
 * Landing Page - Marketing page for unauthenticated users
 *
 * If authenticated → redirect to (tabs) main app
 * If not authenticated → show marketing landing page
 *
 * Performance optimizations:
 * - React.lazy() for below-the-fold sections (reduces initial bundle)
 * - Suspense boundaries with minimal fallbacks
 * - HeroSection loaded eagerly (above the fold)
 */

import React, { Suspense, lazy } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { router, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";
// Hero section loaded eagerly - it's above the fold
import { HeroSection } from "@/components/landing/hero-section";

// Lazy load below-the-fold sections to reduce initial bundle size
const SimulationSection = lazy(() => import("@/components/landing/simulation-section"));
const TimeCalculatorSection = lazy(() => import("@/components/landing/time-calculator-section"));
const FeaturesSection = lazy(() => import("@/components/landing/features-section"));
const EmailCaptureSection = lazy(() => import("@/components/landing/email-capture-section"));
const FooterSection = lazy(() => import("@/components/landing/footer-section"));

// Minimal loading placeholder for lazy sections
function SectionPlaceholder() {
  return (
    <View style={{ height: 200, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <ActivityIndicator size="small" color="#EF4444" />
    </View>
  );
}

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  const handleSignIn = () => {
    router.push("/login");
  };

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

  // Redirect to main app if already authenticated
  // Using Redirect component instead of router.replace() to avoid race conditions
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0F172A" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - loaded eagerly (above the fold) */}
        <HeroSection onSignIn={handleSignIn} />

        {/* Below-the-fold sections wrapped in Suspense for code splitting */}
        <Suspense fallback={<SectionPlaceholder />}>
          {/* Simulation Section - The Cognitive Load Gap */}
          <View nativeID="simulation-section">
            <SimulationSection />
          </View>

          {/* Time Calculator Section - Impact */}
          <View nativeID="impact-section">
            <TimeCalculatorSection />
          </View>

          {/* Features Section */}
          <FeaturesSection />

          {/* Email Capture CTA */}
          <EmailCaptureSection />

          {/* Footer */}
          <FooterSection />
        </Suspense>
      </ScrollView>
    </ScreenContainer>
  );
}
