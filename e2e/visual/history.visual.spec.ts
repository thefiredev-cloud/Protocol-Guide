import { test } from "@playwright/test";
import {
  takeVisualSnapshot,
  setupVisualTest,
} from "../helpers/visual-test.helper";

/**
 * Visual Regression Tests for History Screen
 * Tests the visual appearance of search history
 */

test.describe("History Screen Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/(tabs)/history?e2e=true");
    await setupVisualTest(page);
  });

  test("renders history screen unauthenticated state", async ({ page }) => {
    // History screen shows sign-in prompt when not authenticated
    await takeVisualSnapshot(page, "history-unauthenticated", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders sign in to view history message", async ({ page }) => {
    await page.waitForTimeout(1000);

    await takeVisualSnapshot(page, "history-signin-prompt", {
      maskDynamicContent: true,
    });
  });

  // Note: Authenticated history tests would require auth setup
  test.skip("renders empty history state", async ({ page }) => {
    // Would need authentication
    await takeVisualSnapshot(page, "history-empty", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test.skip("renders history with search items", async ({ page }) => {
    // Would need authentication and search history
    await takeVisualSnapshot(page, "history-with-items", {
      fullPage: true,
      maskDynamicContent: true,
      maskSelectors: [
        '[data-testid="timestamp"]',
        '[data-testid="search-time"]',
        ".timestamp",
      ],
    });
  });

  test.skip("renders history item card", async ({ page }) => {
    // Would need authentication and search history
    await takeVisualSnapshot(page, "history-item-card", {
      maskDynamicContent: true,
      maskSelectors: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe("History Screen Responsive Visual Tests", () => {
  test("renders history on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/(tabs)/history?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "history-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders history on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/(tabs)/history?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "history-tablet-768", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders history on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/(tabs)/history?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "history-desktop-1920", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});
