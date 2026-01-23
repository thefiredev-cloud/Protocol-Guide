/**
 * Verification script for analytics schema exports
 * This file tests that all analytics tables are properly exported from schema.ts
 */

import {
  analyticsEvents,
  searchAnalytics,
  protocolAccessLogs,
  sessionAnalytics,
  dailyMetrics,
  retentionCohorts,
  contentGaps,
  conversionEvents,
  featureUsageStats,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type ProtocolAccessLog,
  type InsertProtocolAccessLog,
  type SessionAnalytics,
  type InsertSessionAnalytics,
  type DailyMetric,
  type InsertDailyMetric,
  type RetentionCohort,
  type InsertRetentionCohort,
  type ContentGap,
  type InsertContentGap,
  type ConversionEvent,
  type InsertConversionEvent,
  type FeatureUsageStat,
  type InsertFeatureUsageStat,
  type EventType,
  type SearchMethod,
  type AccessSource,
  type QueryCategory,
} from "./schema";

// Type assertions to verify imports work
const tables = {
  analyticsEvents,
  searchAnalytics,
  protocolAccessLogs,
  sessionAnalytics,
  dailyMetrics,
  retentionCohorts,
  contentGaps,
  conversionEvents,
  featureUsageStats,
};

// Test type usage
const testEvent: InsertAnalyticsEvent = {
  sessionId: "test-session",
  eventType: "search",
  eventName: "protocol_search",
  timestamp: new Date(),
};

const testSearch: InsertSearchAnalytics = {
  sessionId: "test-session",
  queryText: "cardiac arrest",
  resultsCount: 5,
  timestamp: new Date(),
};

console.log("✓ All analytics schema exports verified");
console.log("✓ Tables:", Object.keys(tables).length, "tables exported");
console.log("✓ Type system working correctly");
