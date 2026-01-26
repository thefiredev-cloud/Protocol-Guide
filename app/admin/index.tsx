/**
 * Agency Admin Dashboard
 * Professional overview with key metrics, analytics preview, and quick actions
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function AdminDashboard() {
  const colors = useColors();
  const router = useRouter();

  // Fetch agency data
  const { data: agencies, isLoading: agenciesLoading } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const { data: members } = trpc.agencyAdmin.listMembers.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  const { data: protocols } = trpc.agencyAdmin.listProtocols.useQuery(
    { agencyId: agencyId!, limit: 5 },
    { enabled: !!agencyId }
  );

  // Fetch analytics preview
  const { data: searchAnalytics } = trpc.agencyAdmin.getSearchAnalytics.useQuery(
    { agencyId: agencyId!, days: 7 },
    { enabled: !!agencyId }
  );

  const { data: userAnalytics } = trpc.agencyAdmin.getUserAnalytics.useQuery(
    { agencyId: agencyId!, days: 7 },
    { enabled: !!agencyId }
  );

  const agency = agencies?.[0];

  // Calculate week-over-week trend (mock for now)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (agenciesLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {agency?.name || "Loading..."}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewAnalyticsButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin/analytics" as any)}
        >
          <IconSymbol name="chart.bar.fill" size={14} color="#FFFFFF" />
          <Text style={styles.viewAnalyticsText}>View Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards - Enhanced */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {searchAnalytics?.summary?.totalSearches?.toLocaleString() || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Searches (7d)</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + "15" }]}>
            <IconSymbol name="person.fill.checkmark" size={20} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {userAnalytics?.activeMembers || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Active Users</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.warning + "15" }]}>
            <IconSymbol name="doc.text.fill" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {protocols?.total || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Protocols</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.muted + "15" }]}>
            <IconSymbol name="person.2.fill" size={20} color={colors.muted} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {members?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Team</Text>
        </View>
      </View>

      {/* Analytics Preview */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This Week</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/admin/analytics" as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.analyticsPreview}>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: colors.foreground }]}>
              {searchAnalytics?.summary?.avgSearchesPerDay || 0}
            </Text>
            <Text style={[styles.analyticsLabel, { color: colors.muted }]}>Avg Searches/Day</Text>
          </View>
          <View style={[styles.analyticsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: colors.foreground }]}>
              {userAnalytics?.avgSearchesPerUser || 0}
            </Text>
            <Text style={[styles.analyticsLabel, { color: colors.muted }]}>Searches/User</Text>
          </View>
          <View style={[styles.analyticsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: (searchAnalytics?.summary?.noResultsRate ?? 0) > 10 ? colors.warning : colors.success }]}>
              {searchAnalytics?.summary?.noResultsRate || 0}%
            </Text>
            <Text style={[styles.analyticsLabel, { color: colors.muted }]}>No Results Rate</Text>
          </View>
        </View>

        {/* Top Searches Quick View */}
        {searchAnalytics?.topQueries && searchAnalytics.topQueries.length > 0 && (
          <View style={styles.topSearches}>
            <Text style={[styles.topSearchesTitle, { color: colors.muted }]}>Top Searches</Text>
            <View style={styles.topSearchesList}>
              {searchAnalytics.topQueries.slice(0, 5).map((q: any, i: number) => (
                <View key={i} style={[styles.topSearchItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.topSearchText, { color: colors.foreground }]} numberOfLines={1}>
                    {q.query}
                  </Text>
                  <Text style={[styles.topSearchCount, { color: colors.primary }]}>{q.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/admin/protocols/upload" as any)}
          >
            <IconSymbol name="arrow.up.doc.fill" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Upload Protocol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => router.push("/admin/team/invite" as any)}
          >
            <IconSymbol name="person.badge.plus" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Invite Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Protocols */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Protocols</Text>
          <TouchableOpacity onPress={() => router.push("/admin/protocols" as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {protocols?.items && protocols.items.length > 0 ? (
          protocols.items.slice(0, 5).map((protocol) => (
            <TouchableOpacity
              key={protocol.id}
              style={[styles.protocolItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/admin/protocols/${protocol.id}` as any)}
            >
              <View style={styles.protocolInfo}>
                <Text style={[styles.protocolNumber, { color: colors.muted }]}>
                  {protocol.protocolNumber}
                </Text>
                <Text style={[styles.protocolTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {protocol.title}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      protocol.status === "published"
                        ? colors.success + "20"
                        : protocol.status === "draft"
                        ? colors.muted + "20"
                        : colors.warning + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        protocol.status === "published"
                          ? colors.success
                          : protocol.status === "draft"
                          ? colors.muted
                          : colors.warning,
                    },
                  ]}
                >
                  {protocol.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No protocols yet. Upload your first protocol to get started.
          </Text>
        )}
      </View>

      {/* Subscription Info */}
      {agency && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subscription</Text>
          <View style={styles.subscriptionInfo}>
            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: colors.muted }]}>Plan</Text>
              <Text style={[styles.subscriptionValue, { color: colors.foreground }]}>
                {agency.subscriptionTier
                  ? agency.subscriptionTier.charAt(0).toUpperCase() + agency.subscriptionTier.slice(1)
                  : "Starter"}
              </Text>
            </View>
            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: colors.muted }]}>Status</Text>
              <Text style={[styles.subscriptionValue, { color: colors.success }]}>
                {agency.subscriptionStatus || "Active"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.manageButton, { borderColor: colors.primary }]}
            onPress={() => router.push("/admin/settings/billing" as any)}
          >
            <Text style={[styles.manageButtonText, { color: colors.primary }]}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  viewAnalyticsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewAnalyticsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    flexBasis: "22%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 100,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  analyticsPreview: {
    flexDirection: "row",
    paddingVertical: 16,
  },
  analyticsItem: {
    flex: 1,
    alignItems: "center",
  },
  analyticsValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  analyticsLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  analyticsDivider: {
    width: 1,
    height: "100%",
  },
  topSearches: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  topSearchesTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  topSearchesList: {
    gap: 6,
  },
  topSearchItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  topSearchText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  topSearchCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  section: {
    margin: 24,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  protocolItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  protocolInfo: {
    flex: 1,
    marginRight: 12,
  },
  protocolNumber: {
    fontSize: 12,
    marginBottom: 2,
  },
  protocolTitle: {
    fontSize: 14,
    fontWeight: "500",
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
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  subscriptionInfo: {
    marginVertical: 12,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subscriptionLabel: {
    fontSize: 14,
  },
  subscriptionValue: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  manageButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
