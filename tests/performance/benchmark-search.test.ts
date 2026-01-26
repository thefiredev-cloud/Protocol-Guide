/**
 * Protocol Guide Performance Benchmarks - Search Latency
 *
 * Target: 2.3 seconds retrieval time (from landing page claim)
 *
 * Metrics measured:
 * - Semantic search P50/P95/P99 latency
 * - Embedding generation time (Voyage AI)
 * - pgvector query time (Supabase)
 * - Cache hit vs miss performance
 *
 * NOTE: These benchmarks require a real database and API keys.
 * Skipped in CI/test environments without real infrastructure.
 */

import { describe, it, expect, beforeAll, afterAll, bench } from "vitest";

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
  process.env.VOYAGE_API_KEY &&
  !process.env.VOYAGE_API_KEY.includes("test-voyage")
);

// Dynamic imports for when tests run
let semanticSearchProtocols: typeof import("../../server/_core/embeddings").semanticSearchProtocols;
let generateEmbedding: typeof import("../../server/_core/embeddings").generateEmbedding;
let embeddingCache: typeof import("../../server/_core/embeddings").embeddingCache;
let getProtocolStats: typeof import("../../server/db").getProtocolStats;

if (hasRealEnv) {
  const embeddings = await import("../../server/_core/embeddings");
  const db = await import("../../server/db");
  semanticSearchProtocols = embeddings.semanticSearchProtocols;
  generateEmbedding = embeddings.generateEmbedding;
  embeddingCache = embeddings.embeddingCache;
  getProtocolStats = db.getProtocolStats;
}

// Skip all benchmarks if we don't have real environment
const describeOrSkip = hasRealEnv ? describe : describe.skip;

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  // Target: 2.3s = 2300ms for end-to-end retrieval
  E2E_TARGET: 2300,
  E2E_WARNING: 3000,
  E2E_CRITICAL: 4000,

  // Component-level targets
  EMBEDDING_GENERATION: 500, // Voyage API call
  EMBEDDING_CACHED: 5, // LRU cache hit
  PGVECTOR_SEARCH: 200, // Supabase pgvector
  TOTAL_SEARCH_P95: 1000, // Backend search
};

// Test queries representing real EMS scenarios
const TEST_QUERIES = {
  simple: ["cardiac arrest", "stroke", "seizure", "asthma"],
  complex: [
    "what do I do for a patient having a heart attack",
    "pediatric respiratory distress management",
    "anaphylaxis treatment epinephrine dosing",
    "diabetic emergency hypoglycemia protocol",
  ],
  protocolNumbers: ["Ref 502", "protocol 814", "policy 510"],
};

// Performance measurement utilities
interface PerformanceMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  samples: number[];
}

function calculateMetrics(samples: number[]): PerformanceMetrics {
  if (samples.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, samples: [] };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    samples: sorted,
  };
}

async function measureExecution<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

describeOrSkip("Search Performance Benchmarks", () => {
  let dbStats: { totalProtocols: number; totalCounties: number } | null = null;

  beforeAll(async () => {
    // Verify database connection and get baseline stats
    dbStats = await getProtocolStats();
    console.log("\n=== Protocol Guide Performance Benchmarks ===");
    console.log(`Database: ${dbStats?.totalProtocols?.toLocaleString() || "N/A"} protocols`);
    console.log(`Target: ${THRESHOLDS.E2E_TARGET}ms (2.3s retrieval time)\n`);

    // Clear embedding cache to ensure clean benchmarks
    embeddingCache.clear();
  });

  afterAll(() => {
    // Print cache stats
    const cacheStats = embeddingCache.getStats();
    console.log(`\nEmbedding cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries`);
  });

  describe("Embedding Generation (Voyage AI)", () => {
    it("generates embedding for simple query within target", async () => {
      const samples: number[] = [];

      for (const query of TEST_QUERIES.simple) {
        embeddingCache.clear(); // Force API call
        const { durationMs } = await measureExecution(() => generateEmbedding(query));
        samples.push(durationMs);
      }

      const metrics = calculateMetrics(samples);
      console.log(`Embedding generation (cold): P50=${metrics.median.toFixed(0)}ms, P95=${metrics.p95.toFixed(0)}ms`);

      expect(metrics.median).toBeLessThan(THRESHOLDS.EMBEDDING_GENERATION);
    }, 30000);

    it("returns cached embedding instantly", async () => {
      const query = "cardiac arrest cache test";

      // First call - populate cache
      await generateEmbedding(query);

      // Second call - should hit cache
      const samples: number[] = [];
      for (let i = 0; i < 10; i++) {
        const { durationMs } = await measureExecution(() => generateEmbedding(query));
        samples.push(durationMs);
      }

      const metrics = calculateMetrics(samples);
      console.log(`Embedding cache hit: P50=${metrics.median.toFixed(2)}ms, max=${metrics.max.toFixed(2)}ms`);

      expect(metrics.median).toBeLessThan(THRESHOLDS.EMBEDDING_CACHED);
    }, 10000);
  });

  describe("Semantic Search (pgvector)", () => {
    it("simple query search completes within P95 target", async () => {
      const samples: number[] = [];

      for (const query of TEST_QUERIES.simple) {
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({ query, limit: 10, threshold: 0.3 })
        );
        samples.push(durationMs);

        // Verify results are returned
        expect(result.length).toBeGreaterThan(0);
      }

      const metrics = calculateMetrics(samples);
      console.log(
        `Simple search: P50=${metrics.median.toFixed(0)}ms, P95=${metrics.p95.toFixed(0)}ms, P99=${metrics.p99.toFixed(0)}ms`
      );

      expect(metrics.p95).toBeLessThan(THRESHOLDS.E2E_TARGET);
    }, 60000);

    it("complex natural language query within target", async () => {
      const samples: number[] = [];

      for (const query of TEST_QUERIES.complex) {
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({ query, limit: 10, threshold: 0.3 })
        );
        samples.push(durationMs);

        // Verify results are relevant
        expect(result.length).toBeGreaterThan(0);
      }

      const metrics = calculateMetrics(samples);
      console.log(
        `Complex search: P50=${metrics.median.toFixed(0)}ms, P95=${metrics.p95.toFixed(0)}ms, P99=${metrics.p99.toFixed(0)}ms`
      );

      // Complex queries allowed slightly more time
      expect(metrics.p95).toBeLessThan(THRESHOLDS.E2E_WARNING);
    }, 60000);

    it("protocol number hybrid search (keyword + semantic)", async () => {
      const samples: number[] = [];

      for (const query of TEST_QUERIES.protocolNumbers) {
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({ query, limit: 10, threshold: 0.3 })
        );
        samples.push(durationMs);
      }

      const metrics = calculateMetrics(samples);
      console.log(
        `Protocol # search: P50=${metrics.median.toFixed(0)}ms, P95=${metrics.p95.toFixed(0)}ms`
      );

      expect(metrics.p95).toBeLessThan(THRESHOLDS.E2E_TARGET);
    }, 30000);

    it("state-filtered search maintains performance", async () => {
      const samples: number[] = [];
      const states = ["CA", "TX", "FL", "NY"];

      for (const stateCode of states) {
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({
            query: "cardiac arrest",
            stateCode,
            limit: 10,
            threshold: 0.3,
          })
        );
        samples.push(durationMs);
      }

      const metrics = calculateMetrics(samples);
      console.log(
        `State-filtered search: P50=${metrics.median.toFixed(0)}ms, P95=${metrics.p95.toFixed(0)}ms`
      );

      expect(metrics.p95).toBeLessThan(THRESHOLDS.E2E_TARGET);
    }, 60000);
  });

  describe("End-to-End Retrieval (2.3s Target)", () => {
    it("cardiac arrest scenario meets 2.3s target", async () => {
      const ITERATIONS = 10;
      const samples: number[] = [];

      // Simulate real-world cold start (clear cache)
      embeddingCache.clear();

      for (let i = 0; i < ITERATIONS; i++) {
        const query = "cardiac arrest treatment protocol adult";
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({ query, limit: 10, threshold: 0.3 })
        );

        samples.push(durationMs);
        expect(result.length).toBeGreaterThan(0);
      }

      const metrics = calculateMetrics(samples);

      console.log("\n=== CARDIAC ARREST SCENARIO (Target: 2.3s) ===");
      console.log(`  Min:    ${metrics.min.toFixed(0)}ms`);
      console.log(`  Median: ${metrics.median.toFixed(0)}ms`);
      console.log(`  P95:    ${metrics.p95.toFixed(0)}ms`);
      console.log(`  Max:    ${metrics.max.toFixed(0)}ms`);
      console.log(`  Status: ${metrics.median < THRESHOLDS.E2E_TARGET ? "PASS" : "FAIL"}`);

      // Primary assertion: median must be under target
      expect(metrics.median).toBeLessThan(THRESHOLDS.E2E_TARGET);

      // Secondary assertion: P95 should be under warning threshold
      expect(metrics.p95).toBeLessThan(THRESHOLDS.E2E_WARNING);
    }, 120000);

    it("pediatric emergency meets target", async () => {
      const samples: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { result, durationMs } = await measureExecution(() =>
          semanticSearchProtocols({
            query: "pediatric seizure management febrile",
            limit: 10,
            threshold: 0.3,
          })
        );
        samples.push(durationMs);
        expect(result.length).toBeGreaterThan(0);
      }

      const metrics = calculateMetrics(samples);
      console.log(`Pediatric emergency: P50=${metrics.median.toFixed(0)}ms`);

      expect(metrics.median).toBeLessThan(THRESHOLDS.E2E_TARGET);
    }, 60000);

    it("multi-search burst performance (5 concurrent)", async () => {
      const queries = [
        "cardiac arrest",
        "stroke protocol",
        "anaphylaxis treatment",
        "diabetic emergency",
        "trauma assessment",
      ];

      const start = performance.now();

      // Execute all searches concurrently
      const results = await Promise.all(
        queries.map((query) =>
          semanticSearchProtocols({ query, limit: 10, threshold: 0.3 })
        )
      );

      const totalDuration = performance.now() - start;
      const avgPerQuery = totalDuration / queries.length;

      console.log(
        `Concurrent burst (5 queries): Total=${totalDuration.toFixed(0)}ms, Avg=${avgPerQuery.toFixed(0)}ms`
      );

      // All queries should complete
      results.forEach((r) => expect(r.length).toBeGreaterThan(0));

      // Average should still meet target (accounting for concurrent execution)
      expect(avgPerQuery).toBeLessThan(THRESHOLDS.E2E_TARGET);
    }, 60000);
  });
});

// Note: Vitest bench tests are in a separate file (benchmark-search.bench.ts)
// Run with: pnpm bench
