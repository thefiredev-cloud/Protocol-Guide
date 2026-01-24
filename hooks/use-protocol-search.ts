import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import { addRecentSearch } from "@/components/recent-searches";
import { extractKeySteps } from "@/utils/protocol-helpers";
import * as Haptics from "@/lib/haptics";
import type { Message, Agency } from "@/types/search.types";

interface UseProtocolSearchOptions {
  selectedState: string | null;
  selectedAgency: Agency | null;
  checkDisclaimerBeforeAction: () => boolean;
}

export function useProtocolSearch({
  selectedState,
  selectedAgency,
  checkDisclaimerBeforeAction,
}: UseProtocolSearchOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trpcUtils = trpc.useUtils();

  const handleSendMessage = useCallback(
    async (text: string) => {
      // P0 CRITICAL: Block search if disclaimer not acknowledged
      if (!checkDisclaimerBeforeAction()) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      addRecentSearch(text);

      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
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
          setMessages((prev) => [...prev, errorMsg]);
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
        setMessages((prev) => [...prev, summaryMsg]);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Search error:", error);
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: "error",
          text: "Search failed. Check connection.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedState, selectedAgency, trpcUtils, checkDisclaimerBeforeAction]
  );

  return {
    messages,
    isLoading,
    handleSendMessage,
  };
}
