/**
 * Hero Section - "Seconds Save Lives." headline with navigation and CTA
 *
 * Features:
 * - Subtle animated gradient background
 * - Improved typography hierarchy with letter-spacing
 * - Hover states on nav links and CTA
 * - Enhanced CTA button with glow effect
 * - Staggered entry animations
 *
 * Accessibility: Full ARIA support, keyboard navigation, focus indicators
 * Performance: 60fps animations using native driver, minimal re-renders
 */

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, useWindowDimensions, Platform } from "react-native";
import { ProtocolGuideLogo } from "@/components/icons/protocol-guide-logo";
import { AnimatedPressable, AnimatedNavLink } from "./animated-pressable";
import { injectSmoothScrollCSS, scrollToElement } from "./animation-utils";

const COLORS = {
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  focusRing: "#3B82F6",
  border: "#334155",
};

/** Inject CSS keyframes for subtle gradient animation (web only) */
function injectGradientStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const styleId = "hero-gradient-styles";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes ctaPulse {
      0%, 100% { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35), 0 0 0 0 rgba(239, 68, 68, 0); }
      50% { box-shadow: 0 8px 28px rgba(239, 68, 68, 0.45), 0 0 0 8px rgba(239, 68, 68, 0.1); }
    }
    .hero-gradient-bg {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 25%, #0F172A 50%, #1E293B 75%, #0F172A 100%);
      background-size: 400% 400%;
      animation: gradientShift 20s ease-in-out infinite;
    }
    .cta-glow {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cta-glow:hover {
      box-shadow: 0 12px 32px rgba(239, 68, 68, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.1) !important;
      transform: translateY(-2px) scale(1.02) !important;
      animation: ctaPulse 2s ease-in-out infinite;
    }
    .nav-link {
      position: relative;
      transition: color 0.2s ease;
    }
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background-color: #EF4444;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-link:hover {
      color: #F1F5F9 !important;
    }
    .nav-link:hover::after {
      width: 100%;
    }
  `;
  document.head.appendChild(style);
}

interface HeroSectionProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

function HamburgerIcon({ color }: { color: string }) {
  return (
    <View
      style={{ width: 24, height: 18, justifyContent: "space-between" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <View
      style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ color, fontSize: 24, fontWeight: "300", lineHeight: 24 }}>x</Text>
    </View>
  );
}

export function HeroSection({ onGetStarted, onSignIn }: HeroSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Animation values for staggered entrance
  const navOpacity = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(20)).current;
  const subheadOpacity = useRef(new Animated.Value(0)).current;
  const subheadTranslateY = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0.95)).current;
  const badgesOpacity = useRef(new Animated.Value(0)).current;
  const badgesTranslateY = useRef(new Animated.Value(15)).current;
  const menuHeight = useRef(new Animated.Value(0)).current;

  // Inject gradient styles, smooth scroll CSS, and run staggered entrance animation on mount
  useEffect(() => {
    injectGradientStyles();
    injectSmoothScrollCSS();
    const animations = Animated.stagger(150, [
      Animated.timing(navOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(headlineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headlineTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subheadOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(subheadTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(ctaScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animations.start();
  }, [navOpacity, headlineOpacity, headlineTranslateY, subheadOpacity, subheadTranslateY, ctaOpacity, ctaScale]);

  // Mobile menu slide animation
  useEffect(() => {
    Animated.spring(menuHeight, {
      toValue: menuOpen ? 1 : 0,
      friction: 10,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [menuOpen, menuHeight]);

  const scrollToSection = (sectionId: string) => {
    scrollToElement(sectionId, 80); // 80px offset for nav bar
    setMenuOpen(false);
  };

  const handleSignIn = () => {
    setMenuOpen(false);
    onSignIn?.();
  };

  return (
    <View
      style={{ backgroundColor: COLORS.bgDark, minHeight: isMobile ? 520 : 640 }}
    >
      {/* Navigation Bar with fade-in */}
      <Animated.View
        style={{
          opacity: navOpacity,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: isMobile ? 16 : 24,
          paddingVertical: 16,
          maxWidth: 1200,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProtocolGuideLogo size={isMobile ? 32 : 40} color={COLORS.primaryRed} invertOnHover />
          <Text style={{ color: COLORS.textWhite, fontSize: isMobile ? 16 : 18, fontWeight: "700" }}>
            Protocol Guide
          </Text>
        </View>

        {!isMobile && (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 32 }}
            accessibilityLabel="Main navigation"
          >
            <AnimatedNavLink
              onPress={() => scrollToSection("simulation-section")}
              accessibilityRole="link"
              accessibilityLabel="Speed Test section"
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: "600", letterSpacing: 0.3 }}>
                Speed Test
              </Text>
            </AnimatedNavLink>
            <AnimatedNavLink
              onPress={() => scrollToSection("impact-section")}
              accessibilityRole="link"
              accessibilityLabel="Impact section"
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: "600", letterSpacing: 0.3 }}>
                Impact
              </Text>
            </AnimatedNavLink>
            <AnimatedPressable
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Request Access"
              style={{
                backgroundColor: COLORS.textWhite,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
              }}
              pressScale={0.95}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
                Request Access
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {isMobile && (
          <AnimatedPressable
            onPress={() => setMenuOpen(!menuOpen)}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            pressScale={0.9}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            accessibilityState={{ expanded: menuOpen }}
          >
            {menuOpen ? <CloseIcon color={COLORS.textWhite} /> : <HamburgerIcon color={COLORS.textWhite} />}
          </AnimatedPressable>
        )}
      </Animated.View>

      {/* Mobile Dropdown Menu with slide animation */}
      {isMobile && (
        <Animated.View
          style={{
            backgroundColor: COLORS.bgSurface,
            paddingHorizontal: 16,
            borderBottomWidth: menuOpen ? 1 : 0,
            borderBottomColor: COLORS.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: menuOpen ? 0.1 : 0,
            shadowRadius: 4,
            elevation: menuOpen ? 3 : 0,
            overflow: "hidden",
            maxHeight: menuHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }),
            opacity: menuHeight,
          }}
        >
          <View style={{ paddingVertical: 8 }}>
            <AnimatedNavLink
              onPress={() => scrollToSection("simulation-section")}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: "500" }}>
                Speed Test
              </Text>
            </AnimatedNavLink>
            <AnimatedNavLink
              onPress={() => scrollToSection("impact-section")}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: "500" }}>
                Impact
              </Text>
            </AnimatedNavLink>
            <AnimatedPressable
              onPress={handleSignIn}
              style={{
                backgroundColor: COLORS.textWhite,
                paddingHorizontal: 16,
                minHeight: 48,
                borderRadius: 6,
                marginTop: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
              pressScale={0.97}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                Request Access
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      )}

      {/* Hero Content */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: isMobile ? 16 : 24,
          paddingVertical: isMobile ? 48 : 80,
        }}
      >
        {/* Main Headline with fade-in + slide-up and enhanced typography */}
        <Animated.Text
          style={{
            fontSize: isMobile ? 44 : 72,
            fontWeight: "900",
            textAlign: "center",
            marginBottom: isMobile ? 24 : 32,
            lineHeight: isMobile ? 52 : 84,
            letterSpacing: isMobile ? -2 : -2.5,
            opacity: headlineOpacity,
            transform: [{ translateY: headlineTranslateY }],
          }}
          accessibilityRole="header"
        >
          <Text style={{ color: COLORS.textWhite }}>Seconds Save </Text>
          <Text
            style={{
              color: COLORS.primaryRed,
              textShadowColor: "rgba(155, 35, 53, 0.2)",
              textShadowOffset: { width: 0, height: 3 },
              textShadowRadius: 12,
            }}
          >
            Lives.
          </Text>
        </Animated.Text>

        {/* Subheadline with staggered fade-in and improved typography */}
        <Animated.View
          style={{ opacity: subheadOpacity, transform: [{ translateY: subheadTranslateY }] }}
        >
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: isMobile ? 22 : 30,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: isMobile ? 18 : 24,
              letterSpacing: -0.5,
            }}
          >
            Why waste 90 of them searching?
          </Text>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: isMobile ? 18 : 20,
              fontWeight: "400",
              textAlign: "center",
              marginBottom: isMobile ? 40 : 52,
              maxWidth: 560,
              lineHeight: isMobile ? 28 : 32,
              letterSpacing: 0.2,
            }}
          >
            The modern protocol retrieval tool for EMS.{"\n"}
            <Text style={{ fontWeight: "700", color: COLORS.textWhite }}>2 seconds</Text> to find what you need. Not 2 minutes.
          </Text>
        </Animated.View>

        {/* CTA Button with scale-in animation and enhanced glow */}
        <Animated.View style={{ opacity: ctaOpacity, transform: [{ scale: ctaScale }] }}>
          <AnimatedPressable
            onPress={() => scrollToSection("simulation-section")}
            style={{
              backgroundColor: COLORS.primaryRed,
              paddingHorizontal: isMobile ? 32 : 40,
              paddingVertical: isMobile ? 16 : 18,
              minHeight: isMobile ? 56 : 62,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              shadowColor: COLORS.primaryRed,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 10,
            }}
            pressScale={0.96}
            accessibilityRole="button"
            accessibilityLabel="See the Difference"
            accessibilityHint="Scrolls to the speed comparison demo"
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: isMobile ? 18 : 19,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              See the Difference
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: isMobile ? 18 : 19, fontWeight: "400" }}>{"\u2192"}</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </View>
  );
}

export default HeroSection;
