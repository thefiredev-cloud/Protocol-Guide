# Database Schema Relationships Diagram

**Protocol Guide - Entity Relationship Overview**

## Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS (Central Entity)                          │
│  ┌─────────┐                                                                │
│  │  users  │ id (PK)                                                        │
│  │         │ openId (UNIQUE)                                                │
│  │         │ supabaseId (UNIQUE)                                            │
│  │         │ selectedCountyId → counties.id                                 │
│  │         │ homeCountyId → counties.id                                     │
│  └────┬────┘                                                                │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
        ├─── CASCADE DELETE (Personal Data) ────────────────────────────┐
        │                                                                │
        ├──→ bookmarks              (userId)                            │
        ├──→ feedback               (userId)                            │
        ├──→ queries                (userId)                            │
        ├──→ userAuthProviders      (userId) UNIQUE(userId, provider)   │
        ├──→ agencyMembers          (userId) UNIQUE(agencyId, userId)   │
        ├──→ userCounties           (userId) UNIQUE(userId, countyId)   │
        ├──→ searchHistory          (userId)                            │
        │                                                                │
        ├─── SET NULL (Analytics/Audit Preserved) ─────────────────────┤
        │                                                                │
        ├──→ auditLogs              (userId)                            │
        ├──→ analyticsEvents        (userId)                            │
        ├──→ protocolAccessLogs     (userId)                            │
        ├──→ searchAnalytics        (userId)                            │
        ├──→ sessionAnalytics       (userId)                            │
        ├──→ protocolVersions       (publishedBy)                       │
        ├──→ agencyMembers          (invitedBy)                         │
        │                                                                │
        └─── RESTRICT (Critical Business Data) ────────────────────────┤
                                                                         │
            ├──→ conversionEvents      (userId)                         │
            └──→ protocolUploads       (uploadedBy)                     │


┌─────────────────────────────────────────────────────────────────────────────┐
│                                   COUNTIES                                   │
│  ┌──────────┐                                                               │
│  │ counties │ id (PK)                                                       │
│  │          │ name, state                                                   │
│  └────┬─────┘                                                               │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
        ├─── RESTRICT (Cannot delete with protocols) ──────────────────┐
        │                                                                │
        ├──→ protocolChunks         (countyId)                          │
        │                                                                │
        ├─── CASCADE DELETE ────────────────────────────────────────────┤
        │                                                                │
        ├──→ queries                (countyId)                          │
        ├──→ userCounties           (countyId)                          │
        │                                                                │
        └─── SET NULL ──────────────────────────────────────────────────┤
                                                                         │
            ├──→ feedback              (countyId)                       │
            ├──→ searchHistory         (countyId)                       │
            ├──→ users                 (selectedCountyId)               │
            └──→ users                 (homeCountyId)                   │


┌─────────────────────────────────────────────────────────────────────────────┐
│                                   AGENCIES                                   │
│  ┌──────────┐                                                               │
│  │ agencies │ id (PK)                                                       │
│  │          │ slug (UNIQUE)                                                 │
│  │          │ name, state                                                   │
│  └────┬─────┘                                                               │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
        ├─── CASCADE DELETE (Agency owned data) ───────────────────────┐
        │                                                                │
        ├──→ agencyMembers          (agencyId)                          │
        ├──→ protocolVersions       (agencyId)                          │
        │    └──→ protocolUploads   (versionId) [nested cascade]       │
        │                                                                │
        └─── SET NULL (Analytics) ─────────────────────────────────────┤
                                                                         │
            ├──→ bookmarks             (agencyId)                       │
            ├──→ integrationLogs       (internalAgencyId)               │
            ├──→ protocolAccessLogs    (agencyId)                       │
            └──→ searchAnalytics       (agencyId)                       │


┌─────────────────────────────────────────────────────────────────────────────┐
│                             PROTOCOL HIERARCHY                               │
│                                                                              │
│  protocolVersions (agency-specific versions)                                │
│       │                                                                      │
│       │ CASCADE DELETE                                                       │
│       └──→ protocolUploads (PDF files for version)                          │
│                                                                              │
│  protocolChunks (county-level searchable content)                           │
│       │                                                                      │
│       │ CASCADE DELETE                                                       │
│       └──→ protocolAccessLogs (analytics)                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Unique Constraints (Prevent Duplicates)

```
users
  └─ UNIQUE(openId)              ← Auth provider unique ID
  └─ UNIQUE(supabaseId)          ← Supabase auth unique ID

agencies
  └─ UNIQUE(slug)                ← URL-safe unique identifier

userAuthProviders
  └─ UNIQUE(userId, provider)    ← One OAuth per provider per user

agencyMembers
  └─ UNIQUE(agencyId, userId)    ← User can join agency only once

userCounties
  └─ UNIQUE(userId, countyId)    ← User can save county only once

stripeWebhookEvents
  └─ UNIQUE(eventId)             ← Prevent duplicate webhook processing

sessionAnalytics
  └─ UNIQUE(sessionId)           ← One session record per session

dailyMetrics
  └─ UNIQUE(date, metricType, dimension, dimensionValue)

featureUsageStats
  └─ UNIQUE(date, featureName)

retentionCohorts
  └─ UNIQUE(cohortDate, cohortType, segment)
```

## Cascade Delete Chains

### User Deletion Cascade

```
DELETE user
    ├─ CASCADE DELETE bookmarks
    ├─ CASCADE DELETE feedback
    ├─ CASCADE DELETE queries
    ├─ CASCADE DELETE userAuthProviders
    ├─ CASCADE DELETE searchHistory
    ├─ CASCADE DELETE userCounties
    ├─ CASCADE DELETE agencyMembers
    │
    ├─ SET NULL auditLogs.userId
    ├─ SET NULL analyticsEvents.userId
    ├─ SET NULL protocolAccessLogs.userId
    ├─ SET NULL searchAnalytics.userId
    ├─ SET NULL sessionAnalytics.userId
    ├─ SET NULL protocolVersions.publishedBy
    ├─ SET NULL agencyMembers.invitedBy
    │
    └─ RESTRICT if:
        ├─ conversionEvents exist (revenue data)
        └─ protocolUploads exist (accountability)
```

### Agency Deletion Cascade

```
DELETE agency
    ├─ CASCADE DELETE agencyMembers (all members removed)
    ├─ CASCADE DELETE protocolVersions
    │   └─ CASCADE DELETE protocolUploads (nested)
    │
    └─ SET NULL
        ├─ bookmarks.agencyId
        ├─ integrationLogs.internalAgencyId
        ├─ protocolAccessLogs.agencyId
        └─ searchAnalytics.agencyId
```

### County Deletion Behavior

```
DELETE county
    ├─ RESTRICT if protocolChunks exist
    │   └─ Must delete/migrate protocols first
    │
    ├─ CASCADE DELETE queries
    ├─ CASCADE DELETE userCounties
    │
    └─ SET NULL
        ├─ feedback.countyId
        ├─ searchHistory.countyId
        ├─ users.selectedCountyId
        └─ users.homeCountyId
```

## Table Dependency Levels

```
Level 0 (No dependencies - can be deleted freely):
├─ users (unless has conversions/uploads)
├─ counties (unless has protocols)
├─ agencies (unless...)
└─ contactSubmissions

Level 1 (Depends on Level 0):
├─ bookmarks → users, agencies
├─ feedback → users, counties
├─ queries → users, counties
├─ protocolChunks → counties
├─ userAuthProviders → users
├─ auditLogs → users
├─ agencyMembers → users, agencies
└─ protocolVersions → agencies, users

Level 2 (Depends on Level 1):
├─ protocolUploads → protocolVersions, users
├─ userCounties → users, counties
├─ searchHistory → users, counties
└─ protocolAccessLogs → users, protocolChunks, agencies

Level 3+ (Analytics - mostly SET NULL):
└─ All analytics_*, *_analytics, *_events tables
```

## Special Cases

### Integration Logs (External Agency IDs)

```
integrationLogs
    ├─ agencyId: varchar(100)        ← External partner ID (ImageTrend, Zoll, etc.)
    └─ internalAgencyId: int         ← FK to agencies.id (our internal ID)
                                       SET NULL on agency delete
```

**Why two columns?**
- Partners send their own agency IDs (not ours)
- May not match our internal agency records
- We attempt to map external → internal for analytics
- Preserves partner data even if we can't map it

### Stripe Webhook Events

```
stripeWebhookEvents
    └─ eventId: UNIQUE               ← Prevents duplicate processing
    └─ processed: indexed            ← Fast lookup for unprocessed events
```

**Why no FK to users?**
- Webhook payload contains customer ID, not user ID
- Mapping happens in application layer
- Events preserved for audit even if customer deleted

## Data Flow Examples

### New User Signup

```
1. INSERT INTO users (openId, email)
2. INSERT INTO userAuthProviders (userId, provider, providerUserId)
3. INSERT INTO auditLogs (userId, action='login')
4. INSERT INTO sessionAnalytics (userId, sessionId)
```

### User Selects County

```
1. INSERT INTO userCounties (userId, countyId, isPrimary=true)
2. UPDATE users SET selectedCountyId = ? WHERE id = ?
```

### User Makes Query

```
1. INSERT INTO queries (userId, countyId, queryText)
2. INSERT INTO searchHistory (userId, countyId, searchQuery)
3. INSERT INTO searchAnalytics (userId, queryText, resultsCount)
4. INSERT INTO protocolAccessLogs (userId, protocolChunkId)
```

### User Deletion Flow

```
1. Check RESTRICT constraints:
   ├─ SELECT COUNT(*) FROM conversionEvents WHERE userId = ?
   ├─ SELECT COUNT(*) FROM protocolUploads WHERE uploadedBy = ?
   └─ If any > 0: REJECT deletion

2. DELETE FROM users WHERE id = ?
   (Database automatically cascades)

3. Cascade deletes:
   ├─ DELETE FROM bookmarks WHERE userId = ?
   ├─ DELETE FROM queries WHERE userId = ?
   ├─ DELETE FROM searchHistory WHERE userId = ?
   └─ ... (all CASCADE DELETE relationships)

4. Anonymize analytics:
   ├─ UPDATE auditLogs SET userId = NULL WHERE userId = ?
   ├─ UPDATE analyticsEvents SET userId = NULL WHERE userId = ?
   └─ ... (all SET NULL relationships)
```

## Migration Order Importance

**Must run in this order:**

1. ✅ Fix data type mismatches (0019)
   - Blocks foreign key creation if types don't match

2. ✅ Add unique constraints (0020)
   - Prevents duplicate data before FKs enforce relationships

3. ✅ Add user foreign keys (0021)
   - Most critical relationships (17 FKs)

4. ✅ Add remaining foreign keys (0022)
   - Counties, agencies, protocols

**Do NOT:**
- Skip validation (0018) - may cause FK creation to fail
- Reorder migrations - dependencies matter
- Run Part 2 before Part 1 - users must be done first

## Performance Considerations

### Index Usage (Already Exists)

```
Foreign keys automatically use these existing indexes:
├─ idx_bookmarks_user              (for FK on userId)
├─ idx_queries_user_created        (for FK on userId)
├─ idx_protocols_county            (for FK on countyId)
├─ idx_agency_members_user         (for FK on userId)
└─ ... (30+ more)
```

### No Additional Indexes Needed

Foreign keys will use existing indexes. No performance degradation expected.

### Cascade Performance

- User deletion: ~10-50ms (depends on data volume)
- County deletion: Blocked if protocols exist (RESTRICT)
- Agency deletion: ~5-20ms (members + versions)

All within acceptable ranges for OLTP operations.
