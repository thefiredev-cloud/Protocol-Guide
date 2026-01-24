/**
 * Token Refresh Race Condition Tests
 * Tests the fixes for concurrent token refresh issues
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { tokenCache } from "../lib/token-cache";
import type { Session } from "@supabase/supabase-js";

// Mock Supabase
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { supabase } from "../lib/supabase";

describe("Token Refresh Race Condition Fixes", () => {
  beforeEach(() => {
    // Clear cache before each test
    tokenCache.clear();
    vi.clearAllMocks();
  });

  it("should prevent concurrent refresh requests using mutex", async () => {
    const mockSession: Session = {
      access_token: "new-token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    // Mock refresh to take some time
    let refreshCallCount = 0;
    vi.mocked(supabase.auth.refreshSession).mockImplementation(async () => {
      refreshCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    });

    // Trigger 5 concurrent refresh requests
    const refreshPromises = [
      tokenCache.refreshSession(),
      tokenCache.refreshSession(),
      tokenCache.refreshSession(),
      tokenCache.refreshSession(),
      tokenCache.refreshSession(),
    ];

    const results = await Promise.all(refreshPromises);

    // Should only call refresh once due to mutex
    expect(refreshCallCount).toBe(1);

    // All results should be the same session
    results.forEach((session) => {
      expect(session).toEqual(mockSession);
    });
  });

  it("should cache session to prevent redundant getSession calls", async () => {
    const mockSession: Session = {
      access_token: "cached-token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    let getSessionCallCount = 0;
    vi.mocked(supabase.auth.getSession).mockImplementation(async () => {
      getSessionCallCount++;
      return { data: { session: mockSession }, error: null };
    });

    // Make multiple concurrent getSession calls
    const sessionPromises = [
      tokenCache.getSession(),
      tokenCache.getSession(),
      tokenCache.getSession(),
      tokenCache.getSession(),
      tokenCache.getSession(),
    ];

    const results = await Promise.all(sessionPromises);

    // Should only call getSession once, then use cache
    expect(getSessionCallCount).toBe(1);

    // All results should be the same
    results.forEach((session) => {
      expect(session).toEqual(mockSession);
    });
  });

  it("should automatically refresh when session is near expiry", async () => {
    const expiringSoon = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now

    const expiringSession: Session = {
      access_token: "expiring-token",
      refresh_token: "refresh-token",
      expires_at: expiringSoon,
      expires_in: 120,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    const freshSession: Session = {
      ...expiringSession,
      access_token: "fresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: expiringSession },
      error: null,
    });

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: freshSession, user: freshSession.user },
      error: null,
    });

    // First call gets the expiring session
    const session1 = await tokenCache.getSession();
    expect(session1?.access_token).toBe("expiring-token");

    // getSessionWithRefresh should trigger automatic refresh
    const session2 = await tokenCache.getSessionWithRefresh();
    expect(session2?.access_token).toBe("fresh-token");
    expect(vi.mocked(supabase.auth.refreshSession)).toHaveBeenCalledTimes(1);
  });

  it("should not refresh if session is still valid", async () => {
    const validSession: Session = {
      access_token: "valid-token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: validSession },
      error: null,
    });

    // Call getSessionWithRefresh multiple times
    await tokenCache.getSessionWithRefresh();
    await tokenCache.getSessionWithRefresh();
    await tokenCache.getSessionWithRefresh();

    // Should NOT trigger refresh since session is valid
    expect(vi.mocked(supabase.auth.refreshSession)).not.toHaveBeenCalled();
  });

  it("should handle refresh failure gracefully", async () => {
    const mockSession: Session = {
      access_token: "token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 60, // Expiring soon
      expires_in: 60,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Refresh failed", name: "AuthError", status: 401 },
    });

    const result = await tokenCache.refreshSession();

    expect(result).toBeNull();
    // Cache should be cleared on failure
    const status = tokenCache.getStatus();
    expect(status.hasCachedSession).toBe(false);
  });

  it("should clear cache on logout", () => {
    const mockSession: Session = {
      access_token: "token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    // Manually set cache
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Get session to populate cache
    tokenCache.getSession();

    // Clear cache (simulating logout)
    tokenCache.clear();

    // Cache should be empty
    const status = tokenCache.getStatus();
    expect(status.hasCachedSession).toBe(false);
    expect(status.refreshInProgress).toBe(false);
  });

  it("should return same promise for concurrent refresh calls", async () => {
    const mockSession: Session = {
      access_token: "token",
      refresh_token: "refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    };

    vi.mocked(supabase.auth.refreshSession).mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { session: mockSession, user: mockSession.user }, error: null });
          }, 200);
        })
    );

    // Start multiple refreshes simultaneously
    const promise1 = tokenCache.refreshSession();
    const promise2 = tokenCache.refreshSession();
    const promise3 = tokenCache.refreshSession();

    // All should be the same promise reference
    expect(promise1).toBe(promise2);
    expect(promise2).toBe(promise3);

    const results = await Promise.all([promise1, promise2, promise3]);

    // All should get the same result
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });
});
