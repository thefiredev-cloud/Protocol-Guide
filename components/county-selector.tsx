import { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "./ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/lib/app-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusTrap } from "@/lib/accessibility";

type County = {
  id: number;
  name: string;
  state: string;
  protocolVersion: string | null;
};

type CountySelectorProps = {
  visible: boolean;
  onClose: () => void;
};

export function CountySelector({ visible, onClose }: CountySelectorProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedCounty, setSelectedCounty } = useAppContext();

  const { data, isLoading } = trpc.counties.list.useQuery(undefined, {
    enabled: visible,
  });

  const filteredCounties = useMemo(() => {
    if (!data?.counties) return [];
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return data.counties;
    
    return data.counties.filter(
      (county) =>
        county.name.toLowerCase().includes(query) ||
        county.state.toLowerCase().includes(query)
    );
  }, [data?.counties, searchQuery]);

  // Group counties by state
  const groupedCounties = useMemo(() => {
    const groups: { state: string; counties: County[] }[] = [];
    const stateMap = new Map<string, County[]>();

    for (const county of filteredCounties) {
      const existing = stateMap.get(county.state);
      if (existing) {
        existing.push(county);
      } else {
        stateMap.set(county.state, [county]);
      }
    }

    // Sort states alphabetically
    const sortedStates = Array.from(stateMap.keys()).sort();
    for (const state of sortedStates) {
      groups.push({
        state,
        counties: stateMap.get(state)!.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    return groups;
  }, [filteredCounties]);

  const handleSelectCounty = (county: County) => {
    setSelectedCounty(county);
    onClose();
  };

  const renderCountyItem = ({ item }: { item: County }) => {
    const isSelected = selectedCounty?.id === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => handleSelectCounty(item)}
        className="flex-row items-center justify-between py-4 px-4 border-b"
        style={{ borderBottomColor: colors.border }}
        activeOpacity={0.7}
      >
        <View className="flex-1">
          <Text className="text-base font-medium text-foreground">{item.name}</Text>
          {item.protocolVersion && (
            <Text className="text-sm text-muted">v{item.protocolVersion}</Text>
          )}
        </View>
        {isSelected && (
          <IconSymbol name="checkmark" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderStateHeader = (state: string) => (
    <View 
      className="px-4 py-2"
      style={{ backgroundColor: colors.surface }}
    >
      <Text className="text-sm font-semibold text-muted">{state}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View 
        className="flex-1"
        style={{ 
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-xl font-bold text-foreground">Select County</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 8,
              minWidth: 48,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Close county selector"
            accessibilityRole="button"
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <View 
            className="flex-row items-center px-4 py-3 rounded-xl"
            style={{ backgroundColor: colors.surface }}
          >
            <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by county or state..."
              placeholderTextColor={colors.muted}
              className="flex-1 ml-3 text-base"
              style={{ color: colors.foreground }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 4,
                }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* County List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-muted mt-4">Loading counties...</Text>
          </View>
        ) : groupedCounties.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-lg text-muted text-center">
              {searchQuery ? "No counties found matching your search" : "No counties available"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedCounties}
            keyExtractor={(item) => item.state}
            renderItem={({ item: group }) => (
              <View>
                {renderStateHeader(group.state)}
                {group.counties.map((county) => (
                  <View key={county.id}>
                    {renderCountyItem({ item: county })}
                  </View>
                ))}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />
        )}
      </View>
    </Modal>
  );
}

// Header button component for triggering the selector
export function CountySelectorButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const { selectedCounty } = useAppContext();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-3 py-2 rounded-lg"
      style={{ backgroundColor: colors.surface }}
      activeOpacity={0.7}
    >
      <IconSymbol name="location.fill" size={16} color={colors.primary} />
      <Text 
        className="ml-2 text-sm font-medium max-w-32"
        style={{ color: colors.foreground }}
        numberOfLines={1}
      >
        {selectedCounty ? selectedCounty.name : "Select County"}
      </Text>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}
