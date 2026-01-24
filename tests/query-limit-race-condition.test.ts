/**
 * Query Limit Race Condition Security Test
 * Tests the atomic increment-and-check mechanism to prevent TOCTOU attacks
 *
 * VULNERABILITY: Previously, checking and incrementing query limits was done in two
 * separate operations, allowing parallel requests to bypass limits.
 *
 * FIX: Atomic increment-and-check in a single database operation prevents race conditions.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getDb } from "../server/db/connection";
import { incrementAndCheckQueryLimit } from "../server/db/users-usage";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Query Limit Race Condition Prevention", () => {
  let testUserId: number;
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test user with a clean state
    const [user] = await db.insert(users).values({
      email: `race-test-${Date.now()}@example.com`,
      tier: "free",
      queryCountToday: 0,
      lastQueryDate: new Date().toISOString().split('T')[0],
    }).returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    if (!db || !testUserId) return;

    // Clean up test user
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("atomically increments and checks query limit", async () => {
    // First request should succeed
    const result1 = await incrementAndCheckQueryLimit(testUserId, 10);
    expect(result1.allowed).toBe(true);
    expect(result1.newCount).toBe(1);

    // Second request should succeed
    const result2 = await incrementAndCheckQueryLimit(testUserId, 10);
    expect(result2.allowed).toBe(true);
    expect(result2.newCount).toBe(2);

    // Verify the database has the correct count
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(2);
  });

  it("prevents exceeding daily limit", async () => {
    const limit = 3;

    // Make 3 requests (should all succeed)
    const result1 = await incrementAndCheckQueryLimit(testUserId, limit);
    expect(result1.allowed).toBe(true);
    expect(result1.newCount).toBe(1);

    const result2 = await incrementAndCheckQueryLimit(testUserId, limit);
    expect(result2.allowed).toBe(true);
    expect(result2.newCount).toBe(2);

    const result3 = await incrementAndCheckQueryLimit(testUserId, limit);
    expect(result3.allowed).toBe(true);
    expect(result3.newCount).toBe(3);

    // 4th request should fail (at limit)
    const result4 = await incrementAndCheckQueryLimit(testUserId, limit);
    expect(result4.allowed).toBe(false);
    expect(result4.newCount).toBe(4);

    // Verify the database count is 4 (incremented even when not allowed)
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(4);
  });

  it("prevents race condition with parallel requests", async () => {
    const limit = 10;

    // Simulate 5 parallel requests that happen at the same time
    // In the old vulnerable code, these could all pass the check and all increment
    const parallelRequests = Array.from({ length: 5 }, () =>
      incrementAndCheckQueryLimit(testUserId, limit)
    );

    const results = await Promise.all(parallelRequests);

    // All should be allowed (within limit)
    results.forEach(result => {
      expect(result.allowed).toBe(true);
    });

    // The counts should be 1, 2, 3, 4, 5 (in some order due to race)
    const counts = results.map(r => r.newCount).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5]);

    // Final database count should be exactly 5
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(5);
  });

  it("prevents exceeding limit via parallel requests near the threshold", async () => {
    const limit = 10;

    // Pre-fill to 9 queries
    await db!.update(users)
      .set({ queryCountToday: 9 })
      .where(eq(users.id, testUserId));

    // Launch 5 parallel requests when user is at 9/10
    // In vulnerable code: all see 9/10, all pass, all increment -> 14/10
    // In fixed code: only 1 succeeds, rest get 10/10 or higher and fail
    const parallelRequests = Array.from({ length: 5 }, () =>
      incrementAndCheckQueryLimit(testUserId, limit)
    );

    const results = await Promise.all(parallelRequests);

    // Only 1 should be allowed (count goes to 10)
    const allowedCount = results.filter(r => r.allowed).length;
    expect(allowedCount).toBe(1);

    // 4 should be denied
    const deniedCount = results.filter(r => !r.allowed).length;
    expect(deniedCount).toBe(4);

    // Final count should be 14 (9 + 5 parallel requests)
    // This is expected - we increment first, then check
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(14);

    // But only 1 request was allowed through
    const allowedResult = results.find(r => r.allowed);
    expect(allowedResult?.newCount).toBe(10);
  });

  it("resets count on new day", async () => {
    // Set user to yesterday with high count
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    await db!.update(users)
      .set({
        queryCountToday: 10,
        lastQueryDate: yesterdayStr,
      })
      .where(eq(users.id, testUserId));

    // Request on new day should reset to 1
    const result = await incrementAndCheckQueryLimit(testUserId, 10);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);

    // Verify database was reset
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(1);
    expect(user.lastQueryDate).toBe(new Date().toISOString().split('T')[0]);
  });

  it("handles unlimited tier (Infinity limit)", async () => {
    // For unlimited tiers, we skip the atomic check in the router
    // But the function should still work if called
    const result = await incrementAndCheckQueryLimit(testUserId, Infinity);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
  });

  it("correctly reports count when at exact limit", async () => {
    const limit = 5;

    // Pre-fill to exactly the limit
    await db!.update(users)
      .set({ queryCountToday: 5 })
      .where(eq(users.id, testUserId));

    // Next request should fail
    const result = await incrementAndCheckQueryLimit(testUserId, limit);
    expect(result.allowed).toBe(false);
    expect(result.newCount).toBe(6);
  });

  it("protects against TOCTOU attack scenario", async () => {
    /**
     * TOCTOU (Time-of-check to time-of-use) Attack Scenario:
     *
     * Attacker sends 10 parallel requests when at 9/10 limit
     * Old vulnerable code:
     *   1. All 10 requests read count=9, see they're under limit=10
     *   2. All 10 requests pass validation
     *   3. All 10 requests increment -> final count=19
     *   4. Attacker got 10 queries instead of 1
     *
     * New secure code:
     *   1. Each request atomically increments first
     *   2. First request: increment to 10, allowed=true
     *   3. Remaining 9 requests: increment to 11,12,13..18, allowed=false
     *   4. Only 1 query succeeds, 9 are blocked
     */
    const limit = 10;

    // Attacker is at 9/10 queries
    await db!.update(users)
      .set({ queryCountToday: 9 })
      .where(eq(users.id, testUserId));

    // Launch attack: 10 parallel requests
    const attackRequests = Array.from({ length: 10 }, () =>
      incrementAndCheckQueryLimit(testUserId, limit)
    );

    const results = await Promise.all(attackRequests);

    // SECURITY ASSERTION: Only 1 request should succeed
    const successfulAttacks = results.filter(r => r.allowed);
    expect(successfulAttacks.length).toBe(1);
    expect(successfulAttacks[0].newCount).toBe(10);

    // SECURITY ASSERTION: 9 requests should be blocked
    const blockedAttacks = results.filter(r => !r.allowed);
    expect(blockedAttacks.length).toBe(9);

    // All blocked requests should have counts > limit
    blockedAttacks.forEach(result => {
      expect(result.newCount).toBeGreaterThan(limit);
    });

    // Database should reflect all increments (but only 1 was allowed)
    const [user] = await db!.select().from(users).where(eq(users.id, testUserId));
    expect(user.queryCountToday).toBe(19); // 9 + 10 parallel requests
  });
});

describe("Integration with Query Router", () => {
  it("documents the security fix in query router", () => {
    /**
     * The query router now uses the atomic function:
     *
     * OLD VULNERABLE CODE:
     * ```typescript
     * // Line 58-66: Check limit (TOCTOU window opens)
     * const { count, limit } = await checkQueryLimit(userId);
     * if (count >= limit) throw new Error("Limit exceeded");
     *
     * // ... process query ...
     *
     * // Line 179: Increment (race window closes)
     * await incrementQueryCount(userId);
     * ```
     *
     * NEW SECURE CODE:
     * ```typescript
     * // Atomic check-and-increment before processing
     * const { allowed, newCount } = await incrementAndCheckQueryLimit(userId, limit);
     * if (!allowed) {
     *   return { error: `Limit exceeded. Count: ${newCount}` };
     * }
     *
     * // ... process query ...
     * // No separate increment needed - already done atomically
     * ```
     */
    expect(true).toBe(true); // Documentation test
  });
});
