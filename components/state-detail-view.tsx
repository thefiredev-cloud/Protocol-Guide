import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { SkeletonListItem } from "@/components/ui/Skeleton";
import { useFocusTrap } from "@/lib/accessibility";
import { trpc } from "@/lib/trpc";

// Agency data from tRPC
interface Agency {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
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
  const colors = useColors();
  const router = useRouter();

  // Focus trap for accessibility (WCAG 2.4.3)
  const { containerRef, containerProps } = useFocusTrap({
    visible,
    onClose,
    allowEscapeClose: true,
  });

  // Use tRPC to fetch agencies by state
  const { data: agenciesData, isLoading, error: queryError, refetch } = trpc.search.agenciesByState.useQuery(
    { state: stateName },
    { enabled: visible && !!stateName }
  );

  // Transform and sort agencies
  const agencies: Agency[] = (agenciesData ?? [])
    .filter((a: { id: number | null; protocolCount: number }) => a.id != null && a.protocolCount > 0)
    .sort((a: { protocolCount: number }, b: { protocolCount: number }) => b.protocolCount - a.protocolCount)
    .map((a: { id: number; name: string; state: string; protocolCount: number }) => ({
      id: a.id,
      name: a.name,
      state: a.state,
      protocolCount: a.protocolCount,
    }));

  const error = queryError?.message || null;

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
                {item.protocolCount.toLocaleString()} protocols
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
      <View
        ref={containerRef}
        {...containerProps}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
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
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
              {stateName}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
              {stateCode} • {totalAgencies} agencies • {totalProtocols.toLocaleString()} protocols
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Search All Button */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={() => navigateToSearch()}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary,
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
              color: colors.foreground,
              marginBottom: 12,
              marginTop: 4,
            }}
          >
            EMS Agencies
          </Text>

          {isLoading ? (
            <View style={{ flex: 1, paddingTop: 8 }}>
              <Text style={{ color: colors.muted, marginBottom: 12, fontSize: 13 }}>
                Loading agencies...
              </Text>
              <View style={{ gap: 10 }}>
                <SkeletonListItem showAvatar={false} lines={2} />
                <SkeletonListItem showAvatar={false} lines={2} />
                <SkeletonListItem showAvatar={false} lines={2} />
                <SkeletonListItem showAvatar={false} lines={2} />
                <SkeletonListItem showAvatar={false} lines={2} />
              </View>
            </View>
          ) : error ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color={colors.error} />
              <Text style={{ color: colors.error, marginTop: 12, textAlign: "center" }}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : agencies.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="house.fill" size={40} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>
                No agencies with protocols found for {stateName}
              </Text>
            </View>
          ) : (
            <FlatList
              data={agencies}
              renderItem={renderAgencyItem}
              keyExtractor={(item, index) => item.id?.toString() ?? `agency-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListHeaderComponent={
                <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
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
