# Protocol Guide - Router Test Plan

**Generated:** 2026-01-23
**Coverage Status:** 0% (No existing tests found)
**Priority:** Critical - Healthcare application requires comprehensive test coverage

---

## Executive Summary

The `server/routers/` directory contains **13 routers** with **70+ procedures** and **0% test coverage**. This document identifies all missing tests, edge cases, and error handling gaps.

### Router Overview

| Router | Procedures | Priority | Risk Level |
|--------|------------|----------|------------|
| query | 6 | P0 | Critical (AI/LLM) |
| search | 8 | P0 | Critical (Core feature) |
| subscription | 4 | P0 | Critical (Payments) |
| auth | 2 | P0 | Critical (Security) |
| user | 10 | P1 | High |
| admin | 6 | P1 | High (Security) |
| agency-admin | 14 | P1 | High |
| referral | 9 | P2 | Medium |
| integration | 4 | P2 | Medium (HIPAA) |
| voice | 2 | P2 | Medium |
| feedback | 2 | P3 | Low |
| contact | 1 | P3 | Low |
| counties | 2 | P3 | Low |

---

## P0: Critical Priority Tests

### 1. Auth Router (`/server/routers/auth.ts`)

#### 1.1 `auth.me` - Get Current User
**Test Specifications:**
```
describe('auth.me')
  - should return user object when authenticated
  - should return null when no session exists
  - should return null after session expires
  - should include correct user fields (id, email, tier, role)
```

**Edge Cases:**
- Corrupted session cookie
- Expired JWT token
- User deleted but session active

**Error Handling:**
- Database connection failure during user lookup

---

#### 1.2 `auth.logout` - User Logout
**Test Specifications:**
```
describe('auth.logout')
  - should clear session cookie
  - should return { success: true }
  - should handle already-logged-out user gracefully
  - should set correct cookie options (secure, httpOnly, sameSite)
```

**Edge Cases:**
- Multiple simultaneous logout requests
- Logout with malformed cookie
- Cross-domain logout handling

**Error Handling:**
- Cookie clearing failure

---

### 2. Query Router (`/server/routers/query.ts`)

#### 2.1 `query.submit` - Submit Protocol Query
**Test Specifications:**
```
describe('query.submit')
  - should return successful response with protocol refs
  - should normalize EMS abbreviations (CPR -> cardiopulmonary resuscitation)
  - should route to correct Claude model based on user tier
  - should return error when daily limit exceeded
  - should handle medication queries with enhanced accuracy
  - should log query to database
  - should increment user query count
  - should record latency metrics
```

**Edge Cases:**
- Query at exact character limit (1000 chars)
- Query with only abbreviations
- Query with typos (e.g., "cariac" -> "cardiac")
- Complex multi-condition query
- Emergency/urgent query detection
- Unknown agency/county ID
- Zero search results

**Error Handling:**
- Claude API timeout
- Claude API rate limit
- Embedding service failure
- Database write failure
- Invalid county ID
- User not found after authentication

**Input Validation:**
```
- queryText: min 1 char, max 1000 chars
- countyId: must be valid number
- Empty string query
- SQL injection attempts in queryText
```

---

#### 2.2 `query.history` - Get Query History
**Test Specifications:**
```
describe('query.history')
  - should return user's query history
  - should respect limit parameter
  - should order by most recent first
  - should return empty array for new user
```

**Edge Cases:**
- User with 0 queries
- User with exactly `limit` queries
- User with more than `limit` queries
- Deleted queries handling

**Input Validation:**
```
- limit: min 1, max 100, default 50
```

---

#### 2.3 `query.syncHistory` - Pro Feature Cloud Sync
**Test Specifications:**
```
describe('query.syncHistory')
  - should sync local queries to cloud for Pro users
  - should reject free tier users with FORBIDDEN
  - should merge duplicate queries
  - should preserve timestamps
  - should handle device ID tracking
```

**Edge Cases:**
- Empty localQueries array
- Very old timestamps
- Future timestamps (clock skew)
- Duplicate query text with different timestamps
- Large batch (near 100 items)

**Error Handling:**
- Database merge conflict
- Concurrent sync from multiple devices

---

#### 2.4 `query.clearHistory` - Clear History
**Test Specifications:**
```
describe('query.clearHistory')
  - should delete all user history
  - should return success for user with no history
```

---

#### 2.5 `query.deleteHistoryEntry` - Delete Single Entry
**Test Specifications:**
```
describe('query.deleteHistoryEntry')
  - should delete specific entry
  - should throw NOT_FOUND for invalid ID
  - should throw NOT_FOUND for another user's entry
```

**Edge Cases:**
- Already deleted entry
- Non-existent entry ID

---

### 3. Search Router (`/server/routers/search.ts`)

#### 3.1 `search.semantic` - Main Semantic Search
**Test Specifications:**
```
describe('search.semantic')
  - should return relevant protocols for query
  - should normalize EMS abbreviations
  - should cache results in Redis
  - should return cached results on cache hit
  - should set appropriate cache headers
  - should map county ID to Supabase agency ID
  - should filter by state when provided
  - should respect limit parameter
  - should include relevance scores
  - should truncate content at 500 chars in results
```

**Edge Cases:**
- Query with no results
- Query returning exactly `limit` results
- Cache expiration timing
- Multiple concurrent searches
- Special characters in query
- Unicode/emoji in query
- Very short query (1-3 chars)
- Query matching multiple agencies

**Error Handling:**
- Redis connection failure (should fallback gracefully)
- Embedding service failure
- Supabase connection failure
- Agency mapping failure

**Input Validation:**
```
- query: min 1 char, max 500 chars
- countyId: optional number
- limit: min 1, max 50, default 10
- stateFilter: optional string
```

---

#### 3.2 `search.searchByAgency` - Agency-Specific Search
**Test Specifications:**
```
describe('search.searchByAgency')
  - should filter results to specific agency
  - should use context boost for agency search
  - should map MySQL county ID to Supabase agency ID
  - should cache results separately per agency
```

**Edge Cases:**
- Non-existent agency ID
- Agency with no protocols
- Agency name containing special characters

---

#### 3.3 `search.getProtocol` - Get Protocol by ID
**Test Specifications:**
```
describe('search.getProtocol')
  - should return full protocol content
  - should return null for non-existent ID
```

---

#### 3.4 `search.stats` / `search.totalStats` / `search.coverageByState`
**Test Specifications:**
```
describe('search statistics')
  - should return protocol statistics
  - should return coverage by state
  - should return total stats
```

---

#### 3.5 `search.agenciesByState` / `search.agenciesWithProtocols`
**Test Specifications:**
```
describe('search agencies')
  - should list agencies by state
  - should list agencies with protocol counts
  - should handle state with no agencies
```

---

### 4. Subscription Router (`/server/routers/subscription.ts`)

#### 4.1 `subscription.createCheckout` - Create Stripe Checkout
**Test Specifications:**
```
describe('subscription.createCheckout')
  - should create checkout session for monthly plan
  - should create checkout session for annual plan
  - should return checkout URL
  - should pass correct user email to Stripe
  - should handle Stripe API errors
```

**Edge Cases:**
- User with no email
- User already subscribed
- Invalid success/cancel URLs
- Stripe webhook delivery failure

**Error Handling:**
- Stripe API down
- Invalid plan type
- Network timeout to Stripe

**Input Validation:**
```
- plan: 'monthly' | 'annual'
- successUrl: valid URL
- cancelUrl: valid URL
```

---

#### 4.2 `subscription.createPortal` - Stripe Customer Portal
**Test Specifications:**
```
describe('subscription.createPortal')
  - should create portal session for existing customer
  - should return error for user without subscription
  - should return portal URL
```

**Edge Cases:**
- User with expired subscription
- User with cancelled subscription

**Error Handling:**
- Invalid stripeCustomerId
- Stripe API failure

---

#### 4.3 `subscription.status` - Get Subscription Status
**Test Specifications:**
```
describe('subscription.status')
  - should return 'free' tier for new user
  - should return 'pro' tier for subscribed user
  - should include subscription end date
  - should include subscription status
```

---

#### 4.4 `subscription.createDepartmentCheckout` - Agency B2B Checkout
**Test Specifications:**
```
describe('subscription.createDepartmentCheckout')
  - should create checkout for starter tier
  - should create checkout for professional tier
  - should create checkout for enterprise tier
  - should verify user is agency admin
  - should return error for non-admin user
  - should calculate correct seat count pricing
```

**Edge Cases:**
- Agency with no contact email
- Seat count at minimum (1) and maximum (1000)
- Non-existent agency ID

**Error Handling:**
- User not authorized for agency
- Database connection failure
- Stripe pricing lookup failure

**Input Validation:**
```
- agencyId: number
- tier: 'starter' | 'professional' | 'enterprise'
- seatCount: 1-1000
- interval: 'monthly' | 'annual'
- successUrl/cancelUrl: valid URLs
```

---

## P1: High Priority Tests

### 5. User Router (`/server/routers/user.ts`)

#### 5.1 `user.usage` - Get Usage Stats
```
describe('user.usage')
  - should return query count and limits
  - should return correct remaining queries
```

---

#### 5.2 `user.acknowledgeDisclaimer` - Medical Disclaimer (P0 CRITICAL)
**Test Specifications:**
```
describe('user.acknowledgeDisclaimer')
  - should record disclaimer acknowledgment timestamp
  - should be idempotent (multiple calls OK)
```

**Critical Note:** This is P0 for legal compliance - users MUST acknowledge before accessing protocols.

---

#### 5.3 `user.hasAcknowledgedDisclaimer`
```
describe('user.hasAcknowledgedDisclaimer')
  - should return false for new user
  - should return true after acknowledgment
```

---

#### 5.4 `user.selectCounty`
```
describe('user.selectCounty')
  - should update user's selected county
  - should accept valid county ID
```

**Edge Cases:**
- Non-existent county ID
- Same county selected twice

---

#### 5.5 `user.savedCounties` / `user.addCounty` / `user.removeCounty` / `user.setPrimaryCounty`
**Test Specifications:**
```
describe('user county management')
  - should list saved counties with limits
  - should enforce tier-based county limits
  - should add county respecting limits
  - should throw BAD_REQUEST when limit exceeded
  - should remove county
  - should set primary county
  - should prevent removing primary county without replacement
```

**Edge Cases:**
- Free user at county limit
- Pro user with many counties
- Setting primary to non-saved county

**Error Handling:**
- BAD_REQUEST with descriptive error message

---

### 6. Admin Router (`/server/routers/admin.ts`)

**Critical:** All procedures require admin role verification.

#### 6.1 `admin.listFeedback`
```
describe('admin.listFeedback')
  - should return paginated feedback
  - should filter by status
  - should reject non-admin users
```

---

#### 6.2 `admin.updateFeedback`
```
describe('admin.updateFeedback')
  - should update feedback status
  - should add admin notes
  - should log audit event
  - should throw NOT_FOUND for invalid ID
```

---

#### 6.3 `admin.listUsers`
```
describe('admin.listUsers')
  - should return paginated users
  - should filter by tier
  - should filter by role
```

---

#### 6.4 `admin.updateUserRole`
```
describe('admin.updateUserRole')
  - should update user role
  - should prevent changing own role (BAD_REQUEST)
  - should throw NOT_FOUND for invalid user
  - should log audit event
```

**Critical Security Test:**
- Ensure non-admin cannot call this procedure

---

#### 6.5 `admin.listContactSubmissions` / `admin.updateContactStatus`
```
describe('admin contact management')
  - should list submissions with pagination
  - should update submission status
  - should log audit events
```

---

#### 6.6 `admin.getAuditLogs`
```
describe('admin.getAuditLogs')
  - should return audit logs
  - should paginate correctly
```

---

### 7. Agency Admin Router (`/server/routers/agency-admin/`)

#### 7.1 Middleware Tests (`middleware.ts`)
```
describe('agencyAdminProcedure')
  - should require agencyId in input
  - should verify user is agency admin
  - should throw FORBIDDEN for non-admin
  - should throw BAD_REQUEST for missing agencyId
```

---

#### 7.2 Agency Procedures (`agency.ts`)
```
describe('agencyAdmin.myAgencies')
  - should return user's agencies
  - should return empty array if none

describe('agencyAdmin.getAgency')
  - should return agency details
  - should throw NOT_FOUND for invalid ID

describe('agencyAdmin.updateAgency')
  - should update agency name
  - should update contact info
  - should update settings
  - should verify admin permission
```

---

#### 7.3 Staff Procedures (`staff.ts`)
```
describe('agencyAdmin.listMembers')
  - should return members with user info
  - should batch fetch users (no N+1)

describe('agencyAdmin.inviteMember')
  - should generate invitation token
  - should set 7-day expiry
  - should create invitation record

describe('agencyAdmin.updateMemberRole')
  - should update member role
  - should prevent changing owner role (FORBIDDEN)
  - should prevent changing own role (FORBIDDEN)
  - should throw NOT_FOUND for invalid member

describe('agencyAdmin.removeMember')
  - should remove member
  - should prevent removing owner (FORBIDDEN)
  - should prevent removing self (FORBIDDEN)
```

---

#### 7.4 Protocol Procedures (`protocols.ts`)
```
describe('agencyAdmin.listProtocols')
  - should list agency protocols
  - should filter by status
  - should paginate correctly

describe('agencyAdmin.uploadProtocol')
  - should upload PDF to storage
  - should reject non-PDF files (BAD_REQUEST)
  - should create upload job
  - should create protocol version
  - should enforce 20MB limit

describe('agencyAdmin.getUploadStatus')
  - should return upload status
  - should verify agency ownership
  - should throw NOT_FOUND for invalid upload

describe('agencyAdmin.updateProtocolStatus')
  - should transition draft -> review
  - should transition review -> approved
  - should reject invalid transitions (BAD_REQUEST)
  - should verify agency ownership

describe('agencyAdmin.publishProtocol')
  - should publish approved protocol
  - should reject non-approved (BAD_REQUEST)
  - should log audit event

describe('agencyAdmin.archiveProtocol')
  - should archive protocol
  - should log audit event
```

**Workflow State Machine Tests:**
```
Valid transitions:
  draft -> review, archived
  review -> draft, approved, archived
  approved -> published, draft
  published -> archived
  archived -> draft

Invalid transitions should throw BAD_REQUEST
```

---

#### 7.5 Version Procedures (`versions.ts`)
```
describe('agencyAdmin.listVersions')
  - should list protocol versions
  - should filter by protocol number
  - should order by created date desc

describe('agencyAdmin.createVersion')
  - should create new version from existing
  - should copy source file URL
  - should record supersedes metadata
  - should throw NOT_FOUND for invalid source
```

---

## P2: Medium Priority Tests

### 8. Integration Router (`/server/routers/integration.ts`)

**HIPAA Compliance Note:** Tests must verify PHI is NOT stored.

#### 8.1 `integration.logAccess`
```
describe('integration.logAccess')
  - should log access event
  - should NOT store userAge (HIPAA)
  - should NOT store impression (HIPAA)
  - should store operational data only
  - should generate unique requestId
  - should handle database unavailable gracefully
```

**Critical HIPAA Tests:**
```
describe('HIPAA compliance')
  - userAge parameter should be ignored (not stored)
  - impression parameter should be ignored (not stored)
  - error logs should not contain PHI
```

---

#### 8.2 `integration.getStats` (Admin only)
```
describe('integration.getStats')
  - should return stats by partner
  - should filter by date range
  - should calculate averages correctly
```

---

#### 8.3 `integration.getRecentLogs` / `integration.getDailyUsage`
```
describe('integration analytics')
  - should return recent logs
  - should return daily usage for charts
  - should filter by partner
```

---

### 9. Voice Router (`/server/routers/voice.ts`)

#### 9.1 `voice.transcribe`
```
describe('voice.transcribe')
  - should transcribe audio from allowed domains
  - should reject URLs from unauthorized domains
  - should return transcription text
  - should handle transcription errors
```

**Security Tests:**
```
describe('URL allowlist')
  - should accept storage.protocol-guide.com
  - should accept *.supabase.co/storage
  - should accept *.r2.cloudflarestorage.com
  - should reject all other domains
  - should reject invalid URLs
```

---

#### 9.2 `voice.uploadAudio`
```
describe('voice.uploadAudio')
  - should upload audio to storage
  - should generate unique key with timestamp
  - should return signed URL
  - should enforce 10MB limit
```

**Input Validation:**
```
- audioBase64: max 10,000,000 chars
- mimeType: string
```

---

### 10. Referral Router (`/server/routers/referral/`)

#### 10.1 User Procedures
```
describe('referral.getMyReferralCode')
  - should return existing code
  - should generate new code if none exists
  - should ensure code uniqueness

describe('referral.getMyStats')
  - should return referral statistics
  - should calculate tier correctly
  - should show progress to next tier

describe('referral.getMyReferrals')
  - should return referral history
  - should mask email for privacy
  - should paginate correctly
```

---

#### 10.2 Code Procedures
```
describe('referral.validateCode')
  - should validate active code
  - should reject inactive code
  - should reject expired code
  - should reject code at usage limit
  - should uppercase and trim input

describe('referral.redeemCode')
  - should create redemption record
  - should prevent self-referral (BAD_REQUEST)
  - should prevent double redemption (BAD_REQUEST)
  - should update code usage count
  - should update referrer stats

describe('referral.getShareTemplates')
  - should return SMS template
  - should return WhatsApp template
  - should return email template
  - should include referral code in URLs
```

---

#### 10.3 Analytics Procedures
```
describe('referral.getLeaderboard')
  - should return top referrers
  - should respect limit
  - should handle timeframe filter

describe('referral.trackViralEvent')
  - should track events silently
  - should not fail user experience on error
```

---

## P3: Lower Priority Tests

### 11. Feedback Router (`/server/routers/feedback.ts`)

```
describe('feedback.submit')
  - should create feedback record
  - should include user's county
  - should handle submission errors gracefully

describe('feedback.myFeedback')
  - should return user's feedback
```

---

### 12. Contact Router (`/server/routers/contact.ts`)

```
describe('contact.submit')
  - should create contact submission
  - should validate email format
  - should enforce message length (10-5000 chars)
```

---

### 13. Counties Router (`/server/routers/counties.ts`)

```
describe('counties.list')
  - should return all counties
  - should group by state

describe('counties.get')
  - should return county by ID
  - should return null for invalid ID
```

---

## Test Infrastructure Requirements

### 1. Test Context Factory
```typescript
// Required: Create test context with mocked dependencies
function createTestContext(options?: {
  user?: Partial<User>;
  isAdmin?: boolean;
  agencyId?: number;
}): TestContext
```

### 2. Database Mocking Strategy
```typescript
// Required: Mock database operations
vi.mock('../db', () => ({
  getUserById: vi.fn(),
  createQuery: vi.fn(),
  // ... etc
}))
```

### 3. External Service Mocks
- **Stripe API**: Mock `createCheckoutSession`, `createCustomerPortalSession`
- **Claude API**: Mock `invokeClaudeRAG` with sample responses
- **Voyage AI**: Mock embedding generation
- **Redis**: Mock cache operations
- **Supabase**: Mock storage operations

### 4. Test Data Fixtures
```typescript
// Required fixtures
const fixtures = {
  users: { free, pro, enterprise, admin },
  agencies: { withProtocols, empty },
  protocols: { draft, published, archived },
  referralCodes: { active, expired, maxedOut },
}
```

---

## Coverage Targets

| Category | Target | Notes |
|----------|--------|-------|
| Line Coverage | 80% | Minimum for all routers |
| Branch Coverage | 75% | Focus on error paths |
| Function Coverage | 90% | All procedures covered |
| Critical Paths | 100% | Auth, payments, HIPAA |

---

## Test File Structure

```
__tests__/
  server/
    routers/
      auth.test.ts
      user.test.ts
      query.test.ts
      search.test.ts
      subscription.test.ts
      admin.test.ts
      voice.test.ts
      feedback.test.ts
      contact.test.ts
      counties.test.ts
      integration.test.ts
      agency-admin/
        agency.test.ts
        staff.test.ts
        protocols.test.ts
        versions.test.ts
        middleware.test.ts
      referral/
        user-procedures.test.ts
        code-procedures.test.ts
        analytics-procedures.test.ts
  utils/
    test-context.ts
    test-fixtures.ts
    test-mocks.ts
```

---

## Implementation Priority Order

1. **Week 1:** Auth, Query, Search (core functionality)
2. **Week 2:** Subscription, User (revenue & user management)
3. **Week 3:** Admin, Agency-Admin (administrative functions)
4. **Week 4:** Integration, Voice, Referral (auxiliary features)
5. **Week 5:** Feedback, Contact, Counties (low-risk)

---

## Notes for Implementation

1. **All procedures require authenticated user context** except:
   - `search.semantic`, `search.getProtocol`, `search.stats`, `search.coverageByState`, `search.totalStats`, `search.agenciesByState`, `search.agenciesWithProtocols`, `search.searchByAgency`
   - `contact.submit`
   - `referral.validateCode`

2. **Admin procedures** require `role: 'admin'` check

3. **Agency admin procedures** require `agencyAdminProcedure` middleware verification

4. **HIPAA-sensitive procedures** (integration) must never log PHI

5. **Payment procedures** should have Stripe webhook tests separately
