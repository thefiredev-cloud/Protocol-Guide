import { View, Text, Image, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Agency } from "@/types/search.types";

interface SearchHeaderProps {
  selectedState: string | null;
  selectedAgency: Agency | null;
  onClearFilters: () => void;
}

export function SearchHeader({
  selectedState,
  selectedAgency,
  onClearFilters,
}: SearchHeaderProps) {
  const colors = useColors();

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
      <View className="flex-row items-center">
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 28, height: 28, marginRight: 8 }}
          resizeMode="contain"
        />
        <Text className="text-lg font-bold text-foreground">Protocol Guide</Text>
      </View>
      {/* Filter indicator */}
      {selectedState && (
        <TouchableOpacity
          onPress={onClearFilters}
          className="flex-row items-center px-2 py-1 rounded-full bg-primary/10"
        >
          <Text className="text-xs text-primary font-medium">
            {selectedAgency?.name?.substring(0, 15) || selectedState}
          </Text>
          <IconSymbol name="xmark.circle.fill" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
