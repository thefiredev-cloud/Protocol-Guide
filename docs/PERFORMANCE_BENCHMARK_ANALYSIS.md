# Protocol Guide Performance Benchmark Analysis

## Executive Summary

This document identifies critical performance paths in the Protocol Guide mobile EMS application, defines measurement points, and establishes baseline targets for each path. The analysis covers app startup, protocol search, voice input, and navigation transitions.

---

## 1. App Startup Performance

### Critical Path Components

```
App Launch
    |
    v
[_layout.tsx] Root Layout Mount
    |
    +-- ThemeProvider initialization
    +-- SafeAreaProvider initialization
    +-- QueryClient creation
    +-- tRPC client creation
    |
    v
[GestureHandlerRootView] Mount
    |
    v
[ErrorBoundary + trpc.Provider + QueryClientProvider]
    |
    v
[AppProvider] Mount
    |
    v
[useAuth] Hook Execution
    |
    +-- supabase.auth.getSession() <-- BLOCKING ASYNC CALL
    +-- onAuthStateChange listener setup
    +-- startSessionMonitor()
    |
    v
[Stack Navigator] Render
    |
    v
[index.tsx OR (tabs)/_layout.tsx] Route Resolution
    |
    +-- (if authenticated) --> (tabs) redirect
    +-- (if not authenticated) --> Landing page render
```

### Measurement Points

| Point ID | Description | Location | Current Baseline |
|----------|-------------|----------|------------------|
| `STARTUP_001` | Module imports (server/db, embeddings, routers) | `tests/performance/benchmark-startup.test.ts` | < 500ms each |
| `STARTUP_002` | Database connection (MySQL) | `server/db.ts:getDb()` | < 1000ms |
| `STARTUP_003` | tRPC client initialization | `lib/trpc.ts:createTRPCClient()` | < 200ms |
| `STARTUP_004` | Auth session fetch | `hooks/use-auth.ts:fetchUser()` | NOT MEASURED |
| `STARTUP_005` | Total cold start | Full initialization | < 2000ms |
| `STARTUP_006` | Total warm start (cached) | Re-import modules | < 500ms |

### Recommended Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Cold Start (web) | < 2.0s | > 3.0s | > 4.0s |
| Cold Start (iOS) | < 2.0s | > 3.0s | > 4.5s |
| Cold Start (Android mid-range) | < 2.5s | > 3.5s | > 5.0s |
| Warm Start | < 500ms | > 1.0s | > 1.5s |
| Time to Interactive (TTI) | < 2.5s | > 3.5s | > 5.0s |
| Auth Session Check | < 300ms | > 500ms | > 1000ms |

### Missing Measurement Points

1. **Auth session check latency** - Currently not instrumented in `use-auth.ts`
2. **Service worker registration time** (web) - `lib/register-sw.ts`
3. **Font loading time** - Expo font loading impact
4. **Navigation mount time** - Time for `(tabs)/_layout.tsx` to become interactive

---

## 2. Protocol Search Performance

### Critical Path Components

```
User Types Query
    |
    v
[search.tsx] handleSearch()
    |
    +-- Keyboard.dismiss()
    +-- setIsSearching(true)
    |
    v
[trpcUtils.search.semantic.fetch()]
    |
    v
=== tRPC HTTP Batch Request ===
    |
    v
[server/routers/search.ts] semantic procedure
    |
    +-- normalizeEmsQuery() <-- Query normalization
    +-- generateSearchCacheKey()
    +-- getCachedSearchResults() <-- Redis cache check
    |
    +-- (if cache miss)
    |       |
    |       v
    |   [embeddings.ts] generateEmbedding()
    |       |
    |       +-- embeddingCache.get() <-- LRU cache
    |       +-- (if miss) Voyage AI API call
    |       +-- embeddingCache.set()
    |       |
    |       v
    |   [Supabase] search_manus_protocols RPC
    |       |
    |       +-- pgvector similarity search
    |       +-- Filter by agency/state
    |       |
    |       v
    |   [rag-optimizer.ts] optimizedSearch()
    |       |
    |       +-- Multi-query fusion (medication queries)
    |       +-- Advanced re-ranking
    |       +-- Context boosting
    |       |
    |       v
    |   cacheSearchResults() <-- Store in Redis
    |
    v
Response returned to client
    |
    v
[search.tsx] setSearchResults() + FlatList render
```

### Measurement Points

| Point ID | Description | Location | Current Baseline |
|----------|-------------|----------|------------------|
| `SEARCH_001` | Embedding generation (cold) | `server/_core/embeddings.ts` | < 500ms |
| `SEARCH_002` | Embedding cache hit | LRU cache | < 5ms |
| `SEARCH_003` | pgvector search | Supabase RPC | < 200ms |
| `SEARCH_004` | Total search P95 | End-to-end | < 1000ms |
| `SEARCH_005` | Target retrieval time | Marketing claim | < 2300ms |
| `SEARCH_006` | Redis cache hit | `search-cache.ts` | NOT MEASURED |
| `SEARCH_007` | Query normalization | `ems-query-normalizer.ts` | NOT MEASURED |
| `SEARCH_008` | Re-ranking latency | `rag-optimizer.ts` | Logged but not tested |

### Recommended Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Embedding Generation (Voyage AI) | < 400ms | > 600ms | > 1000ms |
| Embedding Cache Hit | < 5ms | > 10ms | > 50ms |
| pgvector Search | < 150ms | > 250ms | > 400ms |
| Redis Cache Hit | < 20ms | > 50ms | > 100ms |
| Query Normalization | < 10ms | > 25ms | > 50ms |
| Re-ranking (Advanced) | < 100ms | > 200ms | > 400ms |
| **Total Search (P50)** | < 800ms | > 1200ms | > 2000ms |
| **Total Search (P95)** | < 1500ms | > 2300ms | > 3500ms |
| **Total Search (P99)** | < 2300ms | > 3000ms | > 4000ms |

### Existing Tests

Located in `/tests/performance/`:
- `benchmark-search.test.ts` - Comprehensive search latency tests
- `benchmark-search.bench.ts` - Vitest bench mode for CI/CD tracking

---

## 3. Voice Input Performance

### Critical Path Components

```
User Taps Microphone
    |
    v
[VoiceSearchModal] setShowVoiceModal(true)
    |
    v
[Modal Mount] Animation (SlideInDown)
    |
    v
handleMicPress() --> startRecording()
    |
    +-- Audio.requestPermissionsAsync() <-- Permission check
    +-- Audio.setAudioModeAsync()
    +-- Audio.Recording.createAsync()
    +-- Start pulse animation
    |
    v
=== RECORDING IN PROGRESS ===
    |
    +-- Duration tracking (1s intervals)
    +-- Silence detection (2.5s timeout)
    +-- Max duration (30s timeout)
    |
    v
User Taps to Stop OR Auto-stop
    |
    v
stopRecording()
    |
    +-- recording.stopAndUnloadAsync()
    +-- recording.getURI()
    |
    v
=== AUDIO PROCESSING ===
    |
    +-- fetch(uri) --> blob
    +-- FileReader.readAsDataURL() --> base64
    |
    v
[trpc.voice.uploadAudio.mutateAsync]
    |
    +-- Upload to storage
    +-- Return audio URL
    |
    v
[trpc.voice.transcribe.mutateAsync]
    |
    v
[server/voiceTranscription.ts] transcribeAudio()
    |
    +-- fetch(audioUrl) <-- Download audio
    +-- Size validation (< 16MB)
    +-- FormData creation
    |
    v
[Whisper API] POST /v1/audio/transcriptions
    |
    +-- Model: whisper-1
    +-- Response format: verbose_json
    |
    v
Response returned
    |
    v
[VoiceSearchModal] onTranscription(text)
    |
    v
[search.tsx] setQuery(text) + handleSearch()
```

### Measurement Points

| Point ID | Description | Location | Current Baseline |
|----------|-------------|----------|------------------|
| `VOICE_001` | Permission request | `Audio.requestPermissionsAsync()` | NOT MEASURED |
| `VOICE_002` | Recording start | `Audio.Recording.createAsync()` | NOT MEASURED |
| `VOICE_003` | Recording stop + URI | `stopAndUnloadAsync()` | NOT MEASURED |
| `VOICE_004` | Audio base64 encoding | `FileReader.readAsDataURL()` | NOT MEASURED |
| `VOICE_005` | Audio upload | `voice.uploadAudio` | NOT MEASURED |
| `VOICE_006` | Whisper transcription | `voice.transcribe` | NOT MEASURED |
| `VOICE_007` | Total voice-to-text | Full pipeline | NOT MEASURED |
| `VOICE_008` | Time to search results | Voice + Search | NOT MEASURED |

### Recommended Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Permission Request | < 100ms | > 300ms | > 500ms |
| Recording Start | < 200ms | > 400ms | > 800ms |
| Recording Stop + URI | < 100ms | > 200ms | > 500ms |
| Base64 Encoding | < 200ms | > 500ms | > 1000ms |
| Audio Upload | < 500ms | > 1000ms | > 2000ms |
| Whisper Transcription | < 2000ms | > 3000ms | > 5000ms |
| **Total Voice-to-Text** | < 3500ms | > 5000ms | > 7000ms |
| **Voice to Search Results** | < 5000ms | > 7000ms | > 10000ms |

### Missing Tests

No dedicated voice input performance tests exist. Recommended additions:
- `tests/performance/benchmark-voice.test.ts` - Voice pipeline benchmarks
- Mock audio files for consistent testing
- Whisper API latency tracking

---

## 4. Navigation Transitions

### Critical Path Components

```
=== TAB NAVIGATION ===

User Taps Tab
    |
    v
[HapticTab] onPress
    |
    +-- Haptics.impactAsync() (iOS/Android)
    |
    v
[Tabs] Screen transition
    |
    +-- Previous screen unmount
    +-- New screen mount
    +-- Re-render cycle
    |
    v
Screen Interactive

=== STACK NAVIGATION ===

User Triggers Navigation (e.g., protocol detail)
    |
    v
[router.push()] or [router.replace()]
    |
    v
[Stack] Animation (default: slide from right)
    |
    +-- Previous screen stays mounted
    +-- New screen mounts + animates
    |
    v
Screen Interactive

=== DEEP LINK / REDIRECT ===

[index.tsx] Landing Page
    |
    +-- useAuth() returns isAuthenticated
    |
    v
useEffect() --> router.replace("/(tabs)")
    |
    +-- Navigation state update
    +-- (tabs)/_layout.tsx mount
    +-- Tab screen mount
```

### Measurement Points

| Point ID | Description | Location | Current Baseline |
|----------|-------------|----------|------------------|
| `NAV_001` | Tab switch time | `(tabs)/_layout.tsx` | NOT MEASURED |
| `NAV_002` | Stack push animation | `_layout.tsx` | NOT MEASURED |
| `NAV_003` | Auth redirect time | `index.tsx` --> `(tabs)` | NOT MEASURED |
| `NAV_004` | Protocol detail load | Search --> Detail | NOT MEASURED |
| `NAV_005` | Back navigation | Stack pop | NOT MEASURED |
| `NAV_006` | Deep link resolution | External link --> Screen | NOT MEASURED |

### Recommended Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Tab Switch | < 100ms | > 200ms | > 400ms |
| Stack Push Animation | < 300ms | > 500ms | > 800ms |
| Auth Redirect | < 500ms | > 1000ms | > 1500ms |
| Protocol Detail Load | < 200ms | > 400ms | > 800ms |
| Back Navigation | < 150ms | > 300ms | > 500ms |
| Deep Link Resolution | < 1000ms | > 2000ms | > 3000ms |

### Missing Tests

No navigation performance tests exist. Recommended additions:
- `tests/performance/benchmark-navigation.test.ts`
- Measure frame rate during transitions
- Track JS thread blocking during navigation

---

## 5. Performance Budget Summary

### Client-Side Budgets

| Category | Budget | Notes |
|----------|--------|-------|
| JS Bundle Size | < 2MB | Split code for routes |
| Initial Load (3G) | < 5s | Use suspense + lazy loading |
| Time to Interactive | < 3s | Optimize hydration |
| Frame Rate | 60fps | Use native driver for animations |
| Memory (Idle) | < 150MB | Monitor with Flipper |
| Memory (Active) | < 300MB | GC pressure monitoring |

### Server-Side Budgets

| Category | Budget | Notes |
|----------|--------|-------|
| API Response (P50) | < 200ms | Cached responses |
| API Response (P95) | < 500ms | Cold cache |
| Search Response (P50) | < 800ms | With embedding |
| Search Response (P95) | < 2000ms | Complex queries |
| Database Query | < 100ms | Indexed queries |
| External API (Voyage) | < 500ms | Embedding generation |
| External API (Whisper) | < 3000ms | Transcription |

---

## 6. Instrumentation Recommendations

### Add Performance Markers

```typescript
// lib/performance.ts
export const perfMarkers = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        console.log(`[Perf] ${name}: ${measure.duration.toFixed(0)}ms`);
        return measure.duration;
      } catch {
        return null;
      }
    }
    return null;
  },
};
```

### Recommended Instrumentation Points

1. **use-auth.ts** - Wrap `getSession()` call
2. **VoiceSearchModal.tsx** - Mark recording start/stop/transcribe
3. **search.tsx** - Mark search initiation and result render
4. **(tabs)/_layout.tsx** - Mark tab mount times
5. **trpc.ts** - Add request timing middleware

### Server-Side Logging

The search router already logs latency metrics:
```typescript
console.log(`[Search] Completed in ${latencyMs}ms (cache: ${optimizedResult.metrics.cacheHit}, rerank: ${optimizedResult.metrics.rerankingMs}ms)`);
```

Extend to all critical paths with structured logging for aggregation.

---

## 7. Existing Test Coverage

### Current Performance Tests

| File | Coverage | Status |
|------|----------|--------|
| `benchmark-startup.test.ts` | Module imports, DB connection, cold/warm start | GOOD |
| `benchmark-search.test.ts` | Embedding, pgvector, E2E search | GOOD |
| `benchmark-search.bench.ts` | Vitest bench for CI/CD | GOOD |
| `benchmark-offline-cache.test.ts` | Offline cache performance | EXISTS |

### Missing Performance Tests

| Test | Priority | Description |
|------|----------|-------------|
| `benchmark-voice.test.ts` | HIGH | Voice input pipeline |
| `benchmark-navigation.test.ts` | MEDIUM | Screen transitions |
| `benchmark-auth.test.ts` | MEDIUM | Auth flow timing |
| `benchmark-render.test.ts` | LOW | Component render times |

---

## 8. CI/CD Integration

### Performance Gates

Add to GitHub Actions workflow:

```yaml
- name: Run Performance Benchmarks
  run: pnpm bench:perf

- name: Check Performance Budget
  run: |
    node scripts/check-perf-budget.js

- name: Upload Performance Report
  uses: actions/upload-artifact@v4
  with:
    name: performance-report
    path: ./benchmark-results.json
```

### Alerting Thresholds

| Severity | Condition | Action |
|----------|-----------|--------|
| Warning | > 10% regression from baseline | Notify in PR |
| Critical | > 25% regression from baseline | Block PR merge |
| Failure | Exceeds critical threshold | Block deployment |

---

## 9. Next Steps

### Immediate (Week 1)
1. Instrument auth session check in `use-auth.ts`
2. Add voice pipeline timing markers
3. Create `benchmark-voice.test.ts`

### Short-term (Week 2-3)
4. Add navigation performance tests
5. Implement client-side performance monitoring
6. Set up CI/CD performance gates

### Medium-term (Month 1)
7. Production performance monitoring (Sentry Performance)
8. Real-user monitoring (RUM) integration
9. Performance regression alerting

---

## Appendix: Key File Locations

| Category | Files |
|----------|-------|
| App Entry | `app/_layout.tsx`, `app/index.tsx` |
| Tab Navigation | `app/(tabs)/_layout.tsx` |
| Search | `app/(tabs)/search.tsx`, `server/routers/search.ts` |
| Voice | `components/VoiceSearchModal.tsx`, `server/_core/voiceTranscription.ts` |
| Auth | `hooks/use-auth.ts`, `lib/supabase.ts` |
| Embeddings | `server/_core/embeddings.ts` |
| Performance Tests | `tests/performance/` |
| Config | `vitest.config.ts`, `package.json` (scripts) |
