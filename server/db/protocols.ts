/**
 * Protocol database operations
 * Handles protocol CRUD and search functionality
 */

import { eq, sql } from "drizzle-orm";
import { protocolChunks, counties, type InsertProtocolChunk } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getProtocolsByCounty(countyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(protocolChunks).where(eq(protocolChunks.countyId, countyId));
}

export async function searchProtocols(countyId: number, searchTerms: string[]) {
  const db = await getDb();
  if (!db) return [];

  // Basic keyword search - in production this would use vector similarity
  const results = await db.select().from(protocolChunks)
    .where(eq(protocolChunks.countyId, countyId));

  // Filter by search terms (case-insensitive)
  const lowerTerms = searchTerms.map(t => t.toLowerCase());
  return results.filter(chunk => {
    const content = (chunk.content + ' ' + chunk.protocolTitle + ' ' + (chunk.section || '')).toLowerCase();
    return lowerTerms.some(term => content.includes(term));
  });
}

export async function createProtocolChunk(data: InsertProtocolChunk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(protocolChunks).values(data).returning({ id: protocolChunks.id });
  return result.id;
}

/**
 * Get protocol statistics
 */
export async function getProtocolStats() {
  const db = await getDb();
  if (!db) return { totalProtocols: 0, totalCounties: 0, bySection: {} };

  const [protocolCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(protocolChunks);
  const [countyCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(counties);

  return {
    totalProtocols: protocolCount?.count || 0,
    totalCounties: countyCount?.count || 0,
  };
}

/**
 * Get total protocol statistics
 */
export async function getTotalProtocolStats(): Promise<{
  totalChunks: number;
  totalCounties: number;
  statesWithCoverage: number;
  chunksWithYear: number;
}> {
  const db = await getDb();
  if (!db) return { totalChunks: 0, totalCounties: 0, statesWithCoverage: 0, chunksWithYear: 0 };

  // Use manus_protocol_chunks which is the production table
  const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM manus_protocol_chunks`);
  const agenciesResult = await db.execute(sql`SELECT COUNT(DISTINCT agency_id) as total FROM manus_protocol_chunks WHERE agency_id IS NOT NULL`);
  const statesResult = await db.execute(sql`SELECT COUNT(DISTINCT state_code) as total FROM manus_protocol_chunks WHERE state_code IS NOT NULL`);
  const yearResult = await db.execute(sql`SELECT COUNT(*) as total FROM manus_protocol_chunks WHERE protocol_year IS NOT NULL`);

  return {
    totalChunks: parseInt((totalResult.rows[0] as any)?.total || '0'),
    totalCounties: parseInt((agenciesResult.rows[0] as any)?.total || '0'), // agencies, not counties
    statesWithCoverage: parseInt((statesResult.rows[0] as any)?.total || '0'),
    chunksWithYear: parseInt((yearResult.rows[0] as any)?.total || '0'),
  };
}
