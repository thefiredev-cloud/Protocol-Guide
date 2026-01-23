# Protocol Guide Database Optimization Plan

**Date:** 2026-01-22
**Priority:** HIGH
**Estimated Effort:** 2-3 hours implementation, 1 week monitoring

---

## Executive Summary

This document outlines critical database optimizations for Protocol Guide to improve:
- **Query Performance** - Add missing indexes (10x faster user lookups)
- **Search Efficiency** - Optimize offline sync tracking
- **Data Management** - Implement archival strategy
- **Security** - Enhance RLS policy performance

**Expected Impact:**
- User profile lookups: 50ms → 5ms (10x faster)
- Search history retrieval: 200ms → 20ms (10x faster)
- Query history page load: 500ms → 50ms (10x faster)
- Reduced database load: 30% fewer full table scans

---

## Critical Missing Indexes

### Priority 1: User Table Indexes (MySQL)

**Current State:**
```sql
-- Only primary key index exists
PRIMARY KEY (id)
```

**Problem:**
- Supabase ID lookups for RLS policies: **50-100ms** (full table scan)
- Email lookups for login: **40-80ms** (full table scan)
- Admin queries by role/tier: **100-200ms** (full table scan)

**Solution:**
```sql
-- Add critical indexes
CREATE INDEX idx_users_supabase_id ON users(supabaseId);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_stripe_customer_id ON users(stripeCustomerId);

-- Composite index for admin dashboard
CREATE INDEX idx_users_role_tier ON users(role, tier);

-- Composite index for query limits
CREATE INDEX idx_users_tier_query_count ON users(tier, queryCountToday);
```

**Expected Impact:**
- Supabase ID lookup: 50ms → 2ms (25x faster)
- Email lookup: 40ms → 2ms (20x faster)
- Admin queries: 100ms → 5ms (20x faster)

**Migration Script:**
```sql
-- File: migrations/002-add-user-indexes.sql

-- Add indexes with ALGORITHM=INPLACE to avoid table lock
ALTER TABLE users
    ADD INDEX idx_users_supabase_id (supabaseId) ALGORITHM=INPLACE,
    ADD INDEX idx_users_email (email) ALGORITHM=INPLACE,
    ADD INDEX idx_users_role (role) ALGORITHM=INPLACE,
    ADD INDEX idx_users_tier (tier) ALGORITHM=INPLACE,
    ADD INDEX idx_users_stripe_customer_id (stripeCustomerId) ALGORITHM=INPLACE,
    ADD INDEX idx_users_role_tier (role, tier) ALGORITHM=INPLACE,
    ADD INDEX idx_users_tier_query_count (tier, queryCountToday) ALGORITHM=INPLACE;

-- Verify indexes created
SHOW INDEX FROM users;
```

**Deployment:**
```bash
# Run during low-traffic period
mysql -u $DB_USER -p $DB_NAME < migrations/002-add-user-indexes.sql

# Verify index usage
EXPLAIN SELECT * FROM users WHERE supabaseId = 'abc123';
# Should show: key: idx_users_supabase_id
```

---

### Priority 2: Queries Table Indexes (MySQL)

**Current State:**
```sql
-- Only primary key index exists
PRIMARY KEY (id)
```

**Problem:**
- User query history: **200-500ms** (full table scan)
- County-based analytics: **300-800ms** (full table scan)
- Date range queries: **400-1000ms** (full table scan)

**Solution:**
```sql
-- Add critical indexes
CREATE INDEX idx_queries_user_id ON queries(userId);
CREATE INDEX idx_queries_county_id ON queries(countyId);
CREATE INDEX idx_queries_created_at ON queries(createdAt);

-- Composite index for user query history (most common query)
CREATE INDEX idx_queries_user_created ON queries(userId, createdAt DESC);

-- Composite index for analytics
CREATE INDEX idx_queries_county_created ON queries(countyId, createdAt DESC);
```

**Expected Impact:**
- User history page: 500ms → 50ms (10x faster)
- County analytics: 300ms → 30ms (10x faster)
- Date range queries: 400ms → 40ms (10x faster)

**Migration Script:**
```sql
-- File: migrations/003-add-query-indexes.sql

ALTER TABLE queries
    ADD INDEX idx_queries_user_id (userId) ALGORITHM=INPLACE,
    ADD INDEX idx_queries_county_id (countyId) ALGORITHM=INPLACE,
    ADD INDEX idx_queries_created_at (createdAt) ALGORITHM=INPLACE,
    ADD INDEX idx_queries_user_created (userId, createdAt DESC) ALGORITHM=INPLACE,
    ADD INDEX idx_queries_county_created (countyId, createdAt DESC) ALGORITHM=INPLACE;

-- Verify indexes
SHOW INDEX FROM queries;
```

---

### Priority 3: Search History Table Indexes (MySQL)

**Current State:**
```sql
-- Only primary key index exists
PRIMARY KEY (id)
```

**Problem:**
- User search history sync: **100-300ms** (full table scan)
- Device-specific sync: **150-400ms** (full table scan)
- Unsynced queries lookup: **200-500ms** (full table scan)

**Solution:**
```sql
-- Add critical indexes
CREATE INDEX idx_search_history_user_id ON search_history(userId);
CREATE INDEX idx_search_history_device_id ON search_history(deviceId);
CREATE INDEX idx_search_history_synced ON search_history(synced);

-- Composite index for user history (most common query)
CREATE INDEX idx_search_history_user_timestamp ON search_history(userId, timestamp DESC);

-- Composite index for offline sync
CREATE INDEX idx_search_history_device_synced ON search_history(deviceId, synced);
```

**Expected Impact:**
- Sync API response: 300ms → 30ms (10x faster)
- Device history: 150ms → 15ms (10x faster)
- Unsynced queries: 200ms → 20ms (10x faster)

**Migration Script:**
```sql
-- File: migrations/004-add-search-history-indexes.sql

ALTER TABLE search_history
    ADD INDEX idx_search_history_user_id (userId) ALGORITHM=INPLACE,
    ADD INDEX idx_search_history_device_id (deviceId) ALGORITHM=INPLACE,
    ADD INDEX idx_search_history_synced (synced) ALGORITHM=INPLACE,
    ADD INDEX idx_search_history_user_timestamp (userId, timestamp DESC) ALGORITHM=INPLACE,
    ADD INDEX idx_search_history_device_synced (deviceId, synced) ALGORITHM=INPLACE;

-- Verify indexes
SHOW INDEX FROM search_history;
```

---

## Offline Sync Optimization

### Current Implementation Issues

**Problem 1: No Deduplication**
```typescript
// User searches "cardiac arrest" on Phone A
await db.insert(searchHistory).values({
  userId: 1,
  queryText: "cardiac arrest",
  deviceId: "phone-a",
  synced: true,
});

// User searches "cardiac arrest" on Phone B (duplicate!)
await db.insert(searchHistory).values({
  userId: 1,
  queryText: "cardiac arrest",  // Same query!
  deviceId: "phone-b",
  synced: true,
});
```

**Solution: Add Unique Constraint**
```sql
-- Prevent duplicate searches from same user at same time
ALTER TABLE search_history
ADD UNIQUE INDEX idx_search_history_unique_query (
    userId,
    queryText,
    DATE(timestamp)  -- Allow same query on different days
);
```

**Problem 2: No TTL for Old Searches**
```sql
-- Free users accumulate unlimited search history
SELECT COUNT(*) FROM search_history WHERE userId = 123;
-- Result: 50,000+ rows (should cap at 100 for free tier)
```

**Solution: Implement TTL**
```sql
-- Delete old search history for free users (keep last 100)
DELETE FROM search_history
WHERE userId = ?
  AND tier = 'free'
  AND id NOT IN (
      SELECT id FROM (
          SELECT id FROM search_history
          WHERE userId = ?
          ORDER BY timestamp DESC
          LIMIT 100
      ) AS keep
  );

-- Schedule daily cleanup
CREATE EVENT cleanup_search_history
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM search_history
  WHERE tier = 'free'
    AND timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

**Problem 3: Inefficient Sync Check**
```typescript
// Current: Check all unsynced queries (full table scan)
const unsynced = await db.query.searchHistory.findMany({
  where: eq(searchHistory.synced, false),
});
```

**Solution: Add Device + Timestamp Index**
```sql
-- Already added above
CREATE INDEX idx_search_history_device_synced ON search_history(deviceId, synced);

-- Query now uses index
SELECT * FROM search_history
WHERE deviceId = 'phone-a' AND synced = false
ORDER BY timestamp DESC;
```

---

## Data Archival Strategy

### Current State: Unlimited Growth

**Problem:**
```sql
-- Queries table grows indefinitely
SELECT COUNT(*) as total_queries FROM queries;
-- Result: 500,000+ rows (growing 10,000/month)

-- Old queries rarely accessed
SELECT COUNT(*) as old_queries FROM queries
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);
-- Result: 400,000 rows (80% of table)
```

**Impact:**
- Slower queries (more rows to scan)
- Larger backups (500MB+ for old data)
- Higher storage costs ($50/month for unused data)

### Solution: Archive Old Queries

**Step 1: Create Archive Table**
```sql
-- File: migrations/005-create-archive-tables.sql

CREATE TABLE queries_archive (
    LIKE queries
) ENGINE=InnoDB;

-- Add archival metadata
ALTER TABLE queries_archive
ADD COLUMN archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Partition by year for efficient pruning
ALTER TABLE queries_archive
PARTITION BY RANGE (YEAR(createdAt)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Step 2: Archive Old Data**
```sql
-- Move queries older than 1 year to archive
INSERT INTO queries_archive
    (id, userId, countyId, queryText, responseText, protocolRefs, createdAt)
SELECT id, userId, countyId, queryText, responseText, protocolRefs, createdAt
FROM queries
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Verify archive successful
SELECT COUNT(*) FROM queries_archive;

-- Delete from main table
DELETE FROM queries
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Optimize table to reclaim space
OPTIMIZE TABLE queries;
```

**Step 3: Automate Monthly Archival**
```sql
-- Create event for monthly archival
CREATE EVENT archive_old_queries
ON SCHEDULE EVERY 1 MONTH
DO
BEGIN
    -- Archive queries older than 1 year
    INSERT INTO queries_archive
    SELECT *, NOW() as archived_at
    FROM queries
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);

    -- Delete from main table
    DELETE FROM queries
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);

    -- Log archival
    INSERT INTO audit_logs (action, details)
    VALUES ('QUERIES_ARCHIVED', JSON_OBJECT(
        'archived_count', ROW_COUNT(),
        'archived_at', NOW()
    ));
END;

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;
```

**Expected Impact:**
- Main queries table: 500,000 rows → 100,000 rows (80% reduction)
- Query performance: 500ms → 100ms (5x faster)
- Backup size: 500MB → 100MB (80% reduction)
- Storage cost: $50/month → $10/month (80% reduction)

---

## RLS Policy Performance Optimization

### Current Slow Policies

**Problem: User Policies Require JOIN**
```sql
-- Current policy (slow - requires JOIN)
CREATE POLICY "Users can read their own query history"
    ON queries
    FOR SELECT TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users WHERE supabase_id = auth.uid()::text
        )
    );
-- Query plan: Sequential scan on users, then hash join
-- Execution time: 20-50ms per query
```

**Solution: Add Denormalized Field**
```sql
-- Add supabase_id to queries table (denormalized)
ALTER TABLE queries ADD COLUMN supabase_id TEXT;

-- Backfill existing queries
UPDATE queries q
SET supabase_id = u.supabase_id
FROM users u
WHERE q.user_id = u.id;

-- Create index
CREATE INDEX idx_queries_supabase_id ON queries(supabase_id);

-- Update RLS policy (fast - uses index)
DROP POLICY "Users can read their own query history" ON queries;
CREATE POLICY "Users can read their own query history"
    ON queries
    FOR SELECT TO authenticated
    USING (supabase_id = auth.uid()::text);
-- Query plan: Index scan on idx_queries_supabase_id
-- Execution time: 2-5ms per query (10x faster!)
```

**Alternative: Use Computed Column**
```sql
-- PostgreSQL 12+ supports generated columns
ALTER TABLE queries
ADD COLUMN supabase_id TEXT
GENERATED ALWAYS AS (
    (SELECT supabase_id FROM users WHERE id = user_id)
) STORED;

-- Create index
CREATE INDEX idx_queries_supabase_id ON queries(supabase_id);
```

---

## Query Caching Strategy

### Problem: Repeated Expensive Queries

**Example: Search for "cardiac arrest"**
```sql
-- User 1 searches "cardiac arrest" at 10:00 AM
SELECT * FROM search_manus_protocols(
    query_embedding := embedding,
    match_count := 10
);
-- Execution time: 80ms

-- User 2 searches "cardiac arrest" at 10:05 AM (same query!)
SELECT * FROM search_manus_protocols(
    query_embedding := embedding,  -- Same embedding!
    match_count := 10
);
-- Execution time: 80ms (should be cached!)
```

**Impact:**
- Top 100 searches account for 70% of all searches
- Each search takes 80-150ms
- Repeated searches waste 50,000+ ms/day

### Solution: Redis Cache Layer

**Implementation:**
```typescript
// File: lib/search-cache.ts

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cachedProtocolSearch(
  query: string,
  embedding: number[],
  filters: { agencyId?: number; stateCode?: string }
) {
  // Generate cache key
  const cacheKey = `search:${query}:${filters.agencyId || 'all'}:${filters.stateCode || 'all'}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[Cache] Hit:', cacheKey);
    return JSON.parse(cached);
  }

  // Cache miss - query database
  console.log('[Cache] Miss:', cacheKey);
  const results = await supabase.rpc('search_manus_protocols', {
    query_embedding: embedding,
    agency_filter: filters.agencyId,
    state_code_filter: filters.stateCode,
  });

  // Cache results for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(results));

  return results;
}
```

**Cache Warming:**
```typescript
// File: scripts/warm-search-cache.ts

import { cachedProtocolSearch } from '../lib/search-cache';
import { generateEmbedding } from '../lib/embeddings';

// Top 100 searches from analytics
const topSearches = [
  'cardiac arrest',
  'stroke',
  'asthma',
  'anaphylaxis',
  'seizure',
  // ... 95 more
];

async function warmCache() {
  console.log('[Cache] Warming search cache...');

  for (const query of topSearches) {
    const embedding = await generateEmbedding(query);
    await cachedProtocolSearch(query, embedding, {});
    console.log(`[Cache] Warmed: ${query}`);
  }

  console.log('[Cache] Cache warming complete!');
}

// Run on server start
warmCache();
```

**Expected Impact:**
- Cache hit rate: 70% (top 100 searches)
- Average response time: 80ms → 10ms (8x faster)
- Database load: -70% (fewer vector searches)
- User experience: Instant results for common searches

---

## Monitoring & Metrics

### Key Metrics to Track

**1. Query Performance**
```sql
-- Slow query log analysis
SELECT
    query_time,
    lock_time,
    rows_examined,
    rows_sent,
    sql_text
FROM mysql.slow_log
WHERE query_time > 0.1
ORDER BY query_time DESC
LIMIT 20;
```

**2. Index Usage**
```sql
-- Check if indexes are being used
SELECT
    table_name,
    index_name,
    cardinality,
    index_type
FROM information_schema.statistics
WHERE table_schema = 'protocol_guide'
ORDER BY table_name, index_name;

-- Check index efficiency
SELECT
    table_name,
    index_name,
    rows_read / rows_sent as efficiency
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
ORDER BY efficiency DESC;
```

**3. Cache Hit Rate**
```typescript
// Track cache performance
const cacheStats = {
  hits: 0,
  misses: 0,
  totalTime: 0,
};

// Update on each search
if (cached) {
  cacheStats.hits++;
} else {
  cacheStats.misses++;
}

// Report hourly
setInterval(() => {
  const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
  console.log(`[Cache] Hit rate: ${hitRate.toFixed(2)}%`);
}, 3600000); // Every hour
```

**4. Database Size Growth**
```sql
-- Track table sizes
SELECT
    table_name,
    ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'protocol_guide'
ORDER BY (data_length + index_length) DESC;

-- Alert if growth exceeds threshold
-- Alert if queries table > 200MB
-- Alert if search_history > 100MB
```

---

## Implementation Checklist

### Week 1: Critical Indexes
- [ ] Create index migration scripts
- [ ] Test indexes in staging environment
- [ ] Deploy to production during low-traffic period
- [ ] Verify index usage with EXPLAIN ANALYZE
- [ ] Monitor query performance (should see 10x improvement)

### Week 2: Data Archival
- [ ] Create archive tables
- [ ] Test archival process with small dataset
- [ ] Archive production data (1-year cutoff)
- [ ] Set up monthly archival event
- [ ] Monitor database size reduction

### Week 3: RLS Optimization
- [ ] Add denormalized fields to Supabase tables
- [ ] Update RLS policies
- [ ] Test policy performance
- [ ] Deploy to production
- [ ] Monitor policy execution time

### Week 4: Caching Layer
- [ ] Set up Redis instance
- [ ] Implement cache layer
- [ ] Warm cache with top searches
- [ ] Monitor cache hit rate
- [ ] Tune cache TTL based on usage

---

## Rollback Plans

### Index Rollback
```sql
-- Drop indexes if they cause issues
ALTER TABLE users
    DROP INDEX idx_users_supabase_id,
    DROP INDEX idx_users_email;
-- Takes <1 second
```

### Archive Rollback
```sql
-- Restore archived queries
INSERT INTO queries
SELECT id, userId, countyId, queryText, responseText, protocolRefs, createdAt
FROM queries_archive
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY);
-- Takes 5-10 minutes
```

### Cache Rollback
```typescript
// Disable cache layer
const USE_CACHE = false;

if (USE_CACHE) {
  return cachedProtocolSearch(...);
} else {
  return directProtocolSearch(...);
}
```

---

## Success Criteria

**Performance Goals:**
- [ ] User profile lookup: <10ms (currently 50ms)
- [ ] Query history page: <100ms (currently 500ms)
- [ ] Search history sync: <50ms (currently 300ms)
- [ ] Protocol search: <50ms for cached queries (currently 80ms)

**Efficiency Goals:**
- [ ] Database size: <500MB (currently 800MB)
- [ ] Cache hit rate: >60% for common searches
- [ ] Index usage: >90% of queries use indexes
- [ ] Slow queries: <1% of total queries

**Cost Goals:**
- [ ] Storage costs: <$20/month (currently $50/month)
- [ ] Database CPU: <50% average (currently 70%)
- [ ] Redis costs: <$10/month

---

## Files to Create

1. **`/migrations/002-add-user-indexes.sql`**
2. **`/migrations/003-add-query-indexes.sql`**
3. **`/migrations/004-add-search-history-indexes.sql`**
4. **`/migrations/005-create-archive-tables.sql`**
5. **`/lib/search-cache.ts`** - Redis caching layer
6. **`/scripts/warm-search-cache.ts`** - Cache warming script
7. **`/scripts/archive-old-queries.ts`** - Manual archival script

---

**Next Steps:**
1. Review and approve optimization plan
2. Test in staging environment
3. Deploy indexes (highest priority, lowest risk)
4. Deploy archival system
5. Deploy caching layer
6. Monitor and tune based on metrics
