# Integration Tests - Protocol Guide

## Overview

This directory contains two types of integration tests:

1. **Database Integration Tests** - Real PostgreSQL database operations with transaction rollback
2. **User Journey Tests** - End-to-end tRPC router tests with mocked external services

Both types validate critical flows from user signup through subscription to protocol search and bookmarking.

## Test File

**`user-journey.test.ts`** - Comprehensive integration tests covering:

### 1. User Authentication Flow
- User profile retrieval
- Authentication state management
- Logout functionality
- Unauthenticated user handling

### 2. Subscription Management (Stripe)
- Checkout session creation (monthly/annual)
- Subscription status retrieval
- Customer portal access
- Tier-based restrictions
- Free vs Pro user differentiation

### 3. Protocol Search (AI-Powered)
- Semantic search without authentication
- Authenticated search with personalization
- Agency-specific protocol search
- State filtering
- Protocol statistics and coverage
- Protocol retrieval by ID

### 4. County Bookmarks (Saved Counties)
- View saved counties
- Add counties (with tier limits)
- Remove counties
- Set primary county
- Free tier restrictions (1 county max)
- Pro tier unlimited access

### 5. Complete User Journeys
- Full flow: auth → search → save → subscribe
- Paramedic workflow simulation
- Upgrade path from free to pro

### 6. Error Handling
- Unauthorized access attempts
- Database error recovery
- Stripe API error handling
- Invalid input validation

## Test Architecture

### Mocking Strategy

**External Services (Mocked):**
- Stripe API (checkout, billing portal)
- Anthropic Claude API (AI responses)
- Voyage AI embeddings (semantic search)
- Supabase authentication
- Redis caching

**Real Components:**
- tRPC router logic
- Database query structure
- Business logic and validations
- Tier-based access control

### Test Pattern

Tests use the **tRPC caller pattern** for direct router invocation:

```typescript
const caller = appRouter.createCaller(ctx);
const result = await caller.auth.me();
```

This provides:
- Fast execution (no HTTP overhead)
- Direct access to router procedures
- Easy context manipulation
- Clear error messages

## Running Tests

```bash
# Run all integration tests
pnpm test tests/integration/

# Run specific test file
pnpm test tests/integration/user-journey.test.ts

# Run with coverage
pnpm test:coverage tests/integration/

# Watch mode for development
pnpm test:watch tests/integration/
```

## Test Data

### Test Users

**Free Tier User:**
```typescript
{
  id: 1,
  email: "paramedic@test.com",
  tier: "free",
  queryCountToday: 0,
  stripeCustomerId: null
}
```

**Pro Tier User:**
```typescript
{
  id: 2,
  email: "pro@test.com",
  tier: "pro",
  stripeCustomerId: "cus_test_123",
  subscriptionStatus: "active"
}
```

### Mock Protocols

```typescript
{
  id: 1,
  protocol_number: "P-001",
  protocol_title: "Cardiac Arrest Management",
  content: "Begin CPR immediately. Assess rhythm...",
  similarity: 0.89
}
```

## Coverage Goals

- **Critical Paths:** 100% (auth, subscription, search, bookmarks)
- **Business Logic:** 90%+ (tier restrictions, access control)
- **Error Handling:** 80%+ (API failures, validation errors)
- **Edge Cases:** 70%+ (limits, boundaries, race conditions)

## Maintenance

### Adding New Tests

1. Follow the existing test structure (AAA pattern)
2. Use descriptive test names that explain the scenario
3. Mock external services, use real business logic
4. Test both success and failure cases
5. Keep tests isolated and independent

### Updating Mocks

When APIs change:
1. Update mock responses in the `vi.mock()` blocks
2. Verify test assertions still match expected behavior
3. Update test data if schema changes
4. Run full test suite to catch regressions

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot read properties of undefined"
**Solution:** Check that all required mocks are in place, especially for new dependencies

**Issue:** Tests pass locally but fail in CI
**Solution:** Verify environment variables are set correctly, check for timing issues

**Issue:** Flaky tests
**Solution:** Ensure tests are isolated, avoid shared state, use proper async/await

## Related Documentation

- `/tests/README.md` - Overall test strategy
- `/server/README.md` - Server architecture
- `/docs/testing-guide.md` - Testing best practices

## Key Metrics

- **Test Count:** 27 integration tests
- **Critical Flows Covered:** 4 (auth, subscription, search, bookmarks)
- **Execution Time:** ~2-3 seconds
- **Lines of Code:** ~750
- **Mocked Services:** 8 external dependencies

## Future Enhancements

1. Add performance benchmarks for critical paths
2. Test offline mode functionality
3. Add visual regression tests for UI flows
4. Test real-time subscription updates
5. Add load testing for concurrent users
6. Test webhook integrations end-to-end
