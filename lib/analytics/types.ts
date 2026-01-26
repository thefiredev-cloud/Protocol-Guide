/**
 * Analytics Type Definitions
 *
 * Shared types for the analytics module, extracted to break circular dependencies.
 */

// ============ Event Types ============

export type EventType =
  | "search"
  | "protocol"
  | "user"
  | "conversion"
  | "feature"
  | "navigation"
  | "error";

export interface AnalyticsEvent {
  eventType: EventType;
  eventName: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  screenName?: string;
}

// ============ Property Types ============

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
