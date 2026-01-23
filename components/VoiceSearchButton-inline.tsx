/**
 * VoiceSearchButtonInline Component
 *
 * A compact microphone button for inline use within the search input.
 * Opens the VoiceSearchModal for full recording experience.
 *
 * Features:
 * - Compact design for search bar integration
 * - Opens modal for recording
 * - Visual feedback for different states
 * - Accessibility support
 */

import { TouchableOpacity, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type VoiceSearchButtonInlineProps = {
  onPress: () => void;
  disabled?: boolean;
  size?: "small" | "medium";
};

export function VoiceSearchButtonInline({
  onPress,
  disabled = false,
  size = "medium",
}: VoiceSearchButtonInlineProps) {
  const colors = useColors();

  const sizeConfig = {
    small: { button: 32, icon: 16 },
    medium: { button: 40, icon: 20 },
  };

  const config = sizeConfig[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          width: config.button,
          height: config.button,
          borderRadius: config.button / 2,
          backgroundColor: colors.primary + "15",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityLabel="Voice search"
      accessibilityRole="button"
      accessibilityHint="Opens voice search to speak your query"
      accessibilityState={{ disabled }}
    >
      <IconSymbol name="mic.fill" size={config.icon} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VoiceSearchButtonInline;
