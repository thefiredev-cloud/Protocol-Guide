/**
 * Footer Section - Simple, professional footer
 *
 * Redesigned for firefighter audience:
 * - "Built by firefighters, for firefighters" messaging
 * - Clean, no-nonsense design
 * - Essential links only
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
  Animated,
} from "react-native";
import { router } from "expo-router";
import { ProtocolGuideLogo } from "@/components/icons/protocol-guide-logo";

const COLORS = {
  bgSurface: "#1E293B",
  bgDark: "#0F172A",
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  textMuted: "#94A3B8",
  textWhite: "#F1F5F9",
  border: "#334155",
};

interface FooterLinkProps {
  label: string;
  onPress: () => void;
}

function FooterLink({ label, onPress }: FooterLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  const webTransitionStyle: TextStyle = Platform.OS === "web"
    ? ({ transition: "color 0.2s ease" } as unknown as TextStyle)
    : {};

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={styles.linkPressable}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.linkText,
          isHovered && styles.linkTextHovered,
          webTransitionStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FooterSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const [isVisible, setIsVisible] = useState(false);
  const sectionOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isVisible) {
              setIsVisible(true);
              Animated.timing(sectionOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }).start();
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
      Animated.timing(sectionOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [sectionOpacity, isVisible]);

  const handleNavigation = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  return (
    <View style={styles.container} nativeID="footer-section">
      {/* Top border accent */}
      <View style={styles.topBorder} />

      <Animated.View
        style={[
          styles.innerContainer,
          isMobile && styles.innerContainerMobile,
          { opacity: sectionOpacity },
        ]}
      >
        <View
          style={[
            styles.contentWrapper,
            isMobile && styles.contentWrapperMobile,
          ]}
        >
          {/* Logo + Tagline */}
          <View style={[styles.brandSection, isMobile && styles.brandSectionMobile]}>
            <View style={styles.logoContainer}>
              <ProtocolGuideLogo
                size={isMobile ? 28 : 32}
                color={COLORS.primaryRed}
              />
              <Text style={[styles.brandName, isMobile && styles.brandNameMobile]}>
                Protocol Guide
              </Text>
            </View>
            <Text style={[styles.tagline, isMobile && styles.taglineMobile]}>
              Built by firefighters, for firefighters.
            </Text>
          </View>

          {/* Links */}
          <View
            style={[
              styles.linksSection,
              isMobile && styles.linksSectionMobile,
            ]}
            accessibilityLabel="Footer navigation"
          >
            <FooterLink
              label="Privacy"
              onPress={() => handleNavigation("/privacy")}
            />
            <FooterLink
              label="Terms"
              onPress={() => handleNavigation("/terms")}
            />
            <FooterLink
              label="Contact"
              onPress={() => handleNavigation("/contact")}
            />
            <FooterLink
              label="Feedback"
              onPress={() => handleNavigation("/feedback")}
            />
          </View>
        </View>

        {/* Copyright */}
        <View style={[styles.copyrightSection, isMobile && styles.copyrightSectionMobile]}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} Protocol Guide
          </Text>
          <Text style={styles.copyrightDivider}>•</Text>
          <Text style={styles.copyrightText}>
            Not affiliated with LA County Fire Department
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgDark,
  },
  topBorder: {
    height: 2,
    backgroundColor: COLORS.primaryRed,
    opacity: 0.5,
  },
  innerContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: COLORS.bgSurface,
  },
  innerContainerMobile: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  contentWrapper: {
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  contentWrapperMobile: {
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    marginBottom: 24,
  },
  brandSection: {
    flexDirection: "column",
    gap: 8,
  },
  brandSectionMobile: {
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  brandNameMobile: {
    fontSize: 16,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  taglineMobile: {
    textAlign: "center",
  },
  linksSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  linksSectionMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  linkPressable: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  linkTextHovered: {
    color: COLORS.primaryRed,
  },
  copyrightSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
  },
  copyrightSectionMobile: {
    flexDirection: "column",
    gap: 4,
    paddingTop: 20,
  },
  copyrightText: {
    color: COLORS.textMuted,
    fontSize: 12,
    opacity: 0.7,
  },
  copyrightDivider: {
    color: COLORS.textMuted,
    fontSize: 12,
    opacity: 0.5,
  },
});

export default FooterSection;
