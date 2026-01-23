import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useOfflineCache, useOfflineAccess } from "@/hooks/use-offline-cache";
import { CachedProtocol, formatCacheTime } from "@/lib/offline-cache";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppContext } from "@/lib/app-context";
import { useRouter } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { ProFeatureLock, ProBadge } from "@/components/pro-feature-lock";
import { SkeletonHistoryList, Skeleton } from "@/components/ui/Skeleton";

type FilterOption = "all" | "today" | "week" | "month";

export default function HistoryScreen() {
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const { cachedProtocols, removeFromCache } = useOfflineCache();
  const { hasOfflineAccess, tier } = useOfflineAccess();
  const { addMessage } = useAppContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<FilterOption>("all");
  const [countyFilter, setCountyFilter] = useState<number | null>(null);

  // Check if user is on free tier (no offline access)
  const isFreeTier = tier === "free";

  // Get unique counties from cached protocols
  const uniqueCounties = useMemo(() => {
    const counties = new Map<number, string>();
    cachedProtocols.forEach((p) => {
      if (!counties.has(p.countyId)) {
        counties.set(p.countyId, p.countyName);
      }
    });
    return Array.from(counties.entries()).map(([id, name]) => ({ id, name }));
  }, [cachedProtocols]);

  // Filter protocols based on search, date, and county
  const filteredProtocols = useMemo(() => {
    let filtered = [...cachedProtocols];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.query.toLowerCase().includes(query) ||
          p.response.toLowerCase().includes(query) ||
          p.countyName.toLowerCase().includes(query)
      );
    }

    // County filter
    if (countyFilter !== null) {
      filtered = filtered.filter((p) => p.countyId === countyFilter);
    }

    // Date filter
    const now = Date.now();
    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((p) => now - p.timestamp < 24 * 60 * 60 * 1000);
        break;
      case "week":
        filtered = filtered.filter((p) => now - p.timestamp < 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        filtered = filtered.filter((p) => now - p.timestamp < 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return filtered;
  }, [cachedProtocols, searchQuery, dateFilter, countyFilter]);

  // Handle re-running a query
  const handleRerunQuery = useCallback(
    (protocol: CachedProtocol) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Add messages to context
      addMessage({ type: "user", text: protocol.query });
      addMessage({
        type: "assistant",
        text: protocol.response + "\n\n📱 *Retrieved from history*",
        protocolRefs: protocol.protocolRefs,
      });

      // Navigate to home
      router.push("/");
    },
    [addMessage, router]
  );

  // Handle deleting a query
  const handleDelete = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await removeFromCache(id);
    },
    [removeFromCache]
  );

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Please sign in to view your history
        </Text>
      </ScreenContainer>
    );
  }

  const renderHistoryItem = ({ item }: { item: CachedProtocol }) => {
    // Extract protocol title from response
    const protocolMatch = item.response.match(/^PROTOCOL:\s*(.+?)(?:\n|$)/im);
    const protocolTitle = protocolMatch ? protocolMatch[1].trim() : null;

    return (
      <TouchableOpacity
        onPress={() => handleRerunQuery(item)}
        activeOpacity={0.7}
        style={[styles.historyItem, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}
      >
        <View style={styles.historyContent}>
          <View style={styles.historyMain}>
            {/* Query */}
            <Text style={[styles.queryText, { color: colors.foreground }]} numberOfLines={1}>
              {item.query}
            </Text>

            {/* Protocol Title */}
            {protocolTitle && (
              <View style={styles.protocolRow}>
                <View style={[styles.protocolBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name="doc.text.fill" size={12} color={colors.primary} />
                  <Text style={[styles.protocolText, { color: colors.primary }]} numberOfLines={1}>
                    {protocolTitle}
                  </Text>
                </View>
              </View>
            )}

            {/* Response Preview */}
            <Text style={[styles.responsePreview, { color: colors.muted }]} numberOfLines={2}>
              {item.response.replace(/^PROTOCOL:\s*.+?\n/im, "").slice(0, 120)}...
            </Text>

            {/* Metadata */}
            <View style={styles.metaRow}>
              <View style={[styles.countyBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.countyText, { color: colors.muted }]}>{item.countyName}</Text>
              </View>
              <Text style={[styles.timeText, { color: colors.muted }]}>
                {formatCacheTime(item.timestamp)}
              </Text>
            </View>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
        <IconSymbol name="clock.fill" size={32} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {searchQuery || dateFilter !== "all" || countyFilter !== null
          ? "No matching queries found"
          : "No query history yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {searchQuery || dateFilter !== "all" || countyFilter !== null
          ? "Try adjusting your filters"
          : "Your protocol searches will appear here"}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          {isFreeTier && <ProBadge size="medium" />}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search history..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
            editable={!isFreeTier}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <IconSymbol name="xmark" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Filters */}
        <View style={styles.filterRow}>
          {(["all", "today", "week", "month"] as FilterOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setDateFilter(option)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: dateFilter === option ? colors.primary : '#FFFFFF',
                  borderColor: dateFilter === option ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: dateFilter === option ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* County Filter (if multiple counties) */}
        {uniqueCounties.length > 1 && (
          <View style={styles.countyFilterRow}>
            <TouchableOpacity
              onPress={() => setCountyFilter(null)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: countyFilter === null ? colors.primary : '#FFFFFF',
                  borderColor: countyFilter === null ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: countyFilter === null ? "#FFFFFF" : colors.foreground },
                ]}
              >
                All Counties
              </Text>
            </TouchableOpacity>
            {uniqueCounties.map((county) => (
              <TouchableOpacity
                key={county.id}
                onPress={() => setCountyFilter(county.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: countyFilter === county.id ? colors.primary : '#FFFFFF',
                    borderColor: countyFilter === county.id ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: countyFilter === county.id ? "#FFFFFF" : colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {county.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results Count */}
        <Text style={[styles.resultCount, { color: colors.muted }]}>
          {filteredProtocols.length} {filteredProtocols.length === 1 ? "query" : "queries"}
          {searchQuery || dateFilter !== "all" || countyFilter !== null ? " found" : " in history"}
        </Text>
      </View>

      {/* History List - wrapped with ProFeatureLock for free users */}
      <ProFeatureLock
        locked={isFreeTier}
        featureName="Offline History"
        description="Upgrade to Pro to save and access your protocol search history offline"
        style={styles.listWrapper}
      >
        <FlatList
          data={filteredProtocols}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </ProFeatureLock>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  listWrapper: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  countyFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItem: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyMain: {
    flex: 1,
    marginRight: 12,
  },
  queryText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  protocolRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  protocolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  responsePreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  countyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
    marginTop: -4,
    marginRight: -4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
