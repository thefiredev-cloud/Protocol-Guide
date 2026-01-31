/**
 * E2E Test Fixtures
 * Export all fixtures and helpers for E2E tests
 */

// Auth fixtures
export {
  test,
  expect,
  TEST_USER,
  TEST_PRO_USER,
  injectAuthSession,
  clearAuthSession,
  createMockSession,
  setE2ETestMode,
  type TestUser,
  type TestSession,
} from "./auth";

// Mock API helpers
export {
  setupMockApiRoutes,
  clearMockApiRoutes,
  mockStripeCheckoutSuccess,
  mockRateLimitExceeded,
  type MockUserUsage,
  type MockSubscriptionStatus,
  type MockQuery,
} from "./mock-api";
