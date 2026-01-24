/**
 * County database operations
 * Handles county CRUD and coverage statistics
 */

import { eq, sql } from "drizzle-orm";
import { counties, protocolChunks, type InsertCounty } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getAllCounties() {
  const db = await getDb();

  return await db.select().from(counties).orderBy(counties.state, counties.name);
}

export async function getCountyById(id: number) {
  const db = await getDb();

  const result = await db.select().from(counties).where(eq(counties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCounty(data: InsertCounty) {
  const db = await getDb();

  const [result] = await db.insert(counties).values(data).returning({ id: counties.id });
  return result.id;
}

/**
 * Get all unique states from counties
 */
export async function getAllStates(): Promise<string[]> {
  const db = await getDb();

  const results = await db.selectDistinct({ state: counties.state }).from(counties).orderBy(counties.state);
  return results.map(r => r.state);
}

export interface StateCoverage {
  state: string;
  stateCode: string;
  chunks: number;
  counties: number;
}

/**
 * Get protocol coverage statistics by state
 */
export async function getProtocolCoverageByState(): Promise<StateCoverage[]> {
  const db = await getDb();

  // State name to code mapping
  const stateCodeMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    // Handle abbreviations that might be in data
    'CA': 'CA', 'TX': 'TX', 'FL': 'FL', 'NY': 'NY', 'PA': 'PA', 'IL': 'IL', 'OH': 'OH', 'GA': 'GA',
  };

  const results = await db.execute(sql`
    SELECT
      c.state,
      COUNT(pc.id) as chunk_count,
      COUNT(DISTINCT c.id) as county_count
    FROM protocol_chunks pc
    JOIN counties c ON pc.county_id = c.id
    GROUP BY c.state
    ORDER BY chunk_count DESC
  `);

  const rows = (results.rows as any[]) || [];

  // Merge duplicate states (e.g., "California" and "CA")
  const mergedMap = new Map<string, { chunks: number; counties: number; displayName: string }>();

  for (const row of rows) {
    const stateName = row.state;
    if (!stateName || stateName === 'Unknown') continue;

    const stateCode = stateCodeMap[stateName] || stateName;
    const existing = mergedMap.get(stateCode);

    if (existing) {
      existing.chunks += parseInt(row.chunk_count);
      existing.counties += parseInt(row.county_count);
    } else {
      // Find the full state name for display
      const displayName = Object.entries(stateCodeMap).find(([name, code]) =>
        code === stateCode && name.length > 2
      )?.[0] || stateName;

      mergedMap.set(stateCode, {
        chunks: parseInt(row.chunk_count),
        counties: parseInt(row.county_count),
        displayName,
      });
    }
  }

  // Convert to array and sort by chunks
  const coverage: StateCoverage[] = Array.from(mergedMap.entries())
    .map(([stateCode, data]) => ({
      state: data.displayName,
      stateCode,
      chunks: data.chunks,
      counties: data.counties,
    }))
    .sort((a, b) => b.chunks - a.chunks);

  return coverage;
}

export interface AgencyInfo {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
}

/**
 * Get all agencies (counties) for a specific state with protocol counts
 */
export async function getAgenciesByState(state: string): Promise<AgencyInfo[]> {
  const db = await getDb();

  const results = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.state,
      COUNT(pc.id) as protocol_count
    FROM counties c
    LEFT JOIN protocol_chunks pc ON pc.county_id = c.id
    WHERE c.state = ${state}
    GROUP BY c.id, c.name, c.state
    ORDER BY protocol_count DESC, c.name ASC
  `);

  const rows = (results.rows as any[]) || [];

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
}

/**
 * Get all agencies with protocol data (agencies that have at least one protocol)
 */
export async function getAgenciesWithProtocols(state?: string): Promise<AgencyInfo[]> {
  const db = await getDb();

  let query;
  if (state) {
    query = sql`
      SELECT
        c.id,
        c.name,
        c.state,
        COUNT(pc.id) as protocol_count
      FROM counties c
      INNER JOIN protocol_chunks pc ON pc.county_id = c.id
      WHERE c.state = ${state}
      GROUP BY c.id, c.name, c.state
      HAVING COUNT(pc.id) > 0
      ORDER BY protocol_count DESC, c.name ASC
    `;
  } else {
    query = sql`
      SELECT
        c.id,
        c.name,
        c.state,
        COUNT(pc.id) as protocol_count
      FROM counties c
      INNER JOIN protocol_chunks pc ON pc.county_id = c.id
      GROUP BY c.id, c.name, c.state
      HAVING COUNT(pc.id) > 0
      ORDER BY c.state ASC, protocol_count DESC, c.name ASC
    `;
  }

  const results = await db.execute(query);
  const rows = (results.rows as any[]) || [];

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
}
