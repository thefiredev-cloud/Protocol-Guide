import { test } from "@playwright/test";
import {
  takeVisualSnapshot,
  setupVisualTest,
} from "../helpers/visual-test.helper";

/**
 * Visual Regression Tests for Authentication Screens
 * Tests the visual appearance of login/signup flows
 */

test.describe("Auth Screen Visual Tests", () => {
  test("renders landing page with auth options", async ({ page }) => {
    await page.goto("/");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-landing-page", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders login button", async ({ page }) => {
    await page.goto("/");
    await setupVisualTest(page);

    const loginButton = page
      .getByRole("button", { name: /sign in|login|get started/i })
      .or(page.getByRole("link", { name: /sign in|login|get started/i }));

    const isVisible = await loginButton.isVisible().catch(() => false);

    if (isVisible) {
      await takeVisualSnapshot(page, "auth-login-button", {
        maskDynamicContent: true,
      });
    }
  });

  test("renders login screen", async ({ page }) => {
    await page.goto("/login");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-login-screen", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders OAuth provider buttons on login", async ({ page }) => {
    await page.goto("/login");
    await setupVisualTest(page);

    // Wait for OAuth buttons to render
    await page.waitForTimeout(1000);

    await takeVisualSnapshot(page, "auth-oauth-providers", {
      maskDynamicContent: true,
    });
  });

  test("renders Google OAuth button", async ({ page }) => {
    await page.goto("/login");
    await setupVisualTest(page);

    const googleButton = page
      .getByRole("button", { name: /google/i })
      .or(page.getByText(/continue with google/i));

    const isVisible = await googleButton.isVisible().catch(() => false);

    if (isVisible) {
      await takeVisualSnapshot(page, "auth-google-button", {
        maskDynamicContent: true,
      });
    }
  });

  test("renders Apple OAuth button", async ({ page }) => {
    await page.goto("/login");
    await setupVisualTest(page);

    const appleButton = page
      .getByRole("button", { name: /apple/i })
      .or(page.getByText(/continue with apple/i));

    const isVisible = await appleButton.isVisible().catch(() => false);

    if (isVisible) {
      await takeVisualSnapshot(page, "auth-apple-button", {
        maskDynamicContent: true,
      });
    }
  });

  test("renders OAuth callback error state", async ({ page }) => {
    await page.goto("/oauth/callback?error=access_denied");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-oauth-error", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});

test.describe("Auth Screen Responsive Visual Tests", () => {
  test("renders login on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-login-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders login on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/login");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-login-tablet-768", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders login on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/login");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-login-desktop-1920", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders landing page on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "auth-landing-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});
