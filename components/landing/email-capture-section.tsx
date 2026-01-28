/**
 * CTA Section - Simple call to action
 *
 * Redesigned for firefighters:
 * - Primary CTA goes straight to search (no signup friction)
 * - Secondary: Add to home screen prompt (PWA)
 * - No email capture on first visit - prove value first
 * - Trust elements: HIPAA, no patient data, official sources
 */

import * as React from "react";
import { useCallback } from "react";
import { View, Text, Pressable, Platform, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

const COLORS = {
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  primaryRed: "#EF4444",
  primaryRedHover: "#DC2626",
  border: "#334155",
  green: "#22C55E",
};

// Enhanced CTA Button
function CTAButton({ onPress, primary = true }: { onPress: () => void; primary?: boolean }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: primary ? COLORS.primaryRed : "transparent",
            borderWidth: primary ? 0 : 2,
            borderColor: COLORS.border,
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 200,
            flexDirection: "row",
            gap: 10,
            shadowColor: primary ? COLORS.primaryRed : "transparent",
            shadowOffset: { width: 0, height: primary ? 8 : 0 },
            shadowOpacity: primary ? 0.35 : 0,
            shadowRadius: primary ? 16 : 0,
            elevation: primary ? 8 : 0,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={{
            color: primary ? "#FFFFFF" : COLORS.textMuted,
            fontSize: 17,
            fontWeight: "700",
          }}
        >
          {primary ? "Start Searching" : "Learn More"}
        </Text>
        {primary && <Text style={{ color: "#FFFFFF", fontSize: 17 }}>→</Text>}
      </Animated.View>
    </Pressable>
  );
}

// Trust Badge
function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: "500" }}>{text}</Text>
    </View>
  );
}

export function EmailCaptureSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const sectionProgress = useSharedValue(0);

  React.useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              sectionProgress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
            }
          });
        },
        { threshold: 0.2 }
      );

      const timer = setTimeout(() => {
        const element = document.getElementById("cta-section");
        if (element) observer.observe(element);
      }, 100);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    } else {
      sectionProgress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  }, [sectionProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sectionProgress.value,
    transform: [{ translateY: interpolate(sectionProgress.value, [0, 1], [20, 0]) }],
  }));

  const handleStartSearching = useCallback(() => {
    // Go straight to the app - no signup required
    router.push("/(tabs)");
  }, []);

  const handleLearnMore = useCallback(() => {
    // Scroll to features or about section
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const element = document.getElementById("features-section");
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <View
      nativeID="cta-section"
      style={{
        backgroundColor: COLORS.bgSurface,
        paddingVertical: isMobile ? 56 : isTablet ? 72 : 88,
      }}
    >
      <Animated.View
        style={[
          {
            paddingHorizontal: isMobile ? 20 : isTablet ? 32 : 24,
            maxWidth: 700,
            alignSelf: "center",
            width: "100%",
          },
          animatedStyle,
        ]}
      >
        {/* Main headline */}
        <Text
          style={{
            color: COLORS.textWhite,
            fontSize: isMobile ? 28 : isTablet ? 32 : 36,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: isMobile ? 12 : 16,
            letterSpacing: -0.5,
          }}
        >
          Ready when you are.
        </Text>

        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: isMobile ? 16 : isTablet ? 17 : 18,
            textAlign: "center",
            marginBottom: isMobile ? 32 : 40,
            lineHeight: isMobile ? 24 : 26,
          }}
        >
          Protocols at your fingertips. On the rig,{"\n"}
          on scene, during transport.
        </Text>

        {/* CTA Buttons */}
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            marginBottom: isMobile ? 40 : 48,
          }}
        >
          <CTAButton onPress={handleStartSearching} primary />
          <CTAButton onPress={handleLearnMore} primary={false} />
        </View>

        {/* Trust badges */}
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            gap: isMobile ? 16 : 32,
            paddingTop: 24,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <TrustBadge icon="🔒" text="HIPAA Compliant" />
          <TrustBadge icon="📱" text="No patient data stored" />
          <TrustBadge icon="✓" text="Official LA County protocols" />
        </View>

        {/* Bottom note */}
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 13,
            textAlign: "center",
            marginTop: 24,
            opacity: 0.7,
            fontStyle: "italic",
          }}
        >
          Built with input from LA County paramedics.
        </Text>
      </Animated.View>
    </View>
  );
}

export default EmailCaptureSection;
