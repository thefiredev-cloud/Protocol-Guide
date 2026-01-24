import { View, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface VoiceErrorBannerProps {
  error: string | null;
}

export function VoiceErrorBanner({ error }: VoiceErrorBannerProps) {
  const colors = useColors();

  if (!error) return null;

  return (
    <View
      className="mx-4 mb-2 px-3 py-2 rounded-lg"
      style={{ backgroundColor: colors.error + "20" }}
    >
      <Text className="text-sm text-center" style={{ color: colors.error }}>
        {error}
      </Text>
    </View>
  );
}
