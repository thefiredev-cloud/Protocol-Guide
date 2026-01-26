import { memo } from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { SummaryCard } from "./SummaryCard";
import type { Message } from "@/types/search.types";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const colors = useColors();

  if (message.type === "user") {
    return (
      <View className="mb-2 items-end">
        <View
          className="px-3 py-2 rounded-2xl max-w-[85%]"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white text-base">{message.text}</Text>
        </View>
      </View>
    );
  }

  if (message.type === "summary") {
    return <SummaryCard message={message} />;
  }

  // Error message
  return (
    <View className="mb-2">
      <View className="px-3 py-2 rounded-lg bg-surface">
        <Text className="text-muted text-sm">{message.text}</Text>
      </View>
    </View>
  );
});
