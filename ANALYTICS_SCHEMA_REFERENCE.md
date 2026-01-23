# Analytics Schema Reference

Quick reference guide for Protocol Guide's analytics tables.

---

## Table: analytics_events

**Purpose:** Generic event tracking with flexible properties

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User ID (nullable for anonymous) |
| sessionId | varchar(64) | Session identifier |
| eventType | varchar(50) | Event category (search, protocol, user, conversion) |
| eventName | varchar(100) | Specific event name |
| properties | json | Custom event data |
| deviceType | varchar(20) | ios, android, web, pwa |
| appVersion | varchar(20) | App version |
| osVersion | varchar(20) | OS version |
| screenName | varchar(100) | Current screen |
| referrer | varchar(255) | Referrer URL |
| ipAddress | varchar(45) | IP address |
| userAgent | varchar(500) | User agent string |
| timestamp | timestamp | Event timestamp |

**Indexes:** event_type, user_id, timestamp, session_id

---

## Table: search_analytics

**Purpose:** Detailed search behavior tracking

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User ID (nullable) |
| sessionId | varchar(64) | Session identifier |
| queryText | varchar(500) | Search query |
| queryTokenCount | int | Query complexity metric |
| stateFilter | varchar(2) | State code filter |
| agencyId | int | Agency filter |
| resultsCount | int | Number of results |
| topResultProtocolId | int | Top result ID |
| topResultScore | float | Relevance score |
| selectedResultRank | int | Clicked result position |
| selectedProtocolId | int | Selected protocol ID |
| timeToFirstResult | int | Performance (ms) |
| totalSearchTime | int | Total time (ms) |
| searchMethod | varchar(20) | text, voice, example_click |
| isVoiceQuery | boolean | Voice search flag |
| voiceTranscriptionTime | int | Voice to text time (ms) |
| noResultsFound | boolean | Zero results flag |
| queryCategory | varchar(50) | Auto-classified category |
| timestamp | timestamp | Search timestamp |

**Indexes:** user+timestamp, no_results+timestamp, state, category

---

## Table: protocol_access_logs

**Purpose:** Protocol viewing and engagement tracking

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User ID (nullable) |
| sessionId | varchar(64) | Session identifier |
| protocolChunkId | int | Protocol chunk ID |
| protocolNumber | varchar(50) | Protocol number (e.g., R-001) |
| protocolTitle | varchar(255) | Protocol title |
| agencyId | int | Agency ID |
| stateCode | varchar(2) | State code |
| accessSource | varchar(50) | search, history, bookmark, deep_link |
| timeSpentSeconds | int | Time spent viewing |
| scrollDepth | float | Scroll depth (0-1) |
| copiedContent | boolean | Content copied flag |
| sharedProtocol | boolean | Protocol shared flag |
| fromSearchQuery | varchar(500) | Originating search |
| searchResultRank | int | Position in search results |
| timestamp | timestamp | Access timestamp |

**Indexes:** protocol_id, user+timestamp, state, source

---

## Table: session_analytics

**Purpose:** Session-level usage patterns

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User ID (nullable) |
| sessionId | varchar(64) | **Unique** session identifier |
| deviceType | varchar(20) | Device type |
| appVersion | varchar(20) | App version |
| platform | varchar(20) | ios, android, web |
| startTime | timestamp | Session start |
| endTime | timestamp | Session end |
| durationSeconds | int | Session duration |
| searchCount | int | Number of searches |
| protocolsViewed | int | Protocols viewed count |
| queriesSubmitted | int | AI queries submitted |
| screenTransitions | int | Screen changes |
| isNewUser | boolean | New user flag |
| userTier | varchar(20) | free, pro, enterprise |
| referralSource | varchar(100) | Referral source |
| entryScreen | varchar(100) | Entry point |
| exitScreen | varchar(100) | Exit point |
| userCertificationLevel | varchar(50) | EMT, AEMT, Paramedic |

**Indexes:** user_id, start_time
**Unique:** session_id

---

## Table: daily_metrics

**Purpose:** Pre-aggregated daily statistics

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| date | date | Metric date |
| metricType | varchar(50) | dau, searches, conversions, etc. |
| dimension | varchar(100) | State, tier, device, etc. |
| dimensionValue | varchar(100) | Dimension value |
| count | int | Count value |
| sumValue | decimal(15,2) | Sum value |
| avgValue | decimal(15,4) | Average value |
| p50Value | decimal(15,4) | Median value |
| p95Value | decimal(15,4) | 95th percentile |
| minValue | decimal(15,4) | Minimum value |
| maxValue | decimal(15,4) | Maximum value |

**Indexes:** date, metric_type
**Unique:** date + metric_type + dimension + dimension_value

---

## Table: retention_cohorts

**Purpose:** User retention cohort analysis

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| cohortDate | date | Signup week/month |
| cohortType | varchar(20) | weekly, monthly |
| cohortSize | int | Cohort size |
| d1Retained | int | Day 1 retained users |
| d7Retained | int | Day 7 retained users |
| d14Retained | int | Day 14 retained users |
| d30Retained | int | Day 30 retained users |
| d60Retained | int | Day 60 retained users |
| d90Retained | int | Day 90 retained users |
| segment | varchar(50) | free, pro, enterprise, all |
| acquisitionSource | varchar(100) | Acquisition channel |
| calculatedAt | timestamp | Calculation timestamp |

**Indexes:** cohort_date
**Unique:** cohort_date + cohort_type + segment

---

## Table: content_gaps

**Purpose:** Zero-result search tracking for content improvement

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| queryPattern | varchar(500) | Normalized query pattern |
| occurrences | int | Frequency count |
| lastOccurred | timestamp | Last occurrence |
| firstOccurred | timestamp | First occurrence |
| statesRequested | json | State filter list |
| suggestedCategory | varchar(50) | Suggested protocol category |
| priority | varchar(20) | high, medium, low |
| status | varchar(20) | open, in_progress, resolved, wont_fix |
| resolvedAt | timestamp | Resolution timestamp |
| notes | text | Admin notes |

**Indexes:** occurrences, priority, status

---

## Table: conversion_events

**Purpose:** Revenue funnel and conversion tracking

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| userId | int | User ID |
| sessionId | varchar(64) | Session identifier |
| eventType | varchar(50) | upgrade_prompt_shown, checkout_started, etc. |
| fromTier | varchar(20) | Original tier |
| toTier | varchar(20) | Target tier |
| plan | varchar(20) | monthly, annual |
| promptLocation | varchar(100) | Where prompt shown |
| triggerFeature | varchar(100) | Feature that triggered upgrade |
| amount | decimal(10,2) | Transaction amount |
| currency | varchar(3) | USD, EUR, etc. |
| stripeSessionId | varchar(255) | Stripe session ID |
| completed | boolean | Conversion completed flag |
| completedAt | timestamp | Completion timestamp |
| timestamp | timestamp | Event timestamp |

**Indexes:** user_id, event_type, timestamp

---

## Table: feature_usage_stats

**Purpose:** Daily feature adoption and usage metrics

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| date | date | Usage date |
| featureName | varchar(100) | Feature identifier |
| uniqueUsers | int | Unique user count |
| totalUsage | int | Total usage count |
| avgUsagePerUser | decimal(10,2) | Average per user |
| tierBreakdown | json | Usage by tier: {free: 100, pro: 50} |
| deviceBreakdown | json | Usage by device: {ios: 80, android: 40} |

**Indexes:** feature_name
**Unique:** date + feature_name

---

## Common Query Patterns

### Get user search history:
```typescript
db.select()
  .from(searchAnalytics)
  .where(eq(searchAnalytics.userId, userId))
  .orderBy(desc(searchAnalytics.timestamp))
  .limit(50);
```

### Find zero-result searches:
```typescript
db.select()
  .from(searchAnalytics)
  .where(eq(searchAnalytics.noResultsFound, true))
  .orderBy(desc(searchAnalytics.timestamp));
```

### Get daily active users:
```typescript
db.select()
  .from(dailyMetrics)
  .where(
    and(
      eq(dailyMetrics.metricType, 'dau'),
      gte(dailyMetrics.date, startDate)
    )
  );
```

### Track conversion funnel:
```typescript
db.select()
  .from(conversionEvents)
  .where(eq(conversionEvents.userId, userId))
  .orderBy(asc(conversionEvents.timestamp));
```

---

## Type Exports

```typescript
// Select types (from database)
type AnalyticsEvent
type SearchAnalytics
type ProtocolAccessLog
type SessionAnalytics
type DailyMetric
type RetentionCohort
type ContentGap
type ConversionEvent
type FeatureUsageStat

// Insert types (for database inserts)
type InsertAnalyticsEvent
type InsertSearchAnalytics
type InsertProtocolAccessLog
type InsertSessionAnalytics
type InsertDailyMetric
type InsertRetentionCohort
type InsertContentGap
type InsertConversionEvent
type InsertFeatureUsageStat
```

---

**Reference:** This document provides the complete schema structure for all analytics tables.

**Location:** `/Users/tanner-osterkamp/Protocol Guide Manus`
**Database:** MySQL (TiDB Cloud)
**Last Updated:** 2026-01-23
