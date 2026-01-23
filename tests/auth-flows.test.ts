/**
 * User Authentication Flow Tests
 *
 * Critical path tests for EMS field usage - authentication must work
 * reliably to ensure users can access protocols when needed.
 *
 * These tests verify:
 * - Login and session management
 * - Logout and cookie clearing
 * - Protected route access control
 * - Tier-based feature access
 * - Session persistence and refresh
 * - Error handling in auth flows
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "../server/_core/context";

import * as db from "../server/db";
import * as stripe from "../server/stripe";
import * as dbUserCounties from "../server/db-user-counties";

// Mock database module
vi.mock("../server/db", () => ({
  getUserById: vi.fn(),
  getUserUsage: vi.fn(),
  canUserQuery: vi.fn(),
  findOrCreateUserBySupabaseId: vi.fn(),
  updateUserCounty: vi.fn(),
  getUserQueries: vi.fn(),
  createQuery: vi.fn(),
  incrementUserQueryCount: vi.fn(),
  createFeedback: vi.fn(),
  getUserFeedback: vi.fn(),
  createContactSubmission: vi.fn(),
  getAllCounties: vi.fn().mockResolvedValue([
    { id: 1, name: "Los Angeles County", state: "CA" },
    { id: 2, name: "San Francisco County", state: "CA" },
  ]),
  getCountyById: vi.fn(),
}));

// Mock user counties module
vi.mock("../server/db-user-counties", () => ({
  getUserCounties: vi.fn().mockResolvedValue([]),
  canUserAddCounty: vi.fn().mockResolvedValue({
    canAdd: true,
    currentCount: 0,
    maxAllowed: 1,
    tier: "free",
  }),
  addUserCounty: vi.fn(),
  removeUserCounty: vi.fn(),
  setUserPrimaryCounty: vi.fn(),
  getUserPrimaryCounty: vi.fn(),
  getUserSearchHistory: vi.fn().mockResolvedValue([]),
  syncSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  deleteSearchHistoryEntry: vi.fn(),
}));

// Mock Stripe module
vi.mock("../server/stripe", () => ({
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Helper to create authenticated context
function createAuthenticatedContext(
  userOverrides: Partial<AuthenticatedUser> = {}
): {
  ctx: TrpcContext;
  clearedCookies: { name: string; options: Record<string, unknown> }[];
  user: AuthenticatedUser;
} {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    supabaseId: "test-supabase-id",
    email: "paramedic@example.com",
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
    ...userOverrides,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: {
        authorization: "Bearer valid_token",
        cookie: `${COOKIE_NAME}=valid_session`,
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies, user };
}

// Helper to create unauthenticated context
function createUnauthenticatedContext(): {
  ctx: TrpcContext;
  clearedCookies: { name: string; options: Record<string, unknown> }[];
} {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("Authentication - Session Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth.me", () => {
    it("should return user data when authenticated", async () => {
      const { ctx, user } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe(user.email);
      expect(result?.name).toBe(user.name);
    });

    it("should return null when not authenticated", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });

    it("should include tier information in response", async () => {
      const { ctx } = createAuthenticatedContext({ tier: "pro" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result?.tier).toBe("pro");
    });

    it("should include subscription status for pro users", async () => {
      const { ctx } = createAuthenticatedContext({
        tier: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-12-31"),
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result?.subscriptionStatus).toBe("active");
      expect(result?.subscriptionEndDate).toBeInstanceOf(Date);
    });

    it("should include role information", async () => {
      const { ctx } = createAuthenticatedContext({ role: "admin" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result?.role).toBe("admin");
    });
  });

  describe("auth.logout", () => {
    it("should clear session cookie on logout", async () => {
      const { ctx, clearedCookies } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0].name).toBe(COOKIE_NAME);
    });

    it("should set maxAge to -1 to expire cookie", async () => {
      const { ctx, clearedCookies } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await caller.auth.logout();

      expect(clearedCookies[0].options).toMatchObject({
        maxAge: -1,
      });
    });

    it("should set httpOnly and path in cookie options", async () => {
      const { ctx, clearedCookies } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await caller.auth.logout();

      expect(clearedCookies[0].options).toMatchObject({
        httpOnly: true,
        path: "/",
      });
    });

    it("should work for unauthenticated users (no-op)", async () => {
      const { ctx, clearedCookies } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(clearedCookies).toHaveLength(1);
    });
  });
});

describe("Authentication - Protected Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getUserUsage).mockResolvedValue({
      tier: "free",
      count: 5,
      limit: 10,
    });
  });

  describe("User routes require authentication", () => {
    it("should block user.usage for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.usage()).rejects.toThrow();
    });

    it("should allow user.usage for authenticated users", async () => {
      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.usage();

      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("limit");
    });

    it("should block user.selectCounty for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.selectCounty({ countyId: 1 })).rejects.toThrow();
    });

    it("should block user.queries for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.queries({ limit: 10 })).rejects.toThrow();
    });

    it("should block user.savedCounties for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.savedCounties()).rejects.toThrow();
    });
  });

  describe("Query routes require authentication", () => {
    it("should block query.submit for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.query.submit({
          countyId: 1,
          queryText: "cardiac arrest",
        })
      ).rejects.toThrow();
    });

    it("should block query.history for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.query.history({ limit: 10 })).rejects.toThrow();
    });
  });

  describe("Voice routes require authentication", () => {
    it("should block voice.transcribe for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.voice.transcribe({
          audioUrl: "https://example.com/audio.webm",
        })
      ).rejects.toThrow();
    });

    it("should block voice.uploadAudio for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.voice.uploadAudio({
          audioBase64: "base64data",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow();
    });
  });

  describe("Feedback routes require authentication", () => {
    it("should block feedback.submit for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.feedback.submit({
          category: "suggestion",
          subject: "Test",
          message: "Test message",
        })
      ).rejects.toThrow();
    });

    it("should block feedback.myFeedback for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.feedback.myFeedback()).rejects.toThrow();
    });
  });

  describe("Subscription routes require authentication", () => {
    it("should block subscription.createCheckout for unauthenticated users", async () => {
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

    it("should block subscription.createPortal for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.subscription.createPortal({
          returnUrl: "https://example.com/account",
        })
      ).rejects.toThrow();
    });

    it("should block subscription.status for unauthenticated users", async () => {
      const { ctx } = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.subscription.status()).rejects.toThrow();
    });
  });
});

describe("Authentication - Tier-Based Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Free tier users", () => {
    it("should have limited query count", async () => {
      vi.mocked(db.getUserUsage).mockResolvedValue({
        tier: "free",
        count: 8,
        limit: 10,
      });

      const { ctx } = createAuthenticatedContext({ tier: "free" });
      const caller = appRouter.createCaller(ctx);

      const usage = await caller.user.usage();

      expect(usage.tier).toBe("free");
      expect(usage.limit).toBe(10);
    });

    it("should have limited county access", async () => {
      vi.mocked(dbUserCounties.canUserAddCounty).mockResolvedValue({
        canAdd: false,
        currentCount: 1,
        maxAllowed: 1,
        tier: "free",
      });

      const { ctx } = createAuthenticatedContext({ tier: "free" });
      const caller = appRouter.createCaller(ctx);

      const counties = await caller.user.savedCounties();

      expect(counties.maxAllowed).toBe(1);
      expect(counties.canAdd).toBe(false);
    });
  });

  describe("Pro tier users", () => {
    it("should have higher query limits", async () => {
      vi.mocked(db.getUserUsage).mockResolvedValue({
        tier: "pro",
        count: 50,
        limit: 999,
      });

      const { ctx } = createAuthenticatedContext({ tier: "pro" });
      const caller = appRouter.createCaller(ctx);

      const usage = await caller.user.usage();

      expect(usage.tier).toBe("pro");
      expect(usage.limit).toBe(999);
    });

    it("should have unlimited county access", async () => {
      vi.mocked(dbUserCounties.canUserAddCounty).mockResolvedValue({
        canAdd: true,
        currentCount: 50,
        maxAllowed: 999,
        tier: "pro",
      });

      const { ctx } = createAuthenticatedContext({ tier: "pro" });
      const caller = appRouter.createCaller(ctx);

      const counties = await caller.user.savedCounties();

      expect(counties.maxAllowed).toBe(999);
      expect(counties.canAdd).toBe(true);
    });
  });

  describe("Enterprise tier users", () => {
    it("should have enterprise features", async () => {
      vi.mocked(db.getUserUsage).mockResolvedValue({
        tier: "enterprise",
        count: 100,
        limit: 999,
      });

      const { ctx } = createAuthenticatedContext({ tier: "enterprise" });
      const caller = appRouter.createCaller(ctx);

      const usage = await caller.user.usage();

      expect(usage.tier).toBe("enterprise");
    });
  });
});

describe("Authentication - Subscription Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscription.createCheckout", () => {
    it("should create monthly checkout session", async () => {
      vi.mocked(stripe.createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session123",
      });

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain("stripe.com");
    });

    it("should create annual checkout session", async () => {
      vi.mocked(stripe.createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session456",
      });

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createCheckout({
        plan: "annual",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.success).toBe(true);
      expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "annual",
        })
      );
    });

    it("should handle Stripe errors gracefully", async () => {
      vi.mocked(stripe.createCheckoutSession).mockResolvedValue({
        error: "Card declined",
      });

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createCheckout({
        plan: "monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Card declined");
    });
  });

  describe("subscription.createPortal", () => {
    it("should create portal session for users with stripeCustomerId", async () => {
      vi.mocked(stripe.createCustomerPortalSession).mockResolvedValue({
        url: "https://billing.stripe.com/portal123",
      });

      const { ctx } = createAuthenticatedContext({
        stripeCustomerId: "cus_test123",
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createPortal({
        returnUrl: "https://example.com/account",
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain("stripe.com");
    });

    it("should return error when user has no stripeCustomerId", async () => {
      const { ctx } = createAuthenticatedContext({
        stripeCustomerId: null,
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createPortal({
        returnUrl: "https://example.com/account",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No subscription found");
    });
  });

  describe("subscription.status", () => {
    it("should return subscription status for active user", async () => {
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        tier: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-12-31"),
      });

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.status();

      expect(result.tier).toBe("pro");
      expect(result.subscriptionStatus).toBe("active");
    });

    it("should return free tier for users without subscription", async () => {
      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        tier: "free",
        subscriptionStatus: null,
        subscriptionEndDate: null,
      });

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.status();

      expect(result.tier).toBe("free");
      expect(result.subscriptionStatus).toBeNull();
    });

    it("should handle missing user gracefully", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(null);

      const { ctx } = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.status();

      expect(result.tier).toBe("free");
    });
  });
});

describe("Authentication - Public Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow unauthenticated access to counties.list", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw
    await expect(caller.counties.list()).resolves.toBeDefined();
  });

  it("should allow unauthenticated access to search.semantic", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw (will fail on actual search but not auth)
    await expect(
      caller.search.semantic({
        query: "cardiac arrest",
        limit: 10,
      })
    ).resolves.toBeDefined();
  });

  it("should allow unauthenticated access to contact.submit", async () => {
    vi.mocked(db.createContactSubmission).mockResolvedValue(undefined);

    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      message: "Test message for contact form",
    });

    expect(result).toBeDefined();
  });
});
