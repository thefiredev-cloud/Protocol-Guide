/**
 * Simulation Section - Animated bar chart comparing manual search vs Protocol Guide
 * Features: pulsing CTA, spring animations, celebration effects, hover cards
 *
 * Accessibility: Reduced-motion support, ARIA labels, keyboard accessible button
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";

// Color Palette - Dark Theme
const COLORS = {
  primaryRed: "#EF4444",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  textMutedLight: "#CBD5E1",
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  border: "#334155",
  chartYellow: "#F59E0B",
  celebrationGreen: "#10B981",
};

// Timing Constants
const MANUAL_SEARCH_TIME = 90;
const PROTOCOL_GUIDE_TIME = 2.3;
const MAX_TIME = 95;

type SimulationState = "idle" | "running" | "complete";

export function SimulationSection() {
  const [state, setState] = useState<SimulationState>("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  const manualWidth = useRef(new Animated.Value(0)).current;
  const protocolWidth = useRef(new Animated.Value(0)).current;
  const protocolBounce = useRef(new Animated.Value(1)).current;
  const completeBadgeScale = useRef(new Animated.Value(0)).current;

  const resetAnimation = useCallback(() => {
    manualWidth.setValue(0);
    protocolWidth.setValue(0);
    protocolBounce.setValue(1);
    completeBadgeScale.setValue(0);
    setShowCelebration(false);
    setState("idle");
  }, [manualWidth, protocolWidth, protocolBounce, completeBadgeScale]);

  const runSimulation = useCallback(() => {
    if (state === "complete") {
      resetAnimation();
      return;
    }

    setState("running");

    // Protocol Guide finishes fast with enhanced spring bounce
    Animated.sequence([
      Animated.timing(protocolWidth, {
        toValue: (PROTOCOL_GUIDE_TIME / MAX_TIME) * 100,
        duration: 200,
        easing: Easing.bezier(0.22, 1, 0.36, 1), // Enhanced easing curve
        useNativeDriver: false,
      }),
      // Subtle overshoot bounce
      Animated.spring(protocolBounce, {
        toValue: 1.08,
        friction: 4,
        tension: 250,
        useNativeDriver: true,
      }),
      // Settle back with gentle spring
      Animated.spring(protocolBounce, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Manual search with smooth ease-out curve
    Animated.timing(manualWidth, {
      toValue: (MANUAL_SEARCH_TIME / MAX_TIME) * 100,
      duration: 4000,
      easing: Easing.bezier(0.33, 1, 0.68, 1), // Smoother ease-out
      useNativeDriver: false,
    }).start(() => {
      setState("complete");
      setShowCelebration(true);

      // Animate completion badge with playful bounce
      Animated.spring(completeBadgeScale, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }).start();

      // Hide celebration after delay
      setTimeout(() => setShowCelebration(false), 2500);
    });
  }, [state, resetAnimation, protocolWidth, protocolBounce, manualWidth, completeBadgeScale]);

  const getStatusText = () => {
    switch (state) {
      case "idle":
        return "Waiting to start...";
      case "running":
        return "Simulating cardiac arrest protocol lookup...";
      case "complete":
        return "Complete - Protocol Guide is 39x faster";
    }
  };

  const getButtonText = () => {
    return state === "complete" ? "Reset" : "Simulate Call";
  };

  return (
    <View style={styles.container}>
      {/* Background pattern overlay */}
      <View style={styles.backgroundPattern} />

      <View style={styles.content}>
        {/* Section Label */}
        <Text style={styles.sectionLabel}>Live Simulation</Text>

        {/* Title */}
        <Text style={styles.title}>The Cognitive Load Gap</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {`Click "Simulate Call" to visualize the time difference\nin a cardiac arrest scenario.`}
        </Text>

        {/* Chart Card */}
        <View style={styles.chartCard}>
          {/* Celebration Effect */}
          <CelebrationEffect visible={showCelebration} />

          {/* Header Row */}
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Protocol Retrieval Time</Text>
            <PulsingButton
              onPress={runSimulation}
              label={getButtonText()}
              isRunning={state === "running"}
            />
          </View>

          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Status: {getStatusText()}</Text>
            {state === "complete" && (
              <Animated.View
                style={[styles.completeBadge, { transform: [{ scale: completeBadgeScale }] }]}
              >
                <Text style={styles.completeBadgeText}>39x Faster</Text>
              </Animated.View>
            )}
          </View>

          {/* Manual Search Bar */}
          <View style={styles.barSection}>
            <Text style={styles.barLabel}>Manual Search</Text>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFillManual,
                  {
                    width: manualWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.barTime}>~{MANUAL_SEARCH_TIME}s average</Text>
          </View>

          {/* Protocol Guide Bar */}
          <View style={styles.barSection}>
            <Text style={styles.barLabel}>Protocol Guide</Text>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFillProtocol,
                  {
                    width: protocolWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    transform: [{ scaleY: protocolBounce }],
                  },
                ]}
              />
            </View>
            <Text style={styles.barTime}>~{PROTOCOL_GUIDE_TIME}s average</Text>
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxis}>
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 95].map((val) => (
              <Text key={val} style={styles.xAxisLabel}>
                {val}
              </Text>
            ))}
          </View>
          <Text style={styles.xAxisTitle}>Seconds Elapsed</Text>
        </View>

        {/* Comparison Cards */}
        <View style={styles.cardsRow}>
          <ComparisonCard
            label="Current Standard"
            value="~90s"
            description="PDF Scrolling / App Fumbling"
            variant="standard"
          />
          <ComparisonCard
            label="Protocol Guide"
            value="2.3s"
            description="Natural Language AI"
            variant="protocol"
          />
        </View>
      </View>
    </View>
  );
}

/**
 * PulsingButton - Animated CTA button with continuous pulse effect
 */
interface PulsingButtonProps {
  onPress: () => void;
  label: string;
  isRunning: boolean;
}

function PulsingButton({ onPress, label, isRunning }: PulsingButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (Platform.OS === "web") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Continuous pulse animation when idle
  useEffect(() => {
    if (!isRunning && label === "Simulate Call" && !reducedMotion) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      );

      pulseLoop.start();
      glowLoop.start();

      return () => {
        pulseLoop.stop();
        glowLoop.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isRunning, label, pulseAnim, glowAnim, reducedMotion]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isRunning}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isRunning }}
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }],
          },
        ]}
      >
        {/* Glow effect layer */}
        {label === "Simulate Call" && !reducedMotion && (
          <Animated.View
            style={[
              styles.buttonGlow,
              {
                opacity: glowOpacity,
              },
            ]}
          />
        )}

        <View
          style={[
            styles.button,
            isRunning && styles.buttonDisabled,
            label === "Simulate Call" && styles.buttonPrimary,
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              isRunning && styles.buttonTextDisabled,
              label === "Simulate Call" && styles.buttonTextPrimary,
            ]}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * CelebrationEffect - Confetti/flash effect on simulation completion
 */
interface CelebrationEffectProps {
  visible: boolean;
}

function CelebrationEffect({ visible }: CelebrationEffectProps) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Flash effect
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti burst
      const confettiAnimations = confettiAnims.map((anim, index) => {
        const angle = (index / confettiAnims.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;

        return Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: Math.sin(angle) * distance,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: Math.cos(angle) * distance,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 720 - 360,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.delay(400),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      Animated.parallel(confettiAnimations).start(() => {
        // Reset
        confettiAnims.forEach((anim) => {
          anim.translateY.setValue(0);
          anim.translateX.setValue(0);
          anim.rotate.setValue(0);
          anim.opacity.setValue(0);
        });
      });
    }
  }, [visible, flashAnim, confettiAnims]);

  const confettiColors = [
    COLORS.primaryRed,
    COLORS.celebrationGreen,
    COLORS.chartYellow,
    "#3B82F6",
    "#8B5CF6",
  ];

  return (
    <View style={styles.celebrationContainer} pointerEvents="none">
      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
          },
        ]}
      />

      {/* Confetti pieces */}
      {confettiAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: confettiColors[index % confettiColors.length],
              transform: [
                { translateY: anim.translateY },
                { translateX: anim.translateX },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ["-360deg", "360deg"],
                  }),
                },
              ],
              opacity: anim.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * ComparisonCard - Enhanced card with hover lift effect
 */
interface ComparisonCardProps {
  label: string;
  value: string;
  description: string;
  variant: "standard" | "protocol";
}

function ComparisonCard({ label, value, description, variant }: ComparisonCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const elevationAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === "web") {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.02,
          friction: 6,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(elevationAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === "web") {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(elevationAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        variant === "protocol" && styles.cardProtocol,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
      // @ts-expect-error - Web-only hover events
      onMouseEnter={handleHoverIn}
      onMouseLeave={handleHoverOut}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, variant === "protocol" && styles.cardValueProtocol]}>
        {value}
      </Text>
      <Text style={styles.cardDescription}>{description}</Text>

      {variant === "protocol" && (
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>AI Powered</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 48,
    position: "relative",
    overflow: "hidden",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
    ...(Platform.OS === "web"
      ? {
          backgroundImage: `radial-gradient(circle, ${COLORS.border} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }
      : {}),
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    position: "relative",
    zIndex: 1,
  },
  sectionLabel: {
    color: COLORS.primaryRed,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  chartCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  completeBadge: {
    backgroundColor: COLORS.celebrationGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  barSection: {
    marginBottom: 16,
  },
  barLabel: {
    color: COLORS.textWhite,
    fontSize: 13,
    marginBottom: 6,
  },
  barTrack: {
    height: 24,
    backgroundColor: COLORS.bgDark,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFillManual: {
    height: "100%",
    backgroundColor: COLORS.chartYellow,
    borderRadius: 4,
  },
  barFillProtocol: {
    height: "100%",
    backgroundColor: COLORS.primaryRed,
    borderRadius: 4,
  },
  barTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  xAxisLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  xAxisTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  // PulsingButton styles
  buttonContainer: {
    position: "relative",
  },
  buttonGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.primaryRed,
    borderRadius: 10,
    opacity: 0.3,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(8px)",
        }
      : {}),
  },
  button: {
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 110,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: COLORS.primaryRed,
    borderColor: COLORS.primaryRed,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
  },
  buttonTextDisabled: {
    color: COLORS.textMuted,
  },
  // CelebrationEffect styles
  celebrationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.celebrationGreen,
    borderRadius: 12,
  },
  confettiPiece: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  // ComparisonCard styles
  card: {
    flex: 1,
    backgroundColor: "COLORS.bgSurface",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
          transition: "box-shadow 0.2s ease",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  cardProtocol: {
    borderColor: COLORS.primaryRed,
    borderWidth: 2,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValue: {
    color: COLORS.textWhite,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardValueProtocol: {
    color: COLORS.primaryRed,
  },
  cardDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardBadgeText: {
    color: "COLORS.bgSurface",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default SimulationSection;
