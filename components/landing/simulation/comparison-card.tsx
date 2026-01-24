/**
 * Comparison Card - Hoverable card showing time comparison stats
 */

import * as React from "react";
import { Text, Pressable, StyleSheet, Platform, ViewStyle } from "react-native";
import { COLORS } from "./constants";

interface ComparisonCardProps {
  label: string;
  value: string;
  description: string;
  variant: "standard" | "protocol";
}

export const ComparisonCard = React.memo(function ComparisonCard({ label, value, description, variant }: ComparisonCardProps) {
  const isProtocol = variant === "protocol";

  return (
    <Pressable
      style={({ hovered, pressed }) =>
        [
          styles.card,
          isProtocol ? styles.cardProtocol : styles.cardStandard,
          hovered && styles.cardHovered,
          pressed && styles.cardPressed,
        ] as ViewStyle[]
      }
    >
      <Text
        style={[styles.cardLabel, { color: isProtocol ? COLORS.primaryRed : COLORS.textMuted }]}
      >
        {label}
      </Text>
      <Text
        style={[styles.cardValue, { color: isProtocol ? COLORS.primaryRed : COLORS.chartYellow }]}
      >
        {value}
      </Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    ...(Platform.OS === "web"
      ? {
          transitionProperty: "transform, box-shadow",
          transitionDuration: "200ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "default",
        }
      : {}),
  },
  cardStandard: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.borderGray,
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }),
  },
  cardProtocol: {
    backgroundColor: COLORS.bgLightPink,
    borderColor: COLORS.primaryRed + "30",
    ...(Platform.OS === "web"
      ? {
          boxShadow: `0 1px 3px 0 ${COLORS.primaryRed}20`,
        }
      : {
          shadowColor: COLORS.primaryRed,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }),
  },
  cardHovered: {
    ...(Platform.OS === "web"
      ? {
          transform: [{ translateY: -4 }],
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        }
      : {}),
  },
  cardPressed: {
    ...(Platform.OS === "web"
      ? {
          transform: [{ translateY: -2 }],
        }
      : {}),
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    color: COLORS.textGray,
    fontSize: 13,
  },
});

export default ComparisonCard;
