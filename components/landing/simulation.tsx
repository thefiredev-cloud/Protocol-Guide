/**
 * Simulation Components - Reusable components for the simulation section
 * Features: pulsing button, celebration effects, comparison cards
 *
 * Accessibility: ARIA labels, reduced-motion support, keyboard accessible
 */

import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

// Color Palette
export const COLORS = {
  primaryRed: "#C41E3A",
  textBlack: "#1A1A1A",
  textGray: "#666666",
  textMuted: "#999999",
  bgLightGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  chartYellow: "#F59E0B",
  celebrationGreen: "#10B981",
};

// Timing Constants
export const MANUAL_SEARCH_TIME = 90;
export const PROTOCOL_GUIDE_TIME = 2.3;
export const MAX_TIME = 95;

// State type for the simulation
export type SimulationState = "idle" | "running" | "completed";

/**
 * PulsingButton - Animated CTA button with continuous pulse effect
 */
interface PulsingButtonProps {
  onPress: () => void;
  label: string;
  isRunning: boolean;
}

export function PulsingButton({ onPress, label, isRunning }: PulsingButtonProps) {
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

export function CelebrationEffect({ visible }: CelebrationEffectProps) {
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

export function ComparisonCard({ label, value, description, variant }: ComparisonCardProps) {
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

  const shadowOpacity = elevationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.card,
          variant === "protocol" && styles.cardProtocol,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
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
    color: COLORS.textBlack,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
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
    color: COLORS.textBlack,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardValueProtocol: {
    color: COLORS.primaryRed,
  },
  cardDescription: {
    color: COLORS.textGray,
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
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
