# E2E Test Execution Checklist

Quick reference for running E2E tests on Protocol Guide.

---

## Pre-Test Setup

### Environment Check
```bash
# 1. Check Node version (should be 20+)
node --version

# 2. Check dependencies installed
pnpm list @playwright/test

# 3. Check Playwright browsers installed
npx playwright --version

# 4. Verify .env file exists
ls -la .env

# 5. Check dev server is NOT running
lsof -i :8081
```

### Test Environment Variables
```bash
# .env.test (create if needed)
E2E_BASE_URL=http://localhost:8081
STRIPE_PUBLISHABLE_KEY=pk_test_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
E2E_TEST_MODE=true
```

---

## Test Execution Commands

### Quick Test Suite
```bash
# Run all tests (fastest, recommended for CI)
pnpm test:e2e

# Run with headed browser (see what's happening)
pnpm test:e2e:headed

# Run with UI mode (best for development)
pnpm test:e2e:ui
```

### Specific Test Files
```bash
# Authentication tests only
npx playwright test e2e/auth.spec.ts

# Search tests only
npx playwright test e2e/search.spec.ts

# Checkout tests only
npx playwright test e2e/checkout.spec.ts
```

### Individual Test Cases
```bash
# Run single test by name
npx playwright test -g "AUTH-001"

# Run multiple related tests
npx playwright test -g "AUTH-00[1-5]"

# Run all authentication tests
npx playwright test -g "AUTH"
```

### Browser-Specific Tests
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

---

## Critical Path Tests (Smoke Test)

Run these before every deployment:

### 1. Authentication (5 tests, ~2 min)
```bash
npx playwright test -g "AUTH-001|AUTH-002|AUTH-004|AUTH-007|AUTH-011"
```

**Expected**: All PASS
- [ ] AUTH-001: Landing page loads
- [ ] AUTH-002: Google OAuth button visible
- [ ] AUTH-004: OAuth callback success
- [ ] AUTH-007: Protected routes require auth
- [ ] AUTH-011: Logout works

### 2. Protocol Search (6 tests, ~3 min)
```bash
npx playwright test -g "SEARCH-001|SEARCH-002|SEARCH-007|SEARCH-010|SEARCH-015"
```

**Expected**: All PASS
- [ ] SEARCH-001: Search UI visible
- [ ] SEARCH-002: Cardiac arrest search works
- [ ] SEARCH-007: State filter works
- [ ] SEARCH-010: Results display correctly
- [ ] SEARCH-015: Disclaimer blocks search

### 3. Subscription Checkout (5 tests, ~2 min)
```bash
npx playwright test -g "SUB-001|SUB-002|SUB-004|SUB-009|SUB-012"
```

**Expected**: All PASS
- [ ] SUB-001: Pricing CTA visible
- [ ] SUB-002: Pricing plans display
- [ ] SUB-004: County limit enforced
- [ ] SUB-009: Checkout success handling
- [ ] SUB-012: Billing portal access

### Total: 16 tests, ~7 minutes

---

## Full Test Suite Execution

### P0 Tests (Must Pass)
```bash
# Run all P0 priority tests
npx playwright test --grep @p0
```

**Time**: ~15 minutes
**Expected**: 100% pass rate

### P1 Tests (Important)
```bash
# Run all P1 priority tests
npx playwright test --grep @p1
```

**Time**: ~20 minutes
**Expected**: 95% pass rate

### P2 Tests (Nice to Have)
```bash
# Run all P2 priority tests
npx playwright test --grep @p2
```

**Time**: ~10 minutes
**Expected**: 90% pass rate

---

## Test Results Checklist

### After Test Run
- [ ] Check pass rate (should be >95%)
- [ ] Review failed test screenshots in `test-results/`
- [ ] Check HTML report: `npx playwright show-report`
- [ ] Verify no console errors in logs
- [ ] Check test execution time (should be <10 min)

### If Tests Fail
1. **Check screenshots**: `test-results/*/test-failed-*.png`
2. **View trace**: `npx playwright show-trace test-results/*/trace.zip`
3. **Re-run failed tests**: `npx playwright test --last-failed`
4. **Debug single test**: `npx playwright test --debug -g "TEST-ID"`

---

## Common Issues & Quick Fixes

### Issue: Dev server not starting
```bash
# Kill existing process
lsof -ti :8081 | xargs kill -9

# Start fresh
pnpm dev:metro
```

### Issue: Playwright browsers not found
```bash
# Reinstall browsers
npx playwright install --with-deps
```

### Issue: Tests timing out
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000  # 60 seconds
```

### Issue: Flaky tests
```bash
# Run with retries
npx playwright test --retries=2
```

### Issue: React Native Web slow to render
```typescript
// Add longer waits in tests
await page.waitForTimeout(3000);
```

---

## Test Environments

### Local Development
```bash
# Start dev server
pnpm dev

# Run tests
pnpm test:e2e
```

### Staging Environment
```bash
# Set staging URL
E2E_BASE_URL=https://staging.protocolguide.com pnpm test:e2e
```

### Production Smoke Test
```bash
# WARNING: Only run critical path tests on prod
E2E_BASE_URL=https://protocolguide.com npx playwright test -g "AUTH-001|SEARCH-001|SUB-001"
```

---

## Reporting

### Generate HTML Report
```bash
# Tests generate report automatically
npx playwright show-report
```

### View Test Artifacts
```bash
# Screenshots
open test-results/

# Videos
open test-results/*/video.webm

# Traces
npx playwright show-trace test-results/*/trace.zip
```

### Export Test Results
```bash
# JSON format
npx playwright test --reporter=json > test-results.json

# JUnit XML (for CI)
npx playwright test --reporter=junit > junit-results.xml
```

---

## CI/CD Integration

### GitHub Actions
```yaml
# Runs automatically on push/PR
# Check: https://github.com/[org]/protocol-guide/actions
```

### Manual CI Trigger
```bash
# Trigger via GitHub CLI
gh workflow run e2e.yml
```

### View CI Results
1. Go to GitHub Actions tab
2. Click on latest E2E test run
3. Download artifacts (screenshots, reports)

---

## Performance Benchmarks

### Expected Test Times
| Suite | Tests | Time |
|-------|-------|------|
| Auth | 13 | 3 min |
| Search | 18 | 5 min |
| Checkout | 20 | 7 min |
| **Total** | **51** | **15 min** |

### Performance Thresholds
- **Single test**: < 30 seconds
- **Test suite**: < 20 minutes
- **Critical path**: < 10 minutes

If tests exceed these times, investigate:
- Slow network requests
- Heavy page rendering
- Missing wait conditions
- Excessive timeouts

---

## Test Coverage Goals

### Current Coverage
- [ ] Authentication: 13/13 tests implemented
- [ ] Protocol Search: 18/18 tests implemented
- [ ] Subscription: 20/20 tests implemented

### Target Coverage
- **User Flows**: 100%
- **Error Paths**: 90%
- **Edge Cases**: 80%

---

## Quick Debug Commands

### See what Playwright is doing
```bash
# Headed mode + slow motion
npx playwright test --headed --slow-mo=1000
```

### Generate test code
```bash
# Record actions
npx playwright codegen http://localhost:8081
```

### Inspect selectors
```bash
# Open inspector
npx playwright test --debug -g "TEST-NAME"
```

### Check test configuration
```bash
# View config
npx playwright show-config
```

---

## Weekly Test Maintenance

### Monday: Run Full Suite
```bash
pnpm test:e2e
```
- [ ] Record pass rate
- [ ] Note any flaky tests
- [ ] Review new failures

### Wednesday: Run Critical Path
```bash
npx playwright test -g "AUTH-001|SEARCH-001|SUB-001"
```
- [ ] Verify core functionality
- [ ] Check performance

### Friday: Update Test Data
```bash
# Update test users, mock data
# Refresh Stripe test cards
# Update protocol fixtures
```

---

## Before Release Checklist

### 1. Run Full Test Suite
```bash
pnpm test:e2e --project=chromium --project=firefox --project=webkit
```
- [ ] All P0 tests pass
- [ ] 95%+ P1 tests pass
- [ ] No critical failures

### 2. Run on All Browsers
- [ ] Chrome: `npx playwright test --project=chromium`
- [ ] Firefox: `npx playwright test --project=firefox`
- [ ] Safari: `npx playwright test --project=webkit`
- [ ] Mobile Chrome: `npx playwright test --project="Mobile Chrome"`
- [ ] Mobile Safari: `npx playwright test --project="Mobile Safari"`

### 3. Performance Check
- [ ] Test execution < 15 minutes
- [ ] No timeouts
- [ ] Screenshots confirm UI loads correctly

### 4. Review Failures
- [ ] Check failure screenshots
- [ ] View traces for errors
- [ ] Verify not environment issues

### 5. Document Issues
- [ ] Create tickets for real bugs
- [ ] Mark flaky tests
- [ ] Update test plan if needed

---

## Emergency Test Procedures

### Production is Down
```bash
# Run critical path immediately
E2E_BASE_URL=https://protocolguide.com npx playwright test -g "AUTH-001|SEARCH-001"
```

### Rollback Verification
```bash
# Test previous version
E2E_BASE_URL=https://v1-23.protocolguide.com pnpm test:e2e
```

### Hotfix Validation
```bash
# Test only affected area
npx playwright test -g "AFFECTED-FEATURE"
```

---

## Resources

- **Full Test Plan**: `/E2E_TEST_PLAN.md`
- **Implementation Guide**: `/E2E_IMPLEMENTATION_GUIDE.md`
- **Playwright Docs**: https://playwright.dev
- **Test Files**: `/e2e/*.spec.ts`

---

**Last Updated**: 2026-01-23
**Next Review**: Weekly
