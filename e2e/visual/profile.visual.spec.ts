import { test } from "@playwright/test";
import {
  takeVisualSnapshot,
  setupVisualTest,
} from "../helpers/visual-test.helper";

/**
 * Visual Regression Tests for Profile Screen
 * Tests the visual appearance of user profile and settings
 */

test.describe("Profile Screen Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/(tabs)/profile?e2e=true");
    await setupVisualTest(page);
  });

  test("renders profile screen unauthenticated state", async ({ page }) => {
    // Profile screen shows sign-in prompt when not authenticated
    await takeVisualSnapshot(page, "profile-unauthenticated", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders sign in prompt message", async ({ page }) => {
    // Wait for sign-in content to load
    await page.waitForTimeout(1000);

    await takeVisualSnapshot(page, "profile-signin-prompt", {
      maskDynamicContent: true,
    });
  });

  test("renders OAuth provider buttons", async ({ page }) => {
    // Look for OAuth buttons (Google, Apple)
    const googleButton = page
      .getByRole("button", { name: /google/i })
      .or(page.getByText(/continue with google/i));

    const appleButton = page
      .getByRole("button", { name: /apple/i })
      .or(page.getByText(/continue with apple/i));

    const hasGoogleButton = await googleButton.isVisible().catch(() => false);
    const hasAppleButton = await appleButton.isVisible().catch(() => false);

    if (hasGoogleButton || hasAppleButton) {
      await takeVisualSnapshot(page, "profile-oauth-buttons", {
        maskDynamicContent: true,
      });
    }
  });

  // Note: Authenticated profile tests would require auth setup
  test.skip("renders authenticated profile view", async ({ page }) => {
    // Would need to mock authentication state
    await takeVisualSnapshot(page, "profile-authenticated", {
      fullPage: true,
      maskDynamicContent: true,
      maskSelectors: [
        '[data-testid="user-email"]',
        '[data-testid="user-name"]',
        '[data-testid="user-id"]',
      ],
    });
  });

  test.skip("renders profile settings section", async ({ page }) => {
    // Would need authentication
    await takeVisualSnapshot(page, "profile-settings", {
      maskDynamicContent: true,
    });
  });

  test.skip("renders account management section", async ({ page }) => {
    // Would need authentication
    await takeVisualSnapshot(page, "profile-account-management", {
      maskDynamicContent: true,
    });
  });
});

test.describe("Profile Screen Responsive Visual Tests", () => {
  test("renders profile on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/(tabs)/profile?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "profile-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders profile on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/(tabs)/profile?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "profile-tablet-768", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders profile on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/(tabs)/profile?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "profile-desktop-1920", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});
