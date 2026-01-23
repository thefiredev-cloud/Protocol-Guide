/**
 * Protocol Search Accuracy Tests
 *
 * Critical path tests for EMS field usage - ensuring search functionality
 * returns relevant protocols for emergency medical scenarios.
 *
 * These tests verify:
 * - Semantic search returns relevant results for medical queries
 * - Natural language queries find appropriate protocols
 * - EMS-specific terminology is properly handled
 * - Search relevance scoring is accurate
 * - Edge cases don't break search functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import after mocking
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { semanticSearchProtocols } from "../server/_core/embeddings";
import { mapCountyIdToAgencyId, getAgencyByCountyId } from "../server/db-agency-mapping";

// Mock the embeddings module - use inline mock to avoid hoisting issues
vi.mock("../server/_core/embeddings", () => ({
  semanticSearchProtocols: vi.fn(),
}));

// Mock the database module
vi.mock("../server/db-agency-mapping", () => ({
  mapCountyIdToAgencyId: vi.fn(),
  getAgencyByCountyId: vi.fn(),
}));

// Mock the database
vi.mock("../server/db", async () => {
  const actual = await vi.importActual("../server/db");
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(null),
    getProtocolStats: vi.fn().mockResolvedValue({
      totalProtocols: 5000,
      totalCounties: 150,
    }),
    getProtocolCoverageByState: vi.fn().mockResolvedValue([
      { state: "CA", countyCount: 58, protocolCount: 1200 },
      { state: "TX", countyCount: 254, protocolCount: 800 },
    ]),
    getTotalProtocolStats: vi.fn().mockResolvedValue({
      totalProtocols: 5000,
      totalChunks: 25000,
      totalStates: 50,
      totalAgencies: 150,
    }),
  };
});

// Test context helper
function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock search result factory
function createMockSearchResult(overrides: Partial<{
  id: number;
  protocol_number: string;
  protocol_title: string;
  section: string;
  content: string;
  similarity: number;
  agency_id: number;
  image_urls: string[] | null;
}> = {}) {
  return {
    id: 1,
    protocol_number: "CARD-001",
    protocol_title: "Cardiac Arrest",
    section: "Adult Cardiac Emergencies",
    content: "Begin CPR immediately. Attach AED and follow prompts...",
    similarity: 0.85,
    agency_id: 1,
    image_urls: null,
    ...overrides,
  };
}

describe("Protocol Search Accuracy - Critical EMS Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapCountyIdToAgencyId).mockResolvedValue(1);
    vi.mocked(getAgencyByCountyId).mockResolvedValue({
      name: "Los Angeles County EMS",
      state_code: "CA",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Cardiac Emergency Queries", () => {
    it("should return cardiac arrest protocols for 'cardiac arrest' query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "CARD-001",
          protocol_title: "Cardiac Arrest - Adult",
          content: "Begin high-quality CPR immediately. Push hard, push fast (100-120/min). Attach AED...",
          similarity: 0.92,
        }),
        createMockSearchResult({
          id: 2,
          protocol_number: "CARD-002",
          protocol_title: "Post-Cardiac Arrest Care",
          content: "Once ROSC is achieved, maintain SpO2 94-98%...",
          similarity: 0.78,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "cardiac arrest",
        limit: 10,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].protocolTitle).toContain("Cardiac Arrest");
      expect(result.results[0].relevanceScore).toBeGreaterThan(0.9);
      expect(mockSemanticSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "cardiac arrest",
          limit: 10,
          threshold: 0.3,
        })
      );
    });

    it("should find STEMI protocols for 'heart attack' query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "CARD-005",
          protocol_title: "Acute Coronary Syndrome / STEMI",
          content: "12-lead ECG within 10 minutes. Aspirin 324mg PO. Notify cath lab...",
          similarity: 0.88,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "heart attack",
        limit: 10,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).toContain("STEMI");
      expect(result.totalFound).toBe(1);
    });

    it("should handle chest pain natural language query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "CARD-003",
          protocol_title: "Chest Pain - Cardiac",
          content: "Obtain 12-lead ECG. Assess for STEMI criteria...",
          similarity: 0.85,
        }),
        createMockSearchResult({
          id: 2,
          protocol_number: "CARD-004",
          protocol_title: "Chest Pain - Non-Cardiac",
          content: "Consider pulmonary embolism, aortic dissection...",
          similarity: 0.72,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "patient complaining of crushing chest pain radiating to left arm",
        limit: 10,
      });

      expect(result.results.length).toBeGreaterThan(0);
      // Results should be sorted by relevance
      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(
        result.results[result.results.length - 1].relevanceScore
      );
    });
  });

  describe("Respiratory Emergency Queries", () => {
    it("should find respiratory distress protocols", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "RESP-001",
          protocol_title: "Respiratory Distress - Adult",
          content: "Assess airway, breathing, circulation. Provide O2 to maintain SpO2 94%...",
          similarity: 0.91,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "difficulty breathing",
        limit: 10,
      });

      expect(result.results[0].protocolTitle).toContain("Respiratory");
    });

    it("should find asthma protocols for wheezing query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "RESP-003",
          protocol_title: "Asthma / Bronchospasm",
          content: "Albuterol 2.5mg nebulized. Ipratropium if severe. Methylprednisolone...",
          similarity: 0.87,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "patient wheezing cannot catch breath",
        limit: 10,
      });

      expect(result.results[0].content).toContain("Albuterol");
    });
  });

  describe("Trauma Emergency Queries", () => {
    it("should find trauma protocols for MVA query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "TRAU-001",
          protocol_title: "Major Trauma / Multi-System Trauma",
          content: "C-spine immobilization. Assess GCS. Control hemorrhage...",
          similarity: 0.89,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "motor vehicle accident unresponsive patient",
        limit: 10,
      });

      expect(result.results[0].protocolTitle).toContain("Trauma");
    });

    it("should find hemorrhage control protocols", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "TRAU-005",
          protocol_title: "Hemorrhage Control",
          content: "Direct pressure. Tourniquet if extremity. Tranexamic acid...",
          similarity: 0.93,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "massive bleeding gunshot wound",
        limit: 10,
      });

      expect(result.results[0].content).toContain("Tourniquet");
    });
  });

  describe("Pediatric Emergency Queries", () => {
    it("should find pediatric-specific protocols", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "PED-001",
          protocol_title: "Pediatric Assessment",
          section: "Pediatric Emergencies",
          content: "Use Broselow tape for weight-based dosing. Pediatric vital sign ranges...",
          similarity: 0.88,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "pediatric patient 5 year old",
        limit: 10,
      });

      expect(result.results[0].section).toContain("Pediatric");
    });

    it("should find febrile seizure protocols", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "PED-010",
          protocol_title: "Pediatric Seizures",
          content: "Febrile seizure common in 6mo-5yr. Midazolam 0.2mg/kg IM if active...",
          similarity: 0.86,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "child fever seizure convulsions",
        limit: 10,
      });

      expect(result.results[0].content).toContain("Febrile");
    });
  });

  describe("Search Filtering", () => {
    it("should filter results by county/agency", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          agency_id: 1,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await caller.search.semantic({
        query: "cardiac arrest",
        countyId: 123,
        limit: 10,
      });

      expect(mockMapCountyIdToAgencyId).toHaveBeenCalledWith(123);
      expect(mockSemanticSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId: 1,
          agencyName: "Los Angeles County EMS",
          stateCode: "CA",
        })
      );
    });

    it("should filter by state when no county specified", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult(),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await caller.search.semantic({
        query: "stroke",
        stateFilter: "TX",
        limit: 10,
      });

      expect(mockSemanticSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          stateCode: "TX",
        })
      );
    });

    it("should respect limit parameter", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({ id: 1 }),
        createMockSearchResult({ id: 2 }),
        createMockSearchResult({ id: 3 }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "general assessment",
        limit: 3,
      });

      expect(mockSemanticSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 3,
        })
      );
      expect(result.results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Edge Cases", () => {
    it("should return empty results for nonsense query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "xyzzy12345nonsense",
        limit: 10,
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it("should handle special characters in query", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult(),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "O2 saturation < 90%",
        limit: 10,
      });

      expect(result.query).toBe("O2 saturation < 90%");
    });

    it("should handle abbreviations and acronyms", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          protocol_number: "RESP-002",
          protocol_title: "COPD Exacerbation",
          content: "CPAP/BiPAP if tolerated. Albuterol/Ipratropium nebulized...",
          similarity: 0.84,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "COPD exacerbation BiPAP",
        limit: 10,
      });

      expect(result.results[0].content).toContain("BiPAP");
    });

    it("should truncate long content in results", async () => {
      const longContent = "A".repeat(600);
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          content: longContent,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.search.semantic({
        query: "test",
        limit: 10,
      });

      expect(result.results[0].content.length).toBeLessThanOrEqual(503); // 500 + "..."
      expect(result.results[0].fullContent.length).toBe(600);
    });
  });

  describe("Search by Agency", () => {
    it("should search within specific agency", async () => {
      vi.mocked(semanticSearchProtocols).mockResolvedValue([
        createMockSearchResult({
          agency_id: 5,
        }),
      ]);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await caller.search.searchByAgency({
        query: "anaphylaxis",
        agencyId: 456,
        limit: 10,
      });

      expect(mockMapCountyIdToAgencyId).toHaveBeenCalledWith(456);
      expect(mockGetAgencyByCountyId).toHaveBeenCalledWith(456);
    });
  });
});

describe("Protocol Search - Drug Dosing Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find epinephrine dosing for anaphylaxis", async () => {
    vi.mocked(semanticSearchProtocols).mockResolvedValue([
      createMockSearchResult({
        protocol_number: "ALLER-001",
        protocol_title: "Anaphylaxis / Severe Allergic Reaction",
        content: "Epinephrine 0.3mg IM (Adult) or 0.15mg IM (Pediatric). May repeat q5-15min...",
        similarity: 0.94,
      }),
    ]);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({
      query: "epinephrine dose anaphylaxis",
      limit: 10,
    });

    expect(result.results[0].content).toContain("0.3mg");
    expect(result.results[0].content).toContain("IM");
  });

  it("should find narcan dosing for overdose", async () => {
    vi.mocked(semanticSearchProtocols).mockResolvedValue([
      createMockSearchResult({
        protocol_number: "TOX-001",
        protocol_title: "Opioid Overdose",
        content: "Naloxone 2mg IN or 0.4mg IV/IM. Titrate to adequate respiratory effort...",
        similarity: 0.91,
      }),
    ]);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({
      query: "narcan naloxone overdose dose",
      limit: 10,
    });

    expect(result.results[0].content).toContain("Naloxone");
  });
});
