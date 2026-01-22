/**
 * AnimatedPressable - Button component with micro-interaction feedback
 * Provides scale, opacity, and shadow feedback on press
 *
 * Accessibility: Focus indicators, reduced-motion support
 */

import * as React from "react";
import { useRef, useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";

/** Check for reduced motion preference */
const getReducedMotion = (): boolean => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  return false;
};

/** Inject focus ring styles for web accessibility */
function injectFocusStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const styleId = "animated-pressable-focus-styles";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .focusable-pressable:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
    }
    .focusable-pressable:focus:not(:focus-visible) {
      box-shadow: none;
    }
    .focusable-nav-link:focus {
      outline: 2px solid #2563EB;
      outline-offset: 4px;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      .focusable-pressable,
      .focusable-nav-link {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  /** Style for the button container */
  style?: StyleProp<ViewStyle>;
  /** Scale factor when pressed (0-1, lower = more squish) */
  pressScale?: number;
  /** Opacity when pressed (0-1) */
  pressOpacity?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether to show shadow elevation change */
  elevationFeedback?: boolean;
  children: React.ReactNode;
}

export function AnimatedPressable({
  style,
  pressScale = 0.97,
  pressOpacity = 0.9,
  animationDuration = 100,
  elevationFeedback = true,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [prefersReducedMotion] = useState(getReducedMotion());

  // Inject focus styles on mount
  useEffect(() => {
    injectFocusStyles();
  }, []);

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
      if (prefersReducedMotion) {
        // Skip animation for reduced motion users
        scaleAnim.setValue(pressScale);
        opacityAnim.setValue(pressOpacity);
      } else {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: pressScale,
            duration: animationDuration,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: pressOpacity,
            duration: animationDuration,
            useNativeDriver: true,
          }),
        ]).start();
      }
      onPressIn?.(event);
    },
    [scaleAnim, opacityAnim, pressScale, pressOpacity, animationDuration, onPressIn, prefersReducedMotion]
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
      if (prefersReducedMotion) {
        // Skip animation for reduced motion users
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
      } else {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: true,
          }),
        ]).start();
      }
      onPressOut?.(event);
    },
    [scaleAnim, opacityAnim, animationDuration, onPressOut, prefersReducedMotion]
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * AnimatedNavLink - Animated navigation link with hover/press states
 * For nav items and text links
 */
interface AnimatedNavLinkProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AnimatedNavLink({
  style,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedNavLinkProps) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [prefersReducedMotion] = useState(getReducedMotion());

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
      if (prefersReducedMotion) {
        opacityAnim.setValue(0.6);
      } else {
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: true,
        }).start();
      }
      onPressIn?.(event);
    },
    [opacityAnim, onPressIn, prefersReducedMotion]
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
      if (prefersReducedMotion) {
        opacityAnim.setValue(1);
      } else {
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
      onPressOut?.(event);
    },
    [opacityAnim, onPressOut, prefersReducedMotion]
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[style, { opacity: opacityAnim }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default AnimatedPressable;
