/**
 * EmptySearchState - Web-optimized version
 * Uses CSS animations instead of react-native-reanimated
 * This reduces the initial bundle by ~400KB
 */
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RecentSearches } from "@/components/recent-searches";
import { OfflineCache, CachedProtocol, formatCacheTime } from "@/lib/offline-cache";
import { useNetworkStatus } from "@/hooks/use-offline-cache";

interface EmptySearchStateProps {
  onSelectSearch: (text: string) => void;
}

// Curated example searches for quick access
const QUICK_SEARCHES = [
  { text: "cardiac arrest adult", icon: "heart.fill" as const },
  { text: "pediatric seizure", icon: "person.fill" as const },
  { text: "vtach amiodarone dose", icon: "pills.fill" as const },
  { text: "STEMI protocol", icon: "waveform.path.ecg" as const },
];

// CSS animation classes (web-only, cast as any for RN type compat)
const animateStyles = {
  fadeIn: { animation: 'fadeIn 0.3s ease-out forwards' } as any,
  fadeInDelayed: (delay: number) => ({ 
    animation: `fadeIn 0.3s ease-out ${delay}ms forwards`,
    opacity: 0 
  } as any),
  fadeInDown: { animation: 'fadeInUp 0.4s ease-out forwards' } as any,
  fadeInDownDelayed: (delay: number) => ({
    animation: `fadeInUp 0.4s ease-out ${delay}ms forwards`,
    opacity: 0
  } as any),
};

export function EmptySearchState({ onSelectSearch }: EmptySearchStateProps) {
  const colors = useColors();
  const isOnline = useNetworkStatus();
  const [cachedProtocols, setCachedProtocols] = useState<CachedProtocol[]>([]);
  const [showOfflineContent, setShowOfflineContent] = useState(false);

  // Load cached protocols when offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineContent(true);
      loadCachedProtocols();
    } else {
      setShowOfflineContent(false);
    }
  }, [isOnline]);

  const loadCachedProtocols = async () => {
    const protocols = await OfflineCache.getRecentProtocols(10);
    setCachedProtocols(protocols);
  };

  // Offline mode - show cached protocols
  if (showOfflineContent) {
    return (
      <View className="flex-1">
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Offline Banner */}
          <View
            style={[styles.offlineBanner, { backgroundColor: `${colors.warning}20` }, animateStyles.fadeIn]}
          >
            <IconSymbol name="wifi.slash" size={18} color={colors.warning} />
            <View style={styles.offlineBannerText}>
              <Text style={[styles.offlineBannerTitle, { color: colors.foreground }]}>
                You&apos;re Offline
              </Text>
              <Text style={[styles.offlineBannerSubtitle, { color: colors.muted }]}>
                Showing cached protocols • New searches will sync when online
              </Text>
            </View>
          </View>

          {/* Cached Protocols */}
          {cachedProtocols.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Available Offline ({cachedProtocols.length})
              </Text>
              {cachedProtocols.map((protocol, index) => (
                <View
                  key={protocol.id}
                  style={animateStyles.fadeInDownDelayed(index * 50)}
                >
                  <TouchableOpacity
                    onPress={() => onSelectSearch(protocol.query)}
                    style={[styles.cachedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cachedItemHeader}>
                      <IconSymbol name="doc.text.fill" size={16} color={colors.primary} />
                      <Text style={[styles.cachedItemTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {protocol.query}
                      </Text>
                      {protocol.isFavorite && (
                        <IconSymbol name="star.fill" size={14} color={colors.warning} />
                      )}
                    </View>
                    {protocol.protocolTitle && (
                      <Text style={[styles.cachedItemProtocol, { color: colors.primary }]} numberOfLines={1}>
                        {protocol.protocolTitle}
                      </Text>
                    )}
                    <View style={styles.cachedItemMeta}>
                      <Text style={[styles.cachedItemMetaText, { color: colors.muted }]}>
                        {protocol.countyName}
                      </Text>
                      <Text style={[styles.cachedItemMetaText, { color: colors.muted }]}>
                        •
                      </Text>
                      <Text style={[styles.cachedItemMetaText, { color: colors.muted }]}>
                        {formatCacheTime(protocol.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <View
              style={[styles.emptyOffline, { backgroundColor: colors.surface }, animateStyles.fadeIn]}
            >
              <IconSymbol name="arrow.down.circle.fill" size={40} color={colors.muted} />
              <Text style={[styles.emptyOfflineTitle, { color: colors.foreground }]}>
                No Cached Protocols
              </Text>
              <Text style={[styles.emptyOfflineText, { color: colors.muted }]}>
                Search for protocols while online to save them for offline access
              </Text>
            </View>
          )}

          {/* Tips for offline use */}
          <View style={[styles.offlineTips, { backgroundColor: `${colors.primary}08` }]}>
            <View style={styles.offlineTipHeader}>
              <IconSymbol name="lightbulb.fill" size={16} color={colors.primary} />
              <Text style={[styles.offlineTipTitle, { color: colors.foreground }]}>
                Offline Tips
              </Text>
            </View>
            <Text style={[styles.offlineTipText, { color: colors.muted }]}>
              • Pro users can cache unlimited protocols{"\n"}
              • Star important protocols to keep them longer{"\n"}
              • Searches made offline will sync automatically
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Online mode - normal empty state
  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-6 pb-4">
        {/* Icon with subtle background */}
        <View 
          style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }, animateStyles.fadeIn]}
        >
          <IconSymbol name="magnifyingglass" size={32} color={colors.primary} />
        </View>

        {/* Title */}
        <Text 
          style={[styles.title, { color: colors.foreground }, animateStyles.fadeInDownDelayed(100)]}
        >
          Quick Protocol Search
        </Text>

        {/* Subtitle */}
        <Text 
          style={[styles.subtitle, { color: colors.muted }, animateStyles.fadeInDownDelayed(150)]}
        >
          Type or tap the mic to speak
        </Text>

        {/* Quick Search Chips */}
        <View 
          style={[styles.chipsContainer, animateStyles.fadeInDownDelayed(200)]}
        >
          <View style={styles.chipRow}>
            {QUICK_SEARCHES.slice(0, 2).map((search) => (
              <TouchableOpacity
                key={search.text}
                onPress={() => onSelectSearch(search.text)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${search.text}`}
                accessibilityHint="Tap to search for this protocol"
              >
                <IconSymbol name={search.icon} size={14} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>
                  {search.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {QUICK_SEARCHES.slice(2, 4).map((search) => (
              <TouchableOpacity
                key={search.text}
                onPress={() => onSelectSearch(search.text)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${search.text}`}
                accessibilityHint="Tap to search for this protocol"
              >
                <IconSymbol name={search.icon} size={14} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>
                  {search.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help text */}
        <View 
          style={[styles.helpContainer, { backgroundColor: `${colors.primary}08` }, animateStyles.fadeInDownDelayed(300)]}
        >
          <IconSymbol name="lightbulb.fill" size={14} color={colors.primary} />
          <Text style={[styles.helpText, { color: colors.muted }]}>
            Tip: Use natural language like &quot;dose for pediatric asthma&quot;
          </Text>
        </View>
      </View>
      <RecentSearches onSelectSearch={onSelectSearch} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  chipsContainer: {
    gap: 10,
    marginBottom: 20,
    width: "100%",
    maxWidth: 340,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  helpText: {
    fontSize: 12,
    flex: 1,
  },
  // Offline styles
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    marginTop: 8,
    gap: 12,
  },
  offlineBannerText: {
    flex: 1,
  },
  offlineBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  offlineBannerSubtitle: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  cachedItem: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cachedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cachedItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  cachedItemProtocol: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  cachedItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cachedItemMetaText: {
    fontSize: 12,
  },
  emptyOffline: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    marginVertical: 20,
  },
  emptyOfflineTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyOfflineText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  offlineTips: {
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  offlineTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  offlineTipTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  offlineTipText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default EmptySearchState;
