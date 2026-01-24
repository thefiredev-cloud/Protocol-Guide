/**
 * E2E Mock API Interceptor
 * Provides route interception for tRPC/API calls during E2E tests
 *
 * This allows tests to run without hitting real backend services
 * while still testing the frontend behavior accurately.
 */

import { Page, Route } from "@playwright/test";
import { TestUser, TEST_USER, TEST_PRO_USER } from "./auth";

// Mock user data responses
export interface MockUserUsage {
  tier: "free" | "pro" | "enterprise";
  count: number;
  limit: number;
  resetAt: string;
}

export interface MockSubscriptionStatus {
  tier: "free" | "pro" | "enterprise";
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  hasActiveSubscription: boolean;
}

export interface MockQuery {
  id: number;
  queryText: string;
  createdAt: string;
}

// Default mock data
const DEFAULT_FREE_USAGE: MockUserUsage = {
  tier: "free",
  count: 2,
  limit: 5,
  resetAt: new Date(Date.now() + 86400000).toISOString(),
};

const DEFAULT_PRO_USAGE: MockUserUsage = {
  tier: "pro",
  count: 15,
  limit: -1, // unlimited
  resetAt: new Date(Date.now() + 86400000).toISOString(),
};

const DEFAULT_FREE_SUBSCRIPTION: MockSubscriptionStatus = {
  tier: "free",
  subscriptionStatus: null,
  subscriptionEndDate: null,
  hasActiveSubscription: false,
};

const DEFAULT_PRO_SUBSCRIPTION: MockSubscriptionStatus = {
  tier: "pro",
  subscriptionStatus: "active",
  subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  hasActiveSubscription: true,
};

const DEFAULT_QUERIES: MockQuery[] = [
  {
    id: 1,
    queryText: "cardiac arrest protocol",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    queryText: "pediatric respiratory distress",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    queryText: "stroke assessment",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

/**
 * tRPC response wrapper
 */
function createTRPCResponse(data: unknown): string {
  return JSON.stringify({
    result: {
      data,
    },
  });
}

/**
 * tRPC batch response wrapper
 */
function createTRPCBatchResponse(results: unknown[]): string {
  return JSON.stringify(
    results.map((data) => ({
      result: {
        data,
      },
    }))
  );
}

/**
 * Setup mock API routes for authenticated user tests
 */
export async function setupMockApiRoutes(
  page: Page,
  options: {
    tier?: "free" | "pro";
    usage?: Partial<MockUserUsage>;
    subscription?: Partial<MockSubscriptionStatus>;
    queries?: MockQuery[];
  } = {}
): Promise<void> {
  const tier = options.tier ?? "free";
  const baseUsage = tier === "pro" ? DEFAULT_PRO_USAGE : DEFAULT_FREE_USAGE;
  const baseSubscription = tier === "pro" ? DEFAULT_PRO_SUBSCRIPTION : DEFAULT_FREE_SUBSCRIPTION;

  const usage = { ...baseUsage, ...options.usage };
  const subscription = { ...baseSubscription, ...options.subscription };
  const queries = options.queries ?? DEFAULT_QUERIES;

  // Intercept tRPC API calls
  await page.route("**/api/trpc/**", async (route: Route) => {
    const url = route.request().url();

    // Parse the tRPC procedure from the URL
    // URL format: /api/trpc/procedure.name or /api/trpc/procedure.name,procedure.name2
    const procedureMatch = url.match(/\/api\/trpc\/([^?]+)/);
    if (!procedureMatch) {
      await route.continue();
      return;
    }

    const procedures = procedureMatch[1].split(",");

    // Handle batch requests
    if (procedures.length > 1) {
      const results = procedures.map((proc) => getMockResponse(proc, { usage, subscription, queries }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: createTRPCBatchResponse(results),
      });
      return;
    }

    // Handle single requests
    const procedure = procedures[0];
    const response = getMockResponse(procedure, { usage, subscription, queries });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: createTRPCResponse(response),
    });
  });
}

/**
 * Get mock response for a tRPC procedure
 */
function getMockResponse(
  procedure: string,
  data: {
    usage: MockUserUsage;
    subscription: MockSubscriptionStatus;
    queries: MockQuery[];
  }
): unknown {
  switch (procedure) {
    case "user.usage":
      return data.usage;

    case "subscription.status":
      return data.subscription;

    case "user.queries":
      return data.queries;

    case "subscription.createPortal":
      return {
        success: true,
        url: "https://billing.stripe.com/test-portal",
      };

    case "subscription.createCheckout":
      return {
        success: true,
        url: "https://checkout.stripe.com/test-checkout",
      };

    case "search.query":
      return {
        results: [
          {
            id: "protocol-1",
            title: "Cardiac Arrest Protocol",
            content: "Adult cardiac arrest management protocol...",
            agency: "LA County",
            relevanceScore: 0.95,
          },
        ],
        queryId: 123,
      };

    case "protocol.getById":
      return {
        id: "protocol-1",
        title: "Cardiac Arrest Protocol",
        content: "Full protocol content here...",
        agency: { name: "LA County", state: "CA" },
        sections: [],
      };

    case "county.list":
      return [
        { id: 1, name: "Los Angeles County", state: "CA", protocolVersion: "v1.0" },
        { id: 2, name: "Orange County", state: "CA", protocolVersion: "v1.0" },
      ];

    default:
      // Return empty success for unknown procedures
      return { success: true };
  }
}

/**
 * Clear mock API routes
 */
export async function clearMockApiRoutes(page: Page): Promise<void> {
  await page.unroute("**/api/trpc/**");
}

/**
 * Setup mock routes for Stripe checkout success
 */
export async function mockStripeCheckoutSuccess(page: Page): Promise<void> {
  await page.route("**/api/webhooks/stripe**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ received: true }),
    });
  });
}

/**
 * Mock a rate limit response
 */
export async function mockRateLimitExceeded(page: Page): Promise<void> {
  await page.route("**/api/trpc/search.query**", async (route: Route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          message: "Rate limit exceeded",
          code: "TOO_MANY_REQUESTS",
        },
      }),
    });
  });
}
