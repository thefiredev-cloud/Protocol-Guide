/**
 * Protocol List Screen
 * Browse and manage agency protocols
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

type ProtocolStatus = "draft" | "review" | "approved" | "published" | "archived" | undefined;

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const;

export default function ProtocolsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ProtocolStatus>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const { data: protocols, isLoading } = trpc.agencyAdmin.listProtocols.useQuery(
    { agencyId: agencyId!, status: statusFilter, limit: 100 },
    { enabled: !!agencyId }
  );

  const filteredProtocols = protocols?.items?.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(query) ||
      p.protocolNumber.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return colors.success;
      case "approved":
        return colors.primary;
      case "review":
        return colors.warning;
      case "archived":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Protocols</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {protocols?.total || 0} total protocols
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin/protocols/upload" as any)}
        >
          <IconSymbol name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search protocols..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === filter.value ? colors.primary : colors.card,
                borderColor: statusFilter === filter.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setStatusFilter(filter.value as ProtocolStatus)}
          >
            <Text
              style={[
                styles.filterText,
                { color: statusFilter === filter.value ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Protocol List */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading protocols...</Text>
          </View>
        ) : filteredProtocols && filteredProtocols.length > 0 ? (
          filteredProtocols.map((protocol) => (
            <TouchableOpacity
              key={protocol.id}
              style={[styles.protocolCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/admin/protocols/${protocol.id}` as any)}
            >
              <View style={styles.protocolHeader}>
                <Text style={[styles.protocolNumber, { color: colors.primary }]}>
                  {protocol.protocolNumber}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(protocol.status) + "20" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(protocol.status) }]}>
                    {protocol.status}
                  </Text>
                </View>
              </View>

              <Text style={[styles.protocolTitle, { color: colors.foreground }]} numberOfLines={2}>
                {protocol.title}
              </Text>

              <View style={styles.protocolMeta}>
                <Text style={[styles.metaText, { color: colors.muted }]}>v{protocol.version}</Text>
                <Text style={[styles.metaText, { color: colors.muted }]}>
                  {protocol.chunksGenerated || 0} chunks
                </Text>
                {protocol.effectiveDate && (
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    Effective: {new Date(protocol.effectiveDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="doc.text" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Protocols Found</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {searchQuery
                ? "Try a different search term"
                : "Upload your first protocol to get started"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  protocolCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  protocolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  protocolNumber: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  protocolTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 20,
  },
  protocolMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
