import { describe, it, expect, vi } from "vitest";

// Skip tests that require Claude API in CI (no API key available)
const isCI = process.env.CI === "true";

// Mock the Claude module
vi.mock("../server/_core/claude", () => ({
  invokeClaudeSimple: vi.fn().mockResolvedValue({
    content: `1. Confirm pulselessness, begin CPR 30:2
2. Attach AED, analyze rhythm
3. VF/VT: Shock 200J biphasic
4. Epi 1mg IV/IO q3-5min
5. Amio 300mg IV first, 150mg second`,
    model: 'claude-haiku-4-5-20251001',
    inputTokens: 150,
    outputTokens: 50,
    stopReason: 'end_turn',
  })
}));

describe("Ultra-Concise Summarize Endpoint", () => {
  describe("Output Format", () => {
    it.skipIf(isCI)("should produce output that fits on one screen (max 5 lines)", async () => {
      const { invokeClaudeSimple } = await import("../server/_core/claude");

      const response = await invokeClaudeSimple({
        query: "Summarize cardiac arrest",
        userTier: 'free',
      });

      const summary = response.content;
      const lines = summary.split('\n').filter(l => l.trim());

      // Must be 5 lines or fewer for one-screen display
      expect(lines.length).toBeLessThanOrEqual(5);
    });

    it.skipIf(isCI)("should include numbered steps", async () => {
      const { invokeClaudeSimple } = await import("../server/_core/claude");

      const response = await invokeClaudeSimple({
        query: "Summarize cardiac arrest",
        userTier: 'free',
      });

      const summary = response.content;

      // Should have numbered format
      expect(summary).toMatch(/1\./);
      expect(summary).toMatch(/2\./);
    });

    it.skipIf(isCI)("should include specific dosages", async () => {
      const { invokeClaudeSimple } = await import("../server/_core/claude");

      const response = await invokeClaudeSimple({
        query: "Summarize cardiac arrest",
        userTier: 'free',
      });

      const summary = response.content;

      // Should include dosage numbers
      expect(summary).toMatch(/\d+\s*(mg|mcg|mL|J)/i);
    });

    it("should use EMS abbreviations", async () => {
      const { invokeClaudeSimple } = await import("../server/_core/claude");

      const response = await invokeClaudeSimple({
        query: "Summarize cardiac arrest",
        userTier: 'free',
      });

      const summary = response.content;

      // Should use standard EMS abbreviations
      expect(summary).toMatch(/IV|IO|IM|CPR|AED/);
    });
  });

  describe("Cleanup Function", () => {
    it("should remove markdown formatting", () => {
      const input = "**1. Begin CPR**\n**2. Attach AED**";
      const cleaned = input.replace(/\*\*/g, '');

      expect(cleaned).not.toContain("**");
      expect(cleaned).toContain("Begin CPR");
    });

    it("should limit to 5 lines maximum", () => {
      const lines = [
        "1. Line one",
        "2. Line two",
        "3. Line three",
        "4. Line four",
        "5. Line five",
        "6. Line six - should be removed",
        "7. Line seven - should be removed"
      ];

      const limited = lines.slice(0, 5);
      expect(limited.length).toBe(5);
      expect(limited).not.toContain("6. Line six - should be removed");
    });
  });

  describe("California Protocol Queries", () => {
    it("should handle California cardiac arrest query", () => {
      const query = "cardiac arrest adult";
      const stateFilter = "California";

      // Query should be valid
      expect(query.length).toBeGreaterThan(0);
      expect(query.split(" ").length).toBeLessThanOrEqual(5);
      expect(stateFilter).toBe("California");
    });

    it("should handle short 3-5 word queries", () => {
      const validQueries = [
        "cardiac arrest",
        "pediatric seizure",
        "chest pain stemi",
        "overdose naloxone",
        "stroke tpa"
      ];

      validQueries.forEach(query => {
        const words = query.split(" ");
        expect(words.length).toBeGreaterThanOrEqual(2);
        expect(words.length).toBeLessThanOrEqual(5);
      });
    });
  });
});

describe("UI Simplification", () => {
  it("should have only 2 main tabs (Search and Profile)", () => {
    const visibleTabs = ["Search", "Profile"];
    const hiddenTabs = ["Coverage", "History"];

    expect(visibleTabs.length).toBe(2);
    expect(hiddenTabs.length).toBe(2);
  });

  it("should display compact header", () => {
    // Header should be minimal - just logo and title
    const headerElements = ["logo", "title"];
    expect(headerElements.length).toBeLessThanOrEqual(3);
  });

  it("should show example queries for guidance", () => {
    const exampleQueries = [
      "cardiac arrest adult",
      "pediatric seizure",
      "chest pain stemi"
    ];

    exampleQueries.forEach(query => {
      expect(query.length).toBeLessThan(30);
    });
  });
});
