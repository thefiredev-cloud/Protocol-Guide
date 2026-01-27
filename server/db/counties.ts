/**
 * County database operations
 * Handles county CRUD and coverage statistics
 */

import { eq, sql } from "drizzle-orm";
import { counties, protocolChunks, type InsertCounty } from "../../drizzle/schema";
import { getDb } from "./connection";
import { logger } from "../_core/logger";

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
  try {
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

    // Query manus_protocol_chunks which has state_code/state_name directly
    const results = await db.execute(sql`
      SELECT
        COALESCE(state_name, state_code) as state,
        state_code,
        COUNT(id) as chunk_count,
        COUNT(DISTINCT agency_id) as agency_count
      FROM manus_protocol_chunks
      WHERE state_code IS NOT NULL
      GROUP BY state_name, state_code
      ORDER BY chunk_count DESC
    `);

    // Validate response structure
    if (!results || !Array.isArray(results.rows)) {
      logger.error({ results: typeof results }, '[Counties] Unexpected DB response in getProtocolCoverageByState');
      return [];
    }

    const rows = results.rows as any[];

    // Merge duplicate states (e.g., "California" and "CA")
    const mergedMap = new Map<string, { chunks: number; counties: number; displayName: string }>();

    for (const row of rows) {
      const stateName = row.state;
      const rowStateCode = row.state_code;
      if (!stateName || stateName === 'Unknown') continue;

      const stateCode = rowStateCode || stateCodeMap[stateName] || stateName;
      const existing = mergedMap.get(stateCode);

      const chunkCount = parseInt(row.chunk_count) || 0;
      const agencyCount = parseInt(row.agency_count) || 0;

      if (existing) {
        existing.chunks += chunkCount;
        existing.counties += agencyCount;
      } else {
        // Find the full state name for display
        const displayName = Object.entries(stateCodeMap).find(([name, code]) =>
          code === stateCode && name.length > 2
        )?.[0] || stateName;

        mergedMap.set(stateCode, {
          chunks: chunkCount,
          counties: agencyCount,
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
  } catch (error) {
    logger.error({ error }, '[Counties] getProtocolCoverageByState failed');
    throw new Error('Failed to fetch coverage data');
  }
}

export interface AgencyInfo {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
}

/**
 * Get all agencies for a specific state with protocol counts
 * Uses manus_protocol_chunks which has agency_id and state_code directly
 */
export async function getAgenciesByState(state: string): Promise<AgencyInfo[]> {
  const db = await getDb();

  // state can be either state code (CA) or state name (California)
  // Note: state_code is char(2) so we need TRIM to handle padding
  const results = await db.execute(sql`
    SELECT
      agency_id as id,
      agency_name as name,
      COALESCE(state_name, TRIM(state_code)) as state,
      COUNT(id) as protocol_count
    FROM manus_protocol_chunks
    WHERE (TRIM(state_code) = ${state} OR state_name = ${state})
      AND agency_id IS NOT NULL
    GROUP BY agency_id, agency_name, state_name, state_code
    HAVING COUNT(id) > 0
    ORDER BY protocol_count DESC, agency_name ASC
  `);

  const rows = (results.rows as any[]) || [];

  return rows.map(row => ({
    id: row.id,
    name: row.name || 'Unknown Agency',
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
}

/**
 * Get all agencies with protocol data (agencies that have at least one protocol)
 * Uses manus_protocol_chunks which has agency_id and state_code directly
 */
export async function getAgenciesWithProtocols(state?: string): Promise<AgencyInfo[]> {
  const db = await getDb();

  // Note: state_code is char(2) so we need TRIM to handle padding
  let query;
  if (state) {
    query = sql`
      SELECT
        agency_id as id,
        agency_name as name,
        COALESCE(state_name, TRIM(state_code)) as state,
        COUNT(id) as protocol_count
      FROM manus_protocol_chunks
      WHERE (TRIM(state_code) = ${state} OR state_name = ${state})
        AND agency_id IS NOT NULL
      GROUP BY agency_id, agency_name, state_name, state_code
      HAVING COUNT(id) > 0
      ORDER BY protocol_count DESC, agency_name ASC
    `;
  } else {
    query = sql`
      SELECT
        agency_id as id,
        agency_name as name,
        COALESCE(state_name, TRIM(state_code)) as state,
        COUNT(id) as protocol_count
      FROM manus_protocol_chunks
      WHERE agency_id IS NOT NULL
      GROUP BY agency_id, agency_name, state_name, state_code
      HAVING COUNT(id) > 0
      ORDER BY state ASC, protocol_count DESC, agency_name ASC
    `;
  }

  const results = await db.execute(query);
  const rows = (results.rows as any[]) || [];

  return rows.map(row => ({
    id: row.id,
    name: row.name || 'Unknown Agency',
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
}
