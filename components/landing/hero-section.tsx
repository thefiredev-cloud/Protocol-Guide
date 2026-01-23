/**
 * Hero Section - "Seconds Save Lives." headline with navigation and CTA
 *
 * Features:
 * - Subtle animated gradient background
 * - Improved typography hierarchy with letter-spacing
 * - Hover states on nav links and CTA
 * - Enhanced CTA button with glow effect
 * - Staggered entry animations
 * - Three-tier responsive design (mobile < 640, tablet 640-1024, desktop >= 1024)
 *
 * Accessibility: Full ARIA support, keyboard navigation, focus indicators
 * Performance: 60fps animations using native driver, minimal re-renders
 */

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, useWindowDimensions, Platform } from "react-native";
import { ProtocolGuideLogo } from "@/components/icons/protocol-guide-logo";
import { AnimatedPressable, AnimatedNavLink } from "./animated-pressable";
import { injectSmoothScrollCSS, scrollToElement } from "./animation-utils";
import { StarRating, TrustedBadge, TestimonialQuote, DepartmentUsage } from "./social-proof";

const COLORS = {
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  focusRing: "#3B82F6",
  border: "#334155",
  green: "#22C55E",
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

  // Three-tier responsive breakpoints
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const showMobileMenu = width < 768; // Keep hamburger menu threshold for nav

  // Animation values for staggered entrance
  const navOpacity = useRef(new Animated.Value(0)).current;
  const socialProofOpacity = useRef(new Animated.Value(0)).current;
  const socialProofTranslateY = useRef(new Animated.Value(10)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(20)).current;
  const subheadOpacity = useRef(new Animated.Value(0)).current;
  const subheadTranslateY = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0.95)).current;
  const testimonialOpacity = useRef(new Animated.Value(0)).current;
  const testimonialTranslateY = useRef(new Animated.Value(10)).current;
  const badgesOpacity = useRef(new Animated.Value(0)).current;
  const badgesTranslateY = useRef(new Animated.Value(15)).current;
  const menuHeight = useRef(new Animated.Value(0)).current;

  // Inject gradient styles, smooth scroll CSS, and run staggered entrance animation on mount
  useEffect(() => {
    injectGradientStyles();
    injectSmoothScrollCSS();
    const animations = Animated.stagger(120, [
      Animated.timing(navOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(socialProofOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(socialProofTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
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
      Animated.parallel([
        Animated.timing(testimonialOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(testimonialTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(badgesOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(badgesTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animations.start();
  }, [navOpacity, socialProofOpacity, socialProofTranslateY, headlineOpacity, headlineTranslateY, subheadOpacity, subheadTranslateY, ctaOpacity, ctaScale, testimonialOpacity, testimonialTranslateY, badgesOpacity, badgesTranslateY]);

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

  // Responsive typography helpers
  const getHeadlineFontSize = () => {
    if (isMobile) return 40;
    if (isTablet) return 56;
    return 72;
  };

  const getHeadlineLineHeight = () => {
    if (isMobile) return 48;
    if (isTablet) return 64;
    return 84;
  };

  const getSubheadlineFontSize = () => {
    if (isMobile) return 16;
    if (isTablet) return 18;
    return 20;
  };

  const getMinHeight = () => {
    if (isMobile) return 520;
    if (isTablet) return 580;
    return 640;
  };

  return (
    <View
      style={{ backgroundColor: COLORS.bgDark, minHeight: getMinHeight() }}
    >
      {/* Navigation Bar with fade-in */}
      <Animated.View
        style={{
          opacity: navOpacity,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: isMobile ? 16 : isTablet ? 20 : 24,
          paddingVertical: 16,
          maxWidth: 1200,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProtocolGuideLogo size={isMobile ? 32 : isTablet ? 36 : 40} color={COLORS.primaryRed} invertOnHover />
          <Text style={{ color: COLORS.textWhite, fontSize: isMobile ? 16 : isTablet ? 17 : 18, fontWeight: "700" }}>
            Protocol Guide
          </Text>
        </View>

        {!showMobileMenu && (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: isTablet ? 24 : 32 }}
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
                paddingHorizontal: isTablet ? 14 : 16,
                paddingVertical: isTablet ? 7 : 8,
                borderRadius: 6,
              }}
              pressScale={0.95}
            >
              <Text style={{ color: COLORS.bgDark, fontSize: 14, fontWeight: "600" }}>
                Request Access
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {showMobileMenu && (
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
      {showMobileMenu && (
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
              <Text style={{ color: COLORS.bgDark, fontSize: 16, fontWeight: "600" }}>
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
          paddingHorizontal: isMobile ? 16 : isTablet ? 32 : 24,
          paddingVertical: isMobile ? 48 : isTablet ? 64 : 80,
        }}
      >
        {/* Social Proof Badge - Trusted by badge with star rating */}
        <TrustedBadge
          userCount="12,000+"
          rating={4.9}
          reviewCount={847}
          isMobile={isMobile}
          opacity={socialProofOpacity}
          translateY={socialProofTranslateY}
        />

        {/* Main Headline with fade-in + slide-up and enhanced typography */}
        <Animated.Text
          style={{
            fontSize: getHeadlineFontSize(),
            fontWeight: "900",
            textAlign: "center",
            marginBottom: isMobile ? 24 : isTablet ? 28 : 32,
            lineHeight: getHeadlineLineHeight(),
            letterSpacing: isMobile ? -1.5 : isTablet ? -2 : -2.5,
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
              fontSize: isMobile ? 20 : isTablet ? 26 : 30,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: isMobile ? 18 : isTablet ? 20 : 24,
              letterSpacing: -0.5,
            }}
          >
            Why waste 90 of them searching?
          </Text>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: getSubheadlineFontSize(),
              fontWeight: "400",
              textAlign: "center",
              marginBottom: isMobile ? 40 : isTablet ? 46 : 52,
              maxWidth: isMobile ? 320 : isTablet ? 480 : 560,
              lineHeight: isMobile ? 26 : isTablet ? 28 : 32,
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
              paddingHorizontal: isMobile ? 28 : isTablet ? 34 : 40,
              paddingVertical: isMobile ? 14 : isTablet ? 16 : 18,
              minHeight: isMobile ? 52 : isTablet ? 58 : 62,
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
            accessibilityLabel="Try the Demo"
            accessibilityHint="Scrolls to the speed comparison demo"
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: isMobile ? 16 : isTablet ? 17 : 19,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              Try the Demo
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: isMobile ? 16 : isTablet ? 17 : 19, fontWeight: "400" }}>{"\u2192"}</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* Testimonial Quote */}
        <TestimonialQuote
          quote="Found the STEMI protocol in under 3 seconds during a critical call. This app has genuinely changed how our crews operate."
          authorName="James Mitchell"
          authorTitle="Paramedic"
          authorOrg="Austin-Travis County EMS"
          authorInitials="JM"
          isMobile={isMobile}
          isTablet={isTablet}
          opacity={testimonialOpacity}
          translateY={testimonialTranslateY}
        />

        {/* Department Usage Indicator */}
        <DepartmentUsage
          stateCount={50}
          isMobile={isMobile}
          opacity={testimonialOpacity}
        />

        {/* Trust Badges - Social Proof */}
        <Animated.View
          style={{
            opacity: badgesOpacity,
            transform: [{ translateY: badgesTranslateY }],
            marginTop: isMobile ? 24 : isTablet ? 28 : 32,
          }}
        >
          <View
            style={{
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 20 : 0,
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              borderRadius: 16,
              paddingVertical: isMobile ? 24 : isTablet ? 22 : 20,
              paddingHorizontal: isMobile ? 32 : isTablet ? 40 : 48,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
            accessibilityRole="region"
            accessibilityLabel="Trust statistics"
          >
            <View style={{ alignItems: "center", minWidth: isMobile ? "auto" : isTablet ? 120 : 140 }}>
              <Text
                style={{
                  color: COLORS.textWhite,
                  fontSize: isMobile ? 28 : isTablet ? 30 : 32,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                50,000+
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "500",
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                EMS Professionals
              </Text>
            </View>

            {!isMobile && (
              <View
                style={{
                  width: 1,
                  height: 48,
                  backgroundColor: COLORS.border,
                  marginHorizontal: isTablet ? 24 : 32,
                }}
              />
            )}

            <View style={{ alignItems: "center", minWidth: isMobile ? "auto" : isTablet ? 120 : 140 }}>
              <Text
                style={{
                  color: COLORS.textWhite,
                  fontSize: isMobile ? 28 : isTablet ? 30 : 32,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                55,000+
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "500",
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                Protocols
              </Text>
            </View>

            {!isMobile && (
              <View
                style={{
                  width: 1,
                  height: 48,
                  backgroundColor: COLORS.border,
                  marginHorizontal: isTablet ? 24 : 32,
                }}
              />
            )}

            <View style={{ alignItems: "center", minWidth: isMobile ? "auto" : isTablet ? 120 : 140 }}>
              <Text
                style={{
                  color: COLORS.primaryRed,
                  fontSize: isMobile ? 28 : isTablet ? 30 : 32,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                50
              </Text>
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "500",
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                States Covered
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default HeroSection;
