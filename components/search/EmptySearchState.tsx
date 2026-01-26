import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RecentSearches } from "@/components/recent-searches";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

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

export function EmptySearchState({ onSelectSearch }: EmptySearchStateProps) {
  const colors = useColors();

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-6 pb-4">
        {/* Icon with subtle background */}
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}
        >
          <IconSymbol name="magnifyingglass" size={32} color={colors.primary} />
        </Animated.View>

        {/* Title */}
        <Animated.Text 
          entering={FadeInDown.duration(400).delay(100)}
          style={[styles.title, { color: colors.foreground }]}
        >
          Quick Protocol Search
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text 
          entering={FadeInDown.duration(400).delay(150)}
          style={[styles.subtitle, { color: colors.muted }]}
        >
          Type or tap the mic to speak
        </Animated.Text>

        {/* Quick Search Chips */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.chipsContainer}
        >
          <View style={styles.chipRow}>
            {QUICK_SEARCHES.slice(0, 2).map((search, index) => (
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
            {QUICK_SEARCHES.slice(2, 4).map((search, index) => (
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
        </Animated.View>

        {/* Help text */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(300)}
          style={[styles.helpContainer, { backgroundColor: `${colors.primary}08` }]}
        >
          <IconSymbol name="lightbulb.fill" size={14} color={colors.primary} />
          <Text style={[styles.helpText, { color: colors.muted }]}>
            Tip: Use natural language like "dose for pediatric asthma"
          </Text>
        </Animated.View>
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
});
