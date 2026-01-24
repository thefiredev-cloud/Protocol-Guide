import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";

const RECENT_SEARCHES_KEY = "protocol_guide_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export interface RecentSearchesProps {
  onSelectSearch: (query: string) => void;
}

export function RecentSearches({ onSelectSearch }: RecentSearchesProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const colors = useColors();

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  };

  if (recentSearches.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.muted }]}>Recent Searches</Text>
        <TouchableOpacity
          onPress={clearHistory}
          activeOpacity={0.7}
          style={styles.clearButtonTouchable}
          accessibilityLabel="Clear recent searches"
          accessibilityRole="button"
        >
          <Text style={[styles.clearButton, { color: colors.primary }]}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipsContainer}>
        {recentSearches.map((query, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onSelectSearch(query)}
            style={[styles.chip, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: '#FFFFFF' }]} numberOfLines={1}>
              {query}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Helper function to add a search to recent searches
export async function addRecentSearch(query: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    let searches: string[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists (to move to front)
    searches = searches.filter((s) => s.toLowerCase() !== query.toLowerCase());
    
    // Add to front
    searches.unshift(query);
    
    // Keep only the most recent
    searches = searches.slice(0, MAX_RECENT_SEARCHES);
    
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error("Error saving recent search:", error);
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "48%",
  },
  chipText: {
    fontSize: 14,
    flexShrink: 1,
  },
});
