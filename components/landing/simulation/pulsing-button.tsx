/**
 * PulsingButton - Animated CTA button with continuous pulse effect
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { COLORS } from "./constants";

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

const styles = StyleSheet.create({
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
});
