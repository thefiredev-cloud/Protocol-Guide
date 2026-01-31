import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for Protocol Guide
 * @see https://playwright.dev/docs/test-configuration
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Reduced global test timeout from 30s to 20s for faster feedback
 * 2. Added action/navigation timeouts to catch slow pages early
 * 3. Configured parallel execution for non-CI environments
 * 4. Skip server startup when E2E_SKIP_SERVER or E2E_BASE_URL is set
 */

// Default port for E2E tests (avoid shell variable issues on Windows)
const E2E_PORT = parseInt(process.env.EXPO_PORT || "8081", 10);
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${E2E_PORT}`;

export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (2 retries)
  retries: process.env.CI ? 2 : 0,

  // Workers configuration - parallel locally, sequential in CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI 
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Video recording
    video: "retain-on-failure",

    // Navigation timeout - fail fast if page doesn't load
    navigationTimeout: 15000,

    // Action timeout - fail fast if action doesn't complete
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: process.env.E2E_ALL_BROWSERS ? [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ] : [
    // Default: chromium only for faster test runs
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run local dev server before starting tests
  // Skip if E2E_SKIP_SERVER is set or E2E_BASE_URL points to external server
  webServer: (process.env.E2E_SKIP_SERVER || process.env.E2E_BASE_URL) ? undefined : {
    command: process.platform === "win32" 
      ? `npx cross-env EXPO_USE_METRO_WORKSPACE_ROOT=1 EXPO_PORT=${E2E_PORT} npx expo start --web --port ${E2E_PORT}`
      : `pnpm dev:metro`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },

  // Global timeout for each test - reduced from 30s to 20s for faster feedback
  timeout: 20 * 1000,

  // Expect timeout - reduced from 10s to 8s
  expect: {
    timeout: 8 * 1000,
    // Visual regression testing configuration
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: "disabled",
      scale: "css",
    },
  },

  // Snapshot path template for visual regression tests
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{-projectName}{-snapshotSuffix}{ext}",

  // Update snapshots with --update-snapshots flag
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === "true" ? "all" : "missing",
});
