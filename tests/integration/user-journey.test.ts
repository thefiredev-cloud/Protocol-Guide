/**
 * Critical User Journey Integration Tests
 *
 * Tests the complete user flow:
 * 1. User signup/authentication
 * 2. Subscription creation (Stripe)
 * 3. Protocol search (AI-powered)
 * 4. Save counties (bookmarks)
 *
 * Uses real database logic, mocks external services (Stripe, AI, Supabase)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../../server/routers";
import type { TrpcContext } from "../../server/_core/context";

// Mock external services
vi.mock("../../server/_core/embeddings", () => ({
  semanticSearchProtocols: vi.fn().mockResolvedValue([
    {
      id: 1,
      protocol_number: "P-001",
      protocol_title: "Cardiac Arrest Management",
      section: "Adult Cardiac",
      content: "Begin CPR immediately. Assess rhythm. Epinephrine 1mg IV/IO every 3-5 minutes.",
      similarity: 0.89,
      image_urls: [],
    },
    {
      id: 2,
      protocol_number: "P-002",
      protocol_title: "Respiratory Distress",
      section: "Respiratory",
      content: "Assess airway. Provide oxygen. Consider bronchodilators for wheezing.",
      similarity: 0.75,
      image_urls: [],
    },
  ]),
}));

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/session/cs_test_123",
          }),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "bps_test_123",
            url: "https://billing.stripe.com/session/bps_test_123",
          }),
        },
      },
    })),
  };
});

vi.mock("../../server/db", async () => {
  const actual = await vi.importActual<typeof import("../../server/db")>("../../server/db");
  return {
    ...actual,
    findOrCreateUserBySupabaseId: vi.fn(),
    getUserById: vi.fn(),
    getUserUsage: vi.fn(),
    updateUserCounty: vi.fn(),
    getUserQueries: vi.fn(),
    getProtocolStats: vi.fn().mockResolvedValue({
      totalProtocols: 150,
      totalAgencies: 25,
      totalStates: 5,
    }),
    getTotalProtocolStats: vi.fn().mockResolvedValue({
      totalProtocols: 150,
      totalAgencies: 25,
      totalStates: 5,
    }),
    getProtocolCoverageByState: vi.fn().mockResolvedValue([
      { state: "CA", agencyCount: 10 },
      { state: "WA", agencyCount: 5 },
    ]),
    getAgenciesByState: vi.fn().mockResolvedValue([
      { id: 1, name: "Los Angeles County", protocolCount: 50 },
    ]),
    getAgenciesWithProtocols: vi.fn().mockResolvedValue([
      { id: 1, name: "Los Angeles County", state: "CA", protocolCount: 50 },
    ]),
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                protocol_number: "P-001",
                protocol_title: "Cardiac Arrest Management",
                section: "Adult Cardiac",
                content: "Begin CPR immediately. Assess rhythm.",
              },
            ]),
          }),
        }),
      }),
    }),
  };
});

vi.mock("../../server/db-user-counties", () => ({
  getUserCounties: vi.fn(),
  canUserAddCounty: vi.fn(),
  addUserCounty: vi.fn(),
  removeUserCounty: vi.fn(),
  setUserPrimaryCounty: vi.fn(),
  getUserPrimaryCounty: vi.fn(),
}));

vi.mock("../../server/db-agency-mapping", () => ({
  mapCountyIdToAgencyId: vi.fn().mockResolvedValue(1),
  getAgencyByCountyId: vi.fn().mockResolvedValue({
    id: 1,
    name: "Los Angeles County Fire Department",
    state_code: "CA",
  }),
}));

vi.mock("../../server/_core/search-cache", () => ({
  getSearchCacheKey: vi.fn((params) => `search:${params.query}:${params.agencyId}`),
  getCachedSearchResults: vi.fn().mockResolvedValue(null),
  cacheSearchResults: vi.fn().mockResolvedValue(undefined),
  setSearchCacheHeaders: vi.fn(),
}));

vi.mock("../../server/_core/rag-optimizer", () => ({
  optimizedSearch: vi.fn(async (params, searchFn) => {
    const results = await searchFn(params);
    return {
      results: results.map((r: any) => ({
        ...r,
        rerankedScore: r.similarity,
      })),
      metrics: {
        cacheHit: false,
        rerankingMs: 50,
      },
    };
  }),
  latencyMonitor: {
    record: vi.fn(),
  },
}));

vi.mock("../../server/_core/ems-query-normalizer", () => ({
  normalizeEmsQuery: vi.fn((query) => ({
    original: query,
    normalized: query.toLowerCase(),
    isComplex: false,
    intent: "general_search",
    extractedMedications: [],
    expandedAbbreviations: [],
    correctedTypos: [],
  })),
}));

// Test data
const testUser = {
  id: 1,
  openId: "test-open-id",
  supabaseId: "test-supabase-123",
  email: "paramedic@test.com",
  name: "Test Paramedic",
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
};

const proUser = {
  ...testUser,
  id: 2,
  email: "pro@test.com",
  tier: "pro",
  stripeCustomerId: "cus_test_123",
  subscriptionId: "sub_test_123",
  subscriptionStatus: "active",
  subscriptionEndDate: new Date("2025-12-31"),
};

// Helper to create tRPC caller with context
function createCaller(user: typeof testUser | null = testUser) {
  const ctx: TrpcContext = {
    req: {} as any,
    res: {
      setHeader: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
    user,
  };

  return appRouter.createCaller(ctx);
}

describe("User Journey Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 1: User Authentication", () => {
    it("should authenticate user and return profile", async () => {
      const caller = createCaller(testUser);

      const result = await caller.auth.me();

      expect(result).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        tier: "free",
      });
    });

    it("should return null for unauthenticated user", async () => {
      const caller = createCaller(null);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });

    it("should handle user logout", async () => {
      const caller = createCaller(testUser);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
    });
  });

  describe("Step 2: Subscription Management", () => {
    it("should create checkout session for free user", async () => {
      const caller = createCaller(testUser);

      const result = await caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://app.test.com/success",
        cancelUrl: "https://app.test.com/cancel",
      });

      expect(result).toMatchObject({
        success: true,
        url: expect.stringContaining("checkout.stripe.com"),
      });
    });

    it("should create annual checkout session", async () => {
      const caller = createCaller(testUser);

      const result = await caller.subscription.createCheckout({
        plan: "annual",
        successUrl: "https://app.test.com/success",
        cancelUrl: "https://app.test.com/cancel",
      });

      expect(result).toMatchObject({
        success: true,
        url: expect.stringContaining("checkout.stripe.com"),
      });
    });

    it("should get subscription status for free user", async () => {
      const db = await import("../../server/db");
      vi.mocked(db.getUserById).mockResolvedValue(testUser);

      const caller = createCaller(testUser);

      const result = await caller.subscription.status();

      expect(result).toMatchObject({
        tier: "free",
        subscriptionStatus: null,
        subscriptionEndDate: null,
      });
    });

    it("should get subscription status for pro user", async () => {
      const db = await import("../../server/db");
      vi.mocked(db.getUserById).mockResolvedValue(proUser);

      const caller = createCaller(proUser);

      const result = await caller.subscription.status();

      expect(result).toMatchObject({
        tier: "pro",
        subscriptionStatus: "active",
      });
      expect(result.subscriptionEndDate).toBeTruthy();
    });

    it("should create customer portal session for pro user", async () => {
      const caller = createCaller(proUser);

      const result = await caller.subscription.createPortal({
        returnUrl: "https://app.test.com/settings",
      });

      expect(result).toMatchObject({
        success: true,
        url: expect.stringContaining("billing.stripe.com"),
      });
    });

    it("should reject portal creation for free user without stripe customer", async () => {
      const caller = createCaller(testUser);

      const result = await caller.subscription.createPortal({
        returnUrl: "https://app.test.com/settings",
      });

      expect(result).toMatchObject({
        success: false,
        error: "No subscription found",
      });
    });
  });

  describe("Step 3: Protocol Search", () => {
    it("should search protocols without authentication", async () => {
      const caller = createCaller(null);

      const result = await caller.search.semantic({
        query: "cardiac arrest",
        limit: 10,
      });

      expect(result).toMatchObject({
        results: expect.arrayContaining([
          expect.objectContaining({
            protocolNumber: "P-001",
            protocolTitle: "Cardiac Arrest Management",
            relevanceScore: expect.any(Number),
          }),
        ]),
        totalFound: expect.any(Number),
        query: "cardiac arrest",
        fromCache: false,
      });
    });

    it("should search protocols with authentication", async () => {
      const caller = createCaller(testUser);

      const result = await caller.search.semantic({
        query: "respiratory distress",
        limit: 5,
      });

      expect(result.results).toHaveLength(2);
      expect(result.normalizedQuery).toBe("respiratory distress");
    });

    it("should search protocols by agency", async () => {
      const caller = createCaller(testUser);

      const result = await caller.search.searchByAgency({
        query: "stroke protocol",
        agencyId: 1,
        limit: 10,
      });

      expect(result).toMatchObject({
        results: expect.any(Array),
        totalFound: expect.any(Number),
        query: "stroke protocol",
        fromCache: false,
      });
    });

    it("should get protocol statistics", async () => {
      const caller = createCaller(null);

      const result = await caller.search.stats();

      expect(result).toMatchObject({
        totalProtocols: 150,
        totalAgencies: 25,
        totalStates: 5,
      });
    });

    it("should handle search with state filter", async () => {
      const caller = createCaller(testUser);

      const result = await caller.search.semantic({
        query: "trauma protocol",
        stateFilter: "CA",
        limit: 10,
      });

      expect(result).toHaveProperty("results");
      expect(result.results).toBeInstanceOf(Array);
    });

    it("should get protocol by ID", async () => {
      const caller = createCaller(null);

      const result = await caller.search.getProtocol({ id: 1 });

      expect(result).toMatchObject({
        id: 1,
        protocol_number: "P-001",
        protocol_title: "Cardiac Arrest Management",
      });
    });
  });

  describe("Step 4: Save Counties (Bookmarks)", () => {
    it("should get saved counties for user", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.getUserCounties).mockResolvedValue([
        {
          id: 1,
          userId: testUser.id,
          countyId: 1,
          isPrimary: true,
          addedAt: new Date(),
        },
      ]);
      vi.mocked(dbCounties.canUserAddCounty).mockResolvedValue({
        canAdd: false,
        currentCount: 1,
        maxAllowed: 1,
        tier: "free",
      });

      const caller = createCaller(testUser);

      const result = await caller.user.savedCounties();

      expect(result).toMatchObject({
        counties: expect.arrayContaining([
          expect.objectContaining({
            countyId: 1,
            isPrimary: true,
          }),
        ]),
        canAdd: false,
        currentCount: 1,
        maxAllowed: 1,
        tier: "free",
      });
    });

    it("should add county for free user (within limit)", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: true,
      });

      const caller = createCaller(testUser);

      const result = await caller.user.addCounty({
        countyId: 2,
        isPrimary: false,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });

    it("should reject adding county when limit reached", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: false,
        error: "Maximum county limit reached for free tier",
      });

      const caller = createCaller(testUser);

      await expect(
        caller.user.addCounty({
          countyId: 3,
          isPrimary: false,
        })
      ).rejects.toThrow();
    });

    it("should remove county", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.removeUserCounty).mockResolvedValue({
        success: true,
      });

      const caller = createCaller(testUser);

      const result = await caller.user.removeCounty({
        countyId: 1,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });

    it("should set primary county", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.setUserPrimaryCounty).mockResolvedValue({
        success: true,
      });

      const caller = createCaller(testUser);

      const result = await caller.user.setPrimaryCounty({
        countyId: 1,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });

    it("should get primary county", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.getUserPrimaryCounty).mockResolvedValue({
        id: 1,
        userId: testUser.id,
        countyId: 1,
        isPrimary: true,
        addedAt: new Date(),
      });

      const caller = createCaller(testUser);

      const result = await caller.user.primaryCounty();

      expect(result).toMatchObject({
        countyId: 1,
        isPrimary: true,
      });
    });

    it("should allow pro user to add unlimited counties", async () => {
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.canUserAddCounty).mockResolvedValue({
        canAdd: true,
        currentCount: 5,
        maxAllowed: 999,
        tier: "pro",
      });
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: true,
      });

      const caller = createCaller(proUser);

      const result = await caller.user.addCounty({
        countyId: 6,
        isPrimary: false,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  describe("Complete User Journey", () => {
    it("should complete full flow: auth -> search -> save -> subscribe", async () => {
      // Step 1: Authenticate
      let caller = createCaller(testUser);
      let result = await caller.auth.me();

      expect(result).toMatchObject({
        id: testUser.id,
        tier: "free",
      });

      // Step 2: Search protocols (free tier)
      const searchResult = await caller.search.semantic({
        query: "cardiac arrest",
        limit: 10,
      });

      expect(searchResult.results.length).toBeGreaterThan(0);

      // Step 3: Save a county (within free limit)
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: true,
      });

      const addResult = await caller.user.addCounty({
        countyId: 1,
        isPrimary: true,
      });

      expect(addResult.success).toBe(true);

      // Step 4: Try to add second county (should hit limit)
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: false,
        error: "Maximum county limit reached for free tier",
      });

      await expect(
        caller.user.addCounty({
          countyId: 2,
          isPrimary: false,
        })
      ).rejects.toThrow();

      // Step 5: Subscribe to Pro
      const checkoutResult = await caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://app.test.com/success",
        cancelUrl: "https://app.test.com/cancel",
      });

      expect(checkoutResult.url).toContain("checkout.stripe.com");

      // Step 6: After upgrade, user can add unlimited counties
      const db = await import("../../server/db");
      vi.mocked(db.getUserById).mockResolvedValue(proUser);
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: true,
      });

      caller = createCaller(proUser);

      const proAddResult = await caller.user.addCounty({
        countyId: 2,
        isPrimary: false,
      });

      expect(proAddResult.success).toBe(true);
    });

    it("should handle search -> save -> upgrade flow for paramedic", async () => {
      const paramedic = {
        ...testUser,
        email: "john.doe@fire.dept",
        name: "John Doe",
      };

      const caller = createCaller(paramedic);

      // Search for specific protocol
      const searchResult = await caller.search.semantic({
        query: "epinephrine dosing cardiac arrest",
        limit: 5,
      });

      expect(searchResult.results[0].protocolTitle).toContain("Cardiac Arrest");

      // Try to save multiple counties (should fail on free tier)
      const dbCounties = await import("../../server/db-user-counties");
      vi.mocked(dbCounties.getUserCounties).mockResolvedValue([]);
      vi.mocked(dbCounties.canUserAddCounty).mockResolvedValue({
        canAdd: true,
        currentCount: 0,
        maxAllowed: 1,
        tier: "free",
      });
      vi.mocked(dbCounties.addUserCounty).mockResolvedValue({
        success: true,
      });

      // Add first county (success)
      const firstCounty = await caller.user.addCounty({
        countyId: 1,
        isPrimary: true,
      });

      expect(firstCounty.success).toBe(true);

      // Check saved counties
      vi.mocked(dbCounties.getUserCounties).mockResolvedValue([
        {
          id: 1,
          userId: paramedic.id,
          countyId: 1,
          isPrimary: true,
          addedAt: new Date(),
        },
      ]);
      vi.mocked(dbCounties.canUserAddCounty).mockResolvedValue({
        canAdd: false,
        currentCount: 1,
        maxAllowed: 1,
        tier: "free",
      });

      const savedCounties = await caller.user.savedCounties();

      expect(savedCounties.currentCount).toBe(1);
      expect(savedCounties.canAdd).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should reject protected routes for unauthenticated users", async () => {
      const caller = createCaller(null);

      await expect(
        caller.subscription.createCheckout({
          plan: "monthly",
          successUrl: "https://app.test.com/success",
          cancelUrl: "https://app.test.com/cancel",
        })
      ).rejects.toThrow();
    });

    it("should handle database errors gracefully", async () => {
      const db = await import("../../server/db");
      vi.mocked(db.getUserById).mockRejectedValue(new Error("Database connection failed"));

      const caller = createCaller(testUser);

      await expect(caller.subscription.status()).rejects.toThrow("Database connection failed");
    });

    it("should handle Stripe errors during checkout", async () => {
      const stripe = await import("stripe");
      const stripeMock = vi.mocked(stripe.default);
      stripeMock.mockImplementationOnce(() => ({
        checkout: {
          sessions: {
            create: vi.fn().mockRejectedValue(new Error("Stripe API error")),
          },
        },
      } as any));

      const caller = createCaller(testUser);

      const result = await caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://app.test.com/success",
        cancelUrl: "https://app.test.com/cancel",
      });

      // Should still return success: false with error
      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });
});
