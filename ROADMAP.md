# Protocol Guide - Long-Horizon Roadmap

> Last updated: 2026-01-29  
> Owner: Tanner Osterkamp  
> Platform: Web PWA (protocol-guide.com)

---

## Current State (Jan 2026)

### Lighthouse Scores
| Metric | Score | Status |
|--------|-------|--------|
| Performance | 59 | 🔴 Needs Work |
| Accessibility | 96 | 🟢 Good |
| Best Practices | 100 | 🟢 Excellent |
| SEO | 100 | 🟢 Excellent |

### Core Web Vitals
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP | 5.6s | <1.8s | 🔴 Poor |
| LCP | 6.3s | <2.5s | 🔴 Poor |
| TBT | 220ms | <200ms | 🟡 Needs Improvement |
| CLS | 0 | <0.1 | 🟢 Good |

### Root Cause
- **881KB main JS bundle** - Too large for initial load
- Script evaluation: 1,840ms
- Unused JavaScript: ~2,250ms potential savings

---

## Q1 2026 - Performance & Foundation (Feb-Mar)

### 🔴 Priority 1: Bundle Optimization
**Goal:** Reduce initial bundle to <300KB, achieve Performance score >85

- [ ] **Code splitting by route** - Lazy load non-critical pages
  - Split admin panel (`/admin/*`) into separate chunk
  - Split tools (`/tools/*`) into separate chunk
  - Defer landing page animations/simulations
  
- [ ] **Tree shaking audit**
  - Analyze imports with `@next/bundle-analyzer` equivalent
  - Remove unused exports from component libraries
  - Replace heavy libraries with lighter alternatives
  
- [ ] **Image optimization**
  - Convert all images to WebP/AVIF
  - Implement responsive images with srcset
  - Add blur placeholder for LCP images
  
- [ ] **Critical CSS extraction**
  - Inline above-the-fold CSS
  - Defer non-critical stylesheets

### 🟡 Priority 2: Caching & Delivery
- [ ] **Service Worker enhancements**
  - Precache critical protocol data for offline
  - Implement stale-while-revalidate for API responses
  - Cache static assets aggressively (1 year)
  
- [ ] **CDN optimization**
  - Enable Brotli compression
  - Configure edge caching headers
  - Consider Railway edge deployment

### 🟢 Priority 3: Monitoring
- [ ] **Real User Monitoring (RUM)**
  - Add Web Vitals tracking to analytics
  - Set up performance budgets
  - Alert on Core Web Vitals regression

**Success Metrics:**
- LCP < 2.5s
- FCP < 1.8s  
- Performance score > 85
- Bundle size < 300KB

---

## Q2 2026 - User Experience & Engagement (Apr-Jun)

### Features
- [ ] **Offline Protocol Access (Pro Feature)**
  - Download county protocols for offline use
  - Background sync when connectivity restored
  - Storage management UI
  
- [ ] **Push Notifications**
  - Protocol update alerts
  - Shift reminder integrations
  - Critical safety bulletin pushes
  
- [ ] **Voice Search Enhancement**
  - Continuous listening mode for hands-free
  - Noise cancellation for field use
  - Voice command shortcuts ("show trauma protocol")

- [ ] **Quick Reference Cards**
  - Printable/shareable protocol summaries
  - Drug dose calculator integration
  - Pediatric weight-based dosing

### UX Improvements
- [ ] **Search Experience**
  - Instant search with debounce
  - Search suggestions/autocomplete
  - Recent searches persistence
  
- [ ] **Mobile Optimizations**
  - Gesture navigation
  - Bottom sheet for results
  - Haptic feedback on actions

**Success Metrics:**
- User retention > 40% (7-day)
- Avg session duration > 3 min
- Offline usage > 10% of sessions

---

## Q3 2026 - Platform & Integrations (Jul-Sep)

### Integrations
- [ ] **ImageTrend Integration (Enterprise)**
  - SSO authentication
  - Protocol push to ePCR
  - Usage analytics for agencies
  
- [ ] **CAD Integration**
  - Auto-protocol suggestions based on dispatch
  - Real-time protocol push to units
  
- [ ] **LMS Integration**
  - Protocol quiz generation
  - CE credit tracking
  - Training completion reports

### Platform
- [ ] **Agency Admin Dashboard v2**
  - Protocol version management
  - Staff permissions matrix
  - Usage analytics dashboard
  - Bulk user management
  
- [ ] **API for Partners**
  - RESTful protocol API
  - Webhook notifications
  - Rate limiting & API keys
  - Developer documentation

**Success Metrics:**
- 3+ enterprise integrations live
- API adoption by 5+ partners
- Agency admin NPS > 50

---

## Q4 2026 - Scale & AI (Oct-Dec)

### AI Enhancements
- [ ] **Clinical Decision Support**
  - Differential diagnosis suggestions
  - Contraindication warnings
  - Drug interaction alerts
  
- [ ] **Protocol Summarization**
  - AI-generated quick summaries
  - Key points extraction
  - Situation-specific guidance
  
- [ ] **Learning from Usage**
  - Popular query patterns
  - Gap analysis (missing protocols)
  - Automatic synonym detection

### Scale
- [ ] **Multi-tenant Architecture**
  - State/regional deployments
  - Custom branding per agency
  - Data isolation
  
- [ ] **Performance at Scale**
  - Read replicas for search
  - Redis cluster for caching
  - Auto-scaling infrastructure

**Success Metrics:**
- Support 100+ agencies
- <100ms search response (p95)
- 99.9% uptime

---

## 2027 Horizon - Vision

### Market Expansion
- National protocol database coverage
- International markets (UK, Canada, Australia)
- Fire/Rescue protocols expansion

### Advanced Features
- AR protocol overlay (via phone camera)
- Wearable integration (Apple Watch)
- Real-time protocol collaboration
- Video protocol demonstrations

### Business
- Enterprise tier with SLA
- White-label licensing
- Medical director subscription

---

## Technical Debt Backlog

### High Priority
- [ ] Add `disclaimer_acknowledged_at` column to users table
- [ ] Implement agency invitations table
- [ ] Calculate actual query count in drip emails
- [ ] Fix Railway CLI authentication for log monitoring

### Medium Priority
- [ ] Increase test coverage on referral system (currently 9%)
- [ ] Increase test coverage on agency-admin (currently 12-35%)
- [ ] Add E2E tests for critical user flows
- [ ] Update deprecated subdependencies (glob, rimraf, etc.)

### Low Priority
- [ ] Fix `tar` vulnerability (awaiting Expo update)
- [ ] Migrate to Vite ESM build
- [ ] Remove coverage folder from any remaining references

---

## KPIs & Tracking

### Weekly Metrics
- Active users (DAU/WAU/MAU)
- Search queries volume
- Error rate (Sentry)
- Performance (Web Vitals)

### Monthly Metrics  
- New user signups
- Conversion rate (free → pro)
- Churn rate
- NPS score

### Quarterly Metrics
- Revenue (MRR/ARR)
- Agency accounts
- Protocol coverage
- Feature adoption

---

## Review Schedule

- **Weekly**: Performance monitoring, error triage
- **Bi-weekly**: Sprint planning, feature prioritization  
- **Monthly**: Roadmap review, KPI analysis
- **Quarterly**: Strategy review, major milestone planning

---

*This roadmap is a living document. Update as priorities shift.*
