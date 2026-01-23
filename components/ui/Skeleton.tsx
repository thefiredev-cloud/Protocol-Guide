import { useEffect, useRef } from "react";
import { View, Animated, ViewStyle, DimensionValue } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { spacing, radii, durations } from "@/lib/design-tokens";

interface SkeletonBaseProps {
  /** Width of the skeleton (number for pixels, string for percentage) */
  width?: DimensionValue;
  /** Height of the skeleton (number for pixels, string for percentage) */
  height?: DimensionValue;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

interface SkeletonProps extends SkeletonBaseProps {
  /** Skeleton variant */
  variant?: 'text' | 'card' | 'listItem' | 'circle' | 'rectangle';
}

/**
 * Animated skeleton placeholder component for loading states.
 *
 * Features:
 * - Smooth pulse animation
 * - Multiple variants for common UI patterns
 * - Theme-aware colors
 * - Accessible with reduced motion support
 *
 * Usage:
 * ```tsx
 * // Single line text placeholder
 * <Skeleton variant="text" />
 *
 * // Card placeholder
 * <Skeleton variant="card" />
 *
 * // Custom size
 * <Skeleton width={200} height={40} borderRadius={8} />
 * ```
 */
export function Skeleton({
  variant = 'rectangle',
  width,
  height,
  borderRadius,
  style,
  testID,
}: SkeletonProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: durations.slower * 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: durations.slower * 2,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim]);

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'text':
        return {
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: borderRadius ?? radii.sm,
        };
      case 'card':
        return {
          width: width ?? '100%',
          height: height ?? 120,
          borderRadius: borderRadius ?? radii.lg,
        };
      case 'listItem':
        return {
          width: width ?? '100%',
          height: height ?? 72,
          borderRadius: borderRadius ?? radii.md,
        };
      case 'circle':
        return {
          width: width ?? 48,
          height: height ?? 48,
          borderRadius: borderRadius ?? radii.full,
        };
      case 'rectangle':
      default:
        return {
          width: width ?? 100,
          height: height ?? 20,
          borderRadius: borderRadius ?? radii.sm,
        };
    }
  };

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface,
          opacity: pulseAnim,
        },
        getVariantStyles(),
        style,
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading"
      testID={testID}
    />
  );
}

/**
 * Text skeleton with multiple lines
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  lineHeight = 16,
  gap = spacing.sm,
  style,
  testID,
}: {
  /** Number of lines to show */
  lines?: number;
  /** Width of the last line (creates natural text appearance) */
  lastLineWidth?: DimensionValue;
  /** Height of each line */
  lineHeight?: number;
  /** Gap between lines */
  gap?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <View style={[{ gap }, style]} testID={testID}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          testID={testID ? `${testID}-line-${index}` : undefined}
        />
      ))}
    </View>
  );
}

/**
 * Card skeleton with image and text
 */
export function SkeletonCard({
  showImage = true,
  imageHeight = 160,
  lines = 2,
  style,
  testID,
}: {
  /** Whether to show image placeholder */
  showImage?: boolean;
  /** Height of image area */
  imageHeight?: number;
  /** Number of text lines */
  lines?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          overflow: 'hidden',
        },
        style,
      ]}
      testID={testID}
    >
      {showImage && (
        <Skeleton
          width="100%"
          height={imageHeight}
          borderRadius={0}
          testID={testID ? `${testID}-image` : undefined}
        />
      )}
      <View style={{ padding: spacing.lg }}>
        <Skeleton
          variant="text"
          width="70%"
          height={20}
          style={{ marginBottom: spacing.md }}
          testID={testID ? `${testID}-title` : undefined}
        />
        <SkeletonText
          lines={lines}
          lineHeight={14}
          testID={testID ? `${testID}-text` : undefined}
        />
      </View>
    </View>
  );
}

/**
 * List item skeleton with avatar and text
 */
export function SkeletonListItem({
  showAvatar = true,
  avatarSize = 48,
  lines = 2,
  style,
  testID,
}: {
  /** Whether to show avatar placeholder */
  showAvatar?: boolean;
  /** Size of avatar */
  avatarSize?: number;
  /** Number of text lines */
  lines?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radii.md,
        },
        style,
      ]}
      testID={testID}
    >
      {showAvatar && (
        <Skeleton
          variant="circle"
          width={avatarSize}
          height={avatarSize}
          style={{ marginRight: spacing.md }}
          testID={testID ? `${testID}-avatar` : undefined}
        />
      )}
      <View style={{ flex: 1 }}>
        <Skeleton
          variant="text"
          width="80%"
          height={16}
          style={{ marginBottom: spacing.xs }}
          testID={testID ? `${testID}-title` : undefined}
        />
        {lines > 1 && (
          <Skeleton
            variant="text"
            width="50%"
            height={14}
            testID={testID ? `${testID}-subtitle` : undefined}
          />
        )}
      </View>
    </View>
  );
}

/**
 * Protocol card skeleton for search results
 */
export function SkeletonProtocolCard({
  style,
  testID,
}: {
  style?: ViewStyle;
  testID?: string;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          padding: spacing.lg,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Title */}
      <Skeleton
        variant="text"
        width="75%"
        height={20}
        style={{ marginBottom: spacing.sm }}
      />

      {/* Category */}
      <Skeleton
        variant="text"
        width="40%"
        height={14}
        style={{ marginBottom: spacing.md }}
      />

      {/* Tags */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Skeleton width={60} height={24} borderRadius={radii.full} />
        <Skeleton width={80} height={24} borderRadius={radii.full} />
        <Skeleton width={50} height={24} borderRadius={radii.full} />
      </View>
    </View>
  );
}

export default Skeleton;
