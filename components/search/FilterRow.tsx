import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Agency } from "@/types/search.types";

interface FilterRowProps {
  selectedState: string | null;
  selectedAgency: Agency | null;
  agenciesLoading: boolean;
  onOpenStateModal: () => void;
  onOpenAgencyModal: () => void;
}

export function FilterRow({
  selectedState,
  selectedAgency,
  agenciesLoading,
  onOpenStateModal,
  onOpenAgencyModal,
}: FilterRowProps) {
  const colors = useColors();

  return (
    <View className="flex-row px-4 py-2 gap-2">
      <TouchableOpacity
        onPress={onOpenStateModal}
        className="flex-1 flex-row items-center justify-between bg-surface rounded-xl px-4 border border-border"
        style={{ minHeight: 44, paddingVertical: 10 }}
        activeOpacity={0.7}
        accessibilityLabel={selectedState ? `State filter: ${selectedState}` : "Select state filter"}
        accessibilityRole="button"
        accessibilityHint="Opens state selection menu"
      >
        <Text
          className="text-sm"
          style={{ color: selectedState ? colors.foreground : colors.muted }}
          numberOfLines={1}
        >
          {selectedState || "State"}
        </Text>
        <IconSymbol name="chevron.right" size={14} color={colors.muted} />
      </TouchableOpacity>

      {selectedState && (
        <TouchableOpacity
          onPress={onOpenAgencyModal}
          className="flex-1 flex-row items-center justify-between bg-surface rounded-xl px-4 border border-border"
          style={{ minHeight: 44, paddingVertical: 10 }}
          activeOpacity={0.7}
          accessibilityLabel={selectedAgency ? `Agency filter: ${selectedAgency.name}` : "Select agency filter"}
          accessibilityRole="button"
          accessibilityHint="Opens agency selection menu"
        >
          <Text
            className="text-sm"
            style={{ color: selectedAgency ? colors.foreground : colors.muted }}
            numberOfLines={1}
          >
            {agenciesLoading
              ? "..."
              : selectedAgency?.name?.substring(0, 12) || "Agency"}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
