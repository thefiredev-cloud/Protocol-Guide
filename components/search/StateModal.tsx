import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SkeletonListItem } from "@/components/ui/Skeleton";
import type { StateCoverage } from "@/types/search.types";

interface StateModalProps {
  visible: boolean;
  onClose: () => void;
  states: StateCoverage[];
  loading: boolean;
  error?: Error | null;
  onSelectState: (state: string | null) => void;
}

export function StateModal({
  visible,
  onClose,
  states,
  loading,
  error,
  onSelectState,
}: StateModalProps) {
  const colors = useColors();

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
          <Text className="text-lg font-semibold text-foreground">Select State</Text>
          <TouchableOpacity onPress={onClose}>
            <IconSymbol name="xmark.circle.fill" size={26} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View className="flex-1 items-center justify-center px-4 py-8">
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.error} />
            <Text className="text-base font-medium mt-3" style={{ color: colors.error }}>
              Unable to Load States
            </Text>
            <Text className="text-sm text-center mt-1" style={{ color: colors.muted }}>
              Check your connection and try again
            </Text>
          </View>
        ) : loading ? (
          <View className="flex-1 px-4 pt-4">
            <View style={{ gap: 8 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonListItem key={i} showAvatar={false} lines={1} />
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={states}
            keyExtractor={(item) => item.stateCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelectState(item.state);
                  onClose();
                }}
                className="flex-row items-center justify-between px-4 py-3 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <Text className="text-base text-foreground">{item.state}</Text>
                <Text className="text-sm text-muted">{item.chunks.toLocaleString()}</Text>
              </TouchableOpacity>
            )}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => {
                  onSelectState(null);
                  onClose();
                }}
                className="flex-row items-center justify-between px-4 py-3 border-b bg-surface"
                style={{ borderBottomColor: colors.border }}
              >
                <Text className="text-base text-foreground">All States</Text>
              </TouchableOpacity>
            }
          />
        )}
      </View>
    </Modal>
  );
}
