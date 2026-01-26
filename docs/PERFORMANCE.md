# Performance Optimizations

This document tracks performance optimizations made to Protocol Guide.

## Bundle Optimization

### Code Splitting with React.lazy() (2025-01-14)

**Problem:** Initial web bundle was 3.37 MB, causing slow first load times.

**Solution:** Implemented React.lazy() for below-the-fold landing page sections.

**Files changed:**
- `app/index.tsx` - Added lazy imports with Suspense boundaries

**Components lazy-loaded:**
- SimulationSection
- TimeCalculatorSection  
- FeaturesSection
- EmailCaptureSection
- FooterSection

**Result:** HeroSection loads immediately; other sections load on-demand as user scrolls.

---

## React.memo() Optimizations (2025-01-14)

Added `React.memo()` to prevent unnecessary re-renders on heavy components:

| Component | File | Reason |
|-----------|------|--------|
| `ResponseCard` | `components/response-card.tsx` | Already had memo ✓ |
| `UserMessageCard` | `components/response-card.tsx` | Already had memo ✓ |
| `LoadingCard` | `components/response-card.tsx` | Already had memo ✓ |
| `MessageBubble` | `components/search/MessageBubble.tsx` | Rendered in FlatList |
| `SimulationSection` | `components/landing/simulation-section.tsx` | Heavy animations |
| `FeaturesSection` | `components/landing/features-section.tsx` | Multiple animated cards |
| `FeatureCard` | `components/landing/features-section.tsx` | Rendered 3x in list |

---

## Query Client Optimization (Already Implemented)

The query client (`lib/query-client.ts`) is already well-optimized:

### Stale Time Configuration
```typescript
staleTime: {
  protocols: 1000 * 60 * 60,  // 1 hour - protocols rarely change
  stats: 1000 * 60 * 30,      // 30 minutes
  coverage: 1000 * 60 * 60,   // 1 hour - static data
  user: 1000 * 60 * 5,        // 5 minutes
  default: 1000 * 60 * 5,     // 5 minutes
}
```

### GC Time Configuration
```typescript
gcTime: {
  protocols: 1000 * 60 * 60 * 24,  // 24 hours - keep for offline
  stats: 1000 * 60 * 60 * 2,       // 2 hours
  coverage: 1000 * 60 * 60 * 24,   // 24 hours
  user: 1000 * 60 * 30,            // 30 minutes
  default: 1000 * 60 * 30,         // 30 minutes
}
```

### Smart Retry Logic
- Exponential backoff with jitter
- Don't retry 4xx client errors
- Don't retry 401 auth errors
- Max 2 retries for network errors

---

## Server-Side Optimizations (Already Implemented)

### Search Router (`server/routers/search.ts`)

1. **Redis Caching**: Search results cached for 1 hour
2. **Query Normalization**: EMS abbreviations expanded, typos corrected
3. **Latency Monitoring**: Performance metrics tracked
4. **N+1 Prevention**: Agency mapping uses optimized single-query lookup
5. **Tier Validation**: Result limits enforced server-side

### Database Queries

- Connection pooling via Drizzle ORM
- Modular query files in `server/db/`
- Prepared statements for common queries

---

## Future Optimization Opportunities

1. **Image Optimization**: Consider using next/image or expo-image for lazy loading
2. **Font Subsetting**: Reduce MaterialIcons font size by subsetting
3. **Tree Shaking**: Audit @expo/vector-icons imports
4. **Bundle Analysis**: Run `pnpm analyze` periodically to track bundle growth
5. **Service Worker**: Enhanced caching for offline-first PWA experience

---

## Monitoring

- Server latency: Logged via `latencyMonitor.record()`
- Cache hit rate: Logged in search router
- Build size: Server bundle ~430KB (esbuild)
- Web bundle: Track via `pnpm analyze`
