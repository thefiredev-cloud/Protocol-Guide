import { useEffect, useRef, memo, useMemo } from "react";
import { View, Animated, ViewStyle, DimensionValue, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { spacing, radii, durations } from "@/lib/design-tokens";

// Extract static styles to prevent re-creating style objects on every render
const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowWithGap: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowWithGapMd: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowAligned: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowAlignedSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlignedStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  flex1MarginRight: {
    flex: 1,
    marginRight: spacing.md,
  },
  paddingLg: {
    padding: spacing.lg,
  },
  marginBottomXs: {
    marginBottom: spacing.xs,
  },
  marginBottomSm: {
    marginBottom: spacing.sm,
  },
  marginBottomMd: {
    marginBottom: spacing.md,
  },
  marginBottomLg: {
    marginBottom: spacing.lg,
  },
  marginTopLg: {
    marginTop: spacing.lg,
  },
  marginRightMd: {
    marginRight: spacing.md,
  },
  gapSm: {
    gap: spacing.sm,
  },
  gapMd: {
    gap: spacing.md,
  },
});

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
export const Skeleton = memo(function Skeleton({
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

  const variantStyles = useMemo((): ViewStyle => {
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
  }, [variant, width, height, borderRadius]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface,
          opacity: pulseAnim,
        },
        variantStyles,
        style,
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading"
      testID={testID}
    />
  );
});

/**
 * Text skeleton with multiple lines
 */
export const SkeletonText = memo(function SkeletonText({
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
  const gapStyle = useMemo(() => ({ gap }), [gap]);

  return (
    <View style={[gapStyle, style]} testID={testID}>
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
});

/**
 * Card skeleton with image and text
 */
export const SkeletonCard = memo(function SkeletonCard({
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
      <View style={skeletonStyles.paddingLg}>
        <Skeleton
          variant="text"
          width="70%"
          height={20}
          style={skeletonStyles.marginBottomMd}
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
});

/**
 * List item skeleton with avatar and text
 */
export const SkeletonListItem = memo(function SkeletonListItem({
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
          style={skeletonStyles.marginRightMd}
          testID={testID ? `${testID}-avatar` : undefined}
        />
      )}
      <View style={skeletonStyles.flex1}>
        <Skeleton
          variant="text"
          width="80%"
          height={16}
          style={skeletonStyles.marginBottomXs}
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
});

/**
 * Protocol card skeleton for search results
 */
export const SkeletonProtocolCard = memo(function SkeletonProtocolCard({
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
});

/**
 * Profile header skeleton with avatar, name, and tier badge
 */
export const SkeletonProfileHeader = memo(function SkeletonProfileHeader({
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
          alignItems: 'center',
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Avatar */}
      <Skeleton
        variant="circle"
        width={80}
        height={80}
        style={{ marginBottom: spacing.md }}
      />

      {/* Name */}
      <Skeleton
        variant="text"
        width={140}
        height={22}
        style={{ marginBottom: spacing.sm }}
      />

      {/* Email */}
      <Skeleton
        variant="text"
        width={180}
        height={14}
        style={{ marginBottom: spacing.md }}
      />

      {/* Tier badge */}
      <Skeleton
        width={70}
        height={28}
        borderRadius={radii.full}
      />
    </View>
  );
});

/**
 * Subscription status card skeleton
 */
export const SkeletonSubscriptionCard = memo(function SkeletonSubscriptionCard({
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
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        <Skeleton
          variant="circle"
          width={36}
          height={36}
          style={{ marginRight: spacing.md }}
        />
        <Skeleton variant="text" width={140} height={17} />
      </View>

      {/* Details rows */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={80} height={14} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width={50} height={14} />
          <Skeleton variant="text" width={70} height={14} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width={55} height={14} />
          <Skeleton variant="text" width={90} height={14} />
        </View>
      </View>

      {/* Button */}
      <Skeleton
        width="100%"
        height={44}
        borderRadius={radii.md}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
});

/**
 * Usage progress card skeleton
 */
export const SkeletonUsageCard = memo(function SkeletonUsageCard({
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
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        <Skeleton
          variant="circle"
          width={36}
          height={36}
          style={{ marginRight: spacing.md }}
        />
        <Skeleton variant="text" width={100} height={17} />
      </View>

      {/* Progress bar */}
      <Skeleton
        width="100%"
        height={8}
        borderRadius={radii.sm}
        style={{ marginBottom: spacing.sm }}
      />

      {/* Usage text */}
      <Skeleton variant="text" width={160} height={14} />
    </View>
  );
});

/**
 * Query history item skeleton
 */
export const SkeletonQueryItem = memo(function SkeletonQueryItem({
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
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          {/* Query text */}
          <Skeleton
            variant="text"
            width="80%"
            height={15}
            style={{ marginBottom: spacing.sm }}
          />

          {/* Protocol badge */}
          <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
            <Skeleton
              width={120}
              height={24}
              borderRadius={radii.sm}
            />
          </View>

          {/* Response preview */}
          <Skeleton
            variant="text"
            width="100%"
            height={13}
            style={{ marginBottom: spacing.xs }}
          />
          <Skeleton
            variant="text"
            width="70%"
            height={13}
            style={{ marginBottom: spacing.md }}
          />

          {/* Meta row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Skeleton width={80} height={20} borderRadius={radii.sm} />
            <Skeleton width={60} height={11} />
          </View>
        </View>

        {/* Delete button area */}
        <Skeleton variant="circle" width={24} height={24} />
      </View>
    </View>
  );
});

/**
 * Recent queries list skeleton
 */
export const SkeletonRecentQueries = memo(function SkeletonRecentQueries({
  count = 3,
  style,
  testID,
}: {
  count?: number;
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
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton
            variant="circle"
            width={36}
            height={36}
            style={{ marginRight: spacing.md }}
          />
          <Skeleton variant="text" width={110} height={17} />
        </View>
        <Skeleton variant="text" width={50} height={14} />
      </View>

      {/* Query items */}
      <View style={{ gap: spacing.md }}>
        {Array.from({ length: count }).map((_, index) => (
          <View
            key={index}
            style={{
              paddingVertical: spacing.sm,
              borderBottomWidth: index < count - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Skeleton variant="text" width="85%" height={14} style={{ marginBottom: spacing.xs }} />
            <Skeleton variant="text" width="40%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
});

/**
 * History list skeleton with multiple items
 */
export const SkeletonHistoryList = memo(function SkeletonHistoryList({
  count = 5,
  style,
  testID,
}: {
  count?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <View style={[{ gap: spacing.md }, style]} testID={testID}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonQueryItem key={index} />
      ))}
    </View>
  );
});

/**
 * Stats card skeleton for coverage screen
 */
export const SkeletonStatsCard = memo(function SkeletonStatsCard({
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
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Icon circle */}
      <Skeleton
        variant="circle"
        width={40}
        height={40}
        style={{ marginBottom: spacing.sm }}
      />

      {/* Value */}
      <Skeleton
        variant="text"
        width={80}
        height={28}
        style={{ marginBottom: spacing.xs }}
      />

      {/* Label */}
      <Skeleton variant="text" width={90} height={12} />
    </View>
  );
});

export default Skeleton;
