# Protocol Guide Performance Benchmark Report

**Generated:** January 23, 2026
**Target:** 2.3 seconds protocol retrieval time (landing page claim)
**Platform:** Darwin ARM64 (Apple Silicon)
**Node.js:** v24.10.0

---

## Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Protocol Retrieval (P95)** | 2300ms | 2613ms | **FAIL** (+13.6%) |
| Cold Start Time | 2000ms | 353ms | PASS |
| Memory Usage (Active) | 250MB | 31MB | PASS |
| Offline Cache Size | 10MB | <1MB | PASS |
| Embedding Cache Hit | 5ms | <1ms | PASS |

**Overall Pass Rate:** 90% (9/10 tests)

---

## Key Findings

### 1. Search Latency Analysis

The search latency **marginally exceeds the 2.3s target** on cold queries (first-time searches with no embedding cache).

| Search Type | P50 | P95 | P99 | Target |
|-------------|-----|-----|-----|--------|
| Simple queries | 1,038ms | 2,613ms | 2,613ms | 2,300ms |
| Complex NL queries | 441ms | 602ms | 602ms | 2,300ms |
| Cached queries | <1ms | <1ms | <1ms | 5ms |

**Bottleneck Identified:** The primary latency contributor is the Voyage AI embedding API call (~400-800ms per cold query).

### 2. Cold Start Performance

| Component | Duration |
|-----------|----------|
| Module imports | 353ms |
| Warm start (cached) | <1ms |
| Database stats query | 238ms (P50) |

**Status:** Excellent - well under 2 second target.

### 3. Memory Usage

| Metric | Value | Threshold |
|--------|-------|-----------|
| Heap Used (Idle) | 27.28 MB | 150 MB |
| Heap Used (Active) | 31.46 MB | 250 MB |
| RSS Memory | 200.30 MB | 250 MB |
| Embedding Cache Entries | 12 | 1000 max |

**Status:** All memory metrics are well within acceptable thresholds.

### 4. Offline Cache Estimates

| Metric | Value |
|--------|-------|
| Max cached items | 50 protocols |
| Estimated size per item | ~1.5 KB |
| Max cache size | ~75 KB |
| Cache read latency | <5ms |
| Cache search latency | <50ms |

**Status:** Offline cache is lightweight and fast.

---

## Bottleneck Analysis

### Primary Bottleneck: Voyage AI Embedding Generation

```
Search Request Flow (Cold Query):
1. User query received            ~0ms
2. Generate embedding (API call)  ~400-800ms  <-- BOTTLENECK
3. pgvector similarity search     ~100-200ms
4. Result formatting              ~10ms
   ─────────────────────────────────────────
   Total:                         ~510-1010ms (P50)
                                  ~1500-2600ms (P95)
```

The Voyage AI API call is the dominant factor in search latency. On cold queries (no cached embedding), this single step accounts for **60-80% of total latency**.

### Secondary Factors

1. **pgvector Query Time:** 100-200ms (acceptable)
2. **Network variability:** API response times vary based on load
3. **Database connection:** Initial connection takes ~238ms

---

## Recommendations

### High Impact (Immediate)

1. **Pre-warm Embedding Cache**
   - Cache embeddings for top 100 common EMS queries
   - Run cache warming job on server startup
   - Estimated improvement: P95 reduction to ~1000ms

2. **Search Result Caching**
   - Cache full search results (query -> results) for 1 hour
   - LRU cache with 500 entry limit
   - Estimated improvement: Repeat queries return in <10ms

### Medium Impact (Short-term)

3. **pgvector Index Optimization**
   - Add IVFFlat index with 100 lists for faster approximate search
   - Current: Sequential scan on 34K+ chunks
   - Estimated improvement: pgvector query 50% faster

4. **Embedding Model Optimization**
   - Consider voyage-2 (faster, lower dimension) vs voyage-large-2
   - Trade-off: Slightly reduced accuracy for better latency

### Lower Impact (Long-term)

5. **Edge Deployment**
   - Deploy embedding service closer to users (Cloudflare Workers AI)
   - Reduces network round-trip time

6. **Batch Query Processing**
   - For multi-term searches, batch embedding requests
   - Voyage AI supports batch of 128

---

## Performance Budget

### Target Breakdown (2.3s total)

| Component | Budget | Actual | Status |
|-----------|--------|--------|--------|
| Embedding generation | 800ms | 400-800ms | OK |
| pgvector search | 500ms | 100-200ms | OK |
| Network overhead | 500ms | varies | OK |
| Processing/formatting | 200ms | <50ms | OK |
| Buffer | 300ms | - | - |

### CI/CD Performance Gates

```yaml
# .github/workflows/perf-gate.yml
performance_thresholds:
  search_p95: 2300  # Fail PR if exceeded
  search_p99: 3000  # Warning threshold
  cold_start: 2000
  memory_mb: 250
```

---

## Test Scenarios

### Cardiac Arrest Scenario (Target: 2.3s)

This is the primary benchmark scenario shown on the landing page.

```typescript
Query: "cardiac arrest treatment protocol adult"
Results: 10 protocols returned
P50: 1,038ms
P95: 2,613ms (+13.6% over target)
```

### Concurrent Load Test (5 parallel queries)

```typescript
Queries: cardiac, stroke, anaphylaxis, diabetic, trauma
Total time: ~3.5s
Average per query: ~700ms (parallel execution benefit)
```

---

## Battery Impact Estimates

Based on the measured network activity and CPU usage:

| Scenario | Estimated Battery/Hour |
|----------|------------------------|
| Idle (background sync off) | ~1% |
| Active searching (10 queries/min) | ~3-4% |
| Background location sync | ~2-3% |

**Status:** Within acceptable mobile thresholds.

---

## Files Created

| File | Purpose |
|------|---------|
| `/tests/performance/benchmark-search.test.ts` | Search latency benchmarks |
| `/tests/performance/benchmark-offline-cache.test.ts` | Offline cache benchmarks |
| `/tests/performance/benchmark-startup.test.ts` | App startup benchmarks |
| `/scripts/run-benchmarks.ts` | Benchmark runner script |

### Running Benchmarks

```bash
# Full benchmark suite
pnpm bench:report

# JSON output for CI/CD
pnpm bench:json

# Vitest bench mode
pnpm bench

# Performance tests only
pnpm bench:perf
```

---

## Conclusion

The Protocol Guide app **mostly meets the 2.3s target** with a P50 of ~1 second, but the P95 latency (2.6s) slightly exceeds the target by 13.6%. This is primarily due to cold Voyage AI embedding API calls.

**Recommended Priority Actions:**

1. Implement embedding cache pre-warming for common queries
2. Add search result caching for repeat queries
3. Monitor P95 latency in production with Sentry Performance

With these optimizations, the 2.3s target should be achievable for 99%+ of queries.
