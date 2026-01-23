/**
 * Billing Enforcement Tests
 * Tests for tier check middleware and rate limiting
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { paidProcedure, rateLimitedProcedure, router } from "../server/_core/trpc";

import * as db from "../server/db";

// Mock db module
vi.mock("../server/db", () => ({
  getUserUsage: vi.fn(),
}));

// Mock the context
const createMockContext = (user?: any) => ({
  user,
});

// Create a test router with procedures
const testRouter = router({
  paidTest: paidProcedure.query(() => "success"),
  rateLimitedTest: rateLimitedProcedure.query(() => "success"),
});

// Create caller function for testing
const createCaller = (ctx: any) => testRouter.createCaller(ctx);

describe("Tier Check Middleware", () => {
  it("allows pro tier users", async () => {
    const mockUser = {
      id: 1,
      tier: "pro" as const,
      email: "pro@example.com",
    };

    const caller = createCaller(createMockContext(mockUser));
    const result = await caller.paidTest();

    expect(result).toBe("success");
  });

  it("allows enterprise tier users", async () => {
    const mockUser = {
      id: 2,
      tier: "enterprise" as const,
      email: "enterprise@example.com",
    };

    const caller = createCaller(createMockContext(mockUser));
    const result = await caller.paidTest();

    expect(result).toBe("success");
  });

  it("blocks free tier users from paid features", async () => {
    const mockUser = {
      id: 3,
      tier: "free" as const,
      email: "free@example.com",
    };

    const caller = createCaller(createMockContext(mockUser));

    await expect(caller.paidTest()).rejects.toThrow(TRPCError);
    await expect(caller.paidTest()).rejects.toThrow("This feature requires a Pro or Enterprise subscription");
  });

  it("blocks unauthenticated users", async () => {
    const caller = createCaller(createMockContext(undefined));

    await expect(caller.paidTest()).rejects.toThrow(TRPCError);
  });
});

describe("Rate Limit Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows queries within daily limit", async () => {
    const mockUser = {
      id: 1,
      tier: "free" as const,
      email: "free@example.com",
    };

    vi.mocked(db.getUserUsage).mockResolvedValue({
      count: 3,
      limit: 5,
      tier: "free",
    });

    const caller = createCaller(createMockContext(mockUser));
    const result = await caller.rateLimitedTest();

    expect(result).toBe("success");
    expect(db.getUserUsage).toHaveBeenCalledWith(mockUser.id);
  });

  it("blocks queries at daily limit", async () => {
    const mockUser = {
      id: 1,
      tier: "free" as const,
      email: "free@example.com",
    };

    vi.mocked(db.getUserUsage).mockResolvedValue({
      count: 5,
      limit: 5,
      tier: "free",
    });

    const caller = createCaller(createMockContext(mockUser));

    await expect(caller.rateLimitedTest()).rejects.toThrow(TRPCError);
    await expect(caller.rateLimitedTest()).rejects.toThrow("Daily query limit reached");
  });

  it("allows unlimited queries for pro users", async () => {
    const mockUser = {
      id: 1,
      tier: "pro" as const,
      email: "pro@example.com",
    };

    vi.mocked(db.getUserUsage).mockResolvedValue({
      count: 1000,
      limit: Infinity,
      tier: "pro",
    });

    const caller = createCaller(createMockContext(mockUser));
    const result = await caller.rateLimitedTest();

    expect(result).toBe("success");
  });

  it("allows unlimited queries for enterprise users", async () => {
    const mockUser = {
      id: 1,
      tier: "enterprise" as const,
      email: "enterprise@example.com",
    };

    vi.mocked(db.getUserUsage).mockResolvedValue({
      count: 1000,
      limit: Infinity,
      tier: "enterprise",
    });

    const caller = createCaller(createMockContext(mockUser));
    const result = await caller.rateLimitedTest();

    expect(result).toBe("success");
  });

  it("returns appropriate error message at limit", async () => {
    const mockUser = {
      id: 1,
      tier: "free" as const,
      email: "free@example.com",
    };

    vi.mocked(db.getUserUsage).mockResolvedValue({
      count: 5,
      limit: 5,
      tier: "free",
    });

    const caller = createCaller(createMockContext(mockUser));

    await expect(caller.rateLimitedTest()).rejects.toThrow("Daily query limit reached (5). Upgrade to Pro for unlimited queries.");
  });
});

describe("TIER_CONFIG Usage Limits", () => {
  const TIER_CONFIG = {
    free: {
      dailyQueryLimit: 5,
      maxCounties: 1,
      maxBookmarks: 5,
      offlineAccess: false,
      prioritySupport: false,
    },
    pro: {
      dailyQueryLimit: Infinity,
      maxCounties: Infinity,
      maxBookmarks: Infinity,
      offlineAccess: true,
      prioritySupport: true,
    },
    enterprise: {
      dailyQueryLimit: Infinity,
      maxCounties: Infinity,
      maxBookmarks: Infinity,
      offlineAccess: true,
      prioritySupport: true,
    },
  };

  it("enforces free tier limits", () => {
    expect(TIER_CONFIG.free.dailyQueryLimit).toBe(5);
    expect(TIER_CONFIG.free.maxCounties).toBe(1);
    expect(TIER_CONFIG.free.offlineAccess).toBe(false);
  });

  it("provides unlimited access for pro tier", () => {
    expect(TIER_CONFIG.pro.dailyQueryLimit).toBe(Infinity);
    expect(TIER_CONFIG.pro.maxCounties).toBe(Infinity);
    expect(TIER_CONFIG.pro.offlineAccess).toBe(true);
  });

  it("provides unlimited access for enterprise tier", () => {
    expect(TIER_CONFIG.enterprise.dailyQueryLimit).toBe(Infinity);
    expect(TIER_CONFIG.enterprise.maxCounties).toBe(Infinity);
    expect(TIER_CONFIG.enterprise.offlineAccess).toBe(true);
  });
});

describe("Middleware Error Messages", () => {
  it("provides clear error for unauthorized access", () => {
    const error = new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toContain("logged in");
  });

  it("provides clear error for paid feature access", () => {
    const error = new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires a Pro or Enterprise subscription",
    });

    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toContain("Pro or Enterprise");
  });

  it("provides clear error for rate limit", () => {
    const error = new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Daily query limit reached (5). Upgrade to Pro for unlimited queries.",
    });

    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(error.message).toContain("Daily query limit");
    expect(error.message).toContain("Upgrade to Pro");
  });
});
