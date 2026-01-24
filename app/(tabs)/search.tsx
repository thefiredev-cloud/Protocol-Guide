import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  AccessibilityInfo,
} from "react-native";
import { SkeletonProtocolCard } from "@/components/ui/Skeleton";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VoiceSearchModal } from "@/components/VoiceSearchModal";
import { VoiceSearchButtonInline } from "@/components/VoiceSearchButton-inline";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
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

export default function SearchScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ stateFilter?: string }>();
  const { announceSearchStart, announceSearchResults, announceSearchError } = useSearchAnnouncements();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(params.stateFilter || null);
  const [showStateFilter, setShowStateFilter] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update state filter when navigation params change
  useEffect(() => {
    if (params.stateFilter) {
      setSelectedState(params.stateFilter);
    }
  }, [params.stateFilter]);

  // Cleanup voice timer on unmount
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    };
  }, []);

  // Get protocol stats
  const statsQuery = trpc.search.stats.useQuery();

  // Get coverage data for state filter
  const coverageQuery = trpc.search.coverageByState.useQuery();

  // Get tRPC utils for imperative queries
  const trpcUtils = trpc.useUtils();

  // Track search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    Keyboard.dismiss();
    setHasSearched(true);
    setSelectedProtocol(null);
    setIsSearching(true);
    setSearchError(null);

    // Announce search start for screen readers
    announceSearchStart(query);

    try {
      const result = await trpcUtils.search.semantic.fetch({
        query,
        limit: 20,
        stateFilter: selectedState || undefined,
      });

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
  }, [query, selectedState, trpcUtils, announceSearchStart, announceSearchResults, announceSearchError]);

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

  const handleStateSelect = useCallback((state: string | null) => {
    setSelectedState(state);
    setShowStateFilter(false);
    // Clear previous results when state changes
    if (hasSearched) {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [hasSearched]);

  // Get sorted states for dropdown
  const sortedStates = useMemo(() => {
    if (!coverageQuery.data) return [];
    return coverageQuery.data
      .filter(s => s.chunks > 0)
      .sort((a, b) => a.state.localeCompare(b.state));
  }, [coverageQuery.data]);

  const renderSearchResult = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(200)}
    >
      <TouchableOpacity
        onPress={() => setSelectedProtocol(item)}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: getScoreColor(item.relevanceScore, colors),
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Protocol: ${item.protocolTitle}. Relevance: ${getScoreLabel(item.relevanceScore)}. ${item.protocolNumber && item.protocolNumber !== "N/A" ? `Number ${item.protocolNumber}.` : ""}`}
        accessibilityHint="Double tap to view full protocol details"
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
              {item.protocolTitle}
            </Text>
            {item.protocolNumber && item.protocolNumber !== "N/A" && (
              <Text className="text-xs text-muted mt-1">
                Protocol #{item.protocolNumber}
              </Text>
            )}
          </View>
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: getScoreColor(item.relevanceScore, colors) + "20" }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: getScoreColor(item.relevanceScore, colors) }}
            >
              {getScoreLabel(item.relevanceScore)}
            </Text>
          </View>
        </View>

        {item.section && (
          <View className="flex-row items-center mb-2">
            <IconSymbol name="doc.text.fill" size={14} color={colors.muted} />
            <Text className="text-xs text-muted ml-1">{item.section}</Text>
          </View>
        )}

        <Text className="text-sm text-muted" numberOfLines={3}>
          {item.content}
        </Text>

        {/* Protocol Currency Info */}
        <View className="flex-row items-center mt-3 flex-wrap gap-2">
          {(item.protocolEffectiveDate || item.protocolYear || item.lastVerifiedAt) && (
            <View
              className="flex-row items-center px-2 py-1 rounded-full"
              style={{ backgroundColor: getDateColor(item.protocolYear, item.lastVerifiedAt, colors) + "15" }}
            >
              <IconSymbol name="clock.fill" size={12} color={getDateColor(item.protocolYear, item.lastVerifiedAt, colors)} />
              <Text
                className="text-xs ml-1"
                style={{ color: getDateColor(item.protocolYear, item.lastVerifiedAt, colors) }}
              >
                {formatProtocolDate(item.protocolEffectiveDate, item.protocolYear, item.lastVerifiedAt)}
              </Text>
            </View>
          )}
          <Text className="text-xs text-primary">Tap to view full protocol →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const getScoreColor = (score: number): string => {
    if (score >= 100) return colors.success;
    if (score >= 50) return colors.primary;
    if (score >= 20) return colors.warning;
    return colors.muted;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 100) return "Excellent";
    if (score >= 50) return "Good";
    if (score >= 20) return "Fair";
    return "Related";
  };

  // Get color based on protocol currency
  const getDateColor = (protocolYear: number | null, lastVerifiedAt: string | null): string => {
    const currentYear = new Date().getFullYear();
    
    // Check protocol year first
    if (protocolYear) {
      const age = currentYear - protocolYear;
      if (age <= 1) return colors.success; // Current or last year
      if (age <= 2) return colors.primary; // 2 years old
      if (age <= 3) return colors.warning; // 3 years old
      return colors.error; // 4+ years old
    }
    
    // Check last verified date
    if (lastVerifiedAt) {
      const verifiedDate = new Date(lastVerifiedAt);
      const monthsAgo = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo <= 6) return colors.success;
      if (monthsAgo <= 12) return colors.primary;
      if (monthsAgo <= 24) return colors.warning;
      return colors.error;
    }
    
    return colors.muted;
  };

  // Format protocol date for display
  const formatProtocolDate = (
    effectiveDate: string | null,
    protocolYear: number | null,
    lastVerifiedAt: string | null
  ): string => {
    if (effectiveDate) {
      return `Effective: ${effectiveDate}`;
    }
    if (protocolYear) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - protocolYear;
      if (age === 0) return `${protocolYear} (Current)`;
      if (age === 1) return `${protocolYear} (1 year old)`;
      return `${protocolYear} (${age} years old)`;
    }
    if (lastVerifiedAt) {
      const date = new Date(lastVerifiedAt);
      return `Verified: ${date.toLocaleDateString()}`;
    }
    return "Date unknown";
  };

  // Get advice based on protocol age
  const getCurrencyAdvice = (protocolYear: number): string => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - protocolYear;
    
    if (age <= 1) {
      return "This protocol is current. Always verify with your medical director.";
    }
    if (age <= 2) {
      return "This protocol is relatively recent. Check for updates with your agency.";
    }
    if (age <= 3) {
      return "This protocol may have been updated. Verify current version with your medical director.";
    }
    return "This protocol is over 3 years old. Strongly recommend verifying current guidelines with your medical director.";
  };

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
                    style={{ backgroundColor: getScoreColor(item.relevanceScore) }}
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
                    style={{ backgroundColor: getDateColor(item.protocolYear, item.lastVerifiedAt) }}
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
        className="flex-row items-center rounded-xl px-4 mb-4"
        style={{ backgroundColor: colors.surface, height: 52 }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g., pediatric asthma treatment"
          placeholderTextColor={colors.muted}
          className="flex-1 ml-3 text-base text-foreground"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
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
            className="p-2"
            {...createButtonA11y(MEDICAL_A11Y_LABELS.search.clear, "Clears the search input field")}
          >
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
        <VoiceSearchButtonInline
          onPress={() => setShowVoiceModal(true)}
          disabled={isSearching}
        />
      </View>

      {/* State Filter */}
      <View className="mb-4">
        <TouchableOpacity
          onPress={() => setShowStateFilter(!showStateFilter)}
          className="flex-row items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: colors.surface }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Filter by state: ${selectedState || 'All States'}`}
          accessibilityHint={showStateFilter ? "Collapse state filter list" : "Expand state filter list"}
          accessibilityState={{ expanded: showStateFilter }}
        >
          <View className="flex-row items-center">
            <IconSymbol name="location.fill" size={18} color={selectedState ? colors.primary : colors.muted} />
            <Text className={`ml-2 text-base ${selectedState ? 'text-foreground font-medium' : 'text-muted'}`}>
              {selectedState || 'All States'}
            </Text>
          </View>
          <View className="flex-row items-center">
            {selectedState && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleStateSelect(null);
                }}
                className="p-1 mr-1"
                accessibilityLabel="Clear state filter"
                accessibilityRole="button"
                accessibilityHint="Remove state filter and show all states"
              >
                <IconSymbol name="xmark" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
            <IconSymbol
              name={showStateFilter ? "chevron.left" : "chevron.right"}
              size={16}
              color={colors.muted}
            />
          </View>
        </TouchableOpacity>
        
        {/* State Dropdown */}
        {showStateFilter && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            className="rounded-xl mt-2 overflow-hidden"
            style={{ backgroundColor: colors.surface, maxHeight: 250 }}
          >
            <FlatList
              data={sortedStates}
              keyExtractor={(item) => item.stateCode}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 250 }}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => handleStateSelect(null)}
                  className="flex-row items-center justify-between px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text className={`text-base ${!selectedState ? 'text-primary font-medium' : 'text-foreground'}`}>
                    All States
                  </Text>
                  {!selectedState && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleStateSelect(item.state)}
                  className="flex-row items-center justify-between px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <View className="flex-row items-center flex-1">
                    <Text className={`text-base ${selectedState === item.state ? 'text-primary font-medium' : 'text-foreground'}`}>
                      {item.state}
                    </Text>
                    <Text className="text-xs text-muted ml-2">
                      ({item.chunks.toLocaleString()} protocols)
                    </Text>
                  </View>
                  {selectedState === item.state && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        )}
      </View>

      {/* Search Button */}
      <TouchableOpacity
        onPress={handleSearch}
        disabled={!query.trim() || isSearching}
        className="rounded-xl py-3 mb-4 items-center"
        style={{
          backgroundColor: query.trim() ? colors.primary : colors.muted,
          opacity: query.trim() ? 1 : 0.5,
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
          <Text className="text-base font-semibold text-background">
            Search Protocols
          </Text>
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
          <Text className="text-sm text-muted mb-3">Searching protocols...</Text>
          <View style={{ gap: 12 }}>
            <SkeletonProtocolCard />
            <SkeletonProtocolCard />
            <SkeletonProtocolCard />
          </View>
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
              <Text className="text-sm text-muted mb-3">
                Found {searchResults.length} matching protocols
              </Text>
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
          <Text className="text-sm font-semibold text-foreground mb-3">
            Try searching for:
          </Text>
          <View className="flex-row flex-wrap gap-2">
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
                  // Direct call instead of setTimeout to avoid memory leak
                  requestAnimationFrame(() => handleSearch());
                }}
                className="px-3 py-2 rounded-full"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm text-foreground">{example}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View 
            className="mt-6 p-4 rounded-xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-semibold text-foreground mb-2">
              Database Coverage
            </Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-2xl font-bold text-primary">
                  {statsQuery.data?.totalProtocols?.toLocaleString() || "34,630"}
                </Text>
                <Text className="text-xs text-muted">Protocol chunks</Text>
              </View>
              <View>
                <Text className="text-2xl font-bold text-primary">
                  {statsQuery.data?.totalCounties?.toLocaleString() || "2,582"}
                </Text>
                <Text className="text-xs text-muted">EMS agencies</Text>
              </View>
            </View>
          </View>

          {/* Search Tips */}
          <View 
            className="mt-4 p-4 rounded-xl"
            style={{ backgroundColor: colors.primary + "10" }}
          >
            <Text className="text-sm font-semibold text-foreground mb-2">
              Search Tips
            </Text>
            <Text className="text-xs text-muted leading-5">
              • Use natural language: {'"how to treat pediatric asthma"'}{"\n"}
              • Include condition names: {'"STEMI"'}, {'"anaphylaxis"'}, {'"seizure"'}{"\n"}
              • Specify patient type: {'"pediatric"'}, {'"geriatric"'}, {'"pregnant"'}{"\n"}
              • Search by medication: {'"epinephrine"'}, {'"naloxone"'}, {'"albuterol"'}
            </Text>
          </View>
        </View>
      )}

      {/* Voice Search Modal - wrapped with error boundary */}
      <VoiceErrorBoundary>
        <VoiceSearchModal
          visible={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onTranscription={handleVoiceTranscription}
        />
      </VoiceErrorBoundary>
    </ScreenContainer>
  );
}
