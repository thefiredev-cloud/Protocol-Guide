/**
 * CountyLimitModal Component
 *
 * Modal that appears when a free user tries to add a second county.
 * Shows the current limit, upgrade benefits, and CTA to upgrade.
 */

import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Modal, type ModalButton } from "@/components/ui/Modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { spacing, radii } from "@/lib/design-tokens";
import * as Haptics from "@/lib/haptics";

interface CountyLimitModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when modal is dismissed */
  onDismiss: () => void;
  /** Current number of counties the user has */
  currentCounties?: number;
  /** Maximum allowed counties for free tier */
  maxCounties?: number;
}

const PRO_BENEFITS = [
  { icon: "map.fill" as const, text: "Unlimited counties/agencies" },
  { icon: "magnifyingglass" as const, text: "Unlimited protocol searches" },
  { icon: "arrow.down.circle.fill" as const, text: "Offline access to protocols" },
  { icon: "star.fill" as const, text: "Priority support" },
];

/**
 * Modal shown when free users try to add more counties than their limit.
 *
 * Usage:
 * ```tsx
 * <CountyLimitModal
 *   visible={showUpgradeModal}
 *   onDismiss={() => setShowUpgradeModal(false)}
 *   currentCounties={1}
 *   maxCounties={1}
 * />
 * ```
 */
export function CountyLimitModal({
  visible,
  onDismiss,
  currentCounties = 1,
  maxCounties = 1,
}: CountyLimitModalProps) {
  const colors = useColors();
  const router = useRouter();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
    // Navigate to upgrade screen
    router.push("/(tabs)/?showUpgrade=true" as any);
  };

  const buttons: ModalButton[] = [
    {
      label: "Maybe Later",
      onPress: onDismiss,
      variant: "secondary",
    },
    {
      label: "Upgrade to Pro",
      onPress: handleUpgrade,
      variant: "primary",
    },
  ];

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      title="County Limit Reached"
      buttons={buttons}
      dismissOnBackdrop={true}
    >
      <View style={styles.content}>
        {/* Limit indicator */}
        <View style={[styles.limitBadge, { backgroundColor: colors.warning + "20" }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
          <Text style={[styles.limitText, { color: colors.warning }]}>
            {currentCounties}/{maxCounties} county used
          </Text>
        </View>

        {/* Message */}
        <Text style={[styles.message, { color: colors.muted }]}>
          Free accounts can access protocols from 1 county. Upgrade to Pro for unlimited access across all counties and agencies.
        </Text>

        {/* Benefits list */}
        <View style={styles.benefitsList}>
          <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>
            Pro includes:
          </Text>
          {PRO_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name={benefit.icon} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing hint */}
        <View style={[styles.pricingHint, { backgroundColor: colors.surface }]}>
          <Text style={[styles.pricingText, { color: colors.foreground }]}>
            Starting at <Text style={[styles.pricingAmount, { color: colors.primary }]}>$4.99/mo</Text> or{" "}
            <Text style={[styles.pricingAmount, { color: colors.primary }]}>$39/year</Text>
            <Text style={[styles.savingsText, { color: colors.success }]}> (save 35%)</Text>
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  limitBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    marginBottom: spacing.base,
  },
  limitText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  benefitsList: {
    width: "100%",
    marginBottom: spacing.base,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  benefitText: {
    fontSize: 13,
    flex: 1,
  },
  pricingHint: {
    width: "100%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
  },
  pricingText: {
    fontSize: 13,
    textAlign: "center",
  },
  pricingAmount: {
    fontWeight: "700",
  },
  savingsText: {
    fontWeight: "600",
    fontSize: 12,
  },
});

export default CountyLimitModal;
