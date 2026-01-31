/**
 * E2E Auth Fixtures for Playwright
 * Provides authenticated session mocking for E2E tests
 *
 * Usage:
 *   import { test } from './fixtures/auth';
 *   test('protected route test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/profile');
 *     // Now authenticated!
 *   });
 */

import { test as base, Page } from "@playwright/test";

// Test user data that matches Supabase session structure
export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface TestSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
      avatar_url: string | null;
      email: string;
      email_verified: boolean;
    };
    app_metadata: {
      provider: string;
      providers: string[];
    };
    aud: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

// Default test user for authenticated tests
export const TEST_USER: TestUser = {
  id: "e2e-test-user-00000000-0000-0000-0000-000000000001",
  email: "e2e-test@protocolguide.com",
  name: "E2E Test User",
  avatarUrl: null,
};

// Pro tier test user for subscription tests
export const TEST_PRO_USER: TestUser = {
  id: "e2e-test-user-00000000-0000-0000-0000-000000000002",
  email: "e2e-pro@protocolguide.com",
  name: "E2E Pro User",
  avatarUrl: null,
};

/**
 * Create a mock Supabase session for testing
 * Session is valid for 1 hour from creation
 */
export function createMockSession(user: TestUser, tier: "free" | "pro" = "free"): TestSession {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  return {
    access_token: `e2e-mock-access-token-${user.id}-${now}`,
    refresh_token: `e2e-mock-refresh-token-${user.id}-${now}`,
    expires_at: now + expiresIn,
    expires_in: expiresIn,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.name,
        avatar_url: user.avatarUrl,
        email: user.email,
        email_verified: true,
      },
      app_metadata: {
        provider: "google",
        providers: ["google"],
      },
      aud: "authenticated",
      role: "authenticated",
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Create Supabase storage key for the session
 * Matches the format used by @supabase/supabase-js
 */
export function getSupabaseStorageKey(): string {
  // Supabase uses a key like: sb-<project-ref>-auth-token
  // For local dev, this is typically: sb-localhost-auth-token
  // But since we're setting the full key, we need to match what the app expects
  return "sb-auth-token";
}

/**
 * Set E2E test mode flag (call before first navigation)
 * This enables fast auth bypass in the app
 */
export async function setE2ETestMode(page: Page): Promise<void> {
  // Add to localStorage via addInitScript (runs before page JS)
  await page.addInitScript(() => {
    localStorage.setItem("e2e-test-mode", "true");
  });
}

/**
 * Inject authenticated session into browser storage
 * This simulates a logged-in user without requiring OAuth flow
 */
export async function injectAuthSession(
  page: Page,
  user: TestUser = TEST_USER,
  tier: "free" | "pro" = "free"
): Promise<void> {
  const session = createMockSession(user, tier);
  const storageKey = getSupabaseStorageKey();

  // Set up init script to inject auth BEFORE page loads
  // This prevents any loading spinners or auth checks
  await page.addInitScript(
    ({ storageKey, session, user, tier }) => {
      // Set E2E test mode flag
      localStorage.setItem("e2e-test-mode", "true");
      
      // Set Supabase session in localStorage
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          currentSession: session,
          expiresAt: session.expires_at,
        })
      );

      // Also set the project-specific key format that newer Supabase clients use
      // Format: sb-<project-ref>-auth-token
      const projectRef = window.location.hostname.includes("localhost")
        ? "localhost"
        : "protocol-guide";
      localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify({
          currentSession: session,
          expiresAt: session.expires_at,
        })
      );

      // Set a direct user storage for apps that cache user separately
      localStorage.setItem(
        "protocol-guide-user",
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          tier: tier,
        })
      );

      // Set e2e flag to bypass any additional auth checks
      localStorage.setItem("e2e-authenticated", "true");
      localStorage.setItem("e2e-user-tier", tier);
    },
    { storageKey, session, user, tier }
  );

  // Navigate to app - auth is already injected via init script
  await page.goto("/", { waitUntil: "domcontentloaded" });
  
  // Brief wait for React hydration (much shorter than before)
  await page.waitForTimeout(300);
}

/**
 * Clear authenticated session from browser storage
 */
export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear all auth-related storage
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("protocol-guide-user");
    localStorage.removeItem("e2e-authenticated");
    localStorage.removeItem("e2e-user-tier");
    localStorage.removeItem("e2e-test-mode");

    // Clear any project-specific keys
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    });
  });
}

// Extended test fixtures with authentication
type AuthFixtures = {
  /** Page with authenticated free user session */
  authenticatedPage: Page;
  /** Page with authenticated pro user session */
  proUserPage: Page;
  /** Helper to inject auth for any user */
  injectAuth: (page: Page, user?: TestUser, tier?: "free" | "pro") => Promise<void>;
  /** Helper to clear auth session */
  clearAuth: (page: Page) => Promise<void>;
  /** Test user data */
  testUser: TestUser;
  /** Pro test user data */
  proUser: TestUser;
};

/**
 * Extended Playwright test with auth fixtures
 * Use this instead of the default `test` import for authenticated tests
 */
/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<AuthFixtures>({
  // Authenticated page fixture - logs in as free user
  authenticatedPage: async ({ page }, use) => {
    await injectAuthSession(page, TEST_USER, "free");
    await use(page);
    await clearAuthSession(page);
  },

  // Pro user page fixture - logs in as pro user
  proUserPage: async ({ page }, use) => {
    await injectAuthSession(page, TEST_PRO_USER, "pro");
    await use(page);
    await clearAuthSession(page);
  },

  // Helper to manually inject auth
  injectAuth: async ({}, use) => {
    await use(injectAuthSession);
  },

  // Helper to clear auth
  clearAuth: async ({}, use) => {
    await use(clearAuthSession);
  },

  // Test user data
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },

  // Pro user data
  proUser: async ({}, use) => {
    await use(TEST_PRO_USER);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

// Re-export expect for convenience
export { expect } from "@playwright/test";
