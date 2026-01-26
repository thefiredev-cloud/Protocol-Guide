/**
 * Protocol Guide Performance Benchmarks - App Startup
 *
 * Measures:
 * - Module import times
 * - Provider initialization
 * - Database connection establishment
 * - Service worker registration (web)
 *
 * NOTE: These benchmarks require a real database and properly configured
 * environment. They are skipped in CI/test environments without real infrastructure.
 */

import { describe, it, expect, beforeAll } from "vitest";

// Try to load real env, but don't fail if not available
try {
  await import("../../scripts/load-env.js");
} catch {
  // Ignore - will check if env is available
}

// Check if we have real environment configured
const hasRealEnv = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost:5432/test_db") &&
  process.env.ANTHROPIC_API_KEY &&
  !process.env.ANTHROPIC_API_KEY.includes("test-placeholder")
);

// Skip all benchmarks if we don't have real environment
const describeOrSkip = hasRealEnv ? describe : describe.skip;

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  MODULE_IMPORT: 500,
  DB_CONNECTION: 1000,
  TRPC_INIT: 200,
  TOTAL_COLD_START: 2000,
  TOTAL_WARM_START: 500,
};

interface StartupMetrics {
  moduleImport: number;
  dbConnection: number;
  trpcInit: number;
  total: number;
}

async function measureModuleImport(modulePath: string): Promise<number> {
  const start = performance.now();
  await import(modulePath);
  return performance.now() - start;
}

describeOrSkip("App Startup Performance", () => {
  describe("Module Import Times", () => {
    it("server/db module loads within threshold", async () => {
      const duration = await measureModuleImport("../../server/db");
      console.log(`server/db import: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.MODULE_IMPORT);
    }, 10000);

    it("server/_core/embeddings module loads within threshold", async () => {
      const duration = await measureModuleImport("../../server/_core/embeddings");
      console.log(`embeddings import: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.MODULE_IMPORT);
    }, 10000);

    it("server/routers module loads within threshold", async () => {
      const duration = await measureModuleImport("../../server/routers");
      console.log(`routers import: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.MODULE_IMPORT);
    }, 10000);
  });

  describe("Database Connection", () => {
    it("establishes MySQL connection within threshold", async () => {
      const start = performance.now();

      // Import and test DB connection
      const { getDb } = await import("../../server/db");
      const db = await getDb();

      const duration = performance.now() - start;
      console.log(`MySQL connection: ${duration.toFixed(0)}ms`);

      expect(db).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.DB_CONNECTION);
    }, 15000);

    it("Supabase client initializes within threshold", async () => {
      const start = performance.now();

      const { getSupabaseClient } = await import("../../server/_core/embeddings");
      const supabase = getSupabaseClient();

      const duration = performance.now() - start;
      console.log(`Supabase init: ${duration.toFixed(0)}ms`);

      expect(supabase).toBeDefined();
      expect(duration).toBeLessThan(THRESHOLDS.TRPC_INIT);
    }, 10000);
  });

  describe("Cold Start Simulation", () => {
    it("full server initialization within cold start threshold", async () => {
      const metrics: Partial<StartupMetrics> = {};
      const totalStart = performance.now();

      // 1. Module imports
      const importStart = performance.now();
      const [dbModule, embeddingsModule, routersModule] = await Promise.all([
        import("../../server/db"),
        import("../../server/_core/embeddings"),
        import("../../server/routers"),
      ]);
      metrics.moduleImport = performance.now() - importStart;

      // 2. Database connection
      const dbStart = performance.now();
      await dbModule.getDb();
      metrics.dbConnection = performance.now() - dbStart;

      // 3. tRPC router availability
      const trpcStart = performance.now();
      expect(routersModule.appRouter).toBeDefined();
      metrics.trpcInit = performance.now() - trpcStart;

      metrics.total = performance.now() - totalStart;

      console.log("\n=== COLD START METRICS ===");
      console.log(`  Module imports: ${metrics.moduleImport?.toFixed(0)}ms`);
      console.log(`  DB connection:  ${metrics.dbConnection?.toFixed(0)}ms`);
      console.log(`  tRPC init:      ${metrics.trpcInit?.toFixed(0)}ms`);
      console.log(`  TOTAL:          ${metrics.total?.toFixed(0)}ms`);
      console.log(`  Threshold:      ${THRESHOLDS.TOTAL_COLD_START}ms`);
      console.log(`  Status:         ${(metrics.total || 0) < THRESHOLDS.TOTAL_COLD_START ? "PASS" : "FAIL"}`);

      expect(metrics.total).toBeLessThan(THRESHOLDS.TOTAL_COLD_START);
    }, 30000);
  });

  describe("Warm Start Simulation", () => {
    beforeAll(async () => {
      // Pre-warm modules
      await import("../../server/db");
      await import("../../server/_core/embeddings");
      await import("../../server/routers");
    });

    it("re-import is near-instant (cached)", async () => {
      const samples: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await import("../../server/db");
        await import("../../server/_core/embeddings");
        await import("../../server/routers");
        samples.push(performance.now() - start);
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      console.log(`Warm start (cached modules): Avg=${avg.toFixed(2)}ms`);

      expect(avg).toBeLessThan(THRESHOLDS.TOTAL_WARM_START);
    }, 10000);
  });
});

describeOrSkip("Initialization Dependency Chain", () => {
  it("maps startup dependency order", async () => {
    const timeline: { step: string; duration: number; cumulative: number }[] = [];
    let cumulative = 0;

    const steps = [
      { name: "Environment variables", fn: async () => await import("../../scripts/load-env.js") },
      { name: "Database module", fn: async () => await import("../../server/db") },
      { name: "Embeddings module", fn: async () => await import("../../server/_core/embeddings") },
      { name: "Routers module", fn: async () => await import("../../server/routers") },
    ];

    for (const step of steps) {
      const start = performance.now();
      await step.fn();
      const duration = performance.now() - start;
      cumulative += duration;
      timeline.push({ step: step.name, duration, cumulative });
    }

    console.log("\n=== STARTUP DEPENDENCY CHAIN ===");
    timeline.forEach((t) => {
      console.log(`  ${t.step.padEnd(25)} ${t.duration.toFixed(0).padStart(6)}ms  (cumulative: ${t.cumulative.toFixed(0)}ms)`);
    });

    // Total should be within cold start threshold
    expect(cumulative).toBeLessThan(THRESHOLDS.TOTAL_COLD_START);
  }, 30000);
});

describeOrSkip("Memory Usage During Startup", () => {
  it("estimates heap usage after initialization", async () => {
    // Note: This is a rough estimate - actual heap measurement requires native tools
    const initialHeap = process.memoryUsage().heapUsed;

    // Load all modules
    await import("../../server/db");
    await import("../../server/_core/embeddings");
    await import("../../server/routers");

    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowth = finalHeap - initialHeap;
    const heapGrowthMB = heapGrowth / (1024 * 1024);

    const memUsage = process.memoryUsage();
    console.log("\n=== MEMORY USAGE AFTER STARTUP ===");
    console.log(`  Heap Used:     ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total:    ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  RSS:           ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Growth:   ${heapGrowthMB.toFixed(2)} MB`);

    // Server-side heap should stay reasonable
    expect(memUsage.heapUsed / 1024 / 1024).toBeLessThan(500); // 500 MB threshold
  }, 30000);
});
