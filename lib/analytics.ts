/**
 * Analytics SDK for Protocol Guide
 *
 * Client-side event tracking for understanding EMS professional behavior.
 * Supports offline queuing for PWA and batched event submission.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ============ React Hook ============

import { useEffect, useRef } from "react";

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

export interface UserTraits {
  email?: string;
  tier?: string;
  certificationLevel?: string;
  state?: string;
  agencyId?: number;
  createdAt?: string;
}

// ============ Configuration ============

const ANALYTICS_STORAGE_KEY = "@protocol_guide_analytics_queue";
const SESSION_STORAGE_KEY = "@protocol_guide_session";
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 30000; // 30 seconds
const MAX_QUEUE_SIZE = 500;

// ============ Analytics Class ============

class Analytics {
  private sessionId: string = "";
  private userId: number | null = null;
  private userTraits: UserTraits = {};
  private eventQueue: AnalyticsEvent[] = [];
  private currentScreen: string = "";
  private sessionStartTime: number = 0;
  private isInitialized: boolean = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize analytics with optional user identification
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadQueue();
    await this.startSession();

    // Set up periodic flush
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, FLUSH_INTERVAL_MS);

    this.isInitialized = true;
  }

  /**
   * Clean up analytics (call on app unmount)
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.endSession();
    await this.flush();
  }

  // ============ Session Management ============

  private async startSession(): Promise<void> {
    // Check for existing session
    const existingSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (existingSession) {
      const session = JSON.parse(existingSession);
      const sessionAge = Date.now() - session.startTime;

      // Reuse session if less than 30 minutes old
      if (sessionAge < 30 * 60 * 1000) {
        this.sessionId = session.id;
        this.sessionStartTime = session.startTime;
        return;
      }
    }

    // Create new session
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        id: this.sessionId,
        startTime: this.sessionStartTime,
      })
    );

    this.track("session_started", {
      isReturning: !!existingSession,
    });
  }

  private async endSession(): Promise<void> {
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    this.track("session_ended", {
      durationSeconds: duration,
      eventsCount: this.eventQueue.length,
    });
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // ============ User Identification ============

  /**
   * Identify the current user
   */
  identify(userId: number, traits?: UserTraits): void {
    this.userId = userId;
    if (traits) {
      this.userTraits = { ...this.userTraits, ...traits };
    }

    this.track("user_identified", {
      userId,
      ...traits,
    });
  }

  /**
   * Reset user identification (on logout)
   */
  reset(): void {
    this.userId = null;
    this.userTraits = {};
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
        userId: this.userId,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || "unknown",
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      screenName: this.currentScreen,
    };

    this.queueEvent(event);
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
    this.track("upgrade_prompt_shown", {
      promptLocation: location,
      triggerFeature,
      userTier: this.userTraits.tier,
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, properties?: Record<string, unknown>): void {
    this.track("feature_used", {
      featureName,
      userTier: this.userTraits.tier,
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

  // ============ Queue Management ============

  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);

    // Prevent queue from growing too large
    if (this.eventQueue.length > MAX_QUEUE_SIZE) {
      this.eventQueue = this.eventQueue.slice(-MAX_QUEUE_SIZE);
    }

    // Auto-flush if batch is ready
    if (this.eventQueue.length >= BATCH_SIZE) {
      this.flush().catch(console.error);
    }

    // Persist queue for offline support
    this.saveQueue().catch(console.error);
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.eventQueue));
    } catch (error) {
      console.error("[Analytics] Failed to save queue:", error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("[Analytics] Failed to load queue:", error);
      this.eventQueue = [];
    }
  }

  /**
   * Flush events to the server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch("/api/analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          userId: this.userId,
          deviceInfo: {
            platform: Platform.OS,
            appVersion: Constants.expoConfig?.version,
          },
        }),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue = [...eventsToSend, ...this.eventQueue];
        await this.saveQueue();
        throw new Error(`Analytics flush failed: ${response.status}`);
      }

      // Clear persisted queue on success
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.eventQueue));
    } catch (error) {
      // Re-queue events on network failure
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      await this.saveQueue();
      console.error("[Analytics] Flush failed:", error);
    }
  }

  // ============ Utility Methods ============

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current user ID
   */
  getUserId(): number | null {
    return this.userId;
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
