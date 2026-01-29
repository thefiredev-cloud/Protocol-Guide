# E2E Test Timeout Fix Summary

## Date: 2026-01-29

## Issues Identified

### 1. Test File in Wrong Directory
- **Problem**: `tests/county-filter.test.ts` was using Playwright's test API but was in the Vitest `tests/` directory
- **Solution**: Moved to `e2e/county-filter.spec.ts`
- **Result**: Vitest no longer crashes with "test.describe() called unexpectedly" error

### 2. Playwright Config Windows Compatibility
- **Problem**: The `pnpm dev:metro` command used shell variable syntax `${EXPO_PORT:-8081}` that doesn't work on Windows
- **Solution**: Updated `playwright.config.ts` to:
  - Parse EXPO_PORT with fallback: `parseInt(process.env.EXPO_PORT || "8081", 10)`
  - Use cross-env for Windows compatibility in webServer command
  - Added platform detection: `process.platform === "win32"`
- **Result**: Tests can now start the server on Windows

### 3. Excessive Wait Times
- **Problem**: E2E tests used `waitForTimeout(2000)` everywhere (~40 calls), adding up to potentially 80+ seconds
- **Solution**: 
  - Created shared helper `waitForAppReady()` with optimized 500ms wait
  - Reduced all 2000ms waits to 500ms
  - Changed `networkidle` to `domcontentloaded` where appropriate
- **Estimated Time Savings**: ~60 seconds per test run

### 4. Visual Test Helper Optimization
- **Problem**: Visual tests used 1000ms waits before screenshots
- **Solution**: Reduced to 500ms default wait in `visual-test.helper.ts`
- **Result**: Faster visual regression tests

## Files Changed

1. **playwright.config.ts**
   - Fixed Windows command syntax
   - Added platform detection
   - Reduced global timeout from 30s to 20s
   - Added action/navigation timeouts

2. **e2e/fixtures/auth.ts**
   - Reduced post-reload wait from 1000ms to 500ms
   - Changed networkidle to domcontentloaded

3. **e2e/search.spec.ts**
   - Replaced all `waitForTimeout(2000)` with optimized helper
   - Added shared `getSearchInput()` helper

4. **e2e/auth.spec.ts**
   - Replaced all `waitForTimeout(2000)` with optimized helper

5. **e2e/visual/search.visual.spec.ts**
   - Reduced wait times from 2000ms to 500ms

6. **e2e/helpers/visual-test.helper.ts**
   - Reduced default waits from 1000ms to 500ms

7. **tests/county-filter.test.ts** → **e2e/county-filter.spec.ts**
   - Moved from Vitest directory to Playwright directory

## Test Results After Fix

**Vitest (Unit Tests):**
- ✅ 36 test files passed
- ⏭️ 14 test files skipped
- ✅ 810 tests passed
- ⏭️ 251 tests skipped

**Coverage Issue:**
- `server/stripe.ts` coverage is 63.67% (threshold: 80%)
- This is a pre-existing issue, not caused by these changes

## Coverage Improvement Recommendations

To improve coverage from 86% to >90%:

1. **Add Stripe webhook tests** - Many webhook handlers (customer.subscription.deleted, invoice.payment_succeeded, etc.) are skipped
2. **Enable integration tests** - DB integration tests are all skipped
3. **Add semantic search tests** - Currently skipped, needs VOYAGE_API_KEY
4. **Token refresh tests** - All skipped, needs mock implementation

## CI/CD Configuration Notes

The visual regression tests are already commented out in `.github/workflows/ci.yml` due to the navigation loop issue. Once the auth context fixes are verified working, they can be re-enabled.

## Testing the Fix

To verify the fixes work:

```bash
# Run unit tests
pnpm test

# Run E2E tests (requires dev server or external URL)
E2E_SKIP_SERVER=true E2E_BASE_URL=https://protocol-guide.com pnpm test:e2e
```

## Next Steps

1. ✅ Fixed Vitest/Playwright API conflict
2. ✅ Optimized E2E test waits
3. ✅ Fixed Windows compatibility
4. ⏳ Verify visual tests work with auth context
5. ⏳ Add missing test coverage for stripe.ts
6. ⏳ Enable skipped integration tests
