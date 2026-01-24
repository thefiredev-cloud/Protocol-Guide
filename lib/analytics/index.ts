/**
 * Analytics SDK for Protocol Guide
 *
 * Client-side event tracking for understanding EMS professional behavior.
 * Supports offline queuing for PWA and batched event submission.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { EventQueue } from "./event-queue";
import { SessionManager, UserTraits } from "./session";

// ============ Types ============

export interface AnalyticsEvent {
  eventType: EventType;
  eventName: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  screenName?: string;
}

export type EventType =
  | "search"
  | "protocol"
  | "user"
  | "conversion"
  | "feature"
  | "navigation"
  | "error";

export interface SearchEventProperties {
  query: string;
  resultsCount: number;
  latencyMs: number;
  method: "text" | "voice" | "example_click";
  stateFilter?: string;
  agencyId?: number;
  topResultScore?: number;
  noResults?: boolean;
}

export interface ProtocolViewProperties {
  protocolId: number;
  protocolNumber?: string;
  protocolTitle?: string;
  source: "search" | "history" | "bookmark" | "deep_link";
  searchResultRank?: number;
  fromQuery?: string;
}

export interface ConversionEventProperties {
  fromTier?: string;
  toTier?: string;
  plan?: "monthly" | "annual";
  promptLocation?: string;
  triggerFeature?: string;
}

// Re-export types from session module
export type { UserTraits } from "./session";

// ============ Analytics Class ============

class Analytics {
  private session: SessionManager;
  private queue: EventQueue;
  private currentScreen: string = "";
  private isInitialized: boolean = false;

  constructor() {
    this.session = new SessionManager();
    this.queue = new EventQueue();
    
    // Set up session event callback to use our track method
    this.session.setEventCallback((eventName, properties) => {
      this.track(eventName, properties);
    });
  }

  /**
   * Initialize analytics with optional user identification
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.queue.init();
    await this.session.startSession();

    this.isInitialized = true;
  }

  /**
   * Clean up analytics (call on app unmount)
   */
  async destroy(): Promise<void> {
    await this.session.endSession();
    await this.queue.destroy();
    this.isInitialized = false;
  }

  // ============ User Identification ============

  /**
   * Identify the current user
   */
  identify(userId: number, traits?: UserTraits): void {
    this.session.identify(userId, traits);
  }

  /**
   * Reset user identification (on logout)
   */
  reset(): void {
    this.session.reset();
  }

  // ============ Screen Tracking ============

  /**
   * Track screen view
   */
  screen(screenName: string): void {
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    this.track("screen_viewed", {
      screenName,
      previousScreen: previousScreen || undefined,
    });
  }

  // ============ Core Event Tracking ============

  /**
   * Track a generic event
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    const event: AnalyticsEvent = {
      eventType: this.categorizeEvent(eventName),
      eventName,
      properties: {
        ...properties,
        userId: this.session.getUserId(),
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || "unknown",
      },
      timestamp: Date.now(),
      sessionId: this.session.getSessionId(),
      screenName: this.currentScreen,
    };

    this.queue.enqueue(event);
  }

  private categorizeEvent(eventName: string): EventType {
    if (eventName.startsWith("search_")) return "search";
    if (eventName.startsWith("protocol_")) return "protocol";
    if (eventName.startsWith("upgrade_") || eventName.startsWith("subscription_"))
      return "conversion";
    if (eventName.startsWith("screen_") || eventName.startsWith("navigation_"))
      return "navigation";
    if (eventName.startsWith("error_")) return "error";
    return "feature";
  }

  // ============ Specialized Tracking Methods ============

  /**
   * Track a search event with detailed metrics
   */
  trackSearch(props: SearchEventProperties): void {
    this.track("search_completed", {
      query: props.query,
      resultsCount: props.resultsCount,
      latencyMs: props.latencyMs,
      method: props.method,
      stateFilter: props.stateFilter,
      agencyId: props.agencyId,
      topResultScore: props.topResultScore,
      noResults: props.noResults || props.resultsCount === 0,
    });
  }

  /**
   * Track when user clicks a search result
   */
  trackSearchResultClick(
    query: string,
    resultRank: number,
    protocolId: number,
    relevanceScore: number
  ): void {
    this.track("search_result_clicked", {
      query,
      resultRank,
      protocolId,
      relevanceScore,
    });
  }

  /**
   * Track a zero-result search for content gap analysis
   */
  trackNoResults(query: string, stateFilter?: string): void {
    this.track("search_no_results", {
      query,
      stateFilter,
      queryLength: query.length,
      wordCount: query.split(/\s+/).length,
    });
  }

  /**
   * Track protocol view with engagement metrics
   */
  trackProtocolView(props: ProtocolViewProperties): void {
    this.track("protocol_viewed", {
      protocolId: props.protocolId,
      protocolNumber: props.protocolNumber,
      protocolTitle: props.protocolTitle,
      source: props.source,
      searchResultRank: props.searchResultRank,
      fromQuery: props.fromQuery,
    });
  }

  /**
   * Track time spent on a protocol
   */
  trackProtocolEngagement(
    protocolId: number,
    timeSpentSeconds: number,
    scrollDepth: number
  ): void {
    this.track("protocol_engagement", {
      protocolId,
      timeSpentSeconds,
      scrollDepth,
    });
  }

  /**
   * Track voice search usage
   */
  trackVoiceSearch(transcriptionTimeMs: number, transcribedText: string): void {
    this.track("voice_search_completed", {
      transcriptionTimeMs,
      textLength: transcribedText.length,
      wordCount: transcribedText.split(/\s+/).length,
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(eventName: string, props: ConversionEventProperties): void {
    this.track(eventName, {
      fromTier: props.fromTier,
      toTier: props.toTier,
      plan: props.plan,
      promptLocation: props.promptLocation,
      triggerFeature: props.triggerFeature,
    });
  }

  /**
   * Track upgrade prompt shown
   */
  trackUpgradePrompt(location: string, triggerFeature?: string): void {
    const userTraits = this.session.getUserTraits();
    this.track("upgrade_prompt_shown", {
      promptLocation: location,
      triggerFeature,
      userTier: userTraits.tier,
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, properties?: Record<string, unknown>): void {
    const userTraits = this.session.getUserTraits();
    this.track("feature_used", {
      featureName,
      userTier: userTraits.tier,
      ...properties,
    });
  }

  /**
   * Track error events
   */
  trackError(errorName: string, errorMessage: string, context?: Record<string, unknown>): void {
    this.track("error_occurred", {
      errorName,
      errorMessage,
      ...context,
    });
  }

  // ============ Utility Methods ============

  /**
   * Manually flush events to server
   */
  async flush(): Promise<void> {
    await this.queue.flush(this.session.getSessionId(), this.session.getUserId());
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.session.getSessionId();
  }

  /**
   * Get current user ID
   */
  getUserId(): number | null {
    return this.session.getUserId();
  }

  /**
   * Check if analytics is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// ============ Singleton Export ============

export const analytics = new Analytics();

// ============ React Hooks ============

/**
 * Hook for tracking screen views automatically
 */
export function useScreenTracking(screenName: string): void {
  useEffect(() => {
    analytics.screen(screenName);
  }, [screenName]);
}

/**
 * Hook for tracking time spent on a screen/protocol
 */
export function useTimeTracking(
  protocolId: number | null,
  onComplete?: (timeSeconds: number) => void
): void {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      if (protocolId) {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        if (timeSpent > 1 && onComplete) {
          onComplete(timeSpent);
        }
      }
    };
  }, [protocolId, onComplete]);
}

/**
 * Hook for tracking scroll depth
 */
export function useScrollTracking(protocolId: number | null): {
  onScroll: (scrollY: number, contentHeight: number, viewportHeight: number) => void;
  getMaxScrollDepth: () => number;
} {
  const maxScrollDepth = useRef<number>(0);

  const onScroll = (scrollY: number, contentHeight: number, viewportHeight: number): void => {
    if (contentHeight <= viewportHeight) {
      maxScrollDepth.current = 1;
      return;
    }

    const depth = scrollY / (contentHeight - viewportHeight);
    maxScrollDepth.current = Math.max(maxScrollDepth.current, Math.min(1, depth));
  };

  const getMaxScrollDepth = (): number => maxScrollDepth.current;

  return { onScroll, getMaxScrollDepth };
}
