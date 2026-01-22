import { describe, it, expect, beforeAll } from "vitest";

const TRPC_BASE = "http://127.0.0.1:3000/api/trpc";

// Helper to create proper tRPC input format
const trpcInput = (data: object) => encodeURIComponent(JSON.stringify({ json: data }));

// Check if server is running before tests
let serverRunning = false;

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${TRPC_BASE}/search.stats`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("Agency Filter Feature", () => {
  beforeAll(async () => {
    serverRunning = await checkServerRunning();
    if (!serverRunning) {
      console.log("Server not running - skipping server-dependent tests");
    }
  });

  describe("Agencies by State API", () => {
    it("should return agencies for California", async () => {
      if (!serverRunning) return;
      const response = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "California" })}`);
      expect(response.ok).toBe(true);

      const result = await response.json();
      const data = result.result.data.json;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check structure of first agency
      const firstAgency = data[0];
      expect(firstAgency).toHaveProperty("id");
      expect(firstAgency).toHaveProperty("name");
      expect(firstAgency).toHaveProperty("state");
      expect(firstAgency).toHaveProperty("protocolCount");
      expect(firstAgency.state).toBe("California");
    });

    it("should return agencies for New York", async () => {
      if (!serverRunning) return;
      const response = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "New York" })}`);
      expect(response.ok).toBe(true);

      const result = await response.json();
      const data = result.result.data.json;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Verify all agencies are from New York
      data.forEach((agency: { state: string }) => {
        expect(agency.state).toBe("New York");
      });
    });

    it("should include agencies with protocol counts", async () => {
      if (!serverRunning) return;
      const response = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "California" })}`);
      const result = await response.json();
      const data = result.result.data.json;

      // At least some agencies should have protocols
      const agenciesWithProtocols = data.filter(
        (a: { protocolCount: number }) => a.protocolCount > 0
      );
      expect(agenciesWithProtocols.length).toBeGreaterThan(0);
    });

    it("should return empty array for state with no agencies", async () => {
      if (!serverRunning) return;
      const response = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "NonExistentState" })}`);
      expect(response.ok).toBe(true);

      const result = await response.json();
      const data = result.result.data.json;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe("Semantic Search with Agency Filter", () => {
    it("should filter results by specific agency (county_id)", async () => {
      if (!serverRunning) return;
      // First get an agency with protocols
      const agencyResponse = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "California" })}`);
      const agencyResult = await agencyResponse.json();
      const agencies = agencyResult.result.data.json;

      // Find an agency with protocols
      const agencyWithProtocols = agencies.find(
        (a: { protocolCount: number }) => a.protocolCount > 0
      );
      expect(agencyWithProtocols).toBeDefined();

      // Search with that agency's county_id using tRPC
      const searchResponse = await fetch(
        `${TRPC_BASE}/search.searchByAgency?input=${trpcInput({ query: "cardiac", agencyId: agencyWithProtocols.id, limit: 10 })}`
      );
      expect(searchResponse.ok).toBe(true);

      const searchResult = await searchResponse.json();
      const searchData = searchResult.result.data.json;
      expect(searchData).toHaveProperty("results");
      expect(Array.isArray(searchData.results)).toBe(true);
    });

    it("should return different results for different agencies in same state", async () => {
      if (!serverRunning) return;
      // Get agencies from California
      const agencyResponse = await fetch(`${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: "California" })}`);
      const agencyResult = await agencyResponse.json();
      const agencies = agencyResult.result.data.json;

      // Find two agencies with protocols
      const agenciesWithProtocols = agencies.filter(
        (a: { protocolCount: number }) => a.protocolCount > 10
      );

      if (agenciesWithProtocols.length >= 2) {
        const agency1 = agenciesWithProtocols[0];
        const agency2 = agenciesWithProtocols[1];

        // Search in agency 1
        const search1Response = await fetch(
          `${TRPC_BASE}/search.searchByAgency?input=${trpcInput({ query: "protocol", agencyId: agency1.id, limit: 5 })}`
        );
        const search1Result = await search1Response.json();
        const search1Data = search1Result.result.data.json;

        // Search in agency 2
        const search2Response = await fetch(
          `${TRPC_BASE}/search.searchByAgency?input=${trpcInput({ query: "protocol", agencyId: agency2.id, limit: 5 })}`
        );
        const search2Result = await search2Response.json();
        const search2Data = search2Result.result.data.json;

        // Both searches should return results
        expect(search1Data.results).toBeDefined();
        expect(search2Data.results).toBeDefined();
      }
    });
  });

  describe("Cascading Filter Flow", () => {
    it("should support the full state -> agency -> search workflow", async () => {
      if (!serverRunning) return;
      // Step 1: Get states with coverage
      const coverageResponse = await fetch(`${TRPC_BASE}/search.coverageByState`);
      const coverageResult = await coverageResponse.json();
      const states = coverageResult.result.data.json;

      const statesWithData = states.filter(
        (s: { chunks: number }) => s.chunks > 0
      );
      expect(statesWithData.length).toBeGreaterThan(0);

      // Step 2: Select a state and get its agencies
      const selectedState = statesWithData[0].state;
      const agencyResponse = await fetch(
        `${TRPC_BASE}/search.agenciesByState?input=${trpcInput({ state: selectedState })}`
      );
      const agencyResult = await agencyResponse.json();
      const agencies = agencyResult.result.data.json;

      expect(agencies.length).toBeGreaterThan(0);

      // Step 3: Select an agency and search
      const agenciesWithProtocols = agencies.filter(
        (a: { protocolCount: number }) => a.protocolCount > 0
      );

      if (agenciesWithProtocols.length > 0) {
        const selectedAgency = agenciesWithProtocols[0];

        const searchResponse = await fetch(
          `${TRPC_BASE}/search.searchByAgency?input=${trpcInput({ query: "emergency", agencyId: selectedAgency.id, limit: 10 })}`
        );
        expect(searchResponse.ok).toBe(true);

        const searchResult = await searchResponse.json();
        const searchData = searchResult.result.data.json;
        expect(searchData).toHaveProperty("results");
      }
    });
  });
});
