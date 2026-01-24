/**
 * Token Revocation Tests
 * Tests comprehensive token revocation mechanisms including:
 * - Password change token revocation
 * - Email change token revocation
 * - Logout all devices
 * - Permanent revocation
 * - Security incident handling
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { createMockTraceContext } from "./setup";
import {
  revokeUserTokens,
  permanentlyRevokeUserTokens,
  isTokenRevoked,
  getRevocationDetails,
  clearRevocation,
} from "../server/_core/token-blacklist";

// Mock Redis
const mockRedis = {
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
};

vi.mock("../server/_core/redis", () => ({
  getRedis: vi.fn().mockResolvedValue(mockRedis),
}));

// Mock Supabase admin
const mockSupabaseAdmin = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "supabase-user-id", email: "test@example.com" } },
      error: null,
    }),
    admin: {
      updateUserById: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

// Mock logger
vi.mock("../server/_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthenticatedContext(userOverrides: Partial<AuthenticatedUser> = {}): {
  ctx: TrpcContext;
  clearedCookies: Array<{ name: string; options: Record<string, unknown> }>;
} {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    supabaseId: "supabase-user-id",
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
        authorization: "Bearer test_token_123",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
    trace: createMockTraceContext(),
  };

  return { ctx, clearedCookies };
}

describe("Token Blacklist Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
  });

  it("should revoke user tokens with reason and metadata", async () => {
    const result = await revokeUserTokens("123", "password_change", { ip: "1.2.3.4" });

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:user:123",
      expect.stringContaining("password_change"),
      { ex: 7 * 24 * 3600 }
    );
  });

  it("should permanently revoke tokens without TTL", async () => {
    const result = await permanentlyRevokeUserTokens("123", "account_deletion");

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:permanent:123",
      expect.stringContaining("account_deletion")
      // No TTL parameter
    );
  });

  it("should detect revoked tokens", async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ reason: "password_change", revokedAt: Date.now() })
    );

    const isRevoked = await isTokenRevoked("123");
    expect(isRevoked).toBe(true);
  });

  it("should return false for non-revoked tokens", async () => {
    mockRedis.get.mockResolvedValue(null);

    const isRevoked = await isTokenRevoked("123");
    expect(isRevoked).toBe(false);
  });

  it("should get revocation details", async () => {
    const revocationRecord = {
      reason: "security_incident",
      revokedAt: Date.now(),
      metadata: { ip: "1.2.3.4" },
    };

    mockRedis.get.mockResolvedValueOnce(JSON.stringify(revocationRecord));

    const details = await getRevocationDetails("123");
    expect(details).toMatchObject({
      reason: "security_incident",
      metadata: { ip: "1.2.3.4" },
    });
  });

  it("should clear revocation from both temporary and permanent storage", async () => {
    const result = await clearRevocation("123");

    expect(result).toBe(true);
    expect(mockRedis.del).toHaveBeenCalledWith("revoked:user:123");
    expect(mockRedis.del).toHaveBeenCalledWith("revoked:permanent:123");
  });
});

describe("auth.changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should change password and revoke all tokens", async () => {
    const { ctx, clearedCookies } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.changePassword({
      currentPassword: "oldPassword123",
      newPassword: "newSecurePassword123!",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Please sign in again");

    // Verify password was updated in Supabase
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      "supabase-user-id",
      { password: "newSecurePassword123!" }
    );

    // Verify all sessions were signed out
    expect(mockSupabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith(
      "supabase-user-id",
      "global"
    );

    // Verify tokens were revoked in Redis
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:user:1",
      expect.stringContaining("password_change"),
      expect.any(Object)
    );

    // Verify current session cookie was cleared
    expect(clearedCookies.length).toBeGreaterThan(0);
  });

  it("should reject password change without token", async () => {
    const { ctx } = createAuthenticatedContext();
    ctx.req.headers.authorization = undefined;
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "oldPassword",
        newPassword: "newPassword123",
      })
    ).rejects.toThrow("No authentication token provided");
  });

  it("should reject weak passwords", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "oldPassword",
        newPassword: "weak",
      })
    ).rejects.toThrow();
  });

  it("should handle Supabase errors gracefully", async () => {
    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
      error: { message: "Password too weak" },
    });

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "oldPassword",
        newPassword: "newPassword123",
      })
    ).rejects.toThrow("Failed to update password");
  });
});

describe("auth.updateEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update email and revoke all tokens", async () => {
    const { ctx, clearedCookies } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.updateEmail({
      newEmail: "newemail@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Please check your new email");

    // Verify email was updated in Supabase
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      "supabase-user-id",
      { email: "newemail@example.com" }
    );

    // Verify all sessions were signed out
    expect(mockSupabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith(
      "supabase-user-id",
      "global"
    );

    // Verify tokens were revoked with metadata
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:user:1",
      expect.stringContaining("email_change"),
      expect.any(Object)
    );

    const callArg = mockRedis.set.mock.calls[0][1] as string;
    const parsedArg = JSON.parse(callArg);
    expect(parsedArg.metadata).toMatchObject({
      oldEmail: "test@example.com",
      newEmail: "newemail@example.com",
    });

    // Verify current session cookie was cleared
    expect(clearedCookies.length).toBeGreaterThan(0);
  });

  it("should reject invalid email format", async () => {
    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.updateEmail({
        newEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("should handle duplicate email errors", async () => {
    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
      error: { message: "Email already exists" },
    });

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.updateEmail({
        newEmail: "duplicate@example.com",
      })
    ).rejects.toThrow("Email may already be in use");
  });
});

describe("auth.logoutAllDevices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should logout from all devices and revoke tokens", async () => {
    const { ctx, clearedCookies } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logoutAllDevices();

    expect(result.success).toBe(true);
    expect(result.revoked).toBe(true);

    // Verify tokens were revoked
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:user:1",
      expect.stringContaining("user_initiated_logout_all"),
      expect.any(Object)
    );

    // Verify current session cookie was cleared
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("auth.securityStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return security status when tokens are revoked", async () => {
    const revocationRecord = {
      reason: "suspicious_activity",
      revokedAt: Date.now(),
      metadata: { ip: "1.2.3.4" },
    };

    mockRedis.get.mockResolvedValueOnce(JSON.stringify(revocationRecord));

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.auth.securityStatus();

    expect(status.isRevoked).toBe(true);
    expect(status.revocationReason).toBe("suspicious_activity");
    expect(status.metadata).toMatchObject({ ip: "1.2.3.4" });
  });

  it("should return clean status when tokens are not revoked", async () => {
    mockRedis.get.mockResolvedValue(null);

    const { ctx } = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.auth.securityStatus();

    expect(status.isRevoked).toBe(false);
    expect(status.revocationReason).toBe(null);
  });
});

describe("Token Revocation Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prevent access after password change", async () => {
    // Simulate token revocation
    mockRedis.get.mockResolvedValue(
      JSON.stringify({
        reason: "password_change",
        revokedAt: Date.now(),
      })
    );

    // The context creation would check isTokenRevoked
    // In real implementation, context.ts checks this
    const isRevoked = await isTokenRevoked("1");
    expect(isRevoked).toBe(true);
  });

  it("should handle permanent revocation for deleted accounts", async () => {
    const result = await permanentlyRevokeUserTokens("123", "account_deletion");

    expect(result).toBe(true);

    // Permanent revocations have no expiry
    expect(mockRedis.set).toHaveBeenCalledWith(
      "revoked:permanent:123",
      expect.any(String)
      // Note: no ex parameter for permanent
    );
  });

  it("should check both temporary and permanent revocations", async () => {
    // First call (temporary) returns null, second call (permanent) returns revocation
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        JSON.stringify({
          reason: "account_deletion",
          revokedAt: Date.now(),
        })
      );

    const isRevoked = await isTokenRevoked("123");
    expect(isRevoked).toBe(true);

    // Should have checked both keys
    expect(mockRedis.get).toHaveBeenCalledWith("revoked:user:123");
    expect(mockRedis.get).toHaveBeenCalledWith("revoked:permanent:123");
  });
});

describe("Revocation Reasons", () => {
  it("should support all revocation reasons", async () => {
    const reasons = [
      "password_change",
      "email_change",
      "user_initiated_logout_all",
      "security_incident",
      "account_deletion",
      "suspicious_activity",
      "admin_action",
    ] as const;

    for (const reason of reasons) {
      await revokeUserTokens("123", reason);
      const call = mockRedis.set.mock.calls.pop();
      expect(call?.[1]).toContain(reason);
    }
  });
});
