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

/**
 * Create a mock trace context for testing
 * Matches the TraceContext interface from server/_core/tracing.ts
 */
export function createMockTraceContext(overrides: Partial<{
  requestId: string;
  startTime: number;
  parentTraceId?: string;
  spanId?: string;
  source?: "web" | "mobile" | "api" | "internal";
  userId?: string;
  userTier?: string;
}> = {}) {
  return {
    requestId: overrides.requestId ?? "test-request-id",
    startTime: overrides.startTime ?? Date.now(),
    spanId: overrides.spanId ?? "test-span-id",
    source: overrides.source ?? "api" as const,
    userId: overrides.userId ?? "test-user",
    userTier: overrides.userTier ?? "free",
    parentTraceId: overrides.parentTraceId,
  };
}

/**
 * Create a mock Express-like request object for tRPC context
 * Includes all properties needed by middleware (CSRF, tracing, rate limiting)
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  const csrfToken = "test-csrf-token-12345";
  const headersOverrides = (overrides.headers as Record<string, string>) || {};
  const cookiesOverrides = (overrides.cookies as Record<string, string>) || {};

  return {
    protocol: "https",
    hostname: "localhost",
    method: "POST",
    url: "/api/trpc",
    ip: "127.0.0.1",
    headers: {
      authorization: "Bearer test_token",
      "user-agent": "vitest-test-agent",
      "x-csrf-token": csrfToken,
      "x-request-id": "test-request-id",
      ...headersOverrides,
    },
    cookies: {
      csrf_token: csrfToken,
      ...cookiesOverrides,
    },
    socket: {
      remoteAddress: "127.0.0.1",
    },
    ...overrides,
    // Ensure headers and cookies are not overwritten by spread
  };
}

/**
 * Create a mock Express-like response object for tRPC context
 * Includes all methods needed by middleware (tracing headers, rate limit headers, cookies)
 */
export function createMockResponse() {
  const cookies: { name: string; value?: string; options: Record<string, unknown> }[] = [];
  const headers: Record<string, string | number> = {};

  return {
    cookies,
    headers,
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookies.push({ name, value, options });
    }),
    clearCookie: vi.fn((name: string, options: Record<string, unknown>) => {
      cookies.push({ name, options });
    }),
    setHeader: vi.fn((name: string, value: string | number) => {
      headers[name] = value;
    }),
    getHeader: vi.fn((name: string) => headers[name]),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
    end: vi.fn(),
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

/**
 * Create a complete tRPC context for testing
 * Includes properly configured request, response, trace context, and optional user
 *
 * Usage:
 *   const ctx = createMockContext({ user: createMockUser({ tier: 'pro' }) });
 *   const caller = appRouter.createCaller(ctx);
 */
export function createMockContext(options: {
  user?: ReturnType<typeof createMockUser> | null;
  requestOverrides?: Record<string, unknown>;
  traceOverrides?: Parameters<typeof createMockTraceContext>[0];
} = {}) {
  const { user = null, requestOverrides = {}, traceOverrides = {} } = options;

  return {
    req: createMockRequest(requestOverrides),
    res: createMockResponse(),
    user,
    trace: createMockTraceContext({
      userId: user?.id?.toString(),
      userTier: user?.tier as string,
      ...traceOverrides,
    }),
  };
}
