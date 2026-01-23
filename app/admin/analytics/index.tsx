/**
 * Agency Analytics Screen
 * Usage statistics and protocol analytics
 */

import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function AnalyticsScreen() {
  const colors = useColors();

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const { data: protocols } = trpc.agencyAdmin.listProtocols.useQuery(
    { agencyId: agencyId!, limit: 100 },
    { enabled: !!agencyId }
  );

  const { data: members } = trpc.agencyAdmin.listMembers.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  // Calculate stats
  const totalProtocols = protocols?.total || 0;
  const publishedProtocols = protocols?.items?.filter((p) => p.status === "published").length || 0;
  const draftProtocols = protocols?.items?.filter((p) => p.status === "draft").length || 0;
  const totalChunks = protocols?.items?.reduce((sum, p) => sum + (p.chunksGenerated || 0), 0) || 0;
  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter((m) => m.status === "active").length || 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Usage statistics for your agency
        </Text>
      </View>

      {/* Protocol Stats */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Protocols</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalProtocols}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{publishedProtocols}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Published</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{draftProtocols}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Drafts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalChunks}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Chunks</Text>
          </View>
        </View>
      </View>

      {/* Team Stats */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="person.2.fill" size={20} color={colors.success} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Team</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{activeMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Active</Text>
          </View>
        </View>
      </View>

      {/* Usage Over Time (Placeholder) */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Usage Trends</Text>
        </View>

        <View style={styles.chartPlaceholder}>
          <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
          <Text style={[styles.placeholderText, { color: colors.muted }]}>
            Detailed analytics coming soon
          </Text>
          <Text style={[styles.placeholderSubtext, { color: colors.muted }]}>
            Track protocol searches, user engagement, and more
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={[styles.quickStats, { backgroundColor: colors.primary + "10" }]}>
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.primary }]}>
            {publishedProtocols > 0 ? Math.round((publishedProtocols / totalProtocols) * 100) : 0}%
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.foreground }]}>Publish Rate</Text>
        </View>
        <View style={[styles.quickStatDivider, { backgroundColor: colors.primary + "30" }]} />
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.primary }]}>
            {totalProtocols > 0 ? Math.round(totalChunks / totalProtocols) : 0}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.foreground }]}>Avg Chunks/Protocol</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    width: "50%",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  chartPlaceholder: {
    alignItems: "center",
    paddingVertical: 32,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  quickStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    marginHorizontal: 16,
  },
});
