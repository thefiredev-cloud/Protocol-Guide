import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SkeletonListItem } from "@/components/ui/Skeleton";
import type { Agency } from "@/types/search.types";

interface AgencyModalProps {
  visible: boolean;
  onClose: () => void;
  agencies: Agency[];
  loading: boolean;
  selectedAgency: Agency | null;
  onSelectAgency: (agency: Agency | null) => void;
  /** Optional: Check if user can add another county (monetization) */
  onCheckCountyRestriction?: () => boolean;
  /** Optional: Track when user selects a county (monetization) */
  onIncrementCounty?: () => void;
}

export function AgencyModal({
  visible,
  onClose,
  agencies,
  loading,
  selectedAgency,
  onSelectAgency,
  onCheckCountyRestriction,
  onIncrementCounty,
}: AgencyModalProps) {
  const colors = useColors();

  const handleSelectAgency = (agency: Agency) => {
    // Check county restriction before allowing selection (if monetization enabled)
    // If user already has an agency selected, they can switch freely
    // If they don't have one, check if they can add
    if (onCheckCountyRestriction && !selectedAgency && !onCheckCountyRestriction()) {
      onClose();
      return; // Modal will be shown by the hook
    }
    onSelectAgency(agency);
    onClose();
    // Track that user has selected a county (if monetization enabled)
    if (onIncrementCounty && !selectedAgency) {
      onIncrementCounty();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text className="text-lg font-semibold text-foreground">Select Agency</Text>
          <TouchableOpacity 
            onPress={onClose}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            accessibilityLabel="Close agency selector"
            accessibilityRole="button"
          >
            <IconSymbol name="xmark.circle.fill" size={26} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 px-4 pt-4">
            <View style={{ gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonListItem key={i} showAvatar={false} lines={1} />
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={agencies}
            keyExtractor={(item, index) => item.id?.toString() ?? `agency-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectAgency(item)}
                className="flex-row items-center justify-between px-4 border-b"
                style={{ borderBottomColor: colors.border, minHeight: 48, paddingVertical: 12 }}
                accessibilityLabel={`Select ${item.name}, ${item.protocolCount} protocols`}
                accessibilityRole="button"
              >
                <Text className="text-base text-foreground flex-1 mr-2" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-sm text-muted">{item.protocolCount}</Text>
              </TouchableOpacity>
            )}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => {
                  onSelectAgency(null);
                  onClose();
                }}
                className="flex-row items-center justify-between px-4 border-b bg-surface"
                style={{ borderBottomColor: colors.border, minHeight: 48, paddingVertical: 12 }}
                accessibilityLabel="Select all agencies"
                accessibilityRole="button"
              >
                <Text className="text-base text-foreground">All Agencies</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="text-muted">No agencies found</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
