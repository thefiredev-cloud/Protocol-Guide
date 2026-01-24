import { useState } from "react";
import { View, Text, Modal, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import * as Haptics from "@/lib/haptics";
import { useFocusTrap } from "@/lib/accessibility";

type DisclaimerConsentModalProps = {
  visible: boolean;
  onAcknowledged: () => void;
};

/**
 * DisclaimerConsentModal - P0 CRITICAL Legal Compliance Component
 *
 * Blocks access to protocol search until user acknowledges medical disclaimer.
 * Required by legal compliance - cannot be bypassed.
 *
 * Features:
 * - Full disclaimer text display
 * - Checkbox consent requirement
 * - Link to full disclaimer page
 * - Server-side acknowledgment storage with timestamp
 * - Cannot dismiss without acknowledging
 */
export function DisclaimerConsentModal({ visible, onAcknowledged }: DisclaimerConsentModalProps) {
  const colors = useColors();
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trpcUtils = trpc.useUtils();

  // Focus trap for accessibility (WCAG 2.4.3)
  // Note: allowEscapeClose is false because this modal requires acknowledgment
  const { containerRef, containerProps } = useFocusTrap({
    visible,
    onClose: () => {}, // Cannot be dismissed - legal compliance requirement
    allowEscapeClose: false,
  });

  const handleCheckboxToggle = async () => {
    setIsChecked(!isChecked);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleViewFullDisclaimer = () => {
    router.push("/disclaimer");
  };

  const handleAcknowledge = async () => {
    if (!isChecked) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call server to record acknowledgment with timestamp
      const result = await trpcUtils.user.acknowledgeDisclaimer.mutate();

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAcknowledged();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert("Failed to record acknowledgment. Please try again.");
      }
    } catch (error) {
      console.error("Failed to acknowledge disclaimer:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Failed to record acknowledgment. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      // Cannot dismiss without acknowledging - critical for legal compliance
      onRequestClose={() => {}}
    >
      <View
        ref={containerRef}
        className="flex-1 bg-background"
        {...containerProps}
      >
        {/* Header */}
        <View
          className="px-4 pt-4 pb-3 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <View className="flex-row items-center mb-2">
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
            <Text className="text-xl font-bold text-foreground ml-2">Medical Disclaimer</Text>
          </View>
          <Text className="text-sm text-muted">
            Please read and acknowledge before using Protocol Guide
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={true}
        >
          {/* Critical Warning Box */}
          <View
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: colors.error + "15", borderColor: colors.error, borderWidth: 2 }}
          >
            <Text className="text-base font-bold mb-2" style={{ color: colors.error }}>
              IMPORTANT WARNING
            </Text>
            <Text className="text-sm" style={{ color: colors.error, lineHeight: 20 }}>
              Protocol Guide is a reference tool only. It is NOT a substitute for professional medical judgment, proper training, direct medical control, or your local protocols.
            </Text>
          </View>

          {/* Key Points */}
          <View className="mb-4">
            <Text className="text-base font-semibold text-foreground mb-2">
              Key Points:
            </Text>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">Reference Only:</Text> Information is for clinical decision support, not medical advice
              </Text>
            </BulletPoint>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">Local Protocols:</Text> YOUR LOCAL PROTOCOLS ALWAYS TAKE PRECEDENCE
              </Text>
            </BulletPoint>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">Professional Judgment:</Text> You are responsible for independent clinical decisions
              </Text>
            </BulletPoint>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">Verify Everything:</Text> Always verify medication dosages and treatment parameters
              </Text>
            </BulletPoint>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">Medical Control:</Text> Contact medical direction when required by your protocols
              </Text>
            </BulletPoint>

            <BulletPoint>
              <Text className="text-sm text-foreground">
                <Text className="font-bold">No Warranty:</Text> Information provided &quot;as is&quot; without warranty of accuracy
              </Text>
            </BulletPoint>
          </View>

          {/* Full Disclaimer Link */}
          <Pressable
            onPress={handleViewFullDisclaimer}
            className="flex-row items-center justify-center p-3 rounded-lg mb-4"
            style={{ backgroundColor: colors.primary + "10", borderColor: colors.primary, borderWidth: 1 }}
          >
            <IconSymbol name="doc.text" size={18} color={colors.primary} />
            <Text className="text-sm font-semibold ml-2" style={{ color: colors.primary }}>
              Read Full Medical Disclaimer
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
          </Pressable>

          {/* Spacing for checkbox */}
          <View className="h-4" />
        </ScrollView>

        {/* Fixed Bottom: Checkbox and Continue Button */}
        <View
          className="px-4 py-4 border-t"
          style={{ borderTopColor: colors.border, backgroundColor: colors.background }}
        >
          {/* Checkbox */}
          <Pressable
            onPress={handleCheckboxToggle}
            disabled={isSubmitting}
            className="flex-row items-start mb-4"
            style={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            <View
              className="w-6 h-6 rounded border-2 items-center justify-center mr-3 mt-0.5"
              style={{
                borderColor: isChecked ? colors.primary : colors.border,
                backgroundColor: isChecked ? colors.primary : "transparent"
              }}
            >
              {isChecked && (
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text className="text-sm text-foreground flex-1" style={{ lineHeight: 20 }}>
              I have read and agree to the Medical Disclaimer. I understand that Protocol Guide is a reference tool only and does not replace professional medical judgment, training, or local protocols.
            </Text>
          </Pressable>

          {/* Continue Button */}
          <Pressable
            onPress={handleAcknowledge}
            disabled={!isChecked || isSubmitting}
            className="py-4 rounded-xl items-center justify-center"
            style={{
              backgroundColor: (!isChecked || isSubmitting) ? colors.muted : colors.primary,
              opacity: (!isChecked || isSubmitting) ? 0.5 : 1
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">
                Acknowledge and Continue
              </Text>
            )}
          </Pressable>

          {/* Legal Note */}
          <Text className="text-xs text-muted text-center mt-3" style={{ lineHeight: 16 }}>
            Your acknowledgment will be recorded with a timestamp for legal compliance purposes.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row mb-2">
      <Text className="text-sm text-foreground mr-2">•</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}
