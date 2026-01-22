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

// Main caduceus path data
const MAIN_PATH =
  "M1390 6841 l-1375 -6 -3 -3403 -2 -3402 2995 0 2995 0 0 3405 0 3405 -1237 0 c-681 0 -1409 2 -1618 3 -209 2 -999 1 -1755 -2z m1768 -185 c111 -56 172 -152 172 -271 0 -108 -44 -187 -137 -249 l-40 -27 -6 -242 c-4 -133 -10 -522 -14 -864 -3 -342 -9 -627 -13 -633 -8 -14 -219 -74 -228 -65 -4 4 -10 400 -14 882 -4 625 -9 882 -18 901 -6 15 -33 44 -60 65 -130 100 -148 297 -39 421 75 86 154 118 270 112 56 -3 89 -11 127 -30z m-879 -264 c88 -27 126 -70 171 -195 51 -139 63 -161 122 -223 32 -35 69 -60 111 -78 89 -39 91 -40 98 -72 4 -16 7 -151 8 -300 l1 -271 -37 -7 c-21 -3 -144 -3 -273 0 -259 7 -274 11 -310 69 -12 19 -24 35 -26 35 -2 0 -27 -16 -55 -35 -72 -49 -145 -69 -222 -60 -123 14 -317 79 -317 105 0 17 92 120 102 114 4 -3 3 7 -2 22 -6 15 -9 29 -6 31 2 3 7 -5 11 -16 3 -12 10 -19 15 -16 4 2 45 -8 92 -24 46 -16 111 -32 143 -36 33 -4 96 -13 140 -20 44 -7 84 -11 90 -8 5 2 1 -3 -9 -11 -26 -21 -2 -20 30 1 22 14 33 15 68 6 22 -6 101 -10 175 -8 117 2 136 4 148 20 7 11 13 16 13 12 0 -3 14 -1 30 4 17 6 30 15 30 20 0 5 14 16 30 24 63 33 87 115 55 191 -9 21 -80 99 -182 199 -251 244 -250 243 -322 277 -60 29 -75 32 -156 32 -92 0 -213 -25 -226 -46 -4 -6 -14 -8 -24 -5 -14 6 -180 -59 -343 -133 -23 -11 -49 -20 -56 -20 -8 0 -37 -16 -66 -35 -47 -32 -69 -40 -93 -36 -5 1 -6 -3 -2 -9 3 -5 2 -10 -3 -10 -5 0 -30 -18 -56 -41 -36 -32 -46 -47 -46 -71 0 -35 35 -98 55 -98 7 0 15 -5 17 -10 7 -21 368 -136 394 -126 8 3 14 1 14 -5 0 -6 5 -7 10 -4 6 3 10 4 10 1 0 -2 3 -12 7 -22 4 -12 3 -15 -6 -10 -7 5 -10 2 -9 -5 2 -8 -31 -31 -77 -54 -75 -37 -85 -40 -165 -40 -72 0 -96 5 -155 30 -40 18 -74 39 -79 50 -7 17 -19 20 -85 22 -86 1 -191 32 -476 140 -225 85 -305 125 -355 179 -62 67 -58 70 82 78 247 14 466 53 693 121 129 39 448 165 658 259 301 135 462 166 616 118z m1787 -7 c105 -27 185 -58 379 -147 177 -82 488 -198 650 -243 164 -45 384 -81 575 -95 85 -7 157 -14 160 -16 2 -3 -4 -20 -14 -38 -21 -39 -75 -80 -161 -123 -83 -42 -493 -187 -615 -218 -55 -14 -126 -38 -158 -54 -65 -34 -163 -61 -216 -61 -46 0 -146 33 -197 65 -21 14 -39 21 -39 15 0 -5 4 -10 10 -10 10 0 80 -88 80 -102 0 -5 -26 -21 -57 -36 -54 -25 -67 -27 -203 -28 -127 0 -150 -3 -190 -22 -25 -12 -55 -22 -68 -22 -33 0 -81 26 -125 69 -31 30 -39 33 -47 21 -5 -8 -10 -20 -10 -27 0 -6 -14 -23 -31 -37 l-31 -26 -264 0 -264 0 1 213 c1 116 4 252 8 302 l6 90 60 25 c141 58 193 127 280 364 58 159 219 206 481 141z m-3111 -1335 c381 -75 632 -147 621 -177 -3 -7 -13 -38 -22 -68 -8 -30 -16 -55 -17 -55 -1 0 -30 9 -65 20 -56 18 -518 120 -541 120 -6 0 -9 -453 -8 -1209 l2 -1208 130 -7 c399 -21 749 -130 1044 -324 136 -89 336 -292 411 -416 23 -39 23 -38 -51 23 -237 200 -526 342 -875 429 -243 61 -352 75 -629 78 l-240 2 0 1090 c0 600 -2 1093 -5 1096 -3 2 -39 8 -81 12 l-75 6 -1 -1183 c-1 -651 0 -1191 3 -1199 3 -13 24 -14 151 -8 347 17 685 -22 1018 -117 236 -68 479 -179 638 -291 73 -52 77 -56 77 -93 l0 -38 -73 38 c-268 140 -595 217 -1032 241 -199 11 -691 1 -947 -19 l-78 -6 0 1419 c0 780 4 1425 8 1432 7 10 46 7 194 -13 103 -14 189 -25 192 -25 3 0 6 113 6 251 0 234 1 250 18 245 9 -3 111 -23 227 -46z m4355 -200 c0 -137 3 -250 6 -250 3 0 91 12 196 26 104 14 192 23 195 20 3 -3 7 -647 9 -1432 l3 -1427 -92 6 c-51 4 -222 12 -382 18 -730 29 -1179 -38 -1568 -232 -43 -22 -80 -39 -83 -39 -3 0 -4 17 -2 37 3 31 11 43 52 74 74 56 229 142 347 192 402 172 845 250 1306 231 l172 -7 3 109 c2 60 2 599 0 1198 l-4 1089 -76 -7 c-42 -4 -79 -10 -82 -12 -3 -3 -5 -497 -4 -1097 l1 -1092 -231 0 c-259 -1 -379 -15 -606 -70 -375 -92 -724 -265 -927 -459 -24 -22 -43 -36 -43 -32 0 5 20 36 44 70 305 425 798 667 1426 702 l125 6 1 1209 c0 665 -1 1209 -4 1209 -15 0 -480 -103 -537 -119 -38 -11 -70 -19 -70 -18 -9 25 -35 117 -35 124 0 15 116 56 262 93 100 25 561 126 591 129 4 1 7 -111 7 -249z m-2804 183 c208 -67 283 -254 136 -340 -35 -21 -62 -27 -122 -31 -96 -5 -169 14 -264 71 -59 35 -76 41 -121 40 -54 -1 -110 -24 -132 -52 -7 -9 -13 -32 -13 -52 -1 -115 233 -258 560 -344 108 -28 140 -45 140 -76 0 -36 -14 -51 -84 -86 -39 -19 -102 -55 -139 -79 -37 -24 -76 -44 -87 -44 -37 0 -256 78 -346 123 -100 50 -223 143 -267 200 -121 159 -109 396 26 530 43 43 150 104 221 127 137 44 376 50 492 13z m1417 1 c111 -24 245 -93 300 -154 79 -87 92 -126 92 -265 0 -116 -1 -123 -33 -188 -62 -125 -182 -233 -357 -320 -118 -58 -206 -89 -378 -133 -228 -57 -515 -143 -612 -183 -192 -79 -321 -178 -370 -283 -29 -61 -31 -95 -10 -165 20 -68 60 -120 153 -198 84 -70 101 -102 78 -147 -14 -26 -184 -147 -209 -148 -52 -1 -187 96 -262 190 -67 84 -103 155 -122 244 -44 214 10 405 162 565 174 183 402 285 925 416 323 81 466 134 597 223 163 110 184 229 49 272 -59 19 -114 8 -191 -39 -92 -55 -132 -66 -245 -65 -106 0 -139 11 -184 64 -49 59 -28 161 47 227 49 43 139 83 222 99 85 16 245 11 348 -12z m-260 -1213 c57 -54 117 -153 148 -243 23 -70 25 -214 4 -304 -26 -112 -61 -172 -159 -269 -97 -96 -118 -109 -466 -294 -445 -236 -563 -389 -460 -597 26 -54 42 -71 105 -116 44 -32 74 -60 74 -71 1 -10 -35 -54 -79 -98 l-80 -80 -40 23 c-23 13 -78 62 -124 109 -247 254 -248 578 -2 824 93 94 182 155 423 288 206 115 279 163 355 234 74 71 102 135 96 218 -7 82 -36 135 -124 226 -74 76 -85 97 -61 118 22 18 249 80 295 81 38 0 49 -6 95 -49z m-543 -169 c0 -44 -3 -161 -7 -261 l-6 -182 -89 -59 c-49 -33 -95 -60 -102 -60 -19 0 -33 514 -15 536 19 23 177 100 212 103 4 1 7 -34 7 -77z m297 -995 c53 -40 97 -96 133 -168 114 -224 76 -472 -97 -645 -39 -39 -141 -114 -266 -197 -223 -148 -316 -231 -380 -338 -61 -104 -81 -184 -82 -324 0 -66 4 -147 8 -180 l8 -60 -35 40 c-47 53 -102 165 -120 245 -20 84 -20 239 -1 315 8 33 32 94 52 135 52 106 172 223 389 378 94 67 191 143 216 170 60 64 82 130 76 231 -6 95 -30 151 -97 225 -28 31 -51 58 -51 60 0 3 4 16 10 30 12 31 135 114 170 115 14 0 44 -14 67 -32z m-335 -174 c16 -14 18 -35 18 -200 0 -202 -4 -219 -60 -267 -35 -29 -47 -26 -91 18 -24 23 -26 35 -32 138 -13 214 -12 223 28 259 44 40 85 67 104 68 8 1 23 -6 33 -16z m233 -925 c45 -53 100 -164 120 -243 8 -32 15 -100 15 -150 0 -151 -42 -279 -119 -366 l-38 -43 1 190 c1 130 -3 206 -13 244 -16 63 -59 154 -102 212 -44 62 -39 87 28 147 31 28 60 51 64 51 4 0 24 -19 44 -42z m-227 -699 l-6 -570 -29 -57 c-15 -31 -32 -57 -38 -56 -5 0 -22 21 -37 45 l-28 44 -11 513 -12 512 30 37 c26 32 116 103 131 103 3 0 3 -257 0 -571z";

// Secondary decorative path
const SECONDARY_PATH =
  "M3940 6181 c-107 -10 -177 -50 -307 -178 -62 -61 -113 -109 -113 -108 0 2 -19 -16 -43 -39 -23 -22 -41 -44 -40 -47 1 -3 -24 -31 -57 -63 -33 -31 -62 -67 -66 -81 -3 -14 -10 -22 -15 -19 -5 3 -9 -12 -9 -33 0 -29 8 -47 30 -72 17 -18 28 -36 25 -41 -7 -11 51 -55 98 -75 20 -8 38 -15 39 -14 7 3 164 -14 172 -19 18 -10 136 -7 132 3 -2 7 14 11 40 11 24 1 41 -3 38 -8 -3 -4 0 -8 5 -8 6 0 11 4 11 8 0 5 44 14 98 21 53 7 128 19 167 27 38 8 83 17 100 19 16 2 57 11 90 20 33 10 83 22 110 28 28 5 52 14 55 18 3 4 48 20 100 35 118 33 246 94 284 133 25 26 28 35 23 73 -4 32 -14 50 -38 70 -18 15 -35 25 -37 23 -3 -3 -11 0 -19 6 -7 6 -13 8 -13 4 0 -5 -8 -1 -17 8 -23 20 -326 167 -345 167 -8 0 -18 4 -24 8 -5 5 -38 19 -74 32 -36 12 -87 32 -115 45 -88 39 -185 55 -285 46z";

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
      // @ts-expect-error - Web-only ARIA attribute (boolean value)
      aria-busy={true}
      // @ts-expect-error - Web-only ARIA attribute
      aria-label="Loading Protocol Guide logo"
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
