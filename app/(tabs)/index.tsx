import { useRef, useCallback, useEffect, useMemo } from "react";
import { View, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ChatInput } from "@/components/chat-input";
import { LoadingCard } from "@/components/response-card";
import { OfflineBanner } from "@/components/offline-banner";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { useCountyRestriction } from "@/hooks/use-county-restriction";
import { CountyLimitModal } from "@/components/county-limit-modal";
import { DisclaimerConsentModal } from "@/components/DisclaimerConsentModal";
import {
  VoiceErrorBoundary,
  SearchResultsErrorBoundary,
} from "@/components/ErrorBoundary";
import { useLocalSearchParams } from "expo-router";
// SEO Components
import { SEOHead, MedicalWebPageSchema } from "@/components/seo";

// Extracted hooks
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useFilterState } from "@/hooks/use-filter-state";
import { useDisclaimer } from "@/hooks/use-disclaimer";
import { useProtocolSearch } from "@/hooks/use-protocol-search";

// Extracted components
import { SearchHeader } from "@/components/search/SearchHeader";
import { FilterRow } from "@/components/search/FilterRow";
import { EmptySearchState } from "@/components/search/EmptySearchState";
import { MessageBubble } from "@/components/search/MessageBubble";
import { StateModal } from "@/components/search/StateModal";
import { AgencyModal } from "@/components/search/AgencyModal";
import { VoiceErrorBanner } from "@/components/search/VoiceErrorBanner";

import type { Message } from "@/types/search.types";

export default function HomeScreen() {
  const flatListRef = useRef<FlatList>(null);
  
  // Read route params from navigation (e.g., from coverage page)
  const { stateFilter, agencyId } = useLocalSearchParams<{ 
    stateFilter?: string; 
    agencyId?: string; 
  }>();

  // Disclaimer management
  const {
    showDisclaimerModal,
    handleDisclaimerAcknowledged,
    checkDisclaimerBeforeAction,
  } = useDisclaimer();

  // Filter state management with initial values from route params
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
    initialState: stateFilter || null,
    initialAgencyId: agencyId ? parseInt(agencyId, 10) : null,
  });

  // Voice search management
  const { voiceError, handleVoiceError, clearVoiceError } = useVoiceSearch();

  // Protocol search
  const { messages, isLoading, handleSendMessage } = useProtocolSearch({
    selectedState,
    selectedAgency,
    checkDisclaimerBeforeAction,
  });

  // County restriction hook for monetization
  const {
    showUpgradeModal,
    closeUpgradeModal,
    checkCanAddCounty,
    currentCounties,
    maxCounties,
    incrementCountyCount,
  } = useCountyRestriction(selectedAgency ? 1 : 0);

  // Voice search handler
  const handleVoiceTranscription = useCallback(
    (text: string) => {
      clearVoiceError();
      // Automatically trigger search with transcribed text
      handleSendMessage(text);
    },
    [handleSendMessage, clearVoiceError]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Render message
  const renderMessage = ({ item }: { item: Message }) => {
    return <MessageBubble message={item} />;
  };

  // Generate dynamic SEO title based on selected filters
  const seoTitle = useMemo(() => {
    if (selectedAgency) {
      return `${selectedAgency.name} EMS Protocols`;
    }
    if (selectedState) {
      return `${selectedState} EMS Protocols`;
    }
    return "Search EMS Protocols";
  }, [selectedState, selectedAgency]);

  const seoDescription = useMemo(() => {
    if (selectedAgency) {
      return `Search ${selectedAgency.name} EMS protocols. Find cardiac arrest, pediatric, trauma, and medical protocols for paramedics and EMTs.`;
    }
    if (selectedState) {
      return `Search ${selectedState} EMS protocols. Access county-specific prehospital treatment guidelines for paramedics and EMTs.`;
    }
    return "AI-powered EMS protocol search. Find LA County, California, and nationwide protocols for cardiac arrest, pediatric emergencies, trauma, and more.";
  }, [selectedState, selectedAgency]);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* SEO Meta Tags - Dynamic based on filters */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        path="/search"
        keywords={[
          selectedState ? `${selectedState} EMS protocols` : "EMS protocols",
          selectedAgency ? selectedAgency.name : "California protocols",
          "paramedic protocols",
          "EMT protocols",
          "cardiac arrest protocol",
          "pediatric dosing",
        ]}
      />
      
      {/* Medical Web Page Schema for protocol content */}
      <MedicalWebPageSchema
        name={seoTitle}
        description={seoDescription}
        url="/search"
        medicalAudience={["Paramedics", "EMTs", "First Responders"]}
        specialty="Emergency Medicine"
      />

      <OfflineBanner />

      {/* Compact Header */}
      <SearchHeader
        selectedState={selectedState}
        selectedAgency={selectedAgency}
        onClearFilters={handleClearFilters}
      />

      {/* Quick Filter Row */}
      <FilterRow
        selectedState={selectedState}
        selectedAgency={selectedAgency}
        agenciesLoading={agenciesLoading}
        onOpenStateModal={() => setShowStateDropdown(true)}
        onOpenAgencyModal={() => setShowAgencyDropdown(true)}
      />

      {/* Messages */}
      {messages.length === 0 ? (
        <EmptySearchState onSelectSearch={handleSendMessage} />
      ) : (
        <SearchResultsErrorBoundary>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        </SearchResultsErrorBoundary>
      )}

      {/* Loading */}
      {isLoading && (
        <View className="px-4 pb-2">
          <LoadingCard />
        </View>
      )}

      {/* Voice Error Banner */}
      <VoiceErrorBanner error={voiceError} />

      {/* Voice Search Button - positioned above input */}
      <View className="flex-row items-center justify-center pb-2">
        <VoiceErrorBoundary>
          <VoiceSearchButton
            onTranscription={handleVoiceTranscription}
            onError={handleVoiceError}
            disabled={isLoading}
            size="medium"
          />
        </VoiceErrorBoundary>
      </View>

      {/* Text Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="cardiac arrest adult..."
      />

      {/* State Modal */}
      <StateModal
        visible={showStateDropdown}
        onClose={() => setShowStateDropdown(false)}
        states={statesData}
        loading={statesLoading}
        error={coverageError}
        onSelectState={setSelectedState}
      />

      {/* Agency Modal */}
      <AgencyModal
        visible={showAgencyDropdown}
        onClose={() => setShowAgencyDropdown(false)}
        agencies={agenciesData}
        loading={agenciesLoading}
        selectedAgency={selectedAgency}
        onSelectAgency={setSelectedAgency}
        onCheckCountyRestriction={checkCanAddCounty}
        onIncrementCounty={incrementCountyCount}
      />

      {/* County Limit Modal - shown when free user tries to add 2nd county */}
      <CountyLimitModal
        visible={showUpgradeModal}
        onDismiss={closeUpgradeModal}
        currentCounties={currentCounties}
        maxCounties={maxCounties}
      />

      {/* P0 CRITICAL: Medical Disclaimer Consent Modal - Legal Compliance */}
      {/* Blocks access to protocol search until acknowledged */}
      <DisclaimerConsentModal
        visible={showDisclaimerModal}
        onAcknowledged={handleDisclaimerAcknowledged}
      />
    </ScreenContainer>
  );
}
