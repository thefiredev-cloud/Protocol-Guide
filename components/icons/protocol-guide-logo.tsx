/**
 * Protocol Guide Logo - Medical Caduceus
 *
 * Winged staff with serpents in square frame.
 * Brand color: #EF4444 (Signal Red for dark theme)
 *
 * Features:
 * - Optional pulse/breathing animation
 * - Crisp rendering at all sizes via PixelRatio
 * - Loading placeholder state
 * - Variant support: default (solid red) or inverted (light bg, red caduceus)
 * - Full accessibility support (WCAG 2.1 compliant)
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Image,
  Animated,
  View,
  PixelRatio,
  StyleSheet,
  Easing,
} from "react-native";
import Svg, { Path, G, Rect } from "react-native-svg";

/** Animation type for the logo */
export type LogoAnimation = "pulse" | "breathing" | "none";

/** Logo variant type */
export type LogoVariant = "default" | "inverted";

interface ProtocolGuideLogoProps {
  /** Logo size in logical pixels (default: 48) */
  size?: number;
  /** Logo color (default: brand red #9B2335) */
  color?: string;
  /** Animation style: 'pulse', 'breathing', or 'none' (default: 'none') */
  animation?: LogoAnimation;
  /** Show loading placeholder instead of logo (default: false) */
  isLoading?: boolean;
  /** Placeholder background color (default: #E5E7EB) */
  placeholderColor?: string;
  /** Test ID for testing (optional) */
  testID?: string;
  /** Variant: 'default' (solid red) or 'inverted' (light bg, red caduceus) */
  variant?: LogoVariant;
  /** Custom accessibility label (default: "Protocol Guide logo") */
  ariaLabel?: string;
  /** Additional accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Invert colors on hover (web only) - swaps red/white */
  invertOnHover?: boolean;
}

// Star of Life - Universal EMS symbol (6-pointed star with Rod of Asclepius)
// Clean paths without background, renders properly on dark backgrounds
const STAR_OF_LIFE_PATH =
  "M12 0L14.5 4.5L19.5 2L17 7L22 9.5L17 12L19.5 17L14.5 14.5L12 19L9.5 14.5L4.5 17L7 12L2 9.5L7 7L4.5 2L9.5 4.5L12 0Z";

// Rod of Asclepius (snake on staff) - center of Star of Life
const ROD_PATH =
  "M12 5.5V14M10.5 7C10.5 7 11 6.5 12 6.5C13 6.5 13.5 7.5 13.5 8C13.5 9 12 9 12 10C12 11 13.5 11 13.5 12C13.5 12.5 13 13.5 12 13.5C11 13.5 10.5 13 10.5 13";

/** Default brand color - Signal Red for dark theme */
const DEFAULT_COLOR = "#EF4444";
/** Default placeholder color (slate-700) */
const DEFAULT_PLACEHOLDER_COLOR = "#334155";
/** Inverted background color (dark surface) */
const INVERTED_BG_COLOR = "#1E293B";

/**
 * Hook for pulse animation (scale up/down)
 * Creates a heartbeat-like effect
 */
function usePulseAnimation(enabled: boolean): Animated.Value {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      scaleAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [enabled, scaleAnim]);

  return scaleAnim;
}

/**
 * Hook for breathing animation (smooth opacity fade)
 * Creates a gentle fade in/out effect
 */
function useBreathingAnimation(enabled: boolean): Animated.Value {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      opacityAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [enabled, opacityAnim]);

  return opacityAnim;
}

/**
 * Hook for loading placeholder shimmer animation
 */
function useLoadingAnimation(enabled: boolean): Animated.Value {
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!enabled) {
      shimmerAnim.setValue(0.4);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [enabled, shimmerAnim]);

  return shimmerAnim;
}

/**
 * Get crisp size adjusted for pixel ratio
 * Ensures sharp rendering on high-DPI screens
 */
function getCrispSize(size: number): number {
  const pixelRatio = PixelRatio.get();
  // Round to nearest pixel boundary for crisp rendering
  return Math.round(size * pixelRatio) / pixelRatio;
}

// Generate SVG data URI for web
function getSvgDataUri(
  size: number,
  color: string,
  variant: LogoVariant = "default"
): string {
  if (variant === "inverted") {
    // Inverted: light background with red caduceus on top
    // The caduceus interior paths (after first 'z') define the medical symbol
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 600 685" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="3" width="597" height="679" rx="8" fill="${INVERTED_BG_COLOR}"/><g transform="translate(0,685) scale(0.1,-0.1)" fill="${color}" stroke="none"><path d="${MAIN_PATH}"/><path d="${SECONDARY_PATH}"/></g></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  // Default: solid color fill
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 600 685" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,685) scale(0.1,-0.1)" fill="${color}" stroke="none"><path d="${MAIN_PATH}"/><path d="${SECONDARY_PATH}"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Native version using react-native-svg */
function NativeLogo({
  size,
  color,
  variant = "default",
}: {
  size: number;
  color: string;
  variant?: LogoVariant;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 600 685"
      preserveAspectRatio="xMidYMid meet"
    >
      {variant === "inverted" && (
        <Rect
          x="1.5"
          y="3"
          width="597"
          height="679"
          rx="8"
          fill={INVERTED_BG_COLOR}
        />
      )}
      <G
        transform="translate(0,685) scale(0.1,-0.1)"
        fill={color}
        stroke="none"
      >
        <Path d={MAIN_PATH} />
        <Path d={SECONDARY_PATH} />
      </G>
    </Svg>
  );
}

/** Loading placeholder component with shimmer effect */
function LoadingPlaceholder({
  size,
  color,
  shimmerOpacity,
  testID,
}: {
  size: number;
  color: string;
  shimmerOpacity: Animated.Value;
  testID?: string;
}) {
  return (
    <Animated.View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size * 0.15,
          backgroundColor: color,
          opacity: shimmerOpacity,
        },
      ]}
      accessibilityLabel="Loading Protocol Guide logo"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityHint="Please wait while the logo loads"
      testID={testID}
    />
  );
}

/**
 * Protocol Guide Logo - Medical Caduceus
 *
 * A crisp, animated logo component that renders consistently across
 * all device sizes and pixel densities.
 *
 * @example
 * // Basic usage
 * <ProtocolGuideLogo size={48} />
 *
 * @example
 * // With pulse animation
 * <ProtocolGuideLogo size={64} animation="pulse" />
 *
 * @example
 * // Loading state
 * <ProtocolGuideLogo size={48} isLoading={true} />
 *
 * @example
 * // Inverted variant (light background, red caduceus)
 * <ProtocolGuideLogo size={48} variant="inverted" />
 *
 * @example
 * // Custom accessibility label
 * <ProtocolGuideLogo
 *   size={48}
 *   ariaLabel="Protocol Guide - EMS Medical Protocols"
 *   accessibilityHint="Navigate to homepage"
 * />
 */
export function ProtocolGuideLogo({
  size = 48,
  color = DEFAULT_COLOR,
  animation = "none",
  isLoading = false,
  placeholderColor = DEFAULT_PLACEHOLDER_COLOR,
  testID,
  variant = "default",
  ariaLabel,
  accessibilityHint,
  invertOnHover = false,
}: ProtocolGuideLogoProps) {
  // Hover state for web color inversion
  const [isHovered, setIsHovered] = useState(false);
  // Calculate crisp size for sharp rendering
  const crispSize = getCrispSize(size);

  // Animation hooks
  const pulseScale = usePulseAnimation(animation === "pulse" && !isLoading);
  const breathingOpacity = useBreathingAnimation(
    animation === "breathing" && !isLoading
  );
  const loadingOpacity = useLoadingAnimation(isLoading);

  // Construct accessibility label
  const defaultLabel = variant === "inverted"
    ? "Protocol Guide logo, inverted style"
    : "Protocol Guide logo";
  const accessibilityLabel = ariaLabel || defaultLabel;

  // Add animation state to accessibility hint
  const animationHint = animation !== "none" ? `, ${animation} animation active` : "";
  const finalAccessibilityHint = accessibilityHint ||
    `Medical caduceus symbol for Protocol Guide${animationHint}`;

  // Show loading placeholder
  if (isLoading) {
    return (
      <LoadingPlaceholder
        size={crispSize}
        color={placeholderColor}
        shimmerOpacity={loadingOpacity}
        testID={testID}
      />
    );
  }

  // Determine animation styles
  const animatedStyle: Animated.WithAnimatedObject<{
    transform?: { scale: Animated.Value }[];
    opacity?: Animated.Value;
  }> = {};

  if (animation === "pulse") {
    animatedStyle.transform = [{ scale: pulseScale }];
  } else if (animation === "breathing") {
    animatedStyle.opacity = breathingOpacity;
  }

  // Web hover filter style for color inversion
  const webHoverStyle = Platform.OS === "web" && invertOnHover && isHovered
    ? { filter: "invert(1) brightness(2)", transition: "filter 0.2s ease" }
    : Platform.OS === "web" && invertOnHover
    ? { transition: "filter 0.2s ease" }
    : undefined;

  // Web hover event handlers
  const webHoverProps = Platform.OS === "web" && invertOnHover
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  // Render logo with optional animation wrapper
  const logoContent =
    Platform.OS === "web" ? (
      <Image
        source={{ uri: getSvgDataUri(crispSize, color, variant) }}
        // @ts-ignore - Web-only style properties (filter, transition)
        style={{
          width: crispSize,
          height: crispSize,
          ...webHoverStyle,
        }}
        accessibilityLabel={accessibilityLabel}
        // @ts-ignore - Web-only ARIA attribute
        aria-label={accessibilityLabel}
        // @ts-ignore - Web-only alt text
        alt={accessibilityLabel}
        testID={testID}
      />
    ) : (
      <NativeLogo size={crispSize} color={color} variant={variant} />
    );

  // Wrap in Animated.View if animation is enabled
  if (animation !== "none") {
    return (
      <Animated.View
        style={[styles.container, animatedStyle]}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={finalAccessibilityHint}
        accessibilityRole="image"
        testID={testID}
        // @ts-ignore - Web-only ARIA attribute
        role="img"
        // @ts-ignore - Web-only ARIA attribute
        aria-label={accessibilityLabel}
        // @ts-ignore - Web-only mouse events
        {...webHoverProps}
      >
        {logoContent}
      </Animated.View>
    );
  }

  // No animation, render directly
  return (
    <View
      style={styles.container}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={finalAccessibilityHint}
      accessibilityRole="image"
      testID={testID}
      // @ts-ignore - Web-only ARIA attribute
      role="img"
      // @ts-ignore - Web-only ARIA attribute
      aria-label={accessibilityLabel}
      // @ts-ignore - Web-only mouse events
      {...webHoverProps}
    >
      {logoContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProtocolGuideLogo;
