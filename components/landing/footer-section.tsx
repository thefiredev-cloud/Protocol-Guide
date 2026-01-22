/**
 * Footer Section - Copyright and links
 * Polished footer with enhanced hover animations, gradient border, and responsive layout
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Platform,
  TextStyle,
  ViewStyle,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { ProtocolGuideLogo } from "@/components/icons/protocol-guide-logo";

const COLORS = {
  bgSurface: "#1E293B",
  bgDark: "#0F172A",
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  redGradientEnd: "rgba(239, 68, 68, 0.2)",
  textMuted: "#94A3B8",
  textMutedLight: "#CBD5E1",
  textWhite: "#F1F5F9",
  border: "#334155",
  shadow: "rgba(239, 68, 68, 0.15)",
};

// Consistent spacing scale (8px grid)
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 48,
};

interface FooterLinkProps {
  label: string;
  onPress: () => void;
}

function FooterLink({ label, onPress }: FooterLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = useCallback(() => {
    setIsHovered(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 8,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(underlineAnim, {
        toValue: 1,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, underlineAnim]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(underlineAnim, {
        toValue: 0,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, underlineAnim]);

  // Web-only transition style for color change
  const webTransitionStyle: TextStyle = Platform.OS === "web"
    ? ({ transition: "color 0.25s cubic-bezier(0.4, 0, 0.2, 1)" } as unknown as TextStyle)
    : {};

  // Web-only shadow style
  const webShadowStyle: ViewStyle = Platform.OS === "web" && isHovered
    ? ({ boxShadow: `0 2px 8px ${COLORS.shadow}` } as unknown as ViewStyle)
    : {};

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        style={[styles.linkPressable, webShadowStyle]}
        accessibilityRole="link"
        accessibilityLabel={label}
      >
        {({ pressed }) => (
          <>
            <Text
              style={[
                styles.linkText,
                isHovered && styles.linkTextHovered,
                pressed && styles.linkTextPressed,
                webTransitionStyle,
              ]}
            >
              {label}
            </Text>
            {/* Animated hover underline indicator */}
            <Animated.View
              style={[
                styles.linkUnderline,
                {
                  opacity: underlineAnim,
                  transform: [{ scaleX: underlineAnim }],
                },
              ]}
            />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function FooterSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeDesktop = width >= 1440;
  const [isVisible, setIsVisible] = useState(false);

  // Scroll-triggered entrance animation
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const sectionTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isVisible) {
              setIsVisible(true);
              Animated.parallel([
                Animated.timing(sectionOpacity, {
                  toValue: 1,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.spring(sectionTranslateY, {
                  toValue: 0,
                  friction: 10,
                  tension: 40,
                  useNativeDriver: true,
                }),
              ]).start();
            }
          });
        },
        { threshold: 0.2 }
      );

      const timer = setTimeout(() => {
        const element = document.getElementById("footer-section");
        if (element) observer.observe(element);
      }, 100);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(sectionOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(sectionTranslateY, { toValue: 0, friction: 10, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [sectionOpacity, sectionTranslateY, isVisible]);

  const handleNavigation = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  return (
    <View style={styles.container} accessibilityRole="contentinfo" nativeID="footer-section">
      {/* Enhanced gradient border at top */}
      <View style={styles.gradientBorderWrapper} accessibilityElementsHidden>
        <View style={styles.gradientBorder} />
        <View style={styles.gradientShadow} />
      </View>

      {/* Main footer content */}
      <Animated.View
        style={[
          styles.innerContainer,
          isMobile && styles.innerContainerMobile,
          isLargeDesktop && styles.innerContainerLarge,
          { opacity: sectionOpacity, transform: [{ translateY: sectionTranslateY }] },
        ]}
      >
        <View
          style={[
            styles.contentWrapper,
            isMobile && styles.contentWrapperMobile,
            isLargeDesktop && styles.contentWrapperLarge,
          ]}
        >
          {/* Logo + Copyright Section */}
          <View
            style={[
              styles.brandSection,
              isMobile && styles.brandSectionMobile,
            ]}
          >
            <View style={styles.logoContainer}>
              <ProtocolGuideLogo
                size={isMobile ? 24 : isLargeDesktop ? 32 : 28}
                color={COLORS.primaryRed}
              />
              <Text
                style={[
                  styles.brandName,
                  isMobile && styles.brandNameMobile,
                  isLargeDesktop && styles.brandNameLarge,
                ]}
              >
                Protocol Guide
              </Text>
            </View>
            <Text
              style={[
                styles.copyrightText,
                isMobile && styles.copyrightTextMobile,
              ]}
            >
              © 2026 Protocol Guide. All rights reserved.
            </Text>
          </View>

          {/* Divider for mobile */}
          {isMobile && <View style={styles.mobileDivider} />}

          {/* Links Section */}
          <View
            style={[
              styles.linksSection,
              isMobile && styles.linksSectionMobile,
              isTablet && styles.linksSectionTablet,
            ]}
            accessibilityRole="navigation"
            accessibilityLabel="Footer navigation"
          >
            <FooterLink
              label="Privacy Policy"
              onPress={() => handleNavigation("/privacy")}
            />
            <FooterLink
              label="Terms of Service"
              onPress={() => handleNavigation("/terms")}
            />
            <FooterLink
              label="Contact Us"
              onPress={() => handleNavigation("/contact")}
            />
          </View>
        </View>

        {/* Bottom tagline with enhanced styling */}
        <View
          style={[
            styles.taglineContainer,
            isMobile && styles.taglineContainerMobile,
          ]}
        >
          <View style={styles.taglineDot} />
          <Text style={[styles.taglineText, isMobile && styles.taglineTextMobile]}>
            Built for EMS professionals. Seconds save lives.
          </Text>
          <View style={styles.taglineDot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgDark,
    position: "relative",
  },
  gradientBorderWrapper: {
    position: "relative",
    width: "100%",
    height: 3,
  },
  gradientBorder: {
    height: 3,
    width: "100%",
    backgroundColor: COLORS.primaryRed,
    // Web gradient overlay
    ...(Platform.OS === "web" && {
      background: `linear-gradient(90deg, ${COLORS.redGradientEnd} 0%, ${COLORS.primaryRed} 20%, ${COLORS.primaryRedLight} 50%, ${COLORS.primaryRed} 80%, ${COLORS.redGradientEnd} 100%)`,
    } as any),
  },
  gradientShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.shadow,
    opacity: 0.3,
  },
  innerContainer: {
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.bgSurface,
  },
  innerContainerMobile: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.base,
  },
  innerContainerLarge: {
    paddingVertical: SPACING.xxxxl,
  },
  contentWrapper: {
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xl,
  },
  contentWrapperMobile: {
    flexDirection: "column",
    alignItems: "center",
    gap: SPACING.lg,
  },
  contentWrapperLarge: {
    maxWidth: 1440,
    gap: SPACING.xxl,
  },
  brandSection: {
    flexDirection: "column",
    gap: SPACING.sm,
  },
  brandSectionMobile: {
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  brandName: {
    color: COLORS.textWhite,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  brandNameMobile: {
    fontSize: 15,
    fontWeight: "600",
  },
  brandNameLarge: {
    fontSize: 18,
  },
  copyrightText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "400",
    marginTop: SPACING.xs,
  },
  copyrightTextMobile: {
    textAlign: "center",
    fontSize: 12,
  },
  mobileDivider: {
    width: 60,
    height: 1,
    backgroundColor: COLORS.borderGray,
    marginVertical: SPACING.xs,
  },
  linksSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xxl,
  },
  linksSectionMobile: {
    flexDirection: "column",
    gap: SPACING.xs,
    alignItems: "center",
  },
  linksSectionTablet: {
    gap: SPACING.xl,
  },
  // 44px minimum touch target for accessibility (WCAG 2.1)
  linkPressable: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderRadius: 6,
    // Web-only transition for shadow
    ...(Platform.OS === "web" && {
      transition: "box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    } as any),
  },
  linkText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  linkTextHovered: {
    color: COLORS.primaryRed,
  },
  linkTextPressed: {
    opacity: 0.7,
  },
  linkUnderline: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    height: 2,
    backgroundColor: COLORS.primaryRed,
    borderRadius: 1,
  },
  taglineContainer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    alignItems: "center",
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
  },
  taglineContainerMobile: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.base,
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryRed,
    opacity: 0.4,
  },
  taglineText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  taglineTextMobile: {
    fontSize: 11,
    textAlign: "center",
  },
});

export default FooterSection;
