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
 * 
 * SEO/AEO Optimized:
 * - Dynamic meta tags for search engines
 * - Structured data for AI assistants
 * - FAQ schema for common questions
 */

import React, { Suspense, lazy } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthContext } from "@/lib/auth-context";
import { ScreenContainer } from "@/components/screen-container";
// SEO Components
import { SEOHead, OrganizationSchema, WebSiteSchema } from "@/components/seo";
import { FAQSection, EMS_PROTOCOL_FAQS, APP_FEATURES_FAQS } from "@/components/seo/FAQSection";
// Hero section loaded eagerly - it's above the fold
import { HeroSection } from "@/components/landing/hero-section";

// Lazy load all below-the-fold sections (reduces initial bundle by ~500KB+)
const FeaturesSection = lazy(() => import("@/components/landing/features-section"));
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
      {/* SEO Meta Tags */}
      <SEOHead
        title="EMS Protocol Search"
        description="AI-powered EMS protocol search for paramedics and EMTs. Access LA County, California, and nationwide protocols instantly. Find cardiac arrest, pediatric, trauma protocols in seconds."
        path="/"
        keywords={[
          "LA County EMS protocols",
          "California paramedic protocols",
          "EMS protocol app",
          "prehospital protocols",
          "paramedic field guide",
          "EMT protocol reference",
        ]}
      />
      
      {/* Structured Data for SEO/AEO */}
      <OrganizationSchema />
      <WebSiteSchema />
      
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0F172A" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - "The protocol you need. Now." */}
        <HeroSection />

        {/* Below-the-fold sections - all lazy loaded for performance */}
        <Suspense fallback={<SectionPlaceholder />}>
          {/* Features Section - Practical benefits for firefighters */}
          <FeaturesSection />
          {/* Simulation Section - See how fast it works */}
          <View nativeID="simulation-section">
            <SimulationSection />
          </View>

          {/* CTA Section - Ready when you are */}
          <EmailCaptureSection />

          {/* FAQ Section - SEO/AEO Optimized */}
          <View style={{ paddingHorizontal: 16 }}>
            <FAQSection
              faqs={[...EMS_PROTOCOL_FAQS.slice(0, 4), ...APP_FEATURES_FAQS.slice(0, 2)]}
              title="Common Protocol Questions"
              subtitle="Answers to frequently asked EMS protocol questions"
            />
          </View>

          {/* Footer */}
          <FooterSection />
        </Suspense>
      </ScrollView>
    </ScreenContainer>
  );
}
