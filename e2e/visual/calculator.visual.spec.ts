import { test } from "@playwright/test";
import {
  takeVisualSnapshot,
  setupVisualTest,
} from "../helpers/visual-test.helper";

/**
 * Visual Regression Tests for Calculator Screen
 * Tests the visual appearance of medical calculators
 */

test.describe("Calculator Screen Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/(tabs)/calculator?e2e=true");
    await setupVisualTest(page);
  });

  test("renders calculator screen initial state", async ({ page }) => {
    await takeVisualSnapshot(page, "calculator-initial-state", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders calculator list view", async ({ page }) => {
    await page.waitForTimeout(1000);

    await takeVisualSnapshot(page, "calculator-list-view", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders calculator with inputs", async ({ page }) => {
    // Look for input fields
    const inputs = page.locator('input[type="number"], input[type="text"]');
    const count = await inputs.count();

    if (count > 0) {
      // Fill some sample values
      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i);
        const isVisible = await input.isVisible().catch(() => false);
        if (isVisible) {
          await input.fill("50");
        }
      }

      await page.waitForTimeout(500);

      await takeVisualSnapshot(page, "calculator-with-inputs", {
        maskDynamicContent: true,
      });
    }
  });

  test("renders calculator results display", async ({ page }) => {
    // Look for calculate button
    const calculateButton = page
      .getByRole("button", { name: /calculate/i })
      .or(page.locator('[data-testid="calculate-button"]'));

    const isVisible = await calculateButton.isVisible().catch(() => false);

    if (isVisible) {
      // Fill inputs first
      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i);
        const inputVisible = await input.isVisible().catch(() => false);
        if (inputVisible) {
          await input.fill("70");
        }
      }

      await calculateButton.click();
      await page.waitForTimeout(1000);

      await takeVisualSnapshot(page, "calculator-results", {
        maskDynamicContent: true,
      });
    }
  });
});

test.describe("Calculator Screen Responsive Visual Tests", () => {
  test("renders calculator on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/(tabs)/calculator?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "calculator-mobile-375", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders calculator on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/(tabs)/calculator?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "calculator-tablet-768", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });

  test("renders calculator on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/(tabs)/calculator?e2e=true");
    await setupVisualTest(page);

    await takeVisualSnapshot(page, "calculator-desktop-1920", {
      fullPage: true,
      maskDynamicContent: true,
    });
  });
});
