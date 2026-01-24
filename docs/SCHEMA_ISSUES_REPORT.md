# Database Schema Issues Report

**Generated:** 2026-01-23
**Database:** MySQL (Drizzle ORM)
**Project:** Protocol Guide

## Executive Summary

Critical foreign key constraints are missing throughout the database schema, risking data integrity. All tables have proper primary keys, but lack referential integrity enforcement.

## Primary Key Analysis

### Status: PASS
All tables have proper primary key definitions using auto-increment integers:
- ✅ All 27 tables have `id` as primary key
- ✅ All use `int AUTO_INCREMENT` consistently
- ✅ All have proper `PRIMARY KEY` constraints

### Considerations
- Current: Auto-increment integers (suitable for single-node MySQL)
- Alternative: UUIDs could be considered for distributed systems or merge scenarios
- Recommendation: **Keep current approach** - integers are more efficient for MySQL

## Critical Issues

### 1. Missing Foreign Key Constraints (CRITICAL)

**Impact:** HIGH - No referential integrity enforcement at database level

The schema has **zero foreign key constraints** despite having 40+ relationships. This means:
- Orphaned records can exist
- No CASCADE delete protection
- Application-level integrity only (unreliable)
- Data corruption risk during direct DB operations

#### Affected Relationships

**Users Table References (17 relationships):**
```sql
bookmarks.userId → users.id
feedback.userId → users.id
queries.userId → users.id
auditLogs.userId → users.id
userAuthProviders.userId → users.id
agencyMembers.userId → users.id
agencyMembers.invitedBy → users.id
protocolVersions.publishedBy → users.id
protocolUploads.uploadedBy → users.id
userCounties.userId → users.id
searchHistory.userId → users.id
stripeWebhookEvents (implicit via metadata)
analytics_events.userId → users.id
conversion_events.userId → users.id
protocol_access_logs.userId → users.id
search_analytics.userId → users.id
session_analytics.userId → users.id
```

**Counties Table References (4 relationships):**
```sql
protocolChunks.countyId → counties.id
queries.countyId → counties.id
feedback.countyId → counties.id
userCounties.countyId → counties.id
```

**Agencies Table References (5 relationships):**
```sql
bookmarks.agencyId → agencies.id
agencyMembers.agencyId → agencies.id
protocolVersions.agencyId → agencies.id
protocol_access_logs.agencyId → agencies.id (int)
search_analytics.agencyId → agencies.id
```

**Protocol References:**
```sql
protocolUploads.versionId → protocol_versions.id
protocol_access_logs.protocolChunkId → protocolChunks.id
```

### 2. Data Type Mismatch (CRITICAL)

**Issue:** `integrationLogs.agencyId` is `varchar(100)` but `agencies.id` is `int`

```sql
-- Current (INCORRECT)
integrationLogs.agencyId: varchar(100)
agencies.id: int

-- This prevents foreign key creation!
```

**Root Cause:** Integration logs accept external agency IDs from partner systems (ImageTrend, Zoll, etc.) which may not match internal agency IDs.

**Solutions:**
1. **Option A (Recommended):** Add `externalAgencyId` varchar column, change `agencyId` to int for FK
2. **Option B:** Keep as-is but add `internalAgencyId int` for FK relationship
3. **Option C:** Remove agency relationship from integration logs (analytics only)

### 3. Missing Unique Constraints (MEDIUM)

**userAuthProviders:**
```sql
-- Missing: UNIQUE(userId, provider)
-- Risk: User could have duplicate OAuth providers
```

**agencyMembers:**
```sql
-- Missing: UNIQUE(agencyId, userId)
-- Risk: User could be added to same agency multiple times
```

**stripeWebhookEvents:**
```sql
-- Has index but should be UNIQUE: eventId
-- Risk: Duplicate webhook processing
```

### 4. Composite Key Consideration (LOW)

**user_counties table:**
```sql
-- Current:
PRIMARY KEY (id)
UNIQUE KEY (userId, countyId)

-- Consider:
PRIMARY KEY (userId, countyId)
-- No separate id column needed
```

**Reasoning:** The relationship is inherently identified by the pair (userId, countyId). A surrogate `id` adds no value.

## Recommended Actions

### Priority 1: Add Foreign Key Constraints

Create migration to add ALL foreign key constraints with proper CASCADE rules.

**Delete Cascade Rules:**
- User deleted → CASCADE delete user's data (bookmarks, queries, history)
- County deleted → RESTRICT (don't allow if protocols exist)
- Agency deleted → CASCADE delete members, versions, uploads
- Protocol version deleted → CASCADE delete uploads

**Update Cascade Rules:**
- User updated → CASCADE update references
- County/Agency updated → CASCADE update references

### Priority 2: Fix Data Type Mismatches

Fix `integrationLogs.agencyId` before adding FK constraints.

### Priority 3: Add Missing Unique Constraints

Prevent duplicate entries at database level.

### Priority 4: Consider Composite Keys

Evaluate if surrogate keys are necessary for junction tables.

## Migration Strategy

1. **Backup database** (critical!)
2. **Clean orphaned data** (find and handle records with invalid FKs)
3. **Fix data type issues** (integrationLogs.agencyId)
4. **Add unique constraints** (prevent duplicates)
5. **Add foreign keys incrementally** (table by table, monitor for errors)
6. **Update schema.ts** (add `.references()` calls)
7. **Test thoroughly** (verify CASCADE behavior)

## Files Generated

1. `drizzle/migrations/0018_fix_data_type_mismatches.sql` - Fix type issues
2. `drizzle/migrations/0019_add_unique_constraints.sql` - Prevent duplicates
3. `drizzle/migrations/0020_add_foreign_keys_users.sql` - User relationships
4. `drizzle/migrations/0021_add_foreign_keys_complete.sql` - All other FKs
5. `drizzle/schema.ts` - Updated with references

## Risk Assessment

| Issue | Risk Level | Impact | Effort |
|-------|-----------|--------|--------|
| Missing FKs | HIGH | Data corruption possible | Medium |
| Type mismatch | HIGH | Blocks FK creation | Low |
| Missing unique | MEDIUM | Duplicate data possible | Low |
| Composite keys | LOW | Minor efficiency impact | Low |

## Testing Checklist

- [ ] Verify no orphaned records exist before adding FKs
- [ ] Test CASCADE DELETE behavior
- [ ] Test CASCADE UPDATE behavior
- [ ] Verify unique constraints work
- [ ] Check application still functions
- [ ] Verify analytics queries still work
- [ ] Test user deletion flow
- [ ] Test agency deletion flow
- [ ] Performance test after FKs added

## Notes

- Current schema works at application level but lacks DB-level integrity
- No immediate danger if application logic is perfect (it never is)
- Foreign keys will add small performance overhead but massive safety benefit
- Should be done before production launch or during low-traffic maintenance window
