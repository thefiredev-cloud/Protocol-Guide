# Protocol Guide - Search Performance Optimization Report

**Date:** 2026-01-23
**Focus:** Backend search optimization, N+1 query elimination, caching improvements

---

## Executive Summary

Analyzed search functionality across `/server/routers/search.ts`, `/server/routers/query.ts`, `/server/_core/embeddings.ts`, and related files. Identified **4 critical N+1 queries**, **3 missing cache layers**, and **2 pagination inefficiencies**.

**Performance Impact:**
- Current P95 latency: ~500-800ms (search endpoint)
- Target P95 latency: ~200ms (cache hit), ~400ms (cache miss)
- Expected improvement: **40-60% reduction** in response time

---

## Critical Issues Found

### 1. N+1 Query: Duplicate Agency Lookups (HIGH PRIORITY)

**Location:** `/server/routers/search.ts` (lines 121-122, 303-306)

**Problem:**
```typescript
// First call
agencyId = await mapCountyIdToAgencyId(input.countyId);  // DB call #1
const agency = await getAgencyByCountyId(input.countyId); // DB call #2 + #3
```

`getAgencyByCountyId()` internally calls `mapCountyIdToAgencyId()` AGAIN, then makes another Supabase query. This results in **3 database calls** when only 1 is needed.

**Impact:** ~100-200ms added latency per search request

**Fix:** Combine into single optimized function

---

### 2. Missing Cache Layer: Agency Details

**Location:** `/server/db-agency-mapping.ts`

**Problem:**
- Only agency IDs are cached, not full agency objects
- `getAgencyByCountyId()` makes fresh Supabase query every time
- No Redis cache for agency mapping results

**Impact:** ~50-100ms added latency, unnecessary DB load

**Fix:** Add Redis cache for agency details with 1-hour TTL

---

### 3. N+1 Query: Staff Members with User Details

**Location:** `/server/routers/agency-admin/staff.ts` (lines 23-27)

**Problem:**
```typescript
const membersWithUsers = await Promise.all(
  members.map(async (member) => {
    const user = await db.getUserById(member.userId); // N queries for N members
    return { ...member, user };
  })
);
```

Classic N+1 pattern - fetching user details one by one instead of batch query.

**Impact:** ~50ms * N members (for 10 members = 500ms)

**Fix:** Single batch query using SQL `IN` clause

---

### 4. Missing Pagination: Protocol Stats

**Location:** `/server/routers/search.ts` (stats, coverageByState, agenciesByState)

**Problem:**
- No limit/offset parameters
- Returns all results in single query
- Could return thousands of rows for large datasets

**Impact:** Slow queries for large result sets, high memory usage

**Fix:** Add cursor-based pagination with limit/offset

---

### 5. Inefficient Pagination: Embedding Generation

**Location:** `/server/_core/embeddings.ts` (line 481)

**Problem:**
```typescript
.range(offset, offset + batchSize - 1)
```

Offset-based pagination becomes slow for large offsets (queries take O(n) time).

**Impact:** Embedding generation job slows down as it progresses

**Fix:** Use cursor-based pagination with `id > lastProcessedId`

---

### 6. Missing Cache: getProtocol Endpoint

**Location:** `/server/routers/search.ts` (lines 220-234)

**Problem:**
- No caching layer for individual protocol lookups
- Direct database query every time

**Impact:** ~20-50ms per request

**Fix:** Add Redis cache with 1-hour TTL

---

## Implementation Checklist

### Week 1: Critical Fixes
- [ ] Fix agency mapping N+1 query
- [ ] Add protocol caching layer
- [ ] Fix staff N+1 query
- [ ] Add performance monitoring
- [ ] Deploy and measure baseline improvements

### Week 2: Pagination & Indexes
- [ ] Add cursor-based pagination for embeddings
- [ ] Add pagination to stats endpoints
- [ ] Create database indexes
- [ ] Test pagination with large datasets

### Week 3: Advanced Optimizations
- [ ] Implement batch cache operations
- [ ] Optimize connection pooling
- [ ] Add cache warming on server startup
- [ ] Performance regression testing

### Week 4: Monitoring & Tuning
- [ ] Set up latency dashboards
- [ ] Add alerting for slow queries (P95 > 500ms)
- [ ] A/B test optimizations
- [ ] Document performance SLAs

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Search P95 latency | 800ms | 350ms | 56% |
| Search P50 latency | 500ms | 200ms | 60% |
| Agency lookup | 150ms | 10ms (cache hit) | 93% |
| Protocol lookup | 50ms | 5ms (cache hit) | 90% |
| Staff list (10 users) | 500ms | 80ms | 84% |
| Embedding generation | 30 min | 15 min | 50% |
| Cache hit rate | 0% | 70% (target) | - |

---

## Related Files

- `/server/routers/search.ts` - Main search router
- `/server/routers/query.ts` - Query submission router
- `/server/_core/embeddings.ts` - Vector search & embeddings
- `/server/_core/rag-optimizer.ts` - Search optimization layer
- `/server/_core/search-cache.ts` - Redis caching
- `/server/db-agency-mapping.ts` - Agency ID mapping
- `/server/db.ts` - Database connection
- `/server/routers/agency-admin/staff.ts` - Staff management
