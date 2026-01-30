# Performance Improvement Plan

> Created: 2026-01-29  
> Target: Lighthouse Performance 59 → 85+

## Current Analysis

### Lighthouse Results (Jan 29, 2026)
```
Performance:     59  🔴
Accessibility:   96  🟢
Best Practices: 100  🟢
SEO:            100  🟢
```

### Core Web Vitals
| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| FCP | 5.6s | 1.8s | -3.8s |
| LCP | 6.3s | 2.5s | -3.8s |
| TBT | 220ms | 200ms | -20ms |
| CLS | 0 | 0.1 | ✅ |
| Speed Index | 5.8s | 3.4s | -2.4s |

### Root Cause Analysis

**Primary Issue: Large JavaScript Bundle**
- Main bundle: **881KB** (transferred)
- Script evaluation: 1,840ms
- Unused JS savings potential: 2,250ms

**Main Thread Work**
| Task | Time |
|------|------|
| Script Evaluation | 1,840ms |
| Other | 802ms |
| Style & Layout | 277ms |
| Script Parsing | 183ms |

---

## Action Plan

### Phase 1: Quick Wins (1-2 days)

#### 1.1 Enable Compression
```javascript
// Check Railway/hosting compression settings
// Enable Brotli/gzip for JS/CSS
```

#### 1.2 Add Resource Hints
```html
<!-- In _document or head -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.protocol-guide.com">
<link rel="dns-prefetch" href="https://sentry.io">
```

#### 1.3 Defer Non-Critical Scripts
- Move analytics to `defer`
- Lazy load Sentry after interaction
- Defer non-essential third-party scripts

### Phase 2: Bundle Optimization (3-5 days)

#### 2.1 Analyze Bundle
```bash
# Add bundle analyzer
pnpm add -D @expo/webpack-config webpack-bundle-analyzer

# Create analysis script
npx expo export --platform web --dev
```

#### 2.2 Code Splitting Strategy
```typescript
// Lazy load routes
const AdminPanel = lazy(() => import('./admin/AdminPanel'));
const ProtocolComparison = lazy(() => import('./tools/compare'));
const QuickReference = lazy(() => import('./tools/quick-reference'));

// Suspense wrapper
<Suspense fallback={<LoadingSkeleton />}>
  <AdminPanel />
</Suspense>
```

#### 2.3 Tree Shaking
```typescript
// BAD - imports entire library
import { format } from 'date-fns';

// GOOD - imports only what's needed
import format from 'date-fns/format';
```

**Libraries to audit:**
- [ ] `@expo/vector-icons` - Only import used icons
- [ ] `lodash` - Use `lodash-es` or individual imports
- [ ] `react-native-reanimated` - Check if needed on web
- [ ] UI component libraries - Tree-shake unused components

### Phase 3: Critical Rendering Path (2-3 days)

#### 3.1 Inline Critical CSS
```javascript
// scripts/extract-critical-css.js
const critical = require('critical');

critical.generate({
  base: 'dist/',
  src: 'index.html',
  target: 'index.html',
  inline: true,
  dimensions: [
    { width: 375, height: 667 },  // Mobile
    { width: 1440, height: 900 }  // Desktop
  ]
});
```

#### 3.2 Optimize LCP Element
```typescript
// Identify LCP element (likely hero image or main heading)
// Add fetchpriority="high" to LCP image
<img 
  src="/hero.webp"
  fetchpriority="high"
  loading="eager"
  decoding="async"
/>
```

#### 3.3 Font Loading Strategy
```css
/* Use font-display: swap */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/Inter.woff2') format('woff2');
}
```

### Phase 4: Caching & Service Worker (2-3 days)

#### 4.1 Cache Headers
```
# Static assets (1 year)
Cache-Control: public, max-age=31536000, immutable

# HTML (revalidate)
Cache-Control: public, max-age=0, must-revalidate

# API responses (short cache + stale-while-revalidate)
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

#### 4.2 Service Worker Improvements
```typescript
// workbox-config.js
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
  swDest: 'dist/sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.protocol-guide\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    }
  ]
};
```

### Phase 5: Image Optimization (1-2 days)

#### 5.1 Convert to Modern Formats
```bash
# Convert PNG/JPG to WebP
npx sharp-cli --input "public/**/*.png" --output "public/" --format webp

# Generate responsive sizes
npx responsive-images-cli --input "public/hero.png" --sizes 320,640,960,1280
```

#### 5.2 Implement Picture Element
```html
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Protocol Guide" loading="lazy">
</picture>
```

---

## Implementation Timeline

| Week | Focus | Target Score |
|------|-------|--------------|
| 1 | Quick wins + Bundle analysis | 65 |
| 2 | Code splitting + Tree shaking | 75 |
| 3 | Critical CSS + LCP optimization | 80 |
| 4 | Caching + Images | 85+ |

---

## Monitoring

### Set Up Performance Budgets
```json
// budget.json
[
  {
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  }
]
```

### Add Web Vitals Tracking
```typescript
// lib/web-vitals.ts
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  analytics.track('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### CI Performance Check
```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://protocol-guide.com
      https://protocol-guide.com/search
    budgetPath: ./budget.json
    uploadArtifacts: true
```

---

## Success Criteria

- [ ] Lighthouse Performance ≥ 85
- [ ] LCP < 2.5s
- [ ] FCP < 1.8s
- [ ] Main bundle < 300KB
- [ ] No regressions in accessibility (maintain 96+)
