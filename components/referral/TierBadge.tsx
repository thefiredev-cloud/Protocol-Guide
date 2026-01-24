/**
 * TierBadge Component
 * 
 * Displays a tier badge with color and icon (Bronze, Silver, Gold, etc.)
 */

import { View, Text } from "react-native";
import { COLORS, TIER_COLORS, TIER_ICONS } from "./constants";

export interface TierBadgeProps {
  tier: string;
  size?: "small" | "large";
}

export function TierBadge({ tier, size = "small" }: TierBadgeProps) {
  const tierKey = tier.toLowerCase() as keyof typeof TIER_COLORS;
  const color = TIER_COLORS[tierKey] || COLORS.textMuted;
  const icon = TIER_ICONS[tierKey] || "?";
  const dimensions = size === "large" ? 40 : 24;

  return (
    <View
      style={{
        width: dimensions,
        height: dimensions,
        borderRadius: dimensions / 2,
        backgroundColor: color + "30",
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: color,
          fontSize: size === "large" ? 18 : 12,
          fontWeight: "700",
        }}
      >
        {icon}
      </Text>
    </View>
  );
}
