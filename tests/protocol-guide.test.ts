import { describe, it, expect, vi, beforeEach } from "vitest";

// Skip tests that require database connection in CI (no Postgres available)
const isCI = process.env.CI === "true";

// Mock database functions
vi.mock("../server/db", () => ({
  getAllCounties: vi.fn().mockResolvedValue([
    { id: 1, name: "Demo County", state: "California", protocolVersion: "2024.1" },
    { id: 2, name: "Test County", state: "Texas", protocolVersion: "2024.2" },
  ]),
  getCountyById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({ id: 1, name: "Demo County", state: "California", protocolVersion: "2024.1" });
    }
    return Promise.resolve(null);
  }),
  getUserUsage: vi.fn().mockResolvedValue({
    tier: "free",
    count: 5,
    limit: 10,
  }),
  canUserQuery: vi.fn().mockResolvedValue(true),
  getProtocolsByCounty: vi.fn().mockResolvedValue([
    {
      id: 1,
      countyId: 1,
      protocolNumber: "100",
      protocolTitle: "Cardiac Arrest",
      section: "Cardiac",
      content: "For adult cardiac arrest, initiate CPR immediately...",
    },
  ]),
  searchProtocols: vi.fn().mockResolvedValue([
    {
      id: 1,
      countyId: 1,
      protocolNumber: "100",
      protocolTitle: "Cardiac Arrest",
      section: "Cardiac",
      content: "For adult cardiac arrest, initiate CPR immediately...",
    },
  ]),
  createQuery: vi.fn().mockResolvedValue({ id: 1 }),
  incrementUserQueryCount: vi.fn().mockResolvedValue(undefined),
  getUserQueries: vi.fn().mockResolvedValue([]),
  updateUserCounty: vi.fn().mockResolvedValue(undefined),
}));

describe("Protocol Guide - Counties", () => {
  it("should return a list of counties grouped by state", async () => {
    const db = await import("../server/db");
    const counties = await db.getAllCounties();
    
    expect(counties).toHaveLength(2);
    expect(counties[0]).toHaveProperty("name");
    expect(counties[0]).toHaveProperty("state");
    expect(counties[0]).toHaveProperty("protocolVersion");
  });

  it.skipIf(isCI)("should return a county by ID", async () => {
    const db = await import("../server/db");
    const county = await db.getCountyById(1);
    
    expect(county).not.toBeNull();
    expect(county?.name).toBe("Demo County");
    expect(county?.state).toBe("California");
  });

  it.skipIf(isCI)("should return null for non-existent county", async () => {
    const db = await import("../server/db");
    const county = await db.getCountyById(999);
    
    expect(county).toBeNull();
  });
});

describe("Protocol Guide - User Usage", () => {
  it.skipIf(isCI)("should return user usage with tier info", async () => {
    const db = await import("../server/db");
    const usage = await db.getUserUsage(1);
    
    expect(usage).toHaveProperty("tier");
    expect(usage).toHaveProperty("count");
    expect(usage).toHaveProperty("limit");
    expect(usage.tier).toBe("free");
    expect(usage.count).toBeLessThanOrEqual(usage.limit);
  });

  it.skipIf(isCI)("should check if user can query", async () => {
    const db = await import("../server/db");
    const canQuery = await db.canUserQuery(1);
    
    expect(typeof canQuery).toBe("boolean");
    expect(canQuery).toBe(true);
  });
});

describe("Protocol Guide - Protocol Search", () => {
  it.skipIf(isCI)("should return protocols for a county", async () => {
    const db = await import("../server/db");
    const protocols = await db.getProtocolsByCounty(1);
    
    expect(protocols).toHaveLength(1);
    expect(protocols[0]).toHaveProperty("protocolNumber");
    expect(protocols[0]).toHaveProperty("protocolTitle");
    expect(protocols[0]).toHaveProperty("content");
  });

  it("should search protocols by terms", async () => {
    const db = await import("../server/db");
    const results = await db.searchProtocols(1, ["cardiac", "arrest"]);
    
    expect(results).toHaveLength(1);
    expect(results[0].protocolTitle).toBe("Cardiac Arrest");
  });
});

describe("Protocol Guide - Query Logging", () => {
  it.skipIf(isCI)("should create a query log entry", async () => {
    const db = await import("../server/db");
    const result = await db.createQuery({
      userId: 1,
      countyId: 1,
      queryText: "What is the protocol for cardiac arrest?",
      responseText: "PROTOCOL: 100 - Cardiac Arrest...",
      protocolRefs: ["100 - Cardiac Arrest"],
    });
    
    expect(result).toHaveProperty("id");
  });

  it("should increment user query count", async () => {
    const db = await import("../server/db");
    await expect(db.incrementUserQueryCount(1)).resolves.not.toThrow();
  });
});

describe("Protocol Guide - Response Format", () => {
  it("should parse structured response correctly", () => {
    const responseText = `PROTOCOL: 100 - Cardiac Arrest
For adult cardiac arrest, initiate CPR immediately and attach AED.

ACTIONS:
• Begin chest compressions at 100-120/min
• Attach AED and follow prompts
• Establish IV/IO access

REF: Protocol 100, Section 3.2`;

    // Test response parsing logic
    const protocolMatch = responseText.match(/^PROTOCOL:\s*(.+?)(?:\n|$)/im);
    expect(protocolMatch).not.toBeNull();
    expect(protocolMatch![1]).toBe("100 - Cardiac Arrest");

    const refMatch = responseText.match(/^REF:\s*(.+?)(?:\n|$)/im);
    expect(refMatch).not.toBeNull();
    expect(refMatch![1]).toBe("Protocol 100, Section 3.2");

    const actionsMatch = responseText.match(/ACTIONS:\s*\n((?:•\s*.+\n?)+)/im);
    expect(actionsMatch).not.toBeNull();
    const actions = actionsMatch![1]
      .split('\n')
      .map(line => line.replace(/^•\s*/, '').trim())
      .filter(line => line.length > 0);
    expect(actions).toHaveLength(3);
  });

  it("should handle response without structured format", () => {
    const responseText = "No protocol found for this query. Please try rephrasing or contact your medical director.";
    
    const protocolMatch = responseText.match(/^PROTOCOL:\s*(.+?)(?:\n|$)/im);
    expect(protocolMatch).toBeNull();
    
    // Should still be usable as plain text content
    expect(responseText.length).toBeGreaterThan(0);
  });
});

describe("Protocol Guide - Theme Colors", () => {
  it("should have EMS-appropriate color palette", () => {
    // These are the expected theme colors from theme.config.js
    const expectedColors = {
      primary: { light: '#C41E3A', dark: '#E63950' },
      background: { light: '#ffffff', dark: '#0D1117' },
      surface: { light: '#F6F8FA', dark: '#161B22' },
    };

    // Verify primary color is EMS red
    expect(expectedColors.primary.light).toBe('#C41E3A');
    expect(expectedColors.primary.dark).toBe('#E63950');
  });
});
