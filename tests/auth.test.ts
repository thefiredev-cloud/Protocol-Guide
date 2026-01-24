/**
 * Auth Flow Tests
 * Tests authentication-related functionality including login context,
 * user session management, and protected procedures
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "../server/_core/context";
import { createMockTraceContext } from "./setup";

// Mock the database module
vi.mock("../server/db", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    email: "test@example.com",
    name: "Test User",
    tier: "free",
    stripeCustomerId: null,
  }),
  getUserUsage: vi.fn().mockResolvedValue({
    tier: "free",
    count: 5,
    limit: 10,
  }),
  canUserQuery: vi.fn().mockResolvedValue(true),
  findOrCreateUserBySupabaseId: vi.fn().mockResolvedValue({
    id: 1,
    email: "test@example.com",
    name: "Test User",
    tier: "free",
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthenticatedContext(userOverrides: Partial<AuthenticatedUser> = {}) {
  type CookieCall = { name: string; options: Record<string, unknown> };
  const clearedCookies: CookieCall[] = [];

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
      headers: {
        authorization: "Bearer test_token",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
    trace: createMockTraceContext(),
  };

  return { ctx, clearedCookies, user };
}

function createUnauthenticatedContext() {
  type CookieCall = { name: string; options: Record<string, unknown> };
  const clearedCookies: CookieCall[] = [];

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
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.me", () => {
  it("returns user data when authenticated", async () => {
    const { ctx, user } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).not.toBeNull();
    expect(result?.id).toBe(user.id);
    expect(result?.email).toBe(user.email);
    expect(result?.name).toBe(user.name);
  });

  it("returns null when not authenticated", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });

  it("returns user tier and subscription info", async () => {
    const { ctx } = createAuthenticatedContext({
      tier: "pro",
      subscriptionStatus: "active",
      subscriptionEndDate: new Date("2025-12-31"),
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result?.tier).toBe("pro");
    expect(result?.subscriptionStatus).toBe("active");
    expect(result?.subscriptionEndDate).toBeInstanceOf(Date);
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });

  it("works for unauthenticated users", async () => {
    const { ctx, clearedCookies } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("protected procedures authorization", () => {
  it("user.usage requires authentication", async () => {
    const { ctx } = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.user.usage()).rejects.toThrow();
  });

  it("user.usage works for authenticated users", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.usage();

    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("limit");
  });
});

describe("user tier handling", () => {
  it("identifies free tier users", async () => {
    const { ctx } = createAuthenticatedContext({ tier: "free" });
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    expect(user?.tier).toBe("free");
  });

  it("identifies pro tier users", async () => {
    const { ctx } = createAuthenticatedContext({ tier: "pro" });
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    expect(user?.tier).toBe("pro");
  });
});
