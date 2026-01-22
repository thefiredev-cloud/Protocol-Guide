/**
 * Time Calculator Section - Interactive slider showing time savings per shift
 *
 * Features:
 * - Smooth animated number transitions with count-up effect
 * - Enhanced slider with larger touch targets (48px) and glow effects
 * - Subtle green glow on reclaimed time number
 * - Optimized dark theme with high contrast
 * - Mobile-optimized slider with haptic feedback
 */

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { View, Text, Platform, Animated, StyleSheet, useWindowDimensions, Easing } from "react-native";

const COLORS = {
  darkNavy: "#0A0F1C", // Deeper navy for better contrast
  cardBg: "#151D2E", // Slightly lighter card background
  textWhite: "#F8FAFC", // Softer white for reduced eye strain
  textGray: "#94A3B8",
  textGrayLight: "#CBD5E1", // Lighter gray for better readability
  textGreen: "#34D399", // Brighter green for visibility
  textGreenGlow: "#10B981",
  primaryRed: "#DC2626", // Brighter red for slider
  primaryRedGlow: "#EF4444",
  borderGray: "#2D3A50", // Slightly lighter border for contrast
  trackBg: "#1E293B",
};

const MANUAL_TIME = 90; // seconds per lookup
const PROTOCOL_GUIDE_TIME = 2.3; // seconds per lookup

// Animated number component with smooth count-up transitions
function AnimatedNumber({
  value,
  suffix,
  style,
  glowColor,
}: {
  value: number;
  suffix: string;
  style: any;
  glowColor?: string;
}) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const [displayValue, setDisplayValue] = useState(value.toFixed(1));

  useEffect(() => {
    // Smooth eased animation to new value
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Update display value with listener for real-time count-up
    const listenerId = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(v.toFixed(1));
    });

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [value, animatedValue]);

  const textStyle = [
    style,
    glowColor && Platform.OS === "web"
      ? {
          textShadowColor: glowColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 24,
        }
      : null,
  ];

  return (
    <Animated.Text style={textStyle}>
      {displayValue} {suffix}
    </Animated.Text>
  );
}

// Custom slider styles for web with larger touch targets
const sliderStyles = Platform.OS === "web" ? `
  .time-calculator-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 64px;
    background: transparent;
    cursor: pointer;
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
    z-index: 10;
  }
  .time-calculator-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${COLORS.primaryRed};
    border: 4px solid ${COLORS.textWhite};
    box-shadow:
      0 0 24px ${COLORS.primaryRedGlow}90,
      0 4px 16px rgba(0,0,0,0.5),
      0 0 0 0 ${COLORS.primaryRedGlow}40;
    cursor: grab;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .time-calculator-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow:
      0 0 32px ${COLORS.primaryRedGlow}CC,
      0 6px 20px rgba(0,0,0,0.6),
      0 0 0 8px ${COLORS.primaryRedGlow}20;
  }
  .time-calculator-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.08);
    box-shadow:
      0 0 28px ${COLORS.primaryRedGlow}FF,
      0 3px 12px rgba(0,0,0,0.6),
      0 0 0 4px ${COLORS.primaryRedGlow}30;
  }
  .time-calculator-slider::-moz-range-thumb {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${COLORS.primaryRed};
    border: 4px solid ${COLORS.textWhite};
    box-shadow:
      0 0 24px ${COLORS.primaryRedGlow}90,
      0 4px 16px rgba(0,0,0,0.5);
    cursor: grab;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .time-calculator-slider::-moz-range-thumb:hover {
    transform: scale(1.15);
    box-shadow:
      0 0 32px ${COLORS.primaryRedGlow}CC,
      0 6px 20px rgba(0,0,0,0.6);
  }
  .time-calculator-slider::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 4px;
    background: transparent;
  }
  .time-calculator-slider::-moz-range-track {
    height: 8px;
    border-radius: 4px;
    background: transparent;
  }
  .time-calculator-slider:focus {
    outline: none;
  }
  .time-calculator-slider:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 6px ${COLORS.primaryRed}50,
      0 0 24px ${COLORS.primaryRedGlow}90,
      0 4px 16px rgba(0,0,0,0.5);
  }

  /* Mobile touch optimization */
  @media (hover: none) and (pointer: coarse) {
    .time-calculator-slider {
      height: 80px;
    }
    .time-calculator-slider::-webkit-slider-thumb {
      width: 48px;
      height: 48px;
    }
    .time-calculator-slider::-moz-range-thumb {
      width: 48px;
      height: 48px;
    }
  }
` : "";

export function TimeCalculatorSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [calls, setCalls] = useState(10);
  const [isVisible, setIsVisible] = useState(false);

  const timeWasted = (calls * MANUAL_TIME) / 60; // minutes
  const timeReclaimed = (calls * (MANUAL_TIME - PROTOCOL_GUIDE_TIME)) / 60; // minutes
  const sliderPercentage = ((calls - 1) / 19) * 100;

  // Scroll-triggered entrance animation
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const sectionTranslateY = useRef(new Animated.Value(30)).current;

  // Haptic feedback on slider change (mobile)
  const handleSliderChange = (newValue: number) => {
    setCalls(newValue);

    // Trigger haptic feedback on mobile if available
    if (Platform.OS !== "web" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(5);
    }
  };

  // Inject styles on web
  useEffect(() => {
    if (Platform.OS === "web" && sliderStyles) {
      const styleId = "time-calculator-slider-styles";
      if (!document.getElementById(styleId)) {
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.textContent = sliderStyles;
        document.head.appendChild(styleElement);
      }
    }
  }, []);

  // Scroll-triggered animation
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
                  duration: 700,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.spring(sectionTranslateY, {
                  toValue: 0,
                  friction: 9,
                  tension: 45,
                  useNativeDriver: true,
                }),
              ]).start();
            }
          });
        },
        { threshold: 0.15 }
      );

      const timer = setTimeout(() => {
        const element = document.getElementById("impact-section");
        if (element) observer.observe(element);
      }, 100);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(sectionOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(sectionTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [sectionOpacity, sectionTranslateY, isVisible]);

  return (
    <View style={[styles.container, isMobile && { paddingVertical: 48 }]} nativeID="impact-section">
      <Animated.View
        style={[
          styles.content,
          isMobile && { paddingHorizontal: 16 },
          { opacity: sectionOpacity, transform: [{ translateY: sectionTranslateY }] },
        ]}
      >
        {/* Title */}
        <Text style={[styles.title, isMobile && { fontSize: 26 }]} accessibilityRole="header">
          What is your time worth?
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, isMobile && { fontSize: 15, marginBottom: 32 }]}>
          Every second spent looking at a screen is a second not looking at your patient. Calculate
          the impact of switching to Protocol Guide for your department.
        </Text>

        {/* Slider Section */}
        <View style={styles.sliderSection}>
          <Text style={styles.sliderLabel}>Calls per Shift (Avg)</Text>

          {/* Slider Track Container */}
          <View style={[styles.sliderContainer, isMobile && { height: 80 }]}>
            {/* Track Background */}
            <View style={styles.trackBackground} />

            {/* Active Track with gradient glow effect */}
            <View
              style={[
                styles.trackActive,
                {
                  width: `${sliderPercentage}%`,
                },
                Platform.OS === "web" && {
                  boxShadow: `0 0 16px ${COLORS.primaryRedGlow}70, 0 0 4px ${COLORS.primaryRedGlow}40`,
                },
              ]}
            />

            {/* Custom Slider Input (web) */}
            {Platform.OS === "web" ? (
              <input
                type="range"
                min={1}
                max={20}
                value={calls}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="time-calculator-slider"
                aria-label="Number of calls per shift"
                aria-valuemin={1}
                aria-valuemax={20}
                aria-valuenow={calls}
                aria-valuetext={`${calls} calls per shift`}
              />
            ) : null}

            {/* Visual Thumb (hidden on web, shown on native) */}
            {Platform.OS !== "web" && (
              <View
                style={[
                  styles.thumb,
                  isMobile && styles.thumbMobile,
                  {
                    left: `${sliderPercentage}%`,
                  },
                ]}
              />
            )}
          </View>

          {/* Scale Labels */}
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>1</Text>
            <Text style={styles.scaleLabel}>5</Text>
            <Text style={styles.scaleLabel}>10</Text>
            <Text style={styles.scaleLabel}>15</Text>
            <Text style={styles.scaleLabel}>20</Text>
          </View>

          {/* Current Value Badge */}
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>{calls} Calls</Text>
          </View>
        </View>

        {/* Results Card */}
        <View
          style={[styles.resultsCard, isMobile && { padding: 20 }]}
          accessibilityRole="summary"
          accessibilityLabel={`Time calculator results: ${timeWasted.toFixed(1)} minutes wasted per shift with current methods, ${timeReclaimed.toFixed(1)} minutes reclaimed with Protocol Guide`}
        >
          {/* Time Wasted */}
          <View style={styles.resultSection}>
            <Text style={styles.resultLabel}>Time Wasted (Current)</Text>
            <AnimatedNumber
              value={timeWasted}
              suffix="min"
              style={[styles.resultValueWasted, isMobile && { fontSize: 36 }]}
            />
            <Text style={styles.resultDescription}>per shift staring at PDFs</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Time Reclaimed */}
          <View style={styles.resultSection}>
            <Text style={styles.resultLabelGreen}>Time Reclaimed (Protocol Guide)</Text>
            <AnimatedNumber
              value={timeReclaimed}
              suffix="min"
              style={[styles.resultValueReclaimed, isMobile && { fontSize: 36 }]}
              glowColor={COLORS.textGreenGlow}
            />
            <Text style={styles.resultDescription}>per shift returned to patient care</Text>
          </View>

          {/* Per Year Calculation */}
          <View style={[styles.yearlySection, isMobile && { flexDirection: "column", alignItems: "flex-start", gap: 8 }]}>
            <Text style={styles.yearlyLabel}>Per Year (260 shifts)</Text>
            <Text style={[styles.yearlyValue, Platform.OS === "web" && {
              textShadowColor: COLORS.textGreenGlow,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 12,
            }]}>
              {((timeReclaimed * 260) / 60).toFixed(0)} hours saved
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.darkNavy,
    paddingVertical: 72,
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textGray,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 26,
  },
  sliderSection: {
    marginBottom: 40,
  },
  sliderLabel: {
    color: COLORS.textGrayLight,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sliderContainer: {
    position: "relative",
    height: 64,
    justifyContent: "center",
  },
  trackBackground: {
    height: 8,
    backgroundColor: COLORS.trackBg,
    borderRadius: 4,
    width: "100%",
  },
  trackActive: {
    position: "absolute",
    height: 8,
    backgroundColor: COLORS.primaryRed,
    borderRadius: 4,
  },
  thumb: {
    position: "absolute",
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryRed,
    borderWidth: 4,
    borderColor: COLORS.textWhite,
    // Shadow for native
    shadowColor: COLORS.primaryRedGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  thumbMobile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: -24,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  scaleLabel: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: "600",
  },
  valueBadge: {
    alignSelf: "center",
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  valueBadgeText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resultsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  resultSection: {
    marginBottom: 24,
  },
  resultLabel: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  resultLabelGreen: {
    color: COLORS.textGreen,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  resultValueWasted: {
    color: COLORS.textWhite,
    fontSize: 44,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  resultValueReclaimed: {
    color: COLORS.textGreen,
    fontSize: 44,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  resultDescription: {
    color: COLORS.textGray,
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderGray,
    marginBottom: 24,
  },
  yearlySection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearlyLabel: {
    color: COLORS.textGrayLight,
    fontSize: 13,
    fontWeight: "600",
  },
  yearlyValue: {
    color: COLORS.textGreen,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default TimeCalculatorSection;
