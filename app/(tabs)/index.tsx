import { useRef, useCallback, useEffect } from "react";
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

  // Disclaimer management
  const {
    showDisclaimerModal,
    handleDisclaimerAcknowledged,
    checkDisclaimerBeforeAction,
  } = useDisclaimer();

  // Filter state management
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
  } = useFilterState();

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

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
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
