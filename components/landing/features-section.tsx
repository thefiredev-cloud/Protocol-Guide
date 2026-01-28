/**
 * Features Section - Practical benefits for firefighter/paramedics
 *
 * Reframed for LA County firefighter audience:
 * - NO tech jargon (no "semantic search", "PWA", "deep linking")
 * - Speak their language: "on scene", "in the back", "during transport"
 * - Focus on practical problems they actually face
 * - Blue collar, no-nonsense tone
 */

import React, { useEffect, useRef, useState, memo } from "react";
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
import Svg, { Path, Circle, Rect } from "react-native-svg";

const COLORS = {
  bgSurface: "#1E293B",
  bgDark: "#0F172A",
  bgAccentRed: "#451a1a",
  bgAccentBlue: "#1e3a5f",
  bgAccentGreen: "#14532d",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  border: "#334155",
  borderLight: "#475569",
  primaryRed: "#EF4444",
  primaryRedLight: "#F87171",
  primaryBlue: "#3B82F6",
  primaryBlueLight: "#60A5FA",
  primaryGreen: "#22C55E",
  primaryGreenLight: "#4ADE80",
  shadowColor: "#000000",
};

// Check for reduced motion preference
const getReducedMotion = (): boolean => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  return false;
};

// SVG Icons - Simple, recognizable
function SearchIcon({ size = 28, color = COLORS.primaryRed }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2.5} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function WifiOffIcon({ size = 28, color = COLORS.primaryBlue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h.01" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5.06 12.68a10 10 0 0 1 13.88 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M1.59 9.25a14 14 0 0 1 20.82 0" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      {/* Offline slash */}
      <Path d="M2 2l20 20" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function CalculatorIcon({ size = 28, color = COLORS.primaryGreen }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="7" y="5" width="10" height="4" rx="1" fill={color} opacity={0.3} stroke={color} strokeWidth={1} />
      <Circle cx="8" cy="13" r="1" fill={color} />
      <Circle cx="12" cy="13" r="1" fill={color} />
      <Circle cx="16" cy="13" r="1" fill={color} />
      <Circle cx="8" cy="17" r="1" fill={color} />
      <Circle cx="12" cy="17" r="1" fill={color} />
      <Circle cx="16" cy="17" r="1" fill={color} />
    </Svg>
  );
}

function LinkIcon({ size = 28, color = COLORS.primaryBlue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type FeatureIconType = "search" | "offline" | "calculator" | "link";

interface Feature {
  icon: FeatureIconType;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

// Features reframed for firefighters - no tech jargon
const features: Feature[] = [
  {
    icon: "search",
    title: "Type it. Find it.",
    description:
      "Type \"chest pain\" or \"peds seizure\" and get the protocol. No more flipping through the binder. No more guessing page numbers.",
    iconBg: COLORS.bgAccentRed,
    iconColor: COLORS.primaryRed,
    accentColor: COLORS.primaryRed,
  },
  {
    icon: "offline",
    title: "Works without signal.",
    description:
      "Dead zone on the 14? Middle of Angeles Forest? Doesn't matter. Everything's on your phone. No bars, no problem.",
    iconBg: COLORS.bgAccentBlue,
    iconColor: COLORS.primaryBlue,
    accentColor: COLORS.primaryBlue,
  },
  {
    icon: "calculator",
    title: "Peds doses in seconds.",
    description:
      "Stop doing math on peds calls. Enter the weight, get the dose in mL. Epi, atropine, whatever—it's already calculated.",
    iconBg: COLORS.bgAccentGreen,
    iconColor: COLORS.primaryGreen,
    accentColor: COLORS.primaryGreen,
  },
  {
    icon: "link",
    title: "One tap from ImageTrend.",
    description:
      "Writing your ePCR and need a protocol? One tap. Get the reference, get back to documentation. No switching apps.",
    iconBg: COLORS.bgAccentBlue,
    iconColor: COLORS.primaryBlue,
    accentColor: COLORS.primaryBlue,
  },
];

function FeatureIcon({ type, color }: { type: FeatureIconType; color: string }) {
  switch (type) {
    case "search":
      return <SearchIcon color={color} />;
    case "offline":
      return <WifiOffIcon color={color} />;
    case "calculator":
      return <CalculatorIcon color={color} />;
    case "link":
      return <LinkIcon color={color} />;
  }
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
  isVisible: boolean;
  isMobile: boolean;
  isTablet?: boolean;
}

const FeatureCard = memo(function FeatureCard({ feature, index, isVisible, isMobile, isTablet = false }: FeatureCardProps) {
  const progress = useSharedValue(0);
  const hoverScale = useSharedValue(1);
  const hoverElevation = useSharedValue(0);
  const borderGlow = useSharedValue(0);
  const prefersReducedMotion = getReducedMotion();

  useEffect(() => {
    if (isVisible) {
      if (prefersReducedMotion) {
        progress.value = 1;
      } else {
        progress.value = withDelay(
          index * 100,
          withTiming(1, {
            duration: 500,
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
        { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
        { scale: hoverScale.value },
      ],
    };
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    const elevation = interpolate(hoverElevation.value, [0, 1], [2, 12]);
    return {
      shadowOpacity: interpolate(hoverElevation.value, [0, 1], [0.08, 0.18]),
      shadowRadius: elevation,
      shadowOffset: { width: 0, height: interpolate(hoverElevation.value, [0, 1], [2, 8]) },
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

  const handleHoverIn = () => {
    if (Platform.OS === "web" && !prefersReducedMotion) {
      hoverScale.value = withSpring(1.02, { damping: 18, stiffness: 350 });
      hoverElevation.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      borderGlow.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === "web") {
      hoverScale.value = withSpring(1, { damping: 18, stiffness: 350 });
      hoverElevation.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
      borderGlow.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    }
  };

  // Responsive sizing
  const cardWidth = isMobile ? "100%" : isTablet ? "48%" : "23%";
  const cardMinWidth = isMobile ? undefined : isTablet ? 280 : 240;
  const cardMaxWidth = isMobile ? undefined : isTablet ? 340 : 280;

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={{
        width: cardWidth as any,
        minWidth: cardMinWidth,
        maxWidth: cardMaxWidth,
      }}
      accessibilityLabel={`${feature.title}: ${feature.description}`}
    >
      <Animated.View
        style={[
          {
            backgroundColor: COLORS.bgSurface,
            borderRadius: 16,
            padding: isMobile ? 20 : 24,
            shadowColor: COLORS.shadowColor,
            shadowOpacity: 0.08,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            height: "100%",
          },
          animatedCardStyle,
          animatedShadowStyle,
          animatedBorderStyle,
        ]}
      >
        {/* Icon Container */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: feature.iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <FeatureIcon type={feature.icon} color={feature.iconColor} />
        </View>

        {/* Title */}
        <Text
          style={{
            color: COLORS.textWhite,
            fontSize: isMobile ? 18 : 19,
            fontWeight: "700",
            marginBottom: 10,
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
            lineHeight: isMobile ? 21 : 23,
            letterSpacing: 0.1,
          }}
        >
          {feature.description}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export const FeaturesSection = memo(function FeaturesSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

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
        { threshold: 0.15 }
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
      transform: [{ translateY: interpolate(headerProgress.value, [0, 1], [15, 0]) }],
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
          maxWidth: 1200,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* Section Header */}
        <Animated.View style={animatedHeaderStyle}>
          <Text
            style={{
              color: COLORS.textWhite,
              fontSize: isMobile ? 28 : isTablet ? 32 : 36,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: isMobile ? 10 : 12,
              letterSpacing: -0.5,
            }}
            accessibilityRole="header"
          >
            Built for the back of the rig.
          </Text>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: isMobile ? 16 : isTablet ? 17 : 18,
              textAlign: "center",
              marginBottom: isMobile ? 36 : isTablet ? 44 : 56,
              lineHeight: isMobile ? 24 : isTablet ? 26 : 28,
              maxWidth: isMobile ? "100%" : 520,
              alignSelf: "center",
            }}
          >
            Not another app built by devs who&apos;ve never run a call.{"\n"}
            This one&apos;s different.
          </Text>
        </Animated.View>

        {/* Feature Cards - 1 col mobile, 2 col tablet, 4 col desktop */}
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 16 : isTablet ? 20 : 24,
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
              isTablet={isTablet}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

export default FeaturesSection;
