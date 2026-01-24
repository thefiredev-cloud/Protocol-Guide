/**
 * StatCard Component
 * 
 * Displays a stat value with label, optionally highlighted.
 */

import { View, Text } from "react-native";
import { COLORS } from "./constants";

export interface StatCardProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

export function StatCard({ value, label, highlight }: StatCardProps) {
  return (
    <View
      style={{
        backgroundColor: highlight ? COLORS.primaryRed + "20" : COLORS.bgCard,
        borderRadius: 8,
        padding: 12,
        flex: 1,
        marginHorizontal: 4,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: highlight ? COLORS.primaryRed : COLORS.textWhite,
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
