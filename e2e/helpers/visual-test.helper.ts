import { Page, expect } from "@playwright/test";

/**
 * Visual Regression Test Helper
 * Provides utilities for consistent visual testing across the app
 * 
 * OPTIMIZED: Reduced default wait times for faster CI runs
 */

export interface VisualTestOptions {
  /**
   * Wait time in ms before taking screenshot (allows animations to complete)
   * @default 500 (reduced from 1000)
   */
  waitBeforeScreenshot?: number;

  /**
   * Whether to mask dynamic content (timestamps, user-specific data, etc.)
   * @default false
   */
  maskDynamicContent?: boolean;

  /**
   * Custom selectors to mask (hide from screenshot)
   */
  maskSelectors?: string[];

  /**
   * Whether to take full page screenshot
   * @default false
   */
  fullPage?: boolean;

  /**
   * Custom threshold for this screenshot (overrides global)
   */
  threshold?: number;

  /**
   * Maximum pixel difference ratio allowed (0.0 - 1.0)
   */
  maxDiffPixelRatio?: number;
}

/**
 * Takes a visual snapshot of the page for regression testing
 * @param page - Playwright Page object
 * @param name - Snapshot name (should be descriptive)
 * @param options - Visual test options
 */
export async function takeVisualSnapshot(
  page: Page,
  name: string,
  options: VisualTestOptions = {}
) {
  const {
    waitBeforeScreenshot = 500, // Reduced from 1000
    maskDynamicContent = false,
    maskSelectors = [],
    fullPage = false,
    threshold,
    maxDiffPixelRatio,
  } = options;

  // Wait for page to stabilize - use domcontentloaded for speed
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(waitBeforeScreenshot);

  // Common dynamic content selectors to mask
  const defaultMaskSelectors = maskDynamicContent
    ? [
        '[data-testid*="timestamp"]',
        '[data-testid*="time"]',
        ".timestamp",
        "time",
        '[data-testid*="user-id"]',
        '[data-testid*="session"]',
        '[data-testid*="loading"]',
        ".loading",
        ".spinner",
        '[data-testid*="animation"]',
      ]
    : [];

  const allMaskSelectors = [...defaultMaskSelectors, ...maskSelectors];

  // Build mask array
  const mask = [];
  for (const selector of allMaskSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      mask.push(elements.nth(i));
    }
  }

  // Take screenshot with comparison
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    mask: mask.length > 0 ? mask : undefined,
    threshold,
    maxDiffPixelRatio,
  });
}

/**
 * Takes a visual snapshot of a specific element
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param name - Snapshot name
 * @param options - Visual test options
 */
export async function takeElementSnapshot(
  page: Page,
  selector: string,
  name: string,
  options: VisualTestOptions = {}
) {
  const {
    waitBeforeScreenshot = 500, // Reduced from 1000
    maskSelectors = [],
    threshold,
    maxDiffPixelRatio,
  } = options;

  // Wait for element and page stability
  await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(waitBeforeScreenshot);

  const element = page.locator(selector).first();

  // Build mask array for child elements
  const mask = [];
  for (const maskSelector of maskSelectors) {
    const elements = element.locator(maskSelector);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      mask.push(elements.nth(i));
    }
  }

  // Take screenshot of element
  await expect(element).toHaveScreenshot(`${name}.png`, {
    mask: mask.length > 0 ? mask : undefined,
    threshold,
    maxDiffPixelRatio,
  });
}

/**
 * Waits for React Native Web to fully render
 * @param page - Playwright Page object
 * @param timeout - Maximum wait time in ms
 */
export async function waitForReactNativeWeb(page: Page, timeout = 5000) {
  // Wait for React Native root to be rendered
  await page.waitForSelector('[data-reactroot], #root', { timeout });

  // Wait for DOM content loaded (faster than networkidle)
  await page.waitForLoadState("domcontentloaded");

  // Minimal wait for React Native Web hydration
  await page.waitForTimeout(300);
}

/**
 * Hides scrollbars for consistent screenshots across OS
 * @param page - Playwright Page object
 */
export async function hideScrollbars(page: Page) {
  await page.addStyleTag({
    content: `
      * {
        scrollbar-width: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
      }
    `,
  });
}

/**
 * Waits for fonts to load before taking screenshot
 * @param page - Playwright Page object
 */
export async function waitForFonts(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Performs common setup for visual tests
 * @param page - Playwright Page object
 */
export async function setupVisualTest(page: Page) {
  await hideScrollbars(page);
  await waitForFonts(page);
  await waitForReactNativeWeb(page);
}
