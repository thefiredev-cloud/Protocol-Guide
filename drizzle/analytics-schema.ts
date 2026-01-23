/**
 * Analytics Schema for Protocol Guide
 *
 * Tracks user behavior, search patterns, protocol usage, and retention metrics.
 * Designed for EMS professional behavior analysis and product improvement.
 */

import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  float,
  date,
  decimal,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// ============ Analytics Events Table ============

/**
 * Generic analytics events table for flexible event tracking.
 * Supports custom properties for different event types.
 */
export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"), // NULL for anonymous events
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    eventType: varchar("eventType", { length: 50 }).notNull(), // 'search', 'protocol', 'user', 'conversion'
    eventName: varchar("eventName", { length: 100 }).notNull(), // Specific event name
    properties: json("properties").$type<Record<string, unknown>>(),
    deviceType: varchar("deviceType", { length: 20 }), // 'ios', 'android', 'web', 'pwa'
    appVersion: varchar("appVersion", { length: 20 }),
    osVersion: varchar("osVersion", { length: 20 }),
    screenName: varchar("screenName", { length: 100 }),
    referrer: varchar("referrer", { length: 255 }),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_event_type").on(table.eventType),
    index("idx_user_id").on(table.userId),
    index("idx_timestamp").on(table.timestamp),
    index("idx_session").on(table.sessionId),
  ]
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// ============ Search Analytics Table ============

/**
 * Detailed search analytics for understanding search behavior.
 * Tracks query patterns, result quality, and search performance.
 */
export const searchAnalytics = mysqlTable(
  "search_analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    queryText: varchar("queryText", { length: 500 }).notNull(),
    queryTokenCount: int("queryTokenCount"), // For query complexity analysis
    stateFilter: varchar("stateFilter", { length: 2 }),
    agencyId: int("agencyId"),
    resultsCount: int("resultsCount").notNull(),
    topResultProtocolId: int("topResultProtocolId"),
    topResultScore: float("topResultScore"),
    selectedResultRank: int("selectedResultRank"), // Which result user clicked (1-indexed)
    selectedProtocolId: int("selectedProtocolId"),
    timeToFirstResult: int("timeToFirstResult"), // Milliseconds
    totalSearchTime: int("totalSearchTime"), // Milliseconds
    searchMethod: varchar("searchMethod", { length: 20 }), // 'text', 'voice', 'example_click'
    isVoiceQuery: boolean("isVoiceQuery").default(false),
    voiceTranscriptionTime: int("voiceTranscriptionTime"), // Ms for voice to text
    noResultsFound: boolean("noResultsFound").default(false),
    queryCategory: varchar("queryCategory", { length: 50 }), // Auto-classified category
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_search").on(table.userId, table.timestamp),
    index("idx_no_results").on(table.noResultsFound, table.timestamp),
    index("idx_state").on(table.stateFilter),
    index("idx_category").on(table.queryCategory),
  ]
);

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = typeof searchAnalytics.$inferInsert;

// ============ Protocol Access Logs Table ============

/**
 * Protocol viewing analytics for content popularity and engagement.
 */
export const protocolAccessLogs = mysqlTable(
  "protocol_access_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    sessionId: varchar("sessionId", { length: 64 }),
    protocolChunkId: int("protocolChunkId").notNull(),
    protocolNumber: varchar("protocolNumber", { length: 50 }),
    protocolTitle: varchar("protocolTitle", { length: 255 }),
    agencyId: int("agencyId"),
    stateCode: varchar("stateCode", { length: 2 }),
    accessSource: varchar("accessSource", { length: 50 }), // 'search', 'history', 'bookmark', 'deep_link'
    timeSpentSeconds: int("timeSpentSeconds"), // How long user viewed protocol
    scrollDepth: float("scrollDepth"), // 0-1, how far user scrolled
    copiedContent: boolean("copiedContent").default(false),
    sharedProtocol: boolean("sharedProtocol").default(false),
    fromSearchQuery: varchar("fromSearchQuery", { length: 500 }), // Original search that led here
    searchResultRank: int("searchResultRank"), // Position in search results
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_protocol").on(table.protocolChunkId),
    index("idx_user_access").on(table.userId, table.timestamp),
    index("idx_state").on(table.stateCode),
    index("idx_source").on(table.accessSource),
  ]
);

export type ProtocolAccessLog = typeof protocolAccessLogs.$inferSelect;
export type InsertProtocolAccessLog = typeof protocolAccessLogs.$inferInsert;

// ============ Session Analytics Table ============

/**
 * Session-level analytics for understanding usage patterns.
 */
export const sessionAnalytics = mysqlTable(
  "session_analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
    deviceType: varchar("deviceType", { length: 20 }),
    appVersion: varchar("appVersion", { length: 20 }),
    platform: varchar("platform", { length: 20 }), // 'ios', 'android', 'web'
    startTime: timestamp("startTime").notNull(),
    endTime: timestamp("endTime"),
    durationSeconds: int("durationSeconds"),
    searchCount: int("searchCount").default(0),
    protocolsViewed: int("protocolsViewed").default(0),
    queriesSubmitted: int("queriesSubmitted").default(0), // AI-powered queries
    screenTransitions: int("screenTransitions").default(0),
    isNewUser: boolean("isNewUser").default(false),
    userTier: varchar("userTier", { length: 20 }),
    referralSource: varchar("referralSource", { length: 100 }),
    entryScreen: varchar("entryScreen", { length: 100 }),
    exitScreen: varchar("exitScreen", { length: 100 }),
    userCertificationLevel: varchar("userCertificationLevel", { length: 50 }), // EMT, AEMT, Paramedic
  },
  (table) => [
    index("idx_user_session").on(table.userId),
    index("idx_start").on(table.startTime),
  ]
);

export type SessionAnalytics = typeof sessionAnalytics.$inferSelect;
export type InsertSessionAnalytics = typeof sessionAnalytics.$inferInsert;

// ============ Daily Metrics Table ============

/**
 * Pre-aggregated daily metrics for dashboard performance.
 */
export const dailyMetrics = mysqlTable(
  "daily_metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    date: date("date").notNull(),
    metricType: varchar("metricType", { length: 50 }).notNull(), // 'dau', 'searches', 'conversions', etc.
    dimension: varchar("dimension", { length: 100 }), // State, tier, device, etc.
    dimensionValue: varchar("dimensionValue", { length: 100 }),
    count: int("count").default(0),
    sumValue: decimal("sumValue", { precision: 15, scale: 2 }),
    avgValue: decimal("avgValue", { precision: 15, scale: 4 }),
    p50Value: decimal("p50Value", { precision: 15, scale: 4 }),
    p95Value: decimal("p95Value", { precision: 15, scale: 4 }),
    minValue: decimal("minValue", { precision: 15, scale: 4 }),
    maxValue: decimal("maxValue", { precision: 15, scale: 4 }),
  },
  (table) => [
    uniqueIndex("unique_daily").on(
      table.date,
      table.metricType,
      table.dimension,
      table.dimensionValue
    ),
    index("idx_date").on(table.date),
    index("idx_metric").on(table.metricType),
  ]
);

export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetric = typeof dailyMetrics.$inferInsert;

// ============ User Retention Cohorts Table ============

/**
 * Pre-calculated retention cohort data for retention analysis.
 */
export const retentionCohorts = mysqlTable(
  "retention_cohorts",
  {
    id: int("id").autoincrement().primaryKey(),
    cohortDate: date("cohortDate").notNull(), // Week/month of user signup
    cohortType: varchar("cohortType", { length: 20 }).notNull(), // 'weekly', 'monthly'
    cohortSize: int("cohortSize").notNull(),
    d1Retained: int("d1Retained"),
    d7Retained: int("d7Retained"),
    d14Retained: int("d14Retained"),
    d30Retained: int("d30Retained"),
    d60Retained: int("d60Retained"),
    d90Retained: int("d90Retained"),
    segment: varchar("segment", { length: 50 }), // 'free', 'pro', 'enterprise', 'all'
    acquisitionSource: varchar("acquisitionSource", { length: 100 }),
    calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_cohort").on(
      table.cohortDate,
      table.cohortType,
      table.segment
    ),
    index("idx_cohort_date").on(table.cohortDate),
  ]
);

export type RetentionCohort = typeof retentionCohorts.$inferSelect;
export type InsertRetentionCohort = typeof retentionCohorts.$inferInsert;

// ============ Content Gap Analysis Table ============

/**
 * Tracks zero-result searches for content gap identification.
 */
export const contentGaps = mysqlTable(
  "content_gaps",
  {
    id: int("id").autoincrement().primaryKey(),
    queryPattern: varchar("queryPattern", { length: 500 }).notNull(), // Normalized query
    occurrences: int("occurrences").default(1),
    lastOccurred: timestamp("lastOccurred").defaultNow().notNull(),
    firstOccurred: timestamp("firstOccurred").defaultNow().notNull(),
    statesRequested: json("statesRequested").$type<string[]>(), // Which states users filtered by
    suggestedCategory: varchar("suggestedCategory", { length: 50 }),
    priority: varchar("priority", { length: 20 }).default("low"), // 'high', 'medium', 'low'
    status: varchar("status", { length: 20 }).default("open"), // 'open', 'in_progress', 'resolved', 'wont_fix'
    resolvedAt: timestamp("resolvedAt"),
    notes: text("notes"),
  },
  (table) => [
    index("idx_occurrences").on(table.occurrences),
    index("idx_priority").on(table.priority),
    index("idx_status").on(table.status),
  ]
);

export type ContentGap = typeof contentGaps.$inferSelect;
export type InsertContentGap = typeof contentGaps.$inferInsert;

// ============ Conversion Events Table ============

/**
 * Tracks conversion funnel events for revenue analysis.
 */
export const conversionEvents = mysqlTable(
  "conversion_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    sessionId: varchar("sessionId", { length: 64 }),
    eventType: varchar("eventType", { length: 50 }).notNull(), // 'upgrade_prompt_shown', 'checkout_started', 'subscription_completed'
    fromTier: varchar("fromTier", { length: 20 }),
    toTier: varchar("toTier", { length: 20 }),
    plan: varchar("plan", { length: 20 }), // 'monthly', 'annual'
    promptLocation: varchar("promptLocation", { length: 100 }), // Where the upgrade prompt was shown
    triggerFeature: varchar("triggerFeature", { length: 100 }), // Feature that triggered upgrade
    amount: decimal("amount", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    stripeSessionId: varchar("stripeSessionId", { length: 255 }),
    completed: boolean("completed").default(false),
    completedAt: timestamp("completedAt"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_conversion").on(table.userId),
    index("idx_event_type").on(table.eventType),
    index("idx_timestamp").on(table.timestamp),
  ]
);

export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type InsertConversionEvent = typeof conversionEvents.$inferInsert;

// ============ Feature Usage Stats Table ============

/**
 * Aggregated feature usage statistics.
 */
export const featureUsageStats = mysqlTable(
  "feature_usage_stats",
  {
    id: int("id").autoincrement().primaryKey(),
    date: date("date").notNull(),
    featureName: varchar("featureName", { length: 100 }).notNull(),
    uniqueUsers: int("uniqueUsers").default(0),
    totalUsage: int("totalUsage").default(0),
    avgUsagePerUser: decimal("avgUsagePerUser", { precision: 10, scale: 2 }),
    tierBreakdown: json("tierBreakdown").$type<Record<string, number>>(), // { free: 100, pro: 50 }
    deviceBreakdown: json("deviceBreakdown").$type<Record<string, number>>(), // { ios: 80, android: 40, web: 30 }
  },
  (table) => [
    uniqueIndex("unique_feature_date").on(table.date, table.featureName),
    index("idx_feature").on(table.featureName),
  ]
);

export type FeatureUsageStat = typeof featureUsageStats.$inferSelect;
export type InsertFeatureUsageStat = typeof featureUsageStats.$inferInsert;

// ============ Type Exports ============

export type EventType = "search" | "protocol" | "user" | "conversion" | "feature" | "error";

export type SearchMethod = "text" | "voice" | "example_click";

export type AccessSource = "search" | "history" | "bookmark" | "deep_link" | "integration";

export type QueryCategory =
  | "cardiac"
  | "respiratory"
  | "trauma"
  | "pediatric"
  | "ob_gyn"
  | "behavioral"
  | "medical"
  | "medication"
  | "procedure"
  | "other";
