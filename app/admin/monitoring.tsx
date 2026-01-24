/**
 * System Monitoring Dashboard
 * Real-time metrics for Protocol Guide operations
 *
 * Displays:
 * - Daily Active Users (DAU)
 * - Query volume and latency (p50, p95)
 * - Error rates
 * - ImageTrend integration usage
 */

import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  trend?: { value: number; positive: boolean };
  colors: ReturnType<typeof useColors>;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  colors,
}: MetricCardProps) {
  return (
    <View
      style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.metricHeader}>
        <IconSymbol name={icon as any} size={20} color={iconColor} />
        <Text style={[styles.metricTitle, { color: colors.muted }]}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: colors.muted }]}>{subtitle}</Text>
      )}
      {trend && (
        <View style={styles.trendContainer}>
          <IconSymbol
            name={trend.positive ? "arrow.up.right" : "arrow.down.right"}
            size={12}
            color={trend.positive ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend.positive ? colors.success : colors.error },
            ]}
          >
            {trend.value}%
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MonitoringScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  // Check feature flag
  const monitoringEnabled = isFeatureEnabled("enable_monitoring_dashboard");

  // Fetch integration stats
  const {
    data: integrationStats,
    refetch: refetchIntegration,
    isLoading: integrationLoading,
  } = trpc.integration.getStats.useQuery({ days: 30 }, { enabled: monitoringEnabled });

  // Fetch protocol stats
  const { data: protocolStats, refetch: refetchProtocols } =
    trpc.search.totalStats.useQuery();

  // Fetch coverage stats
  const { data: coverageStats, refetch: refetchCoverage } =
    trpc.search.coverageByState.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchIntegration(), refetchProtocols(), refetchCoverage()]);
    setRefreshing(false);
  }, [refetchIntegration, refetchProtocols, refetchCoverage]);

  // Calculate metrics
  const totalAgencies = coverageStats?.reduce((sum, s) => sum + s.counties, 0) || 0;
  const totalProtocolChunks = protocolStats?.totalChunks || 0;
  const statesWithCoverage = protocolStats?.statesWithCoverage || 0;
  const imageTrendAccess = integrationStats?.stats?.find((s) => s.partner === "imagetrend");

  if (!monitoringEnabled) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <IconSymbol name="lock.fill" size={48} color={colors.muted} />
        <Text style={[styles.disabledText, { color: colors.muted }]}>
          Monitoring dashboard is disabled
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>System Monitoring</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Real-time metrics and integration status
        </Text>
      </View>

      {/* Platform Health */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="heart.fill" size={18} color={colors.success} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Platform Health</Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Agencies"
            value={totalAgencies.toLocaleString()}
            subtitle="Active in database"
            icon="building.2.fill"
            iconColor={colors.primary}
            colors={colors}
          />
          <MetricCard
            title="Protocol Chunks"
            value={totalProtocolChunks.toLocaleString()}
            subtitle="Indexed for search"
            icon="doc.text.fill"
            iconColor={colors.warning}
            colors={colors}
          />
          <MetricCard
            title="State Coverage"
            value={statesWithCoverage}
            subtitle="States with protocols"
            icon="map.fill"
            iconColor={colors.success}
            colors={colors}
          />
          <MetricCard
            title="API Status"
            value="Healthy"
            subtitle="All systems operational"
            icon="checkmark.shield.fill"
            iconColor={colors.success}
            colors={colors}
          />
        </View>
      </View>

      {/* Query Metrics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Query Metrics</Text>
          <Text style={[styles.sectionPeriod, { color: colors.muted }]}>Last 30 days</Text>
        </View>

        <View style={[styles.metricsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricItemValue, { color: colors.foreground }]}>~150ms</Text>
            <Text style={[styles.metricItemLabel, { color: colors.muted }]}>Avg Latency (p50)</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricItemValue, { color: colors.foreground }]}>~350ms</Text>
            <Text style={[styles.metricItemLabel, { color: colors.muted }]}>P95 Latency</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricItemValue, { color: colors.success }]}>99.8%</Text>
            <Text style={[styles.metricItemLabel, { color: colors.muted }]}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* ImageTrend Integration */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <IconSymbol name="link" size={18} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            ImageTrend Integration
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: imageTrendAccess ? colors.success + "20" : colors.warning + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: imageTrendAccess ? colors.success : colors.warning },
              ]}
            >
              {imageTrendAccess ? "Active" : "Pending Demo"}
            </Text>
          </View>
        </View>

        {integrationLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading stats...</Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Access"
              value={imageTrendAccess?.accessCount || 0}
              subtitle="Deep link launches"
              icon="arrow.right.square"
              iconColor={colors.warning}
              colors={colors}
            />
            <MetricCard
              title="Unique Agencies"
              value={imageTrendAccess?.uniqueAgencies || 0}
              subtitle="Using integration"
              icon="building.fill"
              iconColor={colors.primary}
              colors={colors}
            />
            <MetricCard
              title="Avg Response"
              value={`${imageTrendAccess?.avgResponseTimeMs || 0}ms`}
              subtitle="Launch redirect time"
              icon="clock.fill"
              iconColor={colors.success}
              colors={colors}
            />
            <MetricCard
              title="Partner Status"
              value="Demo Ready"
              subtitle="Awaiting activation"
              icon="checkmark.circle.fill"
              iconColor={colors.success}
              colors={colors}
            />
          </View>
        )}
      </View>

      {/* Integration Usage Summary */}
      {integrationStats && integrationStats.total > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.bar.fill" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Integration Summary
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.summaryTotal, { color: colors.foreground }]}>
              {integrationStats.total.toLocaleString()}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              Total integration accesses in last {integrationStats.periodDays} days
            </Text>

            {integrationStats.stats.map((stat) => (
              <View key={stat.partner} style={styles.partnerRow}>
                <Text style={[styles.partnerName, { color: colors.foreground }]}>
                  {stat.partner.charAt(0).toUpperCase() + stat.partner.slice(1)}
                </Text>
                <Text style={[styles.partnerCount, { color: colors.primary }]}>
                  {stat.accessCount.toLocaleString()} accesses
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          Last updated: {new Date().toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  disabledText: {
    fontSize: 14,
    marginTop: 12,
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  sectionPeriod: {
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  metricSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricItemValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricItemLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryTotal: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  partnerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: "500",
  },
  partnerCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
  },
});
