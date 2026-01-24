/**
 * User database operations
 * Handles user CRUD, authentication, and disclaimer management
 */

import { eq } from "drizzle-orm";
import { users, type InsertUser, type User } from "../../drizzle/schema";
import { getDb } from "./connection";
import { ENV } from "../_core/env";

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      queryCountToday: user.queryCountToday ?? 0,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * P0 CRITICAL: Medical Disclaimer Acknowledgment
 * Records timestamp when user acknowledges the medical disclaimer
 * Required for legal compliance before accessing protocol search
 */
export async function acknowledgeDisclaimer(userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db
      .update(users)
      .set({ disclaimerAcknowledgedAt: new Date() })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to acknowledge disclaimer:", error);
    return { success: false, error: "Failed to record acknowledgment" };
  }
}

/**
 * Check if user has acknowledged the medical disclaimer
 * Returns true if acknowledged, false otherwise
 */
export async function hasAcknowledgedDisclaimer(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.disclaimerAcknowledgedAt !== null && user?.disclaimerAcknowledgedAt !== undefined;
}

export async function findOrCreateUserBySupabaseId(
  supabaseId: string,
  metadata: { email?: string; name?: string }
): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find/create user: database not available");
    return null;
  }

  try {
    // First, try to find existing user by supabaseId
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new user with supabaseId as the openId (for backwards compatibility)
    const [newUser] = await db
      .insert(users)
      .values({
        openId: supabaseId, // Use supabaseId as openId for new users
        supabaseId,
        email: metadata.email,
        name: metadata.name,
        tier: "free",
        role: "user",
        queryCountToday: 0,
      })
      .$returningId();

    // Fetch and return the created user
    const created = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find/create user by supabaseId:", error);
    return null;
  }
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}
