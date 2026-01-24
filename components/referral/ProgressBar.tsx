/**
 * ProgressBar Component
 * 
 * Displays progress toward next tier with percentage.
 */

import { View, Text } from "react-native";
import { COLORS } from "./constants";

export interface ProgressBarProps {
  progress: number;
  label: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const clampedProgress = Math.min(progress, 100);
  
  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: COLORS.textWhite, fontSize: 12, fontWeight: "600" }}>
          {progress}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: COLORS.bgCard,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${clampedProgress}%`,
            height: "100%",
            backgroundColor: COLORS.primaryRed,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
