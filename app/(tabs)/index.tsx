import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ChatInput } from "@/components/chat-input";
import { UserMessageCard, LoadingCard } from "@/components/response-card";
import { OfflineBanner } from "@/components/offline-banner";
import { RecentSearches, addRecentSearch } from "@/components/recent-searches";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { getApiBaseUrl } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import * as Haptics from "@/lib/haptics";
import { useCountyRestriction } from "@/hooks/use-county-restriction";
import { CountyLimitModal } from "@/components/county-limit-modal";

type Agency = {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
};

type Message = {
  id: string;
  type: "user" | "summary" | "error";
  text: string;
  protocolTitle?: string;
  protocolNumber?: string;
  protocolYear?: number;
  sourcePdfUrl?: string | null;
  timestamp: Date;
};

// State coverage type
interface StateCoverage {
  state: string;
  stateCode: string;
  chunks: number;
  counties: number;
}

export default function HomeScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Voice search state
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Filter states
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);

  // State data
  const [statesData, setStatesData] = useState<StateCoverage[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [agenciesData, setAgenciesData] = useState<Agency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [totalStats, setTotalStats] = useState<{ totalProtocols: number; totalAgencies: number } | null>(null);

  // County restriction hook for monetization
  const {
    showUpgradeModal,
    closeUpgradeModal,
    checkCanAddCounty,
    currentCounties,
    maxCounties,
    incrementCountyCount,
  } = useCountyRestriction(selectedAgency ? 1 : 0);

  // tRPC queries
  const { data: coverageData, isLoading: coverageLoading } = trpc.search.coverageByState.useQuery();
  const { data: statsData } = trpc.search.totalStats.useQuery();
  const { data: agenciesResult, isLoading: agenciesQueryLoading } = trpc.search.agenciesByState.useQuery(
    { state: selectedState || '' },
    { enabled: !!selectedState }
  );
  
  // Transform coverage data
  useEffect(() => {
    if (coverageData) {
      const sortedStates = coverageData
        .filter((s: StateCoverage) => s.chunks > 0)
        .sort((a: StateCoverage, b: StateCoverage) => a.state.localeCompare(b.state));
      setStatesData(sortedStates);
    }
    setStatesLoading(coverageLoading);
  }, [coverageData, coverageLoading]);
  
  // Transform stats
  useEffect(() => {
    if (statsData) {
      setTotalStats({
        totalProtocols: statsData.totalChunks,
        totalAgencies: statsData.totalCounties,
      });
    }
  }, [statsData]);

  // Transform agencies
  useEffect(() => {
    if (!selectedState) {
      setAgenciesData([]);
      return;
    }
    if (agenciesResult) {
      const agencies: Agency[] = agenciesResult
        .filter((a: { protocolCount: number }) => a.protocolCount > 0)
        .map((a: { id: number; name: string; state: string; protocolCount: number }) => ({
          id: a.id,
          name: a.name,
          state: a.state,
          protocolCount: a.protocolCount,
        }))
        .sort((a: Agency, b: Agency) => b.protocolCount - a.protocolCount);
      setAgenciesData(agencies);
    }
    setAgenciesLoading(agenciesQueryLoading);
  }, [selectedState, agenciesResult, agenciesQueryLoading]);

  // Reset agency when state changes
  useEffect(() => {
    setSelectedAgency(null);
  }, [selectedState]);

  // Scroll to bottom
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const trpcUtils = trpc.useUtils();
  
  const handleSendMessage = useCallback(async (text: string) => {
    addRecentSearch(text);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Search for protocols
      let results;
      if (selectedAgency) {
        results = await trpcUtils.search.searchByAgency.fetch({
          query: text,
          agencyId: selectedAgency.id,
          limit: 3,
        });
      } else {
        results = await trpcUtils.search.semantic.fetch({
          query: text,
          limit: 3,
          stateFilter: selectedState || undefined,
        });
      }
      
      if (!results.results || results.results.length === 0) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: "error",
          text: "No protocols found. Try different keywords.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      // Get the best match and generate ultra-concise summary
      const best = results.results[0];
      const content = best.fullContent || best.content || "";
      
      // Call LLM for ultra-concise summary
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          content: content.substring(0, 6000),
          protocolTitle: best.protocolTitle,
        }),
      });
      
      let summaryText = "";
      if (response.ok) {
        const data = await response.json();
        summaryText = data.summary || "";
      }
      
      // Fallback: extract key info if LLM fails
      if (!summaryText) {
        summaryText = extractKeySteps(content, text);
      }

      const summaryMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "summary",
        text: summaryText,
        protocolTitle: best.protocolTitle,
        protocolNumber: best.protocolNumber,
        protocolYear: best.protocolYear || undefined,
        sourcePdfUrl: best.sourcePdfUrl,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, summaryMsg]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Search error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "error",
        text: "Search failed. Check connection.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedState, selectedAgency, trpcUtils]);

  // Extract key steps from protocol content (fallback)
  const extractKeySteps = (content: string, query: string): string => {
    const lines = content.split('\n').filter(l => l.trim());
    const keyLines: string[] = [];
    
    // Look for medication dosages and key actions
    const patterns = [
      /\d+\s*(mg|mcg|ml|mL|g|units?)/i,
      /IV|IO|IM|SQ|PO|ET|IN/,
      /CPR|AED|defib|shock|epi|amio|narcan|nalox/i,
      /assess|monitor|establish|admin|give|push/i,
    ];
    
    for (const line of lines) {
      if (patterns.some(p => p.test(line))) {
        const clean = line.replace(/^[-•*]\s*/, '').trim();
        if (clean.length > 10 && clean.length < 100) {
          keyLines.push(clean);
        }
      }
      if (keyLines.length >= 5) break;
    }
    
    if (keyLines.length === 0) {
      return "Protocol found. Tap to view full content.";
    }
    
    return keyLines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  };

  const handleClearFilters = useCallback(() => {
    setSelectedState(null);
    setSelectedAgency(null);
  }, []);

  // Voice search handlers
  const handleVoiceTranscription = useCallback((text: string) => {
    setVoiceError(null);
    // Automatically trigger search with transcribed text
    handleSendMessage(text);
  }, [handleSendMessage]);

  const handleVoiceError = useCallback((error: string) => {
    setVoiceError(error);
    // Clear error after 3 seconds
    setTimeout(() => setVoiceError(null), 3000);
  }, []);

  // Get year color
  const getYearColor = (year?: number) => {
    if (!year) return colors.muted;
    const age = new Date().getFullYear() - year;
    if (age <= 1) return colors.success;
    if (age <= 2) return colors.primary;
    return colors.warning;
  };

  // Render summary card - ULTRA CONCISE
  const renderSummaryCard = (msg: Message) => {
    const yearColor = getYearColor(msg.protocolYear);
    
    return (
      <View className="mb-3">
        {/* Protocol header - minimal */}
        <View 
          className="flex-row items-center justify-between px-3 py-2 rounded-t-lg"
          style={{ backgroundColor: colors.primary + "15" }}
        >
          <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>
            {msg.protocolTitle || "Protocol"}
          </Text>
          {msg.protocolYear && (
            <Text style={{ color: yearColor, fontSize: 12, fontWeight: "700" }}>
              {msg.protocolYear}
            </Text>
          )}
        </View>
        
        {/* Summary - THE MAIN OUTPUT */}
        <View
          className="px-3 py-3 rounded-b-lg border-l border-r border-b"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text
            className="text-base text-foreground"
            style={{ lineHeight: 24, letterSpacing: 0.2 }}
          >
            {msg.text}
          </Text>

          {/* Medical Disclaimer */}
          <Text
            className="mt-3"
            style={{
              fontSize: 12,
              color: colors.muted,
              fontStyle: 'italic',
              lineHeight: 16,
            }}
          >
            Consult medical director for patient-specific guidance. Follow your local protocols.
          </Text>
        </View>
      </View>
    );
  };

  // Render message
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === "user") {
      return (
        <View className="mb-2 items-end">
          <View 
            className="px-3 py-2 rounded-2xl max-w-[85%]"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-base">{item.text}</Text>
          </View>
        </View>
      );
    }
    
    if (item.type === "summary") {
      return renderSummaryCard(item);
    }
    
    // Error message
    return (
      <View className="mb-2">
        <View className="px-3 py-2 rounded-lg bg-surface">
          <Text className="text-muted text-sm">{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <OfflineBanner />
      
      {/* Compact Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
        <View className="flex-row items-center">
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 28, height: 28, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text className="text-lg font-bold text-foreground">Protocol Guide</Text>
        </View>
        {/* Filter indicator */}
        {selectedState && (
          <TouchableOpacity 
            onPress={handleClearFilters}
            className="flex-row items-center px-2 py-1 rounded-full bg-primary/10"
          >
            <Text className="text-xs text-primary font-medium">
              {selectedAgency?.name?.substring(0, 15) || selectedState}
            </Text>
            <IconSymbol name="xmark.circle.fill" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filter Row */}
      <View className="flex-row px-4 py-2 gap-2">
        <TouchableOpacity
          onPress={() => setShowStateDropdown(true)}
          className="flex-1 flex-row items-center justify-between bg-surface rounded-lg px-3 py-2 border border-border"
          activeOpacity={0.7}
        >
          <Text 
            className="text-sm"
            style={{ color: selectedState ? colors.foreground : colors.muted }}
            numberOfLines={1}
          >
            {selectedState || "State"}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </TouchableOpacity>

        {selectedState && (
          <TouchableOpacity
            onPress={() => setShowAgencyDropdown(true)}
            className="flex-1 flex-row items-center justify-between bg-surface rounded-lg px-3 py-2 border border-border"
            activeOpacity={0.7}
          >
            <Text 
              className="text-sm"
              style={{ color: selectedAgency ? colors.foreground : colors.muted }}
              numberOfLines={1}
            >
              {agenciesLoading ? "..." : (selectedAgency?.name?.substring(0, 12) || "Agency")}
            </Text>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <IconSymbol name="magnifyingglass" size={40} color={colors.muted} />
            <Text className="text-lg font-semibold text-foreground mt-3">Quick Protocol Search</Text>
            <Text className="text-sm text-muted text-center mt-1">
              3-5 words → instant answer
            </Text>
            <View className="mt-4 gap-1">
              <Text className="text-xs text-muted text-center italic">{'"cardiac arrest adult"'}</Text>
              <Text className="text-xs text-muted text-center italic">{'"pediatric seizure"'}</Text>
              <Text className="text-xs text-muted text-center italic">{'"chest pain stemi"'}</Text>
            </View>
          </View>
          <RecentSearches onSelectSearch={handleSendMessage} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <View className="px-4 pb-2">
          <LoadingCard />
        </View>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="cardiac arrest adult..."
      />

      {/* State Modal */}
      <Modal
        visible={showStateDropdown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStateDropdown(false)}
      >
        <View className="flex-1 bg-background">
          <View 
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-lg font-semibold text-foreground">Select State</Text>
            <TouchableOpacity onPress={() => setShowStateDropdown(false)}>
              <IconSymbol name="xmark.circle.fill" size={26} color={colors.muted} />
            </TouchableOpacity>
          </View>
          
          {statesLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={statesData}
              keyExtractor={(item) => item.stateCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedState(item.state);
                    setShowStateDropdown(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text className="text-base text-foreground">{item.state}</Text>
                  <Text className="text-sm text-muted">{item.chunks.toLocaleString()}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => {
                    setSelectedState(null);
                    setShowStateDropdown(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b bg-surface"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text className="text-base text-foreground">All States</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      </Modal>

      {/* Agency Modal */}
      <Modal
        visible={showAgencyDropdown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAgencyDropdown(false)}
      >
        <View className="flex-1 bg-background">
          <View
            className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-lg font-semibold text-foreground">Select Agency</Text>
            <TouchableOpacity onPress={() => setShowAgencyDropdown(false)}>
              <IconSymbol name="xmark.circle.fill" size={26} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {agenciesLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={agenciesData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    // Check county restriction before allowing selection
                    // If user already has an agency selected, they can switch freely
                    // If they don't have one, check if they can add
                    if (!selectedAgency && !checkCanAddCounty()) {
                      setShowAgencyDropdown(false);
                      return; // Modal will be shown by the hook
                    }
                    setSelectedAgency(item);
                    setShowAgencyDropdown(false);
                    // Track that user has selected a county
                    if (!selectedAgency) {
                      incrementCountyCount();
                    }
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text className="text-base text-foreground flex-1 mr-2" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-sm text-muted">{item.protocolCount}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAgency(null);
                    setShowAgencyDropdown(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b bg-surface"
                  style={{ borderBottomColor: colors.border }}
                >
                  <Text className="text-base text-foreground">All Agencies</Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="text-muted">No agencies found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* County Limit Modal - shown when free user tries to add 2nd county */}
      <CountyLimitModal
        visible={showUpgradeModal}
        onDismiss={closeUpgradeModal}
        currentCounties={currentCounties}
        maxCounties={maxCounties}
      />
    </ScreenContainer>
  );
}
