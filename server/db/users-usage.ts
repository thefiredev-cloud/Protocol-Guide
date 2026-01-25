/**
 * User usage tracking and tier management
 * Handles query limits, subscriptions, and feature access
 */

import { eq, sql } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "./connection";
import { TIER_CONFIG } from "./config";

export async function updateUserCounty(userId: number, countyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ selectedAgencyId: countyId }).where(eq(users.id, userId));
}

export async function incrementUserQueryCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split('T')[0];

  // Get current user
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  // Reset count if it's a new day
  if (user.lastQueryDate !== today) {
    await db.update(users).set({
      queryCountToday: 1,
      lastQueryDate: today,
    }).where(eq(users.id, userId));
    return 1;
  }

  // Increment count
  const newCount = user.queryCountToday + 1;
  await db.update(users).set({ queryCountToday: newCount }).where(eq(users.id, userId));
  return newCount;
}

export async function getUserUsage(userId: number) {
  const db = await getDb();
  if (!db) return {
    count: 0,
    limit: TIER_CONFIG.free.dailyQueryLimit,
    tier: 'free' as const,
    features: TIER_CONFIG.free,
  };

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return {
    count: 0,
    limit: TIER_CONFIG.free.dailyQueryLimit,
    tier: 'free' as const,
    features: TIER_CONFIG.free,
  };

  const today = new Date().toISOString().split('T')[0];
  const count = user.lastQueryDate === today ? user.queryCountToday : 0;
  const tierConfig = TIER_CONFIG[user.tier];

  return {
    count,
    limit: tierConfig.dailyQueryLimit,
    tier: user.tier,
    features: tierConfig,
  };
}

export async function canUserQuery(userId: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return usage.count < usage.limit;
}

export async function getRemainingQueries(userId: number): Promise<number> {
  const usage = await getUserUsage(userId);
  if (usage.limit === Infinity) return Infinity;
  return Math.max(0, usage.limit - usage.count);
}

export async function updateUserTier(userId: number, tier: 'free' | 'pro' | 'enterprise') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ tier }).where(eq(users.id, userId));
}

export async function canUserAccessOffline(userId: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return usage.features.offlineAccess;
}

export async function getUserBookmarkLimit(userId: number): Promise<number> {
  const usage = await getUserUsage(userId);
  return usage.features.maxBookmarks;
}

export async function canUserAddCounty(userId: number, currentCountyCount: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return currentCountyCount < usage.features.maxCounties;
}

/**
 * SECURITY: Atomic increment-and-check to prevent TOCTOU race condition
 * This function prevents users from exceeding daily limits via parallel requests
 *
 * Previous vulnerable flow:
 * 1. Check limit (multiple requests see 9/10)
 * 2. All pass check
 * 3. All increment (results in 14/10)
 *
 * New atomic flow:
 * 1. Increment count in database transaction
 * 2. Return whether the new count is within limit
 *
 * @param userId - The user ID to increment and check
 * @param limit - The daily query limit for the user's tier
 * @returns Object with allowed (boolean) and newCount (number)
 */
export async function incrementAndCheckQueryLimit(
  userId: number,
  limit: number
): Promise<{ allowed: boolean; newCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split('T')[0];

  // Atomic operation: reset if new day, increment, and return new count
  // This prevents race conditions by doing everything in a single UPDATE
  const result = await db
    .update(users)
    .set({
      queryCountToday: sql`CASE
        WHEN ${users.lastQueryDate} != ${today} THEN 1
        ELSE ${users.queryCountToday} + 1
      END`,
      lastQueryDate: today,
    })
    .where(eq(users.id, userId))
    .returning({ newCount: users.queryCountToday });

  const newCount = result[0]?.newCount ?? 1;

  return {
    allowed: newCount <= limit,
    newCount,
  };
}
