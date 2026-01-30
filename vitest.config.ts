import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Environment setup
    environment: "node",
    globals: true,

    // Include test files
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],

    // Exclude node_modules and e2e tests (run separately with Playwright)
    exclude: ["node_modules", "e2e/**"],

    // Integration tests run sequentially to avoid database conflicts
    // Unit tests can run in parallel
    sequence: {
      concurrent: true,
    },

    // Setup files to run before tests
    setupFiles: ["./tests/setup.ts"],

    // Test timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "server/**/*.ts",
        "lib/**/*.ts",
        "hooks/**/*.ts",
        "components/**/*.tsx",
      ],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/drizzle/**",
      ],
      thresholds: {
        // Critical paths should have higher coverage
        // TODO: Increase stripe.ts threshold back to 80% after adding more tests
        "server/stripe.ts": {
          statements: 60,
          branches: 60,
          functions: 60,
          lines: 60,
        },
        "server/routers.ts": {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },

    // Path aliases
    alias: {
      "@": path.resolve(__dirname, "."),
    },

    // Reporter configuration
    reporters: ["verbose"],

    // Pool configuration for parallel testing
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for database tests
      },
    },
  },
});
