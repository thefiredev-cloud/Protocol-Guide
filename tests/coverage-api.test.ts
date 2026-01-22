import { describe, it, expect, beforeAll } from "vitest";

const TRPC_API_BASE = "http://127.0.0.1:3000/api/trpc";

// Check if server is running before tests
let serverRunning = false;

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${TRPC_API_BASE}/search.stats`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("Coverage API Integration", () => {
  beforeAll(async () => {
    serverRunning = await checkServerRunning();
    if (!serverRunning) {
      console.log("Server not running - skipping server-dependent tests");
    }
  });

  it("should return state coverage data from tRPC API", async () => {
    if (!serverRunning) return;
    const response = await fetch(`${TRPC_API_BASE}/search.coverageByState`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(data.result.data).toBeDefined();

    const states = data.result.data.json;
    expect(Array.isArray(states)).toBe(true);
    expect(states.length).toBeGreaterThan(0);

    // Check data structure
    const firstState = states[0];
    expect(firstState).toHaveProperty("state");
    expect(firstState).toHaveProperty("stateCode");
    expect(firstState).toHaveProperty("chunks");
    expect(firstState).toHaveProperty("counties");
  });

  it("should return total stats from tRPC API", async () => {
    if (!serverRunning) return;
    const response = await fetch(`${TRPC_API_BASE}/search.totalStats`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.result).toBeDefined();
    expect(data.result.data).toBeDefined();

    const stats = data.result.data.json;
    expect(stats).toHaveProperty("totalChunks");
    expect(stats).toHaveProperty("totalCounties");
    expect(stats).toHaveProperty("statesWithCoverage");

    // Verify reasonable values
    expect(stats.totalChunks).toBeGreaterThan(50000);
    expect(stats.totalCounties).toBeGreaterThan(2000);
    expect(stats.statesWithCoverage).toBeGreaterThan(50);
  });

  it("should have California as top state by protocol count", async () => {
    if (!serverRunning) return;
    const response = await fetch(`${TRPC_API_BASE}/search.coverageByState`);
    const data = await response.json();

    const states = data.result.data.json;
    // California should be in the top 3
    const topStates = states.slice(0, 3).map((s: { state: string }) => s.state);
    expect(topStates).toContain("California");
  });
});
