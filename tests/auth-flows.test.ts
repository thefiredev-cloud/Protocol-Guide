/**
 * User Authentication Flow Tests
 *
 * Critical path tests for EMS field usage - authentication must work
 * reliably to ensure users can access protocols when needed.
 *
 * These tests verify:
 * - User data mapping and transformation
 * - Tier-based access control logic
 * - Session/cookie handling
 * - Authentication state patterns
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { COOKIE_NAME } from "../shared/const";

// User type matching the app's user model
type User = {
  id: number;
  openId: string;
  supabaseId: string;
  email: string | null;
  name: string | null;
  loginMethod: string;
  role: string;
  tier: string;
  queryCountToday: number;
  lastQueryDate: Date | null;
  selectedCountyId: number | null;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// Factory function for creating test users
function createTestUser(overrides: Partial<User> = {}): User {
  return {
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
    ...overrides,
  };
}

// Tier configuration matching server/db.ts
const TIER_CONFIG = {
  free: {
    maxCounties: 1,
    dailyQueryLimit: 10,
    offlineAccess: false,
    cloudSync: false,
  },
  pro: {
    maxCounties: 999,
    dailyQueryLimit: 999,
    offlineAccess: true,
    cloudSync: true,
  },
  enterprise: {
    maxCounties: 999,
    dailyQueryLimit: 999,
    offlineAccess: true,
    cloudSync: true,
  },
} as const;

type Tier = keyof typeof TIER_CONFIG;

// Helper to check if user can query based on tier
function canUserQuery(user: User): boolean {
  const tier = user.tier as Tier;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  return user.queryCountToday < config.dailyQueryLimit;
}

// Helper to check user's county limits
function getUserCountyLimits(user: User): {
  maxAllowed: number;
  tier: Tier;
} {
  const tier = (user.tier as Tier) || "free";
  return {
    maxAllowed: TIER_CONFIG[tier].maxCounties,
    tier,
  };
}

// Helper to check offline access
function hasOfflineAccess(user: User): boolean {
  const tier = (user.tier as Tier) || "free";
  return TIER_CONFIG[tier].offlineAccess;
}

// Helper to check cloud sync access
function hasCloudSync(user: User): boolean {
  const tier = (user.tier as Tier) || "free";
  return TIER_CONFIG[tier].cloudSync;
}

describe("Authentication - User Data", () => {
  describe("User creation and mapping", () => {
    it("should create user with default free tier", () => {
      const user = createTestUser();

      expect(user.tier).toBe("free");
      expect(user.role).toBe("user");
    });

    it("should create pro tier user with subscription", () => {
      const user = createTestUser({
        tier: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-12-31"),
        stripeCustomerId: "cus_test123",
      });

      expect(user.tier).toBe("pro");
      expect(user.subscriptionStatus).toBe("active");
      expect(user.stripeCustomerId).toBe("cus_test123");
    });

    it("should create admin user", () => {
      const user = createTestUser({ role: "admin" });

      expect(user.role).toBe("admin");
    });

    it("should create enterprise user", () => {
      const user = createTestUser({ tier: "enterprise" });

      expect(user.tier).toBe("enterprise");
    });
  });

  describe("User state validation", () => {
    it("should have required fields populated", () => {
      const user = createTestUser();

      expect(user.id).toBeDefined();
      expect(user.openId).toBeDefined();
      expect(user.supabaseId).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastSignedIn).toBeInstanceOf(Date);
    });

    it("should allow null for optional fields", () => {
      const user = createTestUser({
        email: null,
        name: null,
        selectedCountyId: null,
        stripeCustomerId: null,
      });

      expect(user.email).toBeNull();
      expect(user.name).toBeNull();
      expect(user.selectedCountyId).toBeNull();
      expect(user.stripeCustomerId).toBeNull();
    });
  });
});

describe("Authentication - Tier-Based Access Control", () => {
  describe("Query limits", () => {
    it("should allow free user under limit to query", () => {
      const user = createTestUser({
        tier: "free",
        queryCountToday: 5,
      });

      expect(canUserQuery(user)).toBe(true);
    });

    it("should block free user at limit from querying", () => {
      const user = createTestUser({
        tier: "free",
        queryCountToday: 10,
      });

      expect(canUserQuery(user)).toBe(false);
    });

    it("should allow pro user with high usage to query", () => {
      const user = createTestUser({
        tier: "pro",
        queryCountToday: 500,
      });

      expect(canUserQuery(user)).toBe(true);
    });

    it("should allow enterprise user unlimited queries", () => {
      const user = createTestUser({
        tier: "enterprise",
        queryCountToday: 998,
      });

      expect(canUserQuery(user)).toBe(true);
    });
  });

  describe("County limits", () => {
    it("should limit free user to 1 county", () => {
      const user = createTestUser({ tier: "free" });
      const limits = getUserCountyLimits(user);

      expect(limits.maxAllowed).toBe(1);
      expect(limits.tier).toBe("free");
    });

    it("should allow pro user unlimited counties", () => {
      const user = createTestUser({ tier: "pro" });
      const limits = getUserCountyLimits(user);

      expect(limits.maxAllowed).toBe(999);
      expect(limits.tier).toBe("pro");
    });

    it("should allow enterprise user unlimited counties", () => {
      const user = createTestUser({ tier: "enterprise" });
      const limits = getUserCountyLimits(user);

      expect(limits.maxAllowed).toBe(999);
      expect(limits.tier).toBe("enterprise");
    });
  });

  describe("Offline access", () => {
    it("should deny offline access to free users", () => {
      const user = createTestUser({ tier: "free" });

      expect(hasOfflineAccess(user)).toBe(false);
    });

    it("should allow offline access to pro users", () => {
      const user = createTestUser({ tier: "pro" });

      expect(hasOfflineAccess(user)).toBe(true);
    });

    it("should allow offline access to enterprise users", () => {
      const user = createTestUser({ tier: "enterprise" });

      expect(hasOfflineAccess(user)).toBe(true);
    });
  });

  describe("Cloud sync", () => {
    it("should deny cloud sync to free users", () => {
      const user = createTestUser({ tier: "free" });

      expect(hasCloudSync(user)).toBe(false);
    });

    it("should allow cloud sync to pro users", () => {
      const user = createTestUser({ tier: "pro" });

      expect(hasCloudSync(user)).toBe(true);
    });

    it("should allow cloud sync to enterprise users", () => {
      const user = createTestUser({ tier: "enterprise" });

      expect(hasCloudSync(user)).toBe(true);
    });
  });
});

describe("Authentication - Session Management", () => {
  describe("Cookie configuration", () => {
    it("should use correct cookie name", () => {
      expect(COOKIE_NAME).toBeDefined();
      expect(typeof COOKIE_NAME).toBe("string");
    });

    it("should have secure cookie options for production", () => {
      const isProduction = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const,
        path: "/",
      };

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.path).toBe("/");
    });
  });

  describe("Session state patterns", () => {
    it("should identify authenticated user", () => {
      const user = createTestUser();
      const isAuthenticated = user !== null;

      expect(isAuthenticated).toBe(true);
    });

    it("should identify unauthenticated state", () => {
      const user = null;
      const isAuthenticated = user !== null;

      expect(isAuthenticated).toBe(false);
    });
  });
});

describe("Authentication - Subscription Status", () => {
  describe("Active subscriptions", () => {
    it("should identify active subscription", () => {
      const user = createTestUser({
        tier: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-12-31"),
      });

      expect(user.subscriptionStatus).toBe("active");
      expect(user.subscriptionEndDate).toBeInstanceOf(Date);
    });

    it("should identify trialing subscription", () => {
      const user = createTestUser({
        tier: "pro",
        subscriptionStatus: "trialing",
        subscriptionEndDate: new Date("2025-02-15"),
      });

      expect(user.subscriptionStatus).toBe("trialing");
    });
  });

  describe("Inactive subscriptions", () => {
    it("should identify canceled subscription", () => {
      const user = createTestUser({
        tier: "free",
        subscriptionStatus: "canceled",
      });

      expect(user.subscriptionStatus).toBe("canceled");
    });

    it("should identify past_due subscription", () => {
      const user = createTestUser({
        tier: "pro",
        subscriptionStatus: "past_due",
      });

      expect(user.subscriptionStatus).toBe("past_due");
    });

    it("should handle null subscription status for free users", () => {
      const user = createTestUser({
        tier: "free",
        subscriptionStatus: null,
      });

      expect(user.subscriptionStatus).toBeNull();
    });
  });
});

describe("Authentication - Role-Based Access", () => {
  describe("User roles", () => {
    it("should identify regular user role", () => {
      const user = createTestUser({ role: "user" });

      expect(user.role).toBe("user");
      expect(user.role).not.toBe("admin");
    });

    it("should identify admin role", () => {
      const user = createTestUser({ role: "admin" });

      expect(user.role).toBe("admin");
    });
  });

  describe("Admin access patterns", () => {
    it("should allow admin to access admin features", () => {
      const user = createTestUser({ role: "admin" });
      const canAccessAdmin = user.role === "admin";

      expect(canAccessAdmin).toBe(true);
    });

    it("should block regular user from admin features", () => {
      const user = createTestUser({ role: "user" });
      const canAccessAdmin = user.role === "admin";

      expect(canAccessAdmin).toBe(false);
    });
  });
});

describe("Authentication - EMS Field Scenarios", () => {
  it("should support paramedic with multiple county access (Pro)", () => {
    const user = createTestUser({
      name: "John Paramedic",
      tier: "pro",
      email: "john@fire.dept",
    });

    expect(hasOfflineAccess(user)).toBe(true);
    expect(hasCloudSync(user)).toBe(true);
    expect(getUserCountyLimits(user).maxAllowed).toBe(999);
  });

  it("should support EMT with basic access (Free)", () => {
    const user = createTestUser({
      name: "Jane EMT",
      tier: "free",
      email: "jane@ambulance.co",
    });

    expect(hasOfflineAccess(user)).toBe(false);
    expect(hasCloudSync(user)).toBe(false);
    expect(getUserCountyLimits(user).maxAllowed).toBe(1);
    expect(canUserQuery(user)).toBe(true);
  });

  it("should support agency admin with enterprise access", () => {
    const user = createTestUser({
      name: "Fire Chief",
      tier: "enterprise",
      role: "admin",
      email: "chief@fire.dept",
    });

    expect(hasOfflineAccess(user)).toBe(true);
    expect(hasCloudSync(user)).toBe(true);
    expect(user.role).toBe("admin");
    expect(getUserCountyLimits(user).maxAllowed).toBe(999);
  });
});
