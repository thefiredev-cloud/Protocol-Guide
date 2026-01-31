/**
 * OfflineBanner - Web-optimized version
 * Uses CSS animations instead of react-native-reanimated
 */
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { OfflineCache } from "@/lib/offline-cache";

type OfflineBannerProps = {
  showPendingCount?: boolean;
  onPress?: () => void;
};

export function OfflineBanner({ showPendingCount = true, onPress }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const colors = useColors();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline && showPendingCount) {
      const loadPendingCount = async () => {
        const pending = await OfflineCache.getPendingSearches();
        setPendingCount(pending.length);
      };
      loadPendingCount();
      
      const interval = setInterval(loadPendingCount, 5000);
      return () => clearInterval(interval);
    }
  }, [isOffline, showPendingCount]);

  if (!isOffline) return null;

  const content = (
    <View style={styles.inner}>
      <View style={{ animation: 'pulse 2s ease-in-out infinite' } as any}>
        <IconSymbol name="wifi.slash" size={16} color="#1F2937" />
      </View>
      <Text style={styles.text}>
        You&apos;re offline
        {pendingCount > 0 && ` • ${pendingCount} pending`}
      </Text>
      <Text style={styles.subtext}>Using cached protocols</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container, 
        { backgroundColor: colors.warning, animation: 'slideInDown 0.3s ease-out' } as any
      ]}
    >
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.touchable}>
          {content}
          <IconSymbol name="chevron.right" size={14} color="#1F2937" />
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

export function OfflineDot() {
  const [isOffline, setIsOffline] = useState(false);
  const colors = useColors();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View
      style={[
        styles.dot, 
        { backgroundColor: colors.warning, animation: 'fadeIn 0.2s ease-out' } as any
      ]}
    />
  );
}

export function OfflineFullScreen() {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const colors = useColors();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      OfflineCache.getAllProtocols().then(protocols => {
        setCachedCount(protocols.length);
      });
    }
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <View style={[styles.fullScreenCard, { backgroundColor: colors.surface }]}>
        <IconSymbol name="wifi.slash" size={48} color={colors.warning} />
        <Text style={[styles.fullScreenTitle, { color: colors.foreground }]}>
          No Internet Connection
        </Text>
        <Text style={[styles.fullScreenText, { color: colors.muted }]}>
          {cachedCount > 0
            ? `You have ${cachedCount} cached protocols available offline.`
            : "Connect to the internet to search protocols."}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            NetInfo.fetch().then((state) => {
              setIsOffline(!state.isConnected);
            });
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  touchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  subtext: {
    fontSize: 11,
    color: "#374151",
    marginLeft: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 100,
  },
  fullScreenCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  fullScreenText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
