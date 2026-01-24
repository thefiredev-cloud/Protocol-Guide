import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for Protocol Guide
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8081",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Video recording
    video: "retain-on-failure",
  },

  // Configure projects for major browsers
  projects: [
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

    // Mobile viewports
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },

    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: "pnpm dev:metro",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global timeout for each test
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
    // Visual regression testing configuration
    toHaveScreenshot: {
      // Maximum allowed pixel difference (0.0 - 1.0)
      // 0.2% allows for minor anti-aliasing and font rendering differences
      maxDiffPixelRatio: 0.002,
      // Maximum number of pixels that can differ
      maxDiffPixels: 100,
      // Threshold for individual pixel color difference (0-1)
      threshold: 0.2,
      // Animations: wait for animations to finish
      animations: "disabled",
      // CSS animations and transitions
      scale: "css",
    },
  },

  // Snapshot path template for visual regression tests
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{-projectName}{-snapshotSuffix}{ext}",

  // Update snapshots with --update-snapshots flag
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === "true" ? "all" : "missing",
});
