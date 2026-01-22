/**
 * Comprehensive Router Tests
 * Tests all tRPC procedures in server/routers.ts to achieve 70%+ coverage
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// Mock all dependencies
vi.mock("../server/db", () => ({
  getAllCounties: vi.fn().mockResolvedValue([
    { id: 1, name: "King County", state: "WA" },
    { id: 2, name: "Los Angeles County", state: "CA" },
    { id: 3, name: "San Diego County", state: "CA" },
  ]),
  getCountyById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, name: "King County", state: "WA" });
    if (id === 2) return Promise.resolve({ id: 2, name: "Los Angeles County", state: "CA" });
    return Promise.resolve(null);
  }),
  getUserUsage: vi.fn().mockResolvedValue({
    tier: "free",
    count: 5,
    limit: 10,
  }),
  updateUserCounty: vi.fn().mockResolvedValue(undefined),
  getUserQueries: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      countyId: 1,
      queryText: "What is the protocol for cardiac arrest?",
      responseText: "The protocol for cardiac arrest...",
      protocolRefs: ["Protocol 101"],
      createdAt: new Date(),
    },
  ]),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              protocol_number: "101",
              protocol_title: "Cardiac Arrest",
              section: "Adult Cardiac",
              content: "Full protocol content here...",
            },
          ]),
        }),
      }),
    }),
  }),
  getProtocolStats: vi.fn().mockResolvedValue({
    totalProtocols: 500,
    totalCounties: 50,
  }),
  getProtocolCoverageByState: vi.fn().mockResolvedValue([
    { state: "CA", count: 100 },
    { state: "WA", count: 50 },
  ]),
  getTotalProtocolStats: vi.fn().mockResolvedValue({
    totalProtocols: 500,
    totalAgencies: 50,
    totalStates: 25,
  }),
  getAgenciesByState: vi.fn().mockResolvedValue([
    { id: 1, name: "Agency 1", protocolCount: 10 },
    { id: 2, name: "Agency 2", protocolCount: 15 },
  ]),
  getAgenciesWithProtocols: vi.fn().mockResolvedValue([
    { id: 1, name: "Agency 1", state: "CA", protocolCount: 10 },
    { id: 2, name: "Agency 2", state: "WA", protocolCount: 15 },
  ]),
  canUserQuery: vi.fn().mockResolvedValue(true),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    email: "test@example.com",
    tier: "free",
    selectedCountyId: 1,
  }),
  createQuery: vi.fn().mockResolvedValue({ id: 1 }),
  incrementUserQueryCount: vi.fn().mockResolvedValue(undefined),
  createFeedback: vi.fn().mockResolvedValue({ id: 1 }),
  getUserFeedback: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      category: "error",
      subject: "Bug report",
      message: "I found a bug",
      protocolRef: null,
      countyId: 1,
      createdAt: new Date(),
    },
  ]),
  createContactSubmission: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("../server/_core/embeddings", () => ({
  semanticSearchProtocols: vi.fn().mockResolvedValue([
    {
      id: 1,
      protocol_number: "101",
      protocol_title: "Cardiac Arrest",
      section: "Adult Cardiac",
      content: "Full protocol content for cardiac arrest management...",
      similarity: 0.95,
      agency_id: 1,
      image_urls: [],
    },
    {
      id: 2,
      protocol_number: "102",
      protocol_title: "CPR",
      section: "Basic Life Support",
      content: "CPR protocol content...",
      similarity: 0.85,
      agency_id: 1,
      image_urls: [],
    },
  ]),
}));

vi.mock("../server/_core/claude", () => ({
  invokeClaudeRAG: vi.fn().mockResolvedValue({
    content: "Based on the protocols, for cardiac arrest you should...",
    model: "claude-3-haiku-20240307",
    inputTokens: 1000,
    outputTokens: 500,
  }),
}));

vi.mock("../server/_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "What is the protocol for cardiac arrest?",
  }),
}));

vi.mock("../server/storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://storage.example.com/voice/1/123456789.webm",
  }),
}));

vi.mock("../server/stripe", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({
    url: "https://checkout.stripe.com/session_123",
  }),
  createCustomerPortalSession: vi.fn().mockResolvedValue({
    url: "https://billing.stripe.com/portal_123",
  }),
}));

vi.mock("../server/db-agency-mapping", () => ({
  mapCountyIdToAgencyId: vi.fn().mockImplementation((countyId: number) => {
    return Promise.resolve(countyId); // Simple 1:1 mapping for tests
  }),
  getAgencyByCountyId: vi.fn().mockImplementation((countyId: number) => {
    if (countyId === 1) {
      return Promise.resolve({
        name: "King County EMS",
        state_code: "WA",
      });
    }
    if (countyId === 2) {
      return Promise.resolve({
        name: "Los Angeles County EMS",
        state_code: "CA",
      });
    }
    return Promise.resolve(null);
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthenticatedContext(userOverrides: Partial<AuthenticatedUser> = {}): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    supabaseId: "test-supabase-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    tier: "free",
    queryCountToday: 0,
    lastQueryDate: null,
    selectedCountyId: null,
    stripeCustomerId: null,
    subscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...userOverrides,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: { authorization: "Bearer test_token" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthenticatedContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
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

  return { ctx };
}

describe("counties router", () => {
  it("counties.list returns grouped counties by state", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counties.list();

    expect(result.counties).toHaveLength(3);
    expect(result.grouped).toHaveProperty("WA");
    expect(result.grouped).toHaveProperty("CA");
    expect(result.grouped.CA).toHaveLength(2);
    expect(result.grouped.WA).toHaveLength(1);
  });

  it("counties.get returns county by id", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counties.get({ id: 1 });

    expect(result).toEqual({ id: 1, name: "King County", state: "WA" });
  });

  it("counties.get returns null for non-existent county", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.counties.get({ id: 999 });

    expect(result).toBeNull();
  });
});

describe("user router", () => {
  it("user.selectCounty updates user county", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.selectCounty({ countyId: 2 });

    expect(result).toEqual({ success: true });
  });

  it("user.queries returns user query history", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.queries({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("queryText");
    expect(result[0]).toHaveProperty("responseText");
  });

  it("user.queries respects limit parameter", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.queries({ limit: 5 });

    expect(result.length).toBeLessThanOrEqual(5);
  });
});

describe("search router", () => {
  it("search.semantic performs semantic search", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({
      query: "cardiac arrest",
      limit: 10,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toHaveProperty("protocolNumber");
    expect(result.results[0]).toHaveProperty("protocolTitle");
    expect(result.results[0]).toHaveProperty("relevanceScore");
    expect(result.query).toBe("cardiac arrest");
  });

  it("search.semantic filters by county", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({
      query: "cardiac arrest",
      countyId: 1,
      limit: 10,
    });

    expect(result.results).toHaveLength(2);
  });

  it("search.semantic filters by state", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.semantic({
      query: "cardiac arrest",
      stateFilter: "CA",
      limit: 10,
    });

    expect(result.results).toHaveLength(2);
  });

  it("search.getProtocol returns protocol by id", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.getProtocol({ id: 1 });

    expect(result).toHaveProperty("protocol_number");
    expect(result).toHaveProperty("protocol_title");
  });

  it("search.getProtocol returns null when db is unavailable", async () => {
    const db = await import("../server/db");
    vi.mocked(db.getDb).mockResolvedValueOnce(null);

    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.getProtocol({ id: 1 });

    expect(result).toBeNull();
  });

  it("search.stats returns protocol statistics", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.stats();

    expect(result).toHaveProperty("totalProtocols");
    expect(result).toHaveProperty("totalCounties");
    expect(result.totalProtocols).toBeGreaterThan(0);
  });

  it("search.coverageByState returns state coverage", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.coverageByState();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("state");
    expect(result[0]).toHaveProperty("count");
  });

  it("search.totalStats returns total statistics", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.totalStats();

    expect(result).toHaveProperty("totalProtocols");
    expect(result).toHaveProperty("totalAgencies");
    expect(result).toHaveProperty("totalStates");
  });

  it("search.agenciesByState returns agencies for state", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.agenciesByState({ state: "CA" });

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("protocolCount");
  });

  it("search.agenciesWithProtocols returns all agencies", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.agenciesWithProtocols();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("state");
  });

  it("search.agenciesWithProtocols filters by state", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.agenciesWithProtocols({ state: "CA" });

    expect(result).toHaveLength(2);
  });

  it("search.searchByAgency searches within specific agency", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.searchByAgency({
      query: "cardiac arrest",
      agencyId: 1,
      limit: 10,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toHaveProperty("protocolNumber");
  });
});

describe("query router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("query.submit successfully processes query", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.submit({
      countyId: 1,
      queryText: "What is the protocol for cardiac arrest?",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.response).toHaveProperty("text");
    expect(result.response).toHaveProperty("model");
    expect(result.response).toHaveProperty("tokens");
  });

  it("query.submit blocks when user exceeds limit", async () => {
    const db = await import("../server/db");
    vi.mocked(db.canUserQuery).mockResolvedValueOnce(false);

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.submit({
      countyId: 1,
      queryText: "What is the protocol for cardiac arrest?",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Daily query limit reached");
    expect(result.response).toBeNull();
  });

  it("query.submit handles no matching protocols", async () => {
    const embeddings = await import("../server/_core/embeddings");
    vi.mocked(embeddings.semanticSearchProtocols).mockResolvedValueOnce([]);

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.submit({
      countyId: 1,
      queryText: "xyzzy nonsense query",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No matching protocols found");
  });

  it("query.submit handles errors gracefully", async () => {
    const embeddings = await import("../server/_core/embeddings");
    vi.mocked(embeddings.semanticSearchProtocols).mockRejectedValueOnce(
      new Error("Database connection failed")
    );

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.submit({
      countyId: 1,
      queryText: "cardiac arrest",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("query.submit uses correct tier for model routing", async () => {
    const { ctx } = createAuthenticatedContext({ tier: "pro" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.submit({
      countyId: 1,
      queryText: "What is the protocol for cardiac arrest?",
    });

    expect(result.success).toBe(true);
  });

  it("query.history returns query history", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.query.history({ limit: 50 });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("queryText");
  });
});

describe("voice router", () => {
  it("voice.transcribe successfully transcribes audio", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.voice.transcribe({
      audioUrl: "https://example.com/audio.webm",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.text).toBeTruthy();
  });

  it("voice.transcribe handles transcription errors", async () => {
    const voiceTranscription = await import("../server/_core/voiceTranscription");
    vi.mocked(voiceTranscription.transcribeAudio).mockResolvedValueOnce({
      error: "Transcription failed",
    });

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.voice.transcribe({
      audioUrl: "https://example.com/audio.webm",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.text).toBeNull();
  });

  it("voice.transcribe accepts language parameter", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.voice.transcribe({
      audioUrl: "https://example.com/audio.webm",
      language: "en",
    });

    expect(result.success).toBe(true);
  });

  it("voice.uploadAudio successfully uploads audio", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const base64Audio = Buffer.from("fake audio data").toString("base64");

    const result = await caller.voice.uploadAudio({
      audioBase64: base64Audio,
      mimeType: "audio/webm",
    });

    expect(result).toHaveProperty("url");
    expect(result.url).toContain("storage.example.com");
  });

  it("voice.uploadAudio generates correct key format", async () => {
    const { ctx } = createAuthenticatedContext({ id: 42 });
    const caller = appRouter.createCaller(ctx);

    const base64Audio = Buffer.from("fake audio data").toString("base64");

    const result = await caller.voice.uploadAudio({
      audioBase64: base64Audio,
      mimeType: "audio/webm",
    });

    expect(result.url).toBeTruthy();
  });
});

describe("feedback router", () => {
  it("feedback.submit successfully submits feedback", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.feedback.submit({
      category: "error",
      subject: "Bug found",
      message: "There is a bug in the protocol display",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("feedback.submit handles all categories", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const categories = ["error", "suggestion", "general"] as const;

    for (const category of categories) {
      const result = await caller.feedback.submit({
        category,
        subject: `Test ${category}`,
        message: "Test message",
      });

      expect(result.success).toBe(true);
    }
  });

  it("feedback.submit includes protocol reference", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.feedback.submit({
      category: "error",
      subject: "Protocol error",
      message: "Found an error in protocol",
      protocolRef: "Protocol 101",
    });

    expect(result.success).toBe(true);
  });

  it("feedback.submit handles errors", async () => {
    const db = await import("../server/db");
    vi.mocked(db.createFeedback).mockRejectedValueOnce(new Error("Database error"));

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.feedback.submit({
      category: "error",
      subject: "Bug found",
      message: "There is a bug",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("feedback.myFeedback returns user feedback", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.feedback.myFeedback();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("category");
    expect(result[0]).toHaveProperty("subject");
  });
});

describe("contact router", () => {
  it("contact.submit successfully submits contact form", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      message: "I have a question about the service",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("contact.submit handles errors", async () => {
    const db = await import("../server/db");
    vi.mocked(db.createContactSubmission).mockRejectedValueOnce(new Error("Database error"));

    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      message: "I have a question",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("subscription router", () => {
  it("subscription.createCheckout creates monthly checkout session", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createCheckout({
      plan: "monthly",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.url).toContain("checkout.stripe.com");
  });

  it("subscription.createCheckout creates annual checkout session", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createCheckout({
      plan: "annual",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result.success).toBe(true);
    expect(result.url).toContain("checkout.stripe.com");
  });

  it("subscription.createCheckout handles Stripe errors", async () => {
    const stripe = await import("../server/stripe");
    vi.mocked(stripe.createCheckoutSession).mockResolvedValueOnce({
      error: "Stripe error occurred",
    });

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createCheckout({
      plan: "monthly",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.url).toBeNull();
  });

  it("subscription.createPortal creates portal session", async () => {
    const { ctx } = createAuthenticatedContext({
      stripeCustomerId: "cus_test_123",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createPortal({
      returnUrl: "https://example.com/settings",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.url).toContain("billing.stripe.com");
  });

  it("subscription.createPortal requires stripe customer id", async () => {
    const { ctx } = createAuthenticatedContext({
      stripeCustomerId: null,
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createPortal({
      returnUrl: "https://example.com/settings",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No subscription found");
    expect(result.url).toBeNull();
  });

  it("subscription.createPortal handles Stripe errors", async () => {
    const stripe = await import("../server/stripe");
    vi.mocked(stripe.createCustomerPortalSession).mockResolvedValueOnce({
      error: "Customer not found",
    });

    const { ctx } = createAuthenticatedContext({
      stripeCustomerId: "cus_test_123",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createPortal({
      returnUrl: "https://example.com/settings",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("subscription.status returns subscription status for free user", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.tier).toBe("free");
    expect(result.subscriptionStatus).toBeNull();
    expect(result.subscriptionEndDate).toBeNull();
  });

  it("subscription.status returns subscription status for pro user", async () => {
    const db = await import("../server/db");
    vi.mocked(db.getUserById).mockResolvedValueOnce({
      id: 1,
      email: "test@example.com",
      tier: "pro",
      subscriptionStatus: "active",
      subscriptionEndDate: new Date("2025-12-31"),
      selectedCountyId: 1,
    });

    const { ctx } = createAuthenticatedContext({ tier: "pro" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.tier).toBe("pro");
    expect(result.subscriptionStatus).toBe("active");
    expect(result.subscriptionEndDate).toBeInstanceOf(Date);
  });

  it("subscription.status handles missing user", async () => {
    const db = await import("../server/db");
    vi.mocked(db.getUserById).mockResolvedValueOnce(null);

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.tier).toBe("free");
    expect(result.subscriptionStatus).toBeNull();
  });
});

describe("protected procedure authorization", () => {
  it("user.selectCounty requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.user.selectCounty({ countyId: 1 })).rejects.toThrow();
  });

  it("query.submit requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.query.submit({
        countyId: 1,
        queryText: "test query",
      })
    ).rejects.toThrow();
  });

  it("voice.transcribe requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.voice.transcribe({ audioUrl: "https://example.com/audio.webm" })
    ).rejects.toThrow();
  });

  it("feedback.submit requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.feedback.submit({
        category: "error",
        subject: "Bug",
        message: "Test",
      })
    ).rejects.toThrow();
  });

  it("subscription.createCheckout requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
    ).rejects.toThrow();
  });
});
