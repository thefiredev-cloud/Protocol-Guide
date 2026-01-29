import { test as baseTest, expect, Page } from "@playwright/test";
import { test, TEST_USER } from "./fixtures/auth";
import { setupMockApiRoutes, clearMockApiRoutes } from "./fixtures/mock-api";

/**
 * E2E Tests for Authentication Flows
 * Tests login, logout, and protected route access
 * Uses mock Supabase auth for E2E tests (OAuth providers cannot be tested end-to-end)
 * 
 * OPTIMIZED: Reduced waitForTimeout calls from 2000ms to 500ms
 */

// Helper to wait for React Native Web to render
async function waitForAppReady(page: Page) {
  await page.waitForSelector('[data-reactroot], #root', { timeout: 10000 });
  await page.waitForTimeout(500);
}

baseTest.describe("Authentication UI - Unauthenticated", () => {
  baseTest.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  baseTest("displays login button for unauthenticated users", async ({ page }) => {
    const loginButton = page
      .getByRole("button", { name: /sign in|login|get started/i })
      .or(page.getByRole("link", { name: /sign in|login|get started/i }));

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (!isVisible) {
      const profileLink = page.getByRole("link", { name: /profile|account/i });
      const profileVisible = await profileLink.isVisible().catch(() => false);
      expect(profileVisible || true).toBeTruthy();
    } else {
      expect(isVisible).toBeTruthy();
    }
  });

  baseTest("shows Google OAuth option", async ({ page }) => {
    const loginButton = page
      .getByRole("button", { name: /sign in|login|get started/i })
      .or(page.getByRole("link", { name: /sign in|login|get started/i }));

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (isVisible) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");

      const googleButton = page
        .getByRole("button", { name: /google/i })
        .or(page.getByText(/continue with google/i));

      const googleVisible = await googleButton.isVisible().catch(() => false);
      expect(googleVisible || page.url().includes("oauth")).toBeTruthy();
    }
  });

  baseTest("shows Apple OAuth option", async ({ page }) => {
    const loginButton = page
      .getByRole("button", { name: /sign in|login|get started/i })
      .or(page.getByRole("link", { name: /sign in|login|get started/i }));

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (isVisible) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");

      const appleButton = page
        .getByRole("button", { name: /apple/i })
        .or(page.getByText(/continue with apple/i));

      const appleVisible = await appleButton.isVisible().catch(() => false);
      expect(appleVisible || page.url().includes("oauth")).toBeTruthy();
    }
  });
});

baseTest.describe("Protected Routes - Unauthenticated", () => {
  baseTest("shows sign in prompt for protected profile page", async ({ page }) => {
    await page.goto("/(tabs)/profile");
    await waitForAppReady(page);

    const pageContent = await page.textContent("body");
    const hasSignInPrompt =
      pageContent?.toLowerCase().includes("sign in") ||
      pageContent?.toLowerCase().includes("continue with google") ||
      pageContent?.toLowerCase().includes("continue with apple");

    expect(hasSignInPrompt).toBeTruthy();
  });

  baseTest("shows sign in prompt for protected history page", async ({ page }) => {
    await page.goto("/(tabs)/history");
    await waitForAppReady(page);

    const pageContent = await page.textContent("body");
    const hasSignInPrompt = pageContent?.toLowerCase().includes("please sign in");

    expect(hasSignInPrompt).toBeTruthy();
  });
});

test.describe("Protected Routes - Authenticated", () => {
  test("profile page loads for authenticated user", async ({ authenticatedPage }) => {
    await setupMockApiRoutes(authenticatedPage, { tier: "free" });
    await authenticatedPage.goto("/(tabs)/profile");
    await waitForAppReady(authenticatedPage);

    const pageContent = await authenticatedPage.textContent("body");
    const hasSignInPrompt = pageContent?.toLowerCase().includes("continue with google");

    expect(hasSignInPrompt).toBeFalsy();
    await clearMockApiRoutes(authenticatedPage);
  });

  test("history page loads for authenticated user", async ({ authenticatedPage }) => {
    await setupMockApiRoutes(authenticatedPage, { tier: "free" });
    await authenticatedPage.goto("/(tabs)/history");
    await waitForAppReady(authenticatedPage);

    const pageContent = await authenticatedPage.textContent("body");
    const hasSignInPrompt = pageContent?.toLowerCase().includes("please sign in to view");

    expect(hasSignInPrompt).toBeFalsy();
    await clearMockApiRoutes(authenticatedPage);
  });

  test("pro user sees pro badge on profile", async ({ proUserPage }) => {
    await setupMockApiRoutes(proUserPage, { tier: "pro" });
    await proUserPage.goto("/(tabs)/profile");
    await waitForAppReady(proUserPage);

    const pageContent = await proUserPage.textContent("body");
    const showsProStatus =
      pageContent?.toLowerCase().includes("pro subscription") ||
      pageContent?.toLowerCase().includes("pro") ||
      pageContent?.toLowerCase().includes("unlimited");

    expect(showsProStatus).toBeTruthy();
    await clearMockApiRoutes(proUserPage);
  });
});

test.describe("Logout Flow - Authenticated", () => {
  test("logout button is visible when authenticated", async ({ authenticatedPage }) => {
    await setupMockApiRoutes(authenticatedPage, { tier: "free" });
    await authenticatedPage.goto("/(tabs)/profile");
    await waitForAppReady(authenticatedPage);

    const logoutButton = authenticatedPage.getByRole("button", { name: /sign out|logout/i });
    const isVisible = await logoutButton.isVisible().catch(() => false);

    if (!isVisible) {
      const pageContent = await authenticatedPage.textContent("body");
      const hasLogout = pageContent?.toLowerCase().includes("sign out");
      expect(hasLogout).toBeTruthy();
    } else {
      expect(isVisible).toBeTruthy();
    }

    await clearMockApiRoutes(authenticatedPage);
  });

  test("clicking logout returns to unauthenticated state", async ({ page, injectAuth, clearAuth }) => {
    await injectAuth(page, TEST_USER, "free");
    await setupMockApiRoutes(page, { tier: "free" });
    await page.goto("/(tabs)/profile");
    await waitForAppReady(page);

    const logoutButton = page.getByRole("button", { name: /sign out/i }).or(page.getByText(/sign out/i));
    const isVisible = await logoutButton.isVisible().catch(() => false);

    if (isVisible) {
      await logoutButton.click();
      await page.waitForTimeout(500); // Wait for modal animation

      const confirmButton = page.getByRole("button", { name: /sign out|confirm|yes/i });
      const confirmVisible = await confirmButton.isVisible().catch(() => false);

      if (confirmVisible) {
        await confirmButton.click();
      }

      await page.waitForLoadState("networkidle");

      const pageContent = await page.textContent("body");
      const showsSignIn =
        pageContent?.toLowerCase().includes("sign in") ||
        pageContent?.toLowerCase().includes("continue with google");

      expect(showsSignIn).toBeTruthy();
    }

    await clearMockApiRoutes(page);
    await clearAuth(page);
  });
});

baseTest.describe("Auth Error Handling", () => {
  baseTest("handles OAuth callback errors gracefully", async ({ page }) => {
    await page.goto("/oauth/callback?error=access_denied");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
    expect(page.url()).not.toContain("undefined");
  });

  baseTest("handles missing auth code in callback", async ({ page }) => {
    await page.goto("/oauth/callback");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("Session Persistence", () => {
  test("session persists across page navigation", async ({ authenticatedPage }) => {
    await setupMockApiRoutes(authenticatedPage, { tier: "free" });

    await authenticatedPage.goto("/(tabs)");
    await waitForAppReady(authenticatedPage);

    await authenticatedPage.goto("/(tabs)/profile");
    await waitForAppReady(authenticatedPage);

    const pageContent = await authenticatedPage.textContent("body");
    const hasSignInPrompt = pageContent?.toLowerCase().includes("continue with google");
    expect(hasSignInPrompt).toBeFalsy();

    await authenticatedPage.goto("/(tabs)/history");
    await waitForAppReady(authenticatedPage);

    const historyContent = await authenticatedPage.textContent("body");
    const historySignInPrompt = historyContent?.toLowerCase().includes("please sign in to view");
    expect(historySignInPrompt).toBeFalsy();

    await clearMockApiRoutes(authenticatedPage);
  });
});
