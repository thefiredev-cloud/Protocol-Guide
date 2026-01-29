import { test, expect, Page } from "@playwright/test";
import {
  takeVisualSnapshot,
  takeElementSnapshot,
  setupVisualTest,
} from "../helpers/visual-test.helper";

/**
 * Visual Regression Tests for Search Screen
 * Tests the visual appearance of the search interface and results
 * 
 * OPTIMIZED: Reduced wait times from 2000ms to 500ms
 */

// Helper to get search input
function getSearchInput(page: Page) {
  return page
    .locator('[data-testid="search-input"]')
    .or(page.locator('input[placeholder*="protocol"]'))
    .first();
}

test.describe("Search Screen Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/(tabs)/?e2e=true");
    await setupVisualTest(page);
  });

  test("renders search screen initial state", async ({ page }) => {
    await takeVisualSnapshot(page, "search-initial-state", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search input focused state", async ({ page }) => {
    const searchInput = getSearchInput(page);
    await searchInput.focus();
    await page.waitForTimeout(300); // Short wait for focus animation

    await takeVisualSnapshot(page, "search-input-focused", {
      maskDynamicContent: true,
    });
  });

  test("renders search results for cardiac arrest", async ({ page }) => {
    const searchInput = getSearchInput(page);
    await searchInput.fill("cardiac arrest");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Wait for results to render

    await takeVisualSnapshot(page, "search-results-cardiac", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search results for chest pain", async ({ page }) => {
    const searchInput = getSearchInput(page);
    await searchInput.fill("chest pain");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, "search-results-chest-pain", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders empty search results state", async ({ page }) => {
    const searchInput = getSearchInput(page);
    await searchInput.fill("xyzzy12345nonsensequery");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, "search-results-empty", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search result card component", async ({ page }) => {
    const searchInput = getSearchInput(page);
    await searchInput.fill("stroke");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const resultCard = page
      .locator('[data-testid="protocol-result"]')
      .or(page.locator(".protocol-card, .result-card, .search-result"))
      .first();

    const isVisible = await resultCard.isVisible().catch(() => false);
    if (isVisible) {
      await takeElementSnapshot(
        page,
        '[data-testid="protocol-result"], .protocol-card, .result-card',
        "search-result-card",
        { maskDynamicContent: true }
      );
    }
  });
});

test.describe("Search Screen Responsive Visual Tests", () => {
  test("renders search on mobile viewport (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/(tabs)/?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "search-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search on tablet viewport (768x1024)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/(tabs)/?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "search-tablet-768", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search on desktop viewport (1920x1080)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/(tabs)/?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "search-desktop-1920", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders search results on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/(tabs)/?e2e=true");
    await setupVisualTest(page);

    const searchInput = getSearchInput(page);
    await searchInput.fill("trauma");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, "search-results-mobile", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});
