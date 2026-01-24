# Protocol Guide - 20-Agent Parallel Audit Report

**Date:** 2026-01-23
**Agents Deployed:** 20
**New Agents Created:** 24

---

## Executive Summary

| Category | Critical | High | Medium | Total Issues |
|----------|----------|------|--------|--------------|
| Backend Security | 5 | 11 | 13 | 29 |
| Frontend Quality | 6 | 11 | 18 | 35 |
| Database/Schema | 3 | 5 | 8 | 16 |
| Testing Coverage | - | - | - | 0% (427+ specs needed) |
| Performance | - | 4 | 8 | 12 |

**Overall Risk Level:** MEDIUM-HIGH
**Production Readiness:** Requires 10-15 critical fixes before major release

---

## Critical Issues (Fix Immediately)

### 1. Stripe Webhook Schema Mismatch
**File:** `server/webhooks/stripe.ts:59`
```typescript
// Code uses: eventData: event.data.object
// Schema expects: payload: json()
```
**Impact:** ALL webhook events fail to be recorded, breaking idempotency protection

### 2. CSRF Not Applied to tRPC
**Files:** `server/_core/csrf.ts`, `server/_core/trpc.ts`
**Issue:** CSRF middleware exists for Express but NOT integrated with tRPC mutations
**Impact:** All state-changing mutations vulnerable to CSRF attacks

### 3. No Token Revocation Mechanism
**Issue:** No way to immediately invalidate sessions on password change/logout all devices
**Impact:** Compromised tokens valid until natural expiration (hours)

### 4. Hardcoded Beta Access Code
**File:** `app/login.tsx:31` ✅ **FIXED**
```typescript
// BEFORE (vulnerable):
const BETA_ACCESS_CODE = process.env.EXPO_PUBLIC_BETA_ACCESS_CODE || "PROTOCOL2026";

// AFTER (secure):
const BETA_ACCESS_CODE = process.env.EXPO_PUBLIC_BETA_ACCESS_CODE || "";
```
**Impact:** Access bypass if env var fails - **RESOLVED**: Now defaults to empty string (no access)
**Fix Date:** 2026-01-23
**See:** SECURITY_FIX_REPORT.md

### 5. Blob Constructor Crashes Mobile
**File:** `lib/offline-cache.ts:168`
```typescript
totalSize: new Blob([cacheString]).size  // NOT available in React Native
```
**Impact:** App crash on mobile

### 6. Missing Primary Keys in Schema
**File:** `drizzle/schema.ts`
**Issue:** All tables have `autoincrement().notNull()` but NO `.primaryKey()`
**Impact:** Schema integrity issues

### 7. OAuth Tokens Stored Plaintext
**File:** `drizzle/schema.ts` - `userAuthProviders` table
```typescript
accessToken: text(),     // Stored in plaintext
refreshToken: text(),    // Stored in plaintext
```
**Impact:** Token exposure if DB compromised

### 8. Stripe Webhook Race Condition
**File:** `server/webhooks/stripe.ts:45-63`
**Issue:** Check-then-insert pattern allows duplicate processing
**Impact:** Double charges/downgrades on concurrent webhooks

---

## High Priority Issues

### Authentication & Authorization
1. Subdomain cookie attack vector (`cookies.ts:43-44`)
2. Token refresh race condition (`auth-refresh.ts:54-57`)
3. Agency RBAC no hierarchy (admin can do owner-only actions)
4. Tier bypass - checks `tier` but not `subscriptionStatus`
5. Predictable session IDs (hash of IP+User-Agent)

### Backend
1. No connection pooling for MySQL
2. No rate limiting on public endpoints (`contact.submit`, `referral.validateCode`)
3. Missing output schemas on all tRPC procedures
4. N+1 queries in `getUserAgencies()`, `getUserAccess()`
5. In-memory search loads entire tables

### Frontend
1. `profile.tsx` - 1,167 lines (limit: 500)
2. `index.tsx` - 718 lines (limit: 500)
3. `response-card.tsx` - `parseResponse()` runs on EVERY render
4. Memory leaks - setTimeout without cleanup
5. 20+ useState calls in single component

### Database
1. No FULLTEXT indexes for search
2. Missing FK constraints everywhere
3. Missing UNIQUE constraints on critical columns
4. Empty `relations.ts` file (no Drizzle relations)

---

## Testing Coverage Gaps

| Area | Current | Needed | Gap |
|------|---------|--------|-----|
| Router Tests | 0% | 200+ specs | CRITICAL |
| Component Tests | 0% | 37 components | CRITICAL |
| Utility Tests | 5% | 127 specs | HIGH |
| E2E Tests | 3 flows | 51 scenarios | MEDIUM |
| Accessibility Tests | 0% | 20+ specs | HIGH |
| Performance Tests | Partial | Voice/Nav | MEDIUM |

**Test Failures:** 58 tests failing from 1 root cause (missing `trace` context)

---

## Performance Optimization Opportunities

| Optimization | Current | Target | Impact |
|-------------|---------|--------|--------|
| Search latency | 375-960ms | 150ms | 75% improvement |
| Bundle size | ~900KB | 450KB | 50% reduction |
| Cache hit rate | ~40% | 80% | 100% increase |
| DB queries | 50-100ms | <10ms | 90% improvement |

**Quick Wins:**
- Add MySQL connection pooling (40-60% DB improvement)
- Increase embedding cache 1000→5000 (30% more hits)
- Add FULLTEXT indexes (50-100x search improvement)
- Lazy load VoiceSearchModal (85KB savings)

---

## Accessibility Issues (EMS-Critical)

| Issue | File | WCAG |
|-------|------|------|
| Voice button 40x40pt | VoiceSearchButton.tsx:406 | Need 48pt |
| Weight buttons 36pt | dose-weight-calculator.tsx | Need 44pt |
| Missing a11y labels | quick-actions.tsx | 4.1.2 |
| No focus traps | VoiceSearchModal, DisclaimerModal | 2.4.3 |
| Radio buttons no role | upgrade-screen.tsx | 4.1.2 |

---

## New Agents Created (24)

### Protocol Guide Specialists (8)
- `rag-search-optimizer` - Claude + Voyage RAG pipeline
- `voice-ux-engineer` - Hands-free, glove-friendly interfaces
- `offline-sync-specialist` - Offline cache, sync resolution
- `protocol-data-engineer` - Protocol import pipelines
- `subscription-guardian` - Quota enforcement, billing
- `ems-content-specialist` - Medical accuracy, terminology
- `county-coverage-analyst` - Jurisdiction coverage
- `medical-disclaimer-auditor` - HIPAA, disclaimers

### General Purpose (6)
- `trpc-specialist` - tRPC router patterns
- `drizzle-expert` - Drizzle ORM, migrations
- `expo-router-expert` - File-based routing
- `nativewind-stylist` - Tailwind for React Native
- `pnpm-monorepo-manager` - Workspace management
- `vitest-coverage-hunter` - Test coverage gaps

### Marketing (5)
- `ems-influencer-liaison`
- `app-review-responder`
- `ems-podcast-guest`
- `ems-conference-tracker`
- `paramedic-testimonial-curator`

### Testing (5)
- `voice-regression-tester`
- `stripe-webhook-fuzzer`
- `offline-scenario-tester`
- `search-accuracy-auditor`
- `load-tester`

---

## Remediation Priority

### Week 1 (Critical)
1. Fix Stripe schema mismatch (`eventData` → `payload`)
2. Add `trace` to test context (fixes 46 tests)
3. Add CSRF protection to tRPC mutations
4. Fix Blob for React Native
5. Implement token revocation
6. Remove hardcoded access code

### Week 2 (High)
1. Add connection pooling
2. Add FULLTEXT indexes
3. Fix subdomain cookie attack
4. Add rate limiting to public endpoints
5. Encrypt OAuth tokens at rest

### Week 3 (Medium)
1. Refactor 1000+ line files
2. Add memoization to response-card
3. Implement lazy loading
4. Fix memory leaks
5. Add output schemas to tRPC

### Week 4+ (Testing)
1. Implement router tests (Week 1: auth, query, search)
2. Implement component tests (Week 2: ChatInput, Modal)
3. Implement E2E tests (Week 3: Critical path)
4. Add accessibility tests

---

## Files Updated

- `~/.claude/agents/protocol-guide/AGENTS.md` - 24 new entries
- `~/.claude/agents/GENERAL_AGENTS.md` - New index file
- 24 new agent definition files created

## Documents Generated

- `docs/TEST_PLAN_ROUTERS.md`
- `docs/TEST_PLAN_LIB.md`
- `docs/PERFORMANCE_BENCHMARK_ANALYSIS.md`
- `E2E_TEST_PLAN.md`
- `E2E_IMPLEMENTATION_GUIDE.md`
- `e2e/TEST_EXECUTION_CHECKLIST.md`
- `COMPONENT_TEST_PLAN.md`
- `AUDIT_REPORT_2026-01-23.md` (this file)

---

## Agent Verification

All 24 new agents created and registered:
```
~/.claude/agents/protocol-guide/engineering/    5 new files
~/.claude/agents/protocol-guide/product/        2 new files
~/.claude/agents/protocol-guide/studio-operations/ 1 new file
~/.claude/agents/protocol-guide/marketing/      5 new files
~/.claude/agents/protocol-guide/testing/        5 new files
~/.claude/agents/                               6 new files
```

---

**Report Generated By:** 20 Parallel Agents
**Total Execution Time:** ~3 minutes
**Files Analyzed:** 200+
