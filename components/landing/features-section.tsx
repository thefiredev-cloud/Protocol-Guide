/**
 * Features Section - Three key features: Instant Retrieval, 100% Offline, Always Current
 * Enhanced with staggered animations, gradient borders, sophisticated shadows, and polished hover effects
 *
 * Accessibility: Semantic headings, reduced-motion support, descriptive labels
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, RadialGradient } from "react-native-svg";

const COLORS = {
  bgSurface: "#1E293B",
  bgDark: "#0F172A",
  bgAccentRed: "#451a1a",
  bgAccentBlue: "#1e3a5f",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  border: "#334155",
  borderLight: "#475569",
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  primaryBlue: "#3B82F6",
  primaryBlueLight: "#60A5FA",
  shadowColor: "#000000",
  accentGlow: "#F87171",
};

// Check for reduced motion preference
const getReducedMotion = (): boolean => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  return false;
};

// SVG Icon Components with enhanced visual detail
function BoltIcon({ size = 28, color = COLORS.primaryRed }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.primaryRedLight} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill="url(#boltGrad)"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SignalIcon({ size = 28, color = COLORS.primaryBlue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <RadialGradient id="signalGrad" cx="50%" cy="30%">
          <Stop offset="0%" stopColor={COLORS.primaryBlueLight} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <G stroke={color} strokeWidth={2} strokeLinecap="round">
        <Path d="M12 20v-4" opacity={0.4} />
        <Path d="M8 20v-8" opacity={0.6} />
        <Path d="M16 20v-8" opacity={0.6} />
        <Path d="M4 20v-12" opacity={0.8} />
        <Path d="M20 20v-12" opacity={0.8} />
      </G>
      <Circle cx="12" cy="6" r="3" fill="url(#signalGrad)" />
      <Path
        d="M8.5 3.5a5 5 0 0 1 7 0M6 1a8 8 0 0 1 12 0"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
    </Svg>
  );
}

function RefreshIcon({ size = 28, color = COLORS.primaryBlue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="refreshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.primaryBlueLight} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={COLORS.primaryRed} />
        </LinearGradient>
      </Defs>
      <Path
        d="M21 12a9 9 0 0 1-15.36 6.36L3 16"
        stroke="url(#refreshGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 12a9 9 0 0 1 15.36-6.36L21 8"
        stroke="url(#refreshGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 21v-5h5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M21 3v5h-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

type FeatureIconType = "bolt" | "signal" | "refresh";

interface Feature {
  icon: FeatureIconType;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  gradientStart: string;
  gradientEnd: string;
}

const features: Feature[] = [
  {
    icon: "bolt",
    title: "Instant Retrieval",
    description:
      "Don't memorize page numbers. Type 'Pediatric seizure' or 'Chest pain' and get the exact protocol card instantly.",
    iconBg: COLORS.bgAccentRed,
    iconColor: COLORS.primaryRed,
    accentColor: COLORS.primaryRed,
    gradientStart: COLORS.bgAccentRed,
    gradientEnd: COLORS.bgSurface,
  },
  {
    icon: "signal",
    title: "100% Offline",
    description:
      "Cell towers go down. Your protocols shouldn't. The entire database lives locally on your device. Zero latency.",
    iconBg: COLORS.bgAccentBlue,
    iconColor: COLORS.primaryBlue,
    accentColor: COLORS.primaryBlue,
    gradientStart: COLORS.bgAccentBlue,
    gradientEnd: COLORS.bgSurface,
  },
  {
    icon: "refresh",
    title: "Always Current",
    description:
      "No more outdated binders. When your Medical Director updates a protocol, it pushes to every device instantly.",
    iconBg: COLORS.bgAccentBlue,
    iconColor: COLORS.primaryBlue,
    accentColor: COLORS.primaryBlue,
    gradientStart: COLORS.bgAccentBlue,
    gradientEnd: COLORS.bgSurface,
  },
];

function FeatureIcon({ type, color }: { type: FeatureIconType; color: string }) {
  switch (type) {
    case "bolt":
      return <BoltIcon color={color} />;
    case "signal":
      return <SignalIcon color={color} />;
    case "refresh":
      return <RefreshIcon color={color} />;
  }
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
  isVisible: boolean;
  isMobile: boolean;
}

function FeatureCard({ feature, index, isVisible, isMobile }: FeatureCardProps) {
  const progress = useSharedValue(0);
  const hoverScale = useSharedValue(1);
  const hoverElevation = useSharedValue(0);
  const borderGlow = useSharedValue(0);
  const iconGlow = useSharedValue(0);
  const prefersReducedMotion = getReducedMotion();

  useEffect(() => {
    if (isVisible) {
      if (prefersReducedMotion) {
        progress.value = 1;
      } else {
        progress.value = withDelay(
          index * 150,
          withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.cubic),
          })
        );
      }
    }
  }, [isVisible, index, progress, prefersReducedMotion]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [40, 0]) },
        { scale: hoverScale.value },
      ],
    };
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    const elevation = interpolate(hoverElevation.value, [0, 1], [2, 16]);
    return {
      shadowOpacity: interpolate(hoverElevation.value, [0, 1], [0.08, 0.2]),
      shadowRadius: elevation,
      shadowOffset: { width: 0, height: interpolate(hoverElevation.value, [0, 1], [2, 12]) },
    };
  });

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        borderGlow.value,
        [0, 1],
        [COLORS.border, feature.accentColor]
      ),
      borderWidth: interpolate(borderGlow.value, [0, 1], [1, 2]),
    };
  });

  const animatedIconContainer = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(iconGlow.value, [0, 1], [1, 1.05]) }],
      shadowOpacity: interpolate(iconGlow.value, [0, 1], [0.2, 0.4]),
      shadowRadius: interpolate(iconGlow.value, [0, 1], [8, 16]),
    };
  });

  const animatedAccentLine = useAnimatedStyle(() => {
    return {
      width: interpolate(borderGlow.value, [0, 1], [40, 60]),
      opacity: interpolate(borderGlow.value, [0, 1], [0.6, 1]),
    };
  });

  const handleHoverIn = () => {
    if (Platform.OS === "web" && !prefersReducedMotion) {
      hoverScale.value = withSpring(1.03, { damping: 18, stiffness: 350 });
      hoverElevation.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      borderGlow.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      iconGlow.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === "web") {
      hoverScale.value = withSpring(1, { damping: 18, stiffness: 350 });
      hoverElevation.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
      borderGlow.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      iconGlow.value = withSpring(0, { damping: 15, stiffness: 300 });
    }
  };

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={isMobile ? { width: "100%" } : { flex: 1, minWidth: 280, maxWidth: 320 }}
      accessibilityLabel={`${feature.title}: ${feature.description}`}
    >
      <Animated.View
        style={[
          {
            backgroundColor: COLORS.bgSurface,
            borderRadius: 20,
            padding: isMobile ? 20 : 28,
            shadowColor: COLORS.shadowColor,
            shadowOpacity: 0.08,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          },
          animatedCardStyle,
          animatedShadowStyle,
          animatedBorderStyle,
        ]}
      >
        {/* Subtle gradient background overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "40%",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: feature.gradientStart,
            opacity: 0.3,
          }}
        />

        {/* Icon Container with enhanced glow */}
        <Animated.View
          style={[
            {
              width: isMobile ? 56 : 64,
              height: isMobile ? 56 : 64,
              borderRadius: 16,
              backgroundColor: feature.iconBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: isMobile ? 16 : 24,
              shadowColor: feature.iconColor,
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              borderWidth: 1,
              borderColor: feature.accentColor + "10",
            },
            animatedIconContainer,
          ]}
        >
          <FeatureIcon type={feature.icon} color={feature.iconColor} />
        </Animated.View>

        {/* Animated accent line with gradient */}
        <Animated.View
          style={[
            {
              height: 3,
              backgroundColor: feature.accentColor,
              borderRadius: 2,
              marginBottom: isMobile ? 12 : 16,
            },
            animatedAccentLine,
          ]}
        />

        {/* Title */}
        <Text
          style={{
            color: COLORS.textWhite,
            fontSize: isMobile ? 20 : 22,
            fontWeight: "700",
            marginBottom: isMobile ? 8 : 12,
            letterSpacing: -0.3,
          }}
        >
          {feature.title}
        </Text>

        {/* Description */}
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: isMobile ? 14 : 15,
            lineHeight: isMobile ? 22 : 24,
            letterSpacing: 0.1,
          }}
        >
          {feature.description}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FeaturesSection() {
  const { width } = useWindowDimensions();
  // Three-tier responsive breakpoints
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<View>(null);
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isVisible) {
              setIsVisible(true);
              headerProgress.value = withTiming(1, {
                duration: 500,
                easing: Easing.out(Easing.cubic),
              });
            }
          });
        },
        { threshold: 0.2 }
      );

      const timer = setTimeout(() => {
        const element = document.getElementById("features-section");
        if (element) {
          observer.observe(element);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
      headerProgress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  }, [headerProgress, isVisible]);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: headerProgress.value,
      transform: [{ translateY: interpolate(headerProgress.value, [0, 1], [20, 0]) }],
    };
  });

  return (
    <View
      ref={sectionRef}
      nativeID="features-section"
      style={{
        backgroundColor: COLORS.bgDark,
        paddingVertical: isMobile ? 48 : isTablet ? 64 : 80,
      }}
    >
      <View
        style={{
          paddingHorizontal: isMobile ? 16 : isTablet ? 24 : 32,
          maxWidth: 1100,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* Section Badge */}
        <Animated.View
          style={[
            {
              alignSelf: "center",
              marginBottom: isMobile ? 12 : 16,
            },
            animatedHeaderStyle,
          ]}
        >
          <View
            style={{
              backgroundColor: COLORS.bgAccentRed,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: COLORS.primaryRed + "20",
              shadowColor: COLORS.primaryRed,
              shadowOpacity: 0.1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text
              style={{
                color: COLORS.primaryRed,
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Key Features
            </Text>
          </View>
        </Animated.View>

        {/* Section Title - Responsive */}
        <Animated.Text
          style={[
            {
              color: COLORS.textWhite,
              fontSize: isMobile ? 28 : isTablet ? 32 : 36,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: isMobile ? 12 : isTablet ? 14 : 16,
              letterSpacing: -0.5,
            },
            animatedHeaderStyle,
          ]}
          accessibilityRole="header"
        >
          Engineered for the Field
        </Animated.Text>

        {/* Subtitle - Responsive */}
        <Animated.Text
          style={[
            {
              color: COLORS.textMuted,
              fontSize: isMobile ? 16 : isTablet ? 17 : 18,
              textAlign: "center",
              marginBottom: isMobile ? 32 : isTablet ? 44 : 56,
              lineHeight: isMobile ? 24 : isTablet ? 26 : 28,
              maxWidth: isMobile ? "100%" : 500,
              alignSelf: "center",
            },
            animatedHeaderStyle,
          ]}
        >
          We removed the bloat. You get exactly what you need when the tones drop.
        </Animated.Text>

        {/* Feature Cards - Stack on mobile */}
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 16 : 28,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              isVisible={isVisible}
              isMobile={isMobile}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default FeaturesSection;
