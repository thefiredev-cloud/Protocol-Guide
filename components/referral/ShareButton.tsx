/**
 * ShareButton Component
 * 
 * A reusable button for different share methods (SMS, WhatsApp, Email, etc.)
 */

import { Text, Pressable } from "react-native";
import { COLORS } from "./constants";

export interface ShareButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export function ShareButton({ icon, label, onPress, color = COLORS.bgCard }: ShareButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.border : color,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 1,
        marginHorizontal: 4,
      })}
    >
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}
