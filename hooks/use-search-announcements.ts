import { useCallback } from "react";
import { announceForAccessibility } from "@/lib/accessibility";

/**
 * Custom hook for managing screen reader announcements during search
 */
export const useSearchAnnouncements = () => {
  /**
   * Announce when search starts
   */
  const announceSearchStart = useCallback((query: string) => {
    announceForAccessibility(`Searching for ${query}`);
  }, []);

  /**
   * Announce search results
   */
  const announceSearchResults = useCallback((resultCount: number) => {
    announceForAccessibility(
      resultCount === 0
        ? "No results found"
        : `Found ${resultCount} ${resultCount === 1 ? "result" : "results"}`
    );
  }, []);

  /**
   * Announce search error
   */
  const announceSearchError = useCallback((errorMessage: string) => {
    announceForAccessibility(errorMessage);
  }, []);

  return {
    announceSearchStart,
    announceSearchResults,
    announceSearchError,
  };
};
