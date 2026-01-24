/**
 * User Counties Database Functions
 * Handles county restriction logic for monetization tiers
 *
 * Free users: 1 saved county
 * Pro users: Unlimited saved counties
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, TIER_CONFIG } from "./db";
import {
  userCounties,
  searchHistory,
  users,
  counties,
  type UserCounty,
  type InsertUserCounty,
  type SearchHistory,
  type InsertSearchHistory,
} from "../drizzle/schema";

// ============ User Counties Functions ============

export interface SavedCounty {
  id: number;
  userId: number;
  countyId: number;
  isPrimary: boolean;
  createdAt: Date;
  // Joined county data
  county?: {
    id: number;
    name: string;
    state: string;
  };
}

/**
 * Get all saved counties for a user with county details
 */
export async function getUserCounties(userId: number): Promise<SavedCounty[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: userCounties.id,
      userId: userCounties.userId,
      countyId: userCounties.countyId,
      isPrimary: userCounties.isPrimary,
      createdAt: userCounties.createdAt,
      countyName: counties.name,
      countyState: counties.state,
    })
    .from(userCounties)
    .leftJoin(counties, eq(userCounties.countyId, counties.id))
    .where(eq(userCounties.userId, userId))
    .orderBy(desc(userCounties.isPrimary), desc(userCounties.createdAt));

  return results.map(r => ({
    id: r.id,
    userId: r.userId,
    countyId: r.countyId,
    isPrimary: Boolean(r.isPrimary),
    createdAt: new Date(r.createdAt),
    county: r.countyName ? {
      id: r.countyId,
      name: r.countyName,
      state: r.countyState || '',
    } : undefined,
  }));
}

/**
 * Get count of saved counties for a user
 */
export async function getUserCountyCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userCounties)
    .where(eq(userCounties.userId, userId));

  return result?.count || 0;
}

/**
 * Check if user can add another county based on their tier
 */
export async function canUserAddCounty(userId: number): Promise<{
  canAdd: boolean;
  currentCount: number;
  maxAllowed: number;
  tier: 'free' | 'pro' | 'enterprise';
}> {
  const db = await getDb();
  if (!db) {
    return { canAdd: false, currentCount: 0, maxAllowed: 1, tier: 'free' };
  }

  // Get user's tier
  const [user] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const tier = (user?.tier || 'free') as 'free' | 'pro' | 'enterprise';
  const maxAllowed = TIER_CONFIG[tier].maxCounties;
  const currentCount = await getUserCountyCount(userId);

  return {
    canAdd: currentCount < maxAllowed,
    currentCount,
    maxAllowed,
    tier,
  };
}

/**
 * Add a county to user's saved counties
 * Returns error if tier limit exceeded
 */
export async function addUserCounty(
  userId: number,
  countyId: number,
  isPrimary: boolean = false
): Promise<{ success: boolean; error?: string; userCounty?: SavedCounty }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Check tier limits
  const { canAdd, currentCount, maxAllowed, tier } = await canUserAddCounty(userId);
  if (!canAdd) {
    return {
      success: false,
      error: tier === 'free'
        ? `Free tier allows only ${maxAllowed} saved county. Upgrade to Pro for unlimited counties.`
        : `Maximum of ${maxAllowed} counties reached.`,
    };
  }

  // Check if county already saved
  const existing = await db
    .select()
    .from(userCounties)
    .where(and(eq(userCounties.userId, userId), eq(userCounties.countyId, countyId)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "County already saved" };
  }

  // Verify county exists
  const [county] = await db
    .select()
    .from(counties)
    .where(eq(counties.id, countyId))
    .limit(1);

  if (!county) {
    return { success: false, error: "County not found" };
  }

  // If setting as primary, unset other primaries first
  if (isPrimary) {
    await db
      .update(userCounties)
      .set({ isPrimary: false })
      .where(eq(userCounties.userId, userId));
  }

  // If this is the first county, make it primary
  const shouldBePrimary = isPrimary || currentCount === 0;

  // Insert new user county
  const [result] = await db.insert(userCounties).values({
    userId,
    countyId,
    isPrimary: shouldBePrimary ? 1 : 0,
  }).$returningId();

  const savedCounty: SavedCounty = {
    id: result.id,
    userId,
    countyId,
    isPrimary: shouldBePrimary,
    createdAt: new Date(),
    county: {
      id: county.id,
      name: county.name,
      state: county.state,
    },
  };

  return { success: true, userCounty: savedCounty };
}

/**
 * Remove a county from user's saved counties
 */
export async function removeUserCounty(
  userId: number,
  countyId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Check if county exists in user's saved list
  const [existing] = await db
    .select()
    .from(userCounties)
    .where(and(eq(userCounties.userId, userId), eq(userCounties.countyId, countyId)))
    .limit(1);

  if (!existing) {
    return { success: false, error: "County not in saved list" };
  }

  const wasPrimary = existing.isPrimary;

  // Delete the user county
  await db
    .delete(userCounties)
    .where(and(eq(userCounties.userId, userId), eq(userCounties.countyId, countyId)));

  // If removed county was primary, set another as primary if available
  if (wasPrimary) {
    const [nextCounty] = await db
      .select()
      .from(userCounties)
      .where(eq(userCounties.userId, userId))
      .orderBy(desc(userCounties.createdAt))
      .limit(1);

    if (nextCounty) {
      await db
        .update(userCounties)
        .set({ isPrimary: true })
        .where(eq(userCounties.id, nextCounty.id));
    }
  }

  return { success: true };
}

/**
 * Set a county as primary for user
 */
export async function setUserPrimaryCounty(
  userId: number,
  countyId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Check if county exists in user's saved list
  const [existing] = await db
    .select()
    .from(userCounties)
    .where(and(eq(userCounties.userId, userId), eq(userCounties.countyId, countyId)))
    .limit(1);

  if (!existing) {
    return { success: false, error: "County not in saved list" };
  }

  // Unset all primaries for user
  await db
    .update(userCounties)
    .set({ isPrimary: false })
    .where(eq(userCounties.userId, userId));

  // Set the new primary
  await db
    .update(userCounties)
    .set({ isPrimary: true })
    .where(and(eq(userCounties.userId, userId), eq(userCounties.countyId, countyId)));

  return { success: true };
}

/**
 * Get user's primary county
 */
export async function getUserPrimaryCounty(userId: number): Promise<SavedCounty | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .select({
      id: userCounties.id,
      userId: userCounties.userId,
      countyId: userCounties.countyId,
      isPrimary: userCounties.isPrimary,
      createdAt: userCounties.createdAt,
      countyName: counties.name,
      countyState: counties.state,
    })
    .from(userCounties)
    .leftJoin(counties, eq(userCounties.countyId, counties.id))
    .where(and(eq(userCounties.userId, userId), eq(userCounties.isPrimary, 1)))
    .limit(1);

  if (!result) return null;

  return {
    id: result.id,
    userId: result.userId,
    countyId: result.countyId,
    isPrimary: Boolean(result.isPrimary),
    createdAt: new Date(result.createdAt),
    county: result.countyName ? {
      id: result.countyId,
      name: result.countyName,
      state: result.countyState || '',
    } : undefined,
  };
}

// ============ Search History Functions ============

export interface SearchHistoryEntry {
  id: number;
  userId: number;
  searchQuery: string;
  countyId: number | null;
  resultsCount: number | null;
  createdAt: Date;
}

/**
 * Get user's search history
 */
export async function getUserSearchHistory(
  userId: number,
  limit: number = 50
): Promise<SearchHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.createdAt))
    .limit(limit);

  return results.map(r => ({
    ...r,
    createdAt: new Date(r.createdAt),
  }));
}

/**
 * Add a search query to user's history
 */
export async function addSearchHistory(
  userId: number,
  searchQuery: string,
  countyId?: number,
  resultsCount?: number
): Promise<{ success: boolean; id?: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false };
  }

  const [result] = await db.insert(searchHistory).values({
    userId,
    searchQuery,
    countyId: countyId ?? null,
    resultsCount: resultsCount ?? null,
  }).$returningId();

  return { success: true, id: result.id };
}

/**
 * Sync local search history from device to cloud
 * Used for Pro users to sync across devices
 */
export async function syncSearchHistory(
  userId: number,
  localQueries: {
    searchQuery: string;
    countyId?: number;
    resultsCount?: number;
  }[]
): Promise<{
  success: boolean;
  merged: number;
  serverHistory: SearchHistoryEntry[];
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, merged: 0, serverHistory: [] };
  }

  // Check user tier - only Pro/Enterprise can sync
  const [user] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.tier === 'free') {
    return { success: false, merged: 0, serverHistory: [] };
  }

  let merged = 0;

  // Insert local queries
  for (const local of localQueries) {
    await db.insert(searchHistory).values({
      userId,
      searchQuery: local.searchQuery,
      countyId: local.countyId ?? null,
      resultsCount: local.resultsCount ?? null,
    });
    merged++;
  }

  // Get all server history to return
  const serverHistory = await getUserSearchHistory(userId, 100);

  return { success: true, merged, serverHistory };
}

/**
 * Clear user's search history
 */
export async function clearSearchHistory(userId: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) {
    return { success: false };
  }

  await db.delete(searchHistory).where(eq(searchHistory.userId, userId));

  return { success: true };
}

/**
 * Delete a specific search history entry
 */
export async function deleteSearchHistoryEntry(
  userId: number,
  entryId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Verify ownership
  const [entry] = await db
    .select()
    .from(searchHistory)
    .where(and(eq(searchHistory.id, entryId), eq(searchHistory.userId, userId)))
    .limit(1);

  if (!entry) {
    return { success: false, error: "Entry not found" };
  }

  await db.delete(searchHistory).where(eq(searchHistory.id, entryId));

  return { success: true };
}
