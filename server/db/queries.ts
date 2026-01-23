/**
 * Query history database operations
 * Handles user query tracking and history
 */

import { eq, sql } from "drizzle-orm";
import { queries, type InsertQuery } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function createQuery(data: InsertQuery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(queries).values(data);
  return result[0].insertId;
}

export async function getUserQueries(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(queries)
    .where(eq(queries.userId, userId))
    .orderBy(sql`${queries.createdAt} DESC`)
    .limit(limit);
}
