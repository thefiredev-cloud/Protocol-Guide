/**
 * ProFeatureLock Component
 *
 * Lock icon overlay component for features restricted to Pro users.
 * Shows "Pro feature" badge with upgrade CTA when tapped.
 */

import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { spacing, radii, opacity } from "@/lib/design-tokens";
import * as Haptics from "@/lib/haptics";

interface ProFeatureLockProps {
  /** Whether to show the lock overlay */
  locked: boolean;
  /** Children to render underneath the overlay */
  children: React.ReactNode;
  /** Feature name to display (e.g., "Offline Access") */
  featureName?: string;
  /** Optional description text */
  description?: string;
  /** Whether to show the overlay as opaque (vs semi-transparent) */
  opaque?: boolean;
  /** Additional style for the container */
  style?: ViewStyle;
  /** Optional custom onPress handler instead of navigating to upgrade */
  onUpgradePress?: () => void;
}

/**
 * Overlay component that shows a lock icon and "Pro" badge over content
 * that is restricted to Pro users.
 *
 * Usage:
 * ```tsx
 * <ProFeatureLock
 *   locked={!isPro}
 *   featureName="Offline Access"
 *   description="Save protocols for offline viewing"
 * >
 *   <OfflineCacheSection />
 * </ProFeatureLock>
 * ```
 */
export function ProFeatureLock({
  locked,
  children,
  featureName = "Pro Feature",
  description,
  opaque = false,
  style,
  onUpgradePress,
}: ProFeatureLockProps) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      router.push("/(tabs)/?showUpgrade=true" as any);
    }
  };

  if (!locked) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Underlying content (blurred/dimmed) */}
      <View style={styles.contentWrapper}>
        {children}
      </View>

      {/* Lock overlay */}
      <TouchableOpacity
        style={[
          styles.overlay,
          {
            backgroundColor: opaque
              ? colors.background
              : colors.background + "E6", // ~90% opacity
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityLabel={`${featureName} is a Pro feature. Tap to upgrade.`}
        accessibilityRole="button"
      >
        {/* Lock icon circle */}
        <View style={[styles.lockCircle, { backgroundColor: colors.primary + "15" }]}>
          <IconSymbol name="lock.fill" size={24} color={colors.primary} />
        </View>

        {/* Pro badge */}
        <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
          <IconSymbol name="star.fill" size={10} color="#FFFFFF" />
          <Text style={styles.proText}>PRO</Text>
        </View>

        {/* Feature name */}
        <Text style={[styles.featureName, { color: colors.foreground }]}>
          {featureName}
        </Text>

        {/* Description */}
        {description && (
          <Text style={[styles.description, { color: colors.muted }]}>
            {description}
          </Text>
        )}

        {/* CTA */}
        <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.ctaText}>Upgrade to Unlock</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Small inline lock badge for use in headers or labels
 */
export function ProBadge({ size = "small" }: { size?: "small" | "medium" }) {
  const colors = useColors();
  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.inlineBadge,
        {
          backgroundColor: colors.primary,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <IconSymbol
        name="star.fill"
        size={isSmall ? 8 : 10}
        color="#FFFFFF"
      />
      <Text
        style={[
          styles.inlineBadgeText,
          { fontSize: isSmall ? 9 : 11 },
        ]}
      >
        PRO
      </Text>
    </View>
  );
}

/**
 * Lock icon for use in list items or cards
 */
export function LockIcon({ size = 16 }: { size?: number }) {
  const colors = useColors();

  return (
    <View style={[styles.lockIconContainer, { backgroundColor: colors.muted + "20" }]}>
      <IconSymbol name="lock.fill" size={size * 0.6} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  contentWrapper: {
    opacity: opacity.disabled,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  lockCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  proText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.md,
  },
  ctaButton: {
    // Ensure minimum touch target (WCAG 2.1 AAA - 44px)
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  inlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.full,
    marginLeft: spacing.xs,
  },
  inlineBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 3,
  },
  lockIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProFeatureLock;
