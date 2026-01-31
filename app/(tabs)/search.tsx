/**
 * Search Screen with County Filter Support
 * 
 * This screen provides protocol search with proper county-level filtering.
 * When a county (agency) is selected, searches are filtered to only that county.
 * 
 * FIX: County filter - ensures searches respect county selection and don't leak to other CA counties
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SearchLoadingSkeleton } from "@/components/search/SearchLoadingSkeleton";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VoiceSearchModal } from "@/components/VoiceSearchModal";
import { VoiceSearchButtonInline } from "@/components/VoiceSearchButton-inline";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import {
  createSearchA11y,
  createButtonA11y,
  createStatusA11y,
  MEDICAL_A11Y_LABELS,
} from "@/lib/accessibility";
import {
  SearchResultsErrorBoundary,
  VoiceErrorBoundary,
  ProtocolViewerErrorBoundary,
} from "@/components/ErrorBoundary";
import { SearchResult } from "@/types/search.types";
import {
  getScoreColor,
  getScoreLabel,
  getDateColor,
  formatProtocolDate,
  getCurrencyAdvice,
} from "@/utils/search-formatters";
import { useSearchAnnouncements } from "@/hooks/use-search-announcements";
import { useFilterState } from "@/hooks/use-filter-state";
import { StateModal } from "@/components/search/StateModal";
import { AgencyModal } from "@/components/search/AgencyModal";

export default function SearchScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ stateFilter?: string; agencyId?: string }>();
  const { announceSearchStart, announceSearchResults, announceSearchError } = useSearchAnnouncements();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use centralized filter state management with state AND agency (county) support
  // This ensures county-level filtering works correctly (fixes "leak to other CA counties" bug)
  const {
    selectedState,
    setSelectedState,
    selectedAgency,
    setSelectedAgency,
    showStateDropdown,
    setShowStateDropdown,
    showAgencyDropdown,
    setShowAgencyDropdown,
    statesData,
    statesLoading,
    agenciesData,
    agenciesLoading,
    coverageError,
    handleClearFilters,
  } = useFilterState({
    initialState: params.stateFilter || "CA",
    initialAgencyId: params.agencyId ? parseInt(params.agencyId, 10) : null,
  });

  // Cleanup voice timer on unmount
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    };
  }, []);

  // Get protocol stats
  const statsQuery = trpc.search.stats.useQuery();

  // Get tRPC utils for imperative queries
  const trpcUtils = trpc.useUtils();

  // Track search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setHasSearched(true);
    setSelectedProtocol(null);
    setIsSearching(true);
    setSearchError(null);

    // Announce search start for screen readers
    announceSearchStart(searchQuery);

    try {
      let result;
      
      // COUNTY FILTER FIX: Use agency-specific search when an agency (county) is selected
      // This ensures results are filtered to ONLY the selected county, not all CA counties
      if (selectedAgency) {
        console.log(`[Search] Using agency filter: ${selectedAgency.name} (ID: ${selectedAgency.id})`);
        result = await trpcUtils.search.searchByAgency.fetch({
          query: searchQuery,
          agencyId: selectedAgency.id,
          limit: 20,
        });
      } else {
        // Fall back to state-level search when no specific agency is selected
        result = await trpcUtils.search.semantic.fetch({
          query: searchQuery,
          limit: 20,
          stateFilter: selectedState || undefined,
        });
      }

      if (result && result.results) {
        setSearchResults(result.results);
        announceSearchResults(result.results.length);
      } else {
        setSearchResults([]);
        announceSearchResults(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage = "Search failed. Please check your connection and try again.";
      setSearchError(errorMessage);
      setSearchResults([]);
      announceSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedState, selectedAgency, trpcUtils, announceSearchStart, announceSearchResults, announceSearchError]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setSelectedProtocol(null);
    inputRef.current?.focus();
  }, []);

  // Handle voice transcription result
  const handleVoiceTranscription = useCallback((text: string) => {
    setQuery(text);
    // Auto-search after voice input
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    voiceTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        handleSearch();
      }
    }, 100);
  }, [handleSearch]);

  // Handle state selection - clears results when filter changes
  const handleStateSelect = useCallback((state: string | null) => {
    setSelectedState(state);
    setShowStateDropdown(false);
    // Clear previous results when filter changes
    if (hasSearched) {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [hasSearched, setSelectedState, setShowStateDropdown]);

  // Handle agency (county) selection - clears results when filter changes
  const handleAgencySelect = useCallback((agency: typeof selectedAgency) => {
    setSelectedAgency(agency);
    setShowAgencyDropdown(false);
    // Clear previous results when filter changes
    if (hasSearched) {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [hasSearched, setSelectedAgency, setShowAgencyDropdown]);

  const renderSearchResult = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View
      entering={FadeIn.delay(index * 40).duration(250)}
    >
      <TouchableOpacity
        onPress={() => setSelectedProtocol(item)}
        activeOpacity={0.8}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Protocol: ${item.protocolTitle}. Relevance: ${getScoreLabel(item.relevanceScore)}. ${item.protocolNumber && item.protocolNumber !== "N/A" ? `Number ${item.protocolNumber}.` : ""}`}
        accessibilityHint="Double tap to view full protocol details"
      >
        {/* Top row: Title and relevance badge */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <Text 
              className="text-base font-bold text-foreground" 
              numberOfLines={2}
              style={{ fontSize: 17, lineHeight: 24, letterSpacing: -0.3 }}
            >
              {item.protocolTitle}
            </Text>
          </View>
          <View
            className="px-3 py-1.5 rounded-lg"
            style={{ 
              backgroundColor: getScoreColor(item.relevanceScore, colors) + "18",
              borderWidth: 1,
              borderColor: getScoreColor(item.relevanceScore, colors) + "30",
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: getScoreColor(item.relevanceScore, colors), letterSpacing: 0.3 }}
            >
              {getScoreLabel(item.relevanceScore)}
            </Text>
          </View>
        </View>

        {/* Meta row: Protocol # and Section */}
        <View className="flex-row items-center mb-3 flex-wrap gap-2">
          {item.protocolNumber && item.protocolNumber !== "N/A" && (
            <View 
              className="flex-row items-center px-2.5 py-1 rounded-md"
              style={{ backgroundColor: `${colors.primary}12` }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                #{item.protocolNumber}
              </Text>
            </View>
          )}
          {item.section && (
            <View className="flex-row items-center">
              <IconSymbol name="doc.text.fill" size={13} color={colors.muted} />
              <Text className="text-xs text-muted ml-1 font-medium">{item.section}</Text>
            </View>
          )}
        </View>

        {/* Content preview */}
        <Text 
          className="text-muted" 
          numberOfLines={3}
          style={{ fontSize: 14, lineHeight: 21, marginBottom: 12 }}
        >
          {item.content}
        </Text>

        {/* Footer: Date and CTA */}
        <View 
          className="flex-row items-center justify-between pt-3"
          style={{ borderTopWidth: 1, borderTopColor: `${colors.border}80` }}
        >
          {(item.protocolEffectiveDate || item.protocolYear || item.lastVerifiedAt) && (
            <View
              className="flex-row items-center px-2.5 py-1.5 rounded-md"
              style={{ backgroundColor: getDateColor(item.protocolYear, item.lastVerifiedAt, colors) + "12" }}
            >
              <IconSymbol name="clock.fill" size={12} color={getDateColor(item.protocolYear, item.lastVerifiedAt, colors)} />
              <Text
                className="text-xs ml-1.5 font-semibold"
                style={{ color: getDateColor(item.protocolYear, item.lastVerifiedAt, colors) }}
              >
                {formatProtocolDate(item.protocolEffectiveDate, item.protocolYear, item.lastVerifiedAt)}
              </Text>
            </View>
          )}
          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-primary">View Protocol</Text>
            <IconSymbol name="chevron.right" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Protocol detail modal
  if (selectedProtocol) {
    return (
      <ScreenContainer className="px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => setSelectedProtocol(null)}
            className="p-2 -ml-2"
            accessibilityLabel="Back to search results"
            accessibilityRole="button"
            accessibilityHint="Returns to protocol search results list"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground ml-2 flex-1" numberOfLines={1}>
            Protocol Details
          </Text>
        </View>

        <ProtocolViewerErrorBoundary>
        <FlatList
          data={[selectedProtocol]}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View>
              {/* Protocol Header */}
              <View 
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-xl font-bold text-foreground mb-2">
                  {item.protocolTitle}
                </Text>
                
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {item.protocolNumber && item.protocolNumber !== "N/A" && (
                    <View className="bg-primary/10 px-3 py-1 rounded-full">
                      <Text className="text-xs font-medium text-primary">
                        #{item.protocolNumber}
                      </Text>
                    </View>
                  )}
                  {item.section && (
                    <View className="bg-muted/20 px-3 py-1 rounded-full">
                      <Text className="text-xs font-medium text-muted">
                        {item.section}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View className="flex-row items-center">
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: getScoreColor(item.relevanceScore, colors) }}
                  />
                  <Text className="text-xs text-muted">
                    Relevance: {getScoreLabel(item.relevanceScore)} ({item.relevanceScore} points)
                  </Text>
                </View>
              </View>

              {/* Protocol Currency Info */}
              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-semibold text-foreground mb-3">
                  Protocol Currency
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getDateColor(item.protocolYear, item.lastVerifiedAt, colors) }}
                  />
                  <Text className="text-sm text-foreground">
                    {formatProtocolDate(item.protocolEffectiveDate, item.protocolYear, item.lastVerifiedAt)}
                  </Text>
                </View>
                {item.protocolYear && (
                  <Text className="text-xs text-muted mt-2">
                    {getCurrencyAdvice(item.protocolYear)}
                  </Text>
                )}
              </View>

              {/* Protocol Content */}
              <View 
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-semibold text-foreground mb-3">
                  Protocol Content
                </Text>
                <Text className="text-sm text-foreground leading-6">
                  {item.fullContent}
                </Text>
              </View>

              {/* Source Info */}
              {item.sourcePdfUrl && (
                <View 
                  className="rounded-xl p-4 mb-4"
                  style={{ backgroundColor: colors.surface }}
                >
                  <Text className="text-sm font-semibold text-foreground mb-2">
                    Source
                  </Text>
                  <Text className="text-xs text-muted" numberOfLines={2}>
                    {item.sourcePdfUrl}
                  </Text>
                </View>
              )}

              {/* Disclaimer */}
              <View 
                className="rounded-xl p-4 mb-8"
                style={{ backgroundColor: colors.warning + "15" }}
              >
                <View className="flex-row items-start">
                  <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
                  <View className="flex-1 ml-2">
                    <Text className="text-xs font-semibold text-foreground mb-1">
                      Medical Disclaimer
                    </Text>
                    <Text className="text-xs text-muted leading-5">
                      Always verify protocols with your local medical director. This information is for reference only and should not replace official protocol documents or clinical judgment.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
        </ProtocolViewerErrorBoundary>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-2xl font-bold text-foreground">
          Protocol Search
        </Text>
        <Text className="text-sm text-muted mt-1">
          Search {statsQuery.data?.totalProtocols?.toLocaleString() || "34,000+"} protocols with natural language
        </Text>
      </View>

      {/* Search Input */}
      <View
        className="flex-row items-center rounded-2xl px-5 mb-4"
        style={{ 
          backgroundColor: colors.surface, 
          height: 56,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <IconSymbol name="magnifyingglass" size={22} color={colors.muted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g., pediatric asthma treatment"
          placeholderTextColor={colors.muted}
          className="flex-1 ml-3 text-foreground"
          style={{ fontSize: 16 }}
          returnKeyType="search"
          onSubmitEditing={() => handleSearch()}
          autoCapitalize="none"
          autoCorrect={false}
          {...createSearchA11y(
            "Search protocols",
            "Type medical condition or protocol name, then press search button or enter key"
          )}
          accessibilityValue={{ text: query }}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            className="p-3"
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            {...createButtonA11y(MEDICAL_A11Y_LABELS.search.clear, "Clears the search input field")}
          >
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
        <VoiceSearchButtonInline
          onPress={() => setShowVoiceModal(true)}
          disabled={isSearching}
        />
      </View>

      {/* Location Filter - State & County */}
      {/* This two-level filter ensures searches are scoped to the correct county */}
      <View className="mb-4">
        <View className="flex-row gap-2">
          {/* State Filter Button */}
          <TouchableOpacity
            onPress={() => setShowStateDropdown(true)}
            className="flex-1 flex-row items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: colors.surface }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Filter by state: ${selectedState || 'All States'}`}
            accessibilityHint="Opens state selection menu"
          >
            <View className="flex-row items-center flex-1">
              <IconSymbol name="location.fill" size={18} color={selectedState ? colors.primary : colors.muted} />
              <Text 
                className={`ml-2 text-sm ${selectedState ? 'text-foreground font-medium' : 'text-muted'}`}
                numberOfLines={1}
              >
                {selectedState || 'State'}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </TouchableOpacity>

          {/* Agency (County) Filter Button - Only shows when state is selected */}
          {selectedState && (
            <TouchableOpacity
              onPress={() => setShowAgencyDropdown(true)}
              className="flex-1 flex-row items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: colors.surface }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Filter by county: ${selectedAgency?.name || 'All Counties'}`}
              accessibilityHint="Opens county selection menu for more specific filtering"
            >
              <View className="flex-row items-center flex-1">
                <IconSymbol 
                  name="building.2.fill" 
                  size={18} 
                  color={selectedAgency ? colors.primary : colors.muted} 
                />
                <Text 
                  className={`ml-2 text-sm ${selectedAgency ? 'text-foreground font-medium' : 'text-muted'}`}
                  numberOfLines={1}
                >
                  {agenciesLoading ? '...' : (selectedAgency?.name?.substring(0, 14) || 'County')}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter indicator when county is selected */}
        {selectedAgency && (
          <View className="flex-row items-center mt-2 px-1">
            <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
            <Text className="text-xs ml-1" style={{ color: colors.success }}>
              Filtering to {selectedAgency.name} only
            </Text>
            <TouchableOpacity
              onPress={handleClearFilters}
              className="ml-2 px-2 py-1 rounded"
              style={{ backgroundColor: `${colors.muted}20` }}
              accessibilityLabel="Clear all filters"
              accessibilityRole="button"
            >
              <Text className="text-xs text-muted">Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Button */}
      <TouchableOpacity
        onPress={() => handleSearch()}
        disabled={!query.trim() || isSearching}
        className="rounded-2xl mb-4 items-center justify-center flex-row"
        style={{
          backgroundColor: query.trim() ? colors.primary : colors.muted,
          opacity: query.trim() ? 1 : 0.4,
          height: 56,
          gap: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: query.trim() ? 0.3 : 0,
          shadowRadius: 12,
          elevation: query.trim() ? 6 : 0,
        }}
        {...createButtonA11y(
          MEDICAL_A11Y_LABELS.search.button,
          query.trim() ? "Search for medical protocols" : "Enter a search query first",
          !query.trim() || isSearching
        )}
        accessibilityState={{
          disabled: !query.trim() || isSearching,
          busy: isSearching,
        }}
      >
        {isSearching ? (
          <ActivityIndicator color={colors.background} accessibilityLabel="Searching" />
        ) : (
          <>
            <IconSymbol name="magnifyingglass" size={18} color={colors.background} />
            <Text 
              className="font-bold text-background"
              style={{ fontSize: 17, letterSpacing: 0.3 }}
            >
              Search Protocols
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Error Display */}
      {searchError && (
        <View
          className="rounded-xl p-4 mb-4 flex-row items-start"
          style={{ backgroundColor: colors.error + "15" }}
          {...createStatusA11y(searchError, "error")}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.error} />
          <Text className="text-sm text-foreground ml-2 flex-1">{searchError}</Text>
        </View>
      )}

      {/* Results */}
      {isSearching ? (
        <View className="flex-1">
          <SearchLoadingSkeleton
            count={3}
            message="Searching protocols..."
            showResultsCount={false}
          />
        </View>
      ) : hasSearched && searchResults.length === 0 && !searchError ? (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="magnifyingglass" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4 text-center">
            No protocols found
          </Text>
          <Text className="text-sm text-muted mt-2 text-center">
            Try different keywords or check your spelling. Example searches: {'"cardiac arrest"'}, {'"pediatric seizure"'}, {'"anaphylaxis treatment"'}
          </Text>
        </View>
      ) : searchResults.length > 0 ? (
        <SearchResultsErrorBoundary>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSearchResult}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListHeaderComponent={
              <View 
                className="flex-row items-center mb-4 pb-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View 
                  className="flex-row items-center px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${colors.success}15` }}
                >
                  <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
                  <Text className="text-sm font-semibold ml-1.5" style={{ color: colors.success }}>
                    {searchResults.length} protocols found
                  </Text>
                </View>
              </View>
            }
            ListFooterComponent={
              <View className="mt-2 mb-4">
                <MedicalDisclaimer variant="inline" />
              </View>
            }
          />
        </SearchResultsErrorBoundary>
      ) : (
        <View className="flex-1">
          {/* Example Searches */}
          <Text 
            className="font-bold text-foreground mb-4"
            style={{ fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            Quick Searches
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              "cardiac arrest",
              "pediatric asthma",
              "stroke protocol",
              "naloxone overdose",
              "chest pain",
              "seizure management",
              "anaphylaxis",
              "diabetic emergency",
            ].map((example) => (
              <TouchableOpacity
                key={example}
                onPress={() => {
                  setQuery(example);
                  handleSearch(example);
                }}
                className="px-4 py-3 rounded-xl"
                style={{ 
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text className="text-sm font-semibold text-foreground">{example}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View 
            className="mt-8 p-5 rounded-2xl"
            style={{ 
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text 
              className="font-bold text-foreground mb-4"
              style={{ fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Database Coverage
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text 
                  className="font-bold text-primary"
                  style={{ fontSize: 32, letterSpacing: -1 }}
                >
                  {statsQuery.data?.totalProtocols?.toLocaleString() || "34,630"}
                </Text>
                <Text className="text-xs text-muted font-medium mt-1">Protocol Chunks</Text>
              </View>
              <View 
                style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 16 }} 
              />
              <View className="items-center">
                <Text 
                  className="font-bold text-primary"
                  style={{ fontSize: 32, letterSpacing: -1 }}
                >
                  {statsQuery.data?.totalCounties?.toLocaleString() || "2,582"}
                </Text>
                <Text className="text-xs text-muted font-medium mt-1">EMS Agencies</Text>
              </View>
            </View>
          </View>

          {/* Search Tips */}
          <View 
            className="mt-4 p-5 rounded-2xl"
            style={{ 
              backgroundColor: `${colors.primary}08`,
              borderWidth: 1,
              borderColor: `${colors.primary}20`,
            }}
          >
            <View className="flex-row items-center mb-3">
              <IconSymbol name="lightbulb.fill" size={16} color={colors.primary} />
              <Text 
                className="font-bold ml-2"
                style={{ color: colors.primary, fontSize: 13, letterSpacing: 0.3, textTransform: 'uppercase' }}
              >
                Search Tips
              </Text>
            </View>
            <Text className="text-muted leading-6" style={{ fontSize: 14 }}>
              • Use natural language: {'"how to treat pediatric asthma"'}{"\n"}
              • Include condition names: {'"STEMI"'}, {'"anaphylaxis"'}{"\n"}
              • Specify patient type: {'"pediatric"'}, {'"geriatric"'}{"\n"}
              • Search by medication: {'"epinephrine"'}, {'"naloxone"'}
            </Text>
          </View>
        </View>
      )}

      {/* Voice Search Modal */}
      <VoiceErrorBoundary>
        <VoiceSearchModal
          visible={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onTranscription={handleVoiceTranscription}
        />
      </VoiceErrorBoundary>

      {/* State Selection Modal */}
      <StateModal
        visible={showStateDropdown}
        onClose={() => setShowStateDropdown(false)}
        states={statesData}
        loading={statesLoading}
        error={coverageError}
        onSelectState={handleStateSelect}
      />

      {/* Agency (County) Selection Modal */}
      <AgencyModal
        visible={showAgencyDropdown}
        onClose={() => setShowAgencyDropdown(false)}
        agencies={agenciesData}
        loading={agenciesLoading}
        selectedAgency={selectedAgency}
        onSelectAgency={handleAgencySelect}
      />
    </ScreenContainer>
  );
}
