import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

type MedicalDisclaimerProps = {
  /**
   * 'inline' - Subtle text disclaimer for AI response cards
   * 'boxed' - More prominent boxed disclaimer for detail views
   */
  variant?: "inline" | "boxed";
  /** Optional custom message override */
  message?: string;
};

/**
 * MedicalDisclaimer - Medical-Legal Compliance Component
 *
 * Displays a medical disclaimer below AI-generated content.
 * Required for legal compliance on all AI/search responses.
 *
 * Usage:
 * - `variant="inline"` - For chat bubbles and response cards (subtle, italic text)
 * - `variant="boxed"` - For protocol detail views (highlighted box with icon)
 */
export function MedicalDisclaimer({
  variant = "inline",
  message,
}: MedicalDisclaimerProps) {
  const colors = useColors();

  const defaultMessage =
    "This information is for reference only. Always follow your local protocols and medical direction.";
  const displayMessage = message || defaultMessage;

  if (variant === "boxed") {
    return (
      <View
        style={[
          styles.boxedContainer,
          { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" },
        ]}
      >
        <View style={styles.boxedContent}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={14}
            color={colors.warning}
          />
          <Text style={[styles.boxedText, { color: colors.muted }]}>
            {displayMessage}
          </Text>
        </View>
      </View>
    );
  }

  // Default: inline variant
  return (
    <View style={styles.inlineContainer}>
      <Text style={[styles.inlineText, { color: colors.muted }]}>
        {displayMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline variant styles (subtle)
  inlineContainer: {
    marginTop: 12,
    paddingTop: 8,
  },
  inlineText: {
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
    textAlign: "left",
  },

  // Boxed variant styles (prominent)
  boxedContainer: {
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  boxedContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  boxedText: {
    fontSize: 11,
    lineHeight: 15,
    marginLeft: 8,
    flex: 1,
  },
});
