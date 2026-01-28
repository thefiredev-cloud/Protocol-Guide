/**
 * Protocol Search - Public ImageTrend Integration Page
 * 
 * This page is accessible without authentication for ImageTrend deep linking.
 * It provides read-only search functionality with pre-filled parameters.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { SearchResult } from "@/types/search.types";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

export default function ProtocolSearchScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    query?: string;
    age?: string;
    impression?: string;
    agency?: string;
    source?: string;
    return_url?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const trpcUtils = trpc.useUtils();

  // Auto-search on mount if query param is provided
  useEffect(() => {
    if (params.query) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.query]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setHasSearched(true);
    setSelectedProtocol(null);
    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await trpcUtils.search.semantic.fetch({
        query: searchQuery,
        limit: 15,
        stateFilter: "California", // Default to California for ImageTrend demo
      });

      setSearchResults(result.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Unable to search protocols. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, trpcUtils.search.semantic]);

  const handleReturnToImageTrend = () => {
    if (params.return_url) {
      // In production, this would deep link back to ImageTrend
      router.push(params.return_url as any);
    }
  };

  const renderProtocolResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => setSelectedProtocol(item)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: selectedProtocol?.id === item.id ? colors.primary : colors.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: "600", 
            color: colors.text,
            marginBottom: 4,
          }}>
            {item.protocolNumber || "Protocol"}
          </Text>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "700", 
            color: colors.text,
            marginBottom: 6,
          }} numberOfLines={2}>
            {item.protocolTitle}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {item.section}
          </Text>
        </View>
        <View style={{
          backgroundColor: getScoreBackgroundColor(item.relevanceScore),
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
            {Math.round(item.relevanceScore)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getScoreBackgroundColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // green
    if (score >= 60) return "#eab308"; // yellow
    return "#6b7280"; // gray
  };

  // Protocol detail view
  if (selectedProtocol) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setSelectedProtocol(null)}
              style={{
                padding: 8,
                marginRight: 12,
                backgroundColor: colors.surface,
                borderRadius: 8,
              }}
            >
              <IconSymbol name="chevron.left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 }} numberOfLines={1}>
              {selectedProtocol.protocolTitle}
            </Text>
          </View>

          {/* Protocol Content */}
          <ScrollView 
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ 
              backgroundColor: colors.surface, 
              borderRadius: 12, 
              padding: 16,
              marginBottom: 16,
            }}>
              <Text style={{ 
                fontSize: 14, 
                color: colors.muted, 
                marginBottom: 8,
              }}>
                {selectedProtocol.protocolNumber} • {selectedProtocol.section}
              </Text>
              <Text style={{ 
                fontSize: 15, 
                color: colors.text, 
                lineHeight: 24,
              }}>
                {selectedProtocol.fullContent || selectedProtocol.content}
              </Text>
            </View>

            {/* Medical Disclaimer */}
            <MedicalDisclaimer />
          </ScrollView>

          {/* Return to ImageTrend button */}
          {params.return_url && (
            <TouchableOpacity
              onPress={handleReturnToImageTrend}
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Return to ImageTrend
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
            Protocol Guide
          </Text>
          {params.source === "imagetrend" && (
            <Text style={{ fontSize: 14, color: colors.muted }}>
              Powered by ImageTrend Integration
            </Text>
          )}
          {params.agency && (
            <Text style={{ fontSize: 14, color: colors.primary, marginTop: 4 }}>
              Agency: {params.agency}
            </Text>
          )}
        </View>

        {/* Search Input */}
        <View style={{
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search protocols (e.g., 'chest pain', 'cardiac arrest')"
            placeholderTextColor={colors.muted}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 16,
              color: colors.text,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          style={{
            backgroundColor: searchQuery.trim() ? colors.primary : colors.border,
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Search Protocols
            </Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {searchError && (
          <Animated.View entering={FadeIn} style={{ 
            backgroundColor: "#fef2f2", 
            padding: 16, 
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Text style={{ color: "#dc2626", textAlign: "center" }}>{searchError}</Text>
          </Animated.View>
        )}

        {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
          <Animated.View entering={FadeIn} style={{ 
            padding: 24, 
            alignItems: "center",
          }}>
            <IconSymbol name="doc.text.magnifyingglass" size={48} color={colors.muted} />
            <Text style={{ 
              color: colors.muted, 
              marginTop: 12, 
              textAlign: "center",
              fontSize: 16,
            }}>
              No protocols found for &quot;{searchQuery}&quot;
            </Text>
          </Animated.View>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProtocolResult}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            searchResults.length > 0 ? <MedicalDisclaimer /> : null
          }
        />
      </View>
    </SafeAreaView>
  );
}


