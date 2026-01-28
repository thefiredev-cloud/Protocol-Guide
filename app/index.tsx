/**
 * Landing Page - Protocol Guide for LA County Firefighter/Paramedics
 *
 * Redesigned for firefighter audience:
 * - Dark mode default (night calls are real)
 * - Mobile-first (used on phones, not desktops)
 * - No tech jargon - speak their language
 * - CTA goes straight to search (no signup friction)
 *
 * Section order:
 * 1. Hero - "The protocol you need. Now."
 * 2. Features - Practical benefits (no SaaS-speak)
 * 3. Simulation - See how fast it works
 * 4. CTA - Ready when you are
 * 5. Footer - Built by firefighters, for firefighters
 */

import React, { Suspense, lazy } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthContext } from "@/lib/auth-context";
import { ScreenContainer } from "@/components/screen-container";
// Hero section loaded eagerly - it's above the fold
import { HeroSection } from "@/components/landing/hero-section";
// Features loaded eagerly - usually visible on first scroll
import { FeaturesSection } from "@/components/landing/features-section";

// Lazy load below-the-fold sections
const SimulationSection = lazy(() => import("@/components/landing/simulation-section"));
const EmailCaptureSection = lazy(() => import("@/components/landing/email-capture-section"));
const FooterSection = lazy(() => import("@/components/landing/footer-section"));

// Minimal loading placeholder
function SectionPlaceholder() {
  return (
    <View style={{ height: 200, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <ActivityIndicator size="small" color="#EF4444" />
    </View>
  );
}

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuthContext();

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
        {/* Hero Section - "The protocol you need. Now." */}
        <HeroSection />

        {/* Features Section - Practical benefits for firefighters */}
        <FeaturesSection />

        {/* Below-the-fold sections */}
        <Suspense fallback={<SectionPlaceholder />}>
          {/* Simulation Section - See how fast it works */}
          <View nativeID="simulation-section">
            <SimulationSection />
          </View>

          {/* CTA Section - Ready when you are */}
          <EmailCaptureSection />

          {/* Footer */}
          <FooterSection />
        </Suspense>
      </ScrollView>
    </ScreenContainer>
  );
}
