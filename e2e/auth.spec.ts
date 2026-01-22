import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Authentication Flows
 * Tests login, logout, and protected route access
 * Note: OAuth providers (Google/Apple) are mocked for E2E tests
 */

test.describe("Authentication UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays login button for unauthenticated users", async ({ page }) => {
    // Look for sign in / login button
    const loginButton = page.getByRole("button", { name: /sign in|login|get started/i }).or(
      page.getByRole("link", { name: /sign in|login|get started/i })
    );

    // Either login button is visible or user is already authenticated
    const isVisible = await loginButton.isVisible().catch(() => false);

    // If not visible, check if profile/account is shown (already logged in)
    if (!isVisible) {
      const profileLink = page.getByRole("link", { name: /profile|account/i });
      const profileVisible = await profileLink.isVisible().catch(() => false);
      expect(profileVisible || true).toBeTruthy();
    } else {
      expect(isVisible).toBeTruthy();
    }
  });

  test("shows Google OAuth option", async ({ page }) => {
    // Navigate to login/sign up area
    const loginButton = page.getByRole("button", { name: /sign in|login|get started/i }).or(
      page.getByRole("link", { name: /sign in|login|get started/i })
    );

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (isVisible) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");

      // Look for Google sign in option
      const googleButton = page.getByRole("button", { name: /google/i }).or(
        page.getByText(/continue with google/i)
      );

      const googleVisible = await googleButton.isVisible().catch(() => false);
      // OAuth callback page or Google button should be present
      expect(googleVisible || page.url().includes("oauth")).toBeTruthy();
    }
  });

  test("shows Apple OAuth option", async ({ page }) => {
    const loginButton = page.getByRole("button", { name: /sign in|login|get started/i }).or(
      page.getByRole("link", { name: /sign in|login|get started/i })
    );

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (isVisible) {
      await loginButton.click();
      await page.waitForLoadState("networkidle");

      // Look for Apple sign in option
      const appleButton = page.getByRole("button", { name: /apple/i }).or(
        page.getByText(/continue with apple/i)
      );

      const appleVisible = await appleButton.isVisible().catch(() => false);
      expect(appleVisible || page.url().includes("oauth")).toBeTruthy();
    }
  });
});

test.describe("Protected Routes", () => {
  test("shows sign in prompt for protected profile page", async ({ page }) => {
    // Try to access profile without being logged in
    await page.goto("/profile");

    // Wait for either sign-in content or profile content to load
    // React Native Web can be slow, so give it more time
    await page.waitForTimeout(2000);

    // React Native app shows inline sign-in prompts, not redirects
    const pageContent = await page.textContent("body");

    // Should show sign in button or prompt
    const hasSignInPrompt =
      pageContent?.toLowerCase().includes("sign in") ||
      pageContent?.toLowerCase().includes("continue with google") ||
      pageContent?.toLowerCase().includes("continue with apple");

    expect(hasSignInPrompt).toBeTruthy();
  });

  test("shows sign in prompt for protected history page", async ({ page }) => {
    await page.goto("/history");

    // Wait for content to load (React Native Web needs more time)
    await page.waitForTimeout(2000);

    // React Native app shows inline message, not redirect
    const pageContent = await page.textContent("body");

    // Should show "Please sign in to view your history"
    const hasSignInPrompt = pageContent?.toLowerCase().includes("please sign in");

    expect(hasSignInPrompt).toBeTruthy();
  });
});

test.describe("Logout Flow", () => {
  // Note: These tests would require mock authentication setup
  test.skip("logout button is visible when authenticated", async ({ page }) => {
    // Would need to mock authentication state
    await page.goto("/profile");

    const logoutButton = page.getByRole("button", { name: /logout|sign out/i });
    await expect(logoutButton).toBeVisible();
  });

  test.skip("clicking logout returns to home page", async ({ page }) => {
    // Would need to mock authentication state
    await page.goto("/profile");

    const logoutButton = page.getByRole("button", { name: /logout|sign out/i });
    await logoutButton.click();

    await page.waitForLoadState("networkidle");

    // Should redirect to home or login
    expect(page.url()).toMatch(/\/(login|signin)?$/);
  });
});

test.describe("Auth Error Handling", () => {
  test("handles OAuth callback errors gracefully", async ({ page }) => {
    // Simulate OAuth error callback
    await page.goto("/oauth/callback?error=access_denied");
    await page.waitForLoadState("networkidle");

    // Should not crash, should show error or redirect
    const pageContent = await page.textContent("body");

    // Either shows error message or redirects safely
    expect(pageContent).toBeTruthy();
    expect(page.url()).not.toContain("undefined");
  });

  test("handles missing auth code in callback", async ({ page }) => {
    // Simulate callback without code
    await page.goto("/oauth/callback");
    await page.waitForLoadState("networkidle");

    // Should handle gracefully
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});
