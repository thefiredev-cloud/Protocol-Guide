import { View, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { getYearColor } from "@/utils/protocol-helpers";
import type { Message } from "@/types/search.types";

interface SummaryCardProps {
  message: Message;
}

export function SummaryCard({ message }: SummaryCardProps) {
  const colors = useColors();
  const yearColor = getYearColor(message.protocolYear, colors);

  return (
    <View className="mb-3">
      {/* Protocol header - minimal */}
      <View
        className="flex-row items-center justify-between px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: colors.primary + "15" }}
      >
        <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>
          {message.protocolTitle || "Protocol"}
        </Text>
        {message.protocolYear && (
          <Text style={{ color: yearColor, fontSize: 12, fontWeight: "700" }}>
            {message.protocolYear}
          </Text>
        )}
      </View>

      {/* Summary - THE MAIN OUTPUT */}
      <View
        className="px-3 py-3 rounded-b-lg border-l border-r border-b"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <Text
          className="text-base text-foreground"
          style={{ lineHeight: 24, letterSpacing: 0.2 }}
        >
          {message.text}
        </Text>

        {/* Medical Disclaimer - Required for legal compliance */}
        <MedicalDisclaimer variant="inline" />
      </View>
    </View>
  );
}
