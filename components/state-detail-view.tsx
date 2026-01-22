import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getApiBaseUrl } from "@/constants/oauth";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated";

// Agency data from the Rust API
interface Agency {
  id: number;
  name: string;
  state: string;
  protocol_count: number;
}

interface StateDetailViewProps {
  stateName: string;
  stateCode: string;
  totalProtocols: number;
  totalAgencies: number;
  onClose: () => void;
  visible: boolean;
}

export function StateDetailView({
  stateName,
  stateCode,
  totalProtocols,
  totalAgencies,
  onClose,
  visible,
}: StateDetailViewProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    if (visible && stateName) {
      fetchAgencies();
    }
  }, [visible, stateName]);

  async function fetchAgencies() {
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/counties/by-state?state=${encodeURIComponent(stateName)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch agencies: ${response.status}`);
      }

      const data: Agency[] = await response.json();
      
      // Sort by protocol count descending, filter out agencies with 0 protocols
      const sortedAgencies = data
        .filter((a) => a.protocol_count > 0)
        .sort((a, b) => b.protocol_count - a.protocol_count);

      setAgencies(sortedAgencies);
    } catch (err) {
      console.error("Error fetching agencies:", err);
      setError(err instanceof Error ? err.message : "Failed to load agencies");
    } finally {
      setIsLoading(false);
    }
  }

  const navigateToSearch = (agencyId?: number) => {
    onClose();
    router.push({
      pathname: "/(tabs)",
      params: agencyId 
        ? { stateFilter: stateName, agencyId: agencyId.toString() }
        : { stateFilter: stateName },
    });
  };

  const renderAgencyItem = ({ item, index }: { item: Agency; index: number }) => {
    const isTopAgency = index < 3;

    return (
      <TouchableOpacity
        onPress={() => navigateToSearch(item.id)}
        activeOpacity={0.7}
        style={{
          backgroundColor: isTopAgency ? `${colors.primary}15` : colors.surface,
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: isTopAgency ? `${colors.primary}40` : colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: colors.foreground,
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconSymbol name="paperplane.fill" size={12} color={colors.muted} />
              <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 4 }}>
                {item.protocol_count.toLocaleString()} protocols
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
              Search
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#1F2937" }}>
              {stateName}
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              {stateCode} • {totalAgencies} agencies • {totalProtocols.toLocaleString()} protocols
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="chevron.right" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search All Button */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={() => navigateToSearch()}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#6366F1",
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="magnifyingglass" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              Search All {stateName} Protocols
            </Text>
          </TouchableOpacity>
        </View>

        {/* Agencies List */}
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 12,
              marginTop: 4,
            }}
          >
            EMS Agencies
          </Text>

          {isLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={{ color: "#6B7280", marginTop: 12 }}>Loading agencies...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#EF4444" />
              <Text style={{ color: "#EF4444", marginTop: 12, textAlign: "center" }}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchAgencies}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: "#6366F1",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : agencies.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="house.fill" size={40} color="#9CA3AF" />
              <Text style={{ color: "#6B7280", marginTop: 12, textAlign: "center" }}>
                No agencies with protocols found for {stateName}
              </Text>
            </View>
          ) : (
            <FlatList
              data={agencies}
              renderItem={renderAgencyItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListHeaderComponent={
                <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 12 }}>
                  Tap an agency to search its protocols
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
