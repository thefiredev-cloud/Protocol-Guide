/**
 * Vitest global test setup
 * Loads environment variables and configures test utilities
 */
import { beforeAll, afterAll, vi } from "vitest";

// Load environment variables
import "../scripts/load-env.js";

// Set test environment variables if not present
const testEnvDefaults: Record<string, string> = {
  NODE_ENV: "test",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_placeholder",
  STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_test_monthly",
  STRIPE_PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_test_annual",
  SUPABASE_URL: process.env.SUPABASE_URL || "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "test_service_role_key",
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Global test setup
beforeAll(() => {
  // Silence console.log in tests unless DEBUG is set
  if (!process.env.DEBUG) {
    vi.spyOn(console, "log").mockImplementation(() => {});
  }
});

afterAll(() => {
  // Restore console.log
  vi.restoreAllMocks();
});

// Export test utilities
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    protocol: "https",
    hostname: "localhost",
    headers: {
      authorization: "Bearer test_token",
      ...overrides.headers,
    },
    ...overrides,
  };
}

export function createMockResponse() {
  const cookies: { name: string; value?: string; options: Record<string, unknown> }[] = [];

  return {
    cookies,
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookies.push({ name, value, options });
    }),
    clearCookie: vi.fn((name: string, options: Record<string, unknown>) => {
      cookies.push({ name, options });
    }),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    openId: "test-user",
    supabaseId: "test-supabase-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    tier: "free",
    queryCountToday: 0,
    lastQueryDate: null,
    selectedCountyId: null,
    stripeCustomerId: null,
    subscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}
