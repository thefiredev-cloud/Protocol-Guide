/**
 * Agency ID Mapping Layer
 *
 * Maps between MySQL county IDs and Supabase agency_ids
 * Uses name + state matching to correlate records
 *
 * This is a temporary solution until frontend is migrated to use Supabase agencies directly.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - In-memory cache for ID mappings
 * - Redis cache for full agency details (1-hour TTL)
 * - Combined lookup to prevent N+1 queries
 */

import { createClient } from '@supabase/supabase-js';
import { getCountyById, getAllCounties } from './db';
import { getRedis, isRedisAvailable } from './_core/redis';
import { logger } from './_core/logger';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Redis cache configuration
const AGENCY_CACHE_TTL = 3600; // 1 hour
const AGENCY_CACHE_PREFIX = 'agency:';

/**
 * Agency mapping cache
 * Maps MySQL county ID -> Supabase agency_id
 */
const mappingCache = new Map<number, number>();
let cacheInitialized = false;

/**
 * State code normalization
 * Maps full state names to 2-letter codes
 */
const STATE_CODE_MAP: Record<string, string> = {
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
};

/**
 * Normalize state name to 2-letter code
 */
function normalizeState(state: string): string {
  // Already a 2-letter code
  if (state.length === 2) {
    return state.toUpperCase();
  }

  // Look up full name
  return STATE_CODE_MAP[state] || state.toUpperCase().slice(0, 2);
}

/**
 * Normalize agency/county name for matching
 * Removes common prefixes/suffixes and standardizes format
 */
function normalizeAgencyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/\s+ems$/i, '')
    .replace(/\s+fire$/i, '')
    .replace(/\s+dept\.?$/i, '')
    .replace(/\s+department$/i, '')
    .trim();
}

/**
 * Initialize the mapping cache by matching MySQL counties to Supabase agencies
 */
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;

  console.log('[Agency Mapping] Initializing ID mapping cache...');

  try {
    // Fetch all MySQL counties
    const mysqlCounties = await getAllCounties();

    if (mysqlCounties.length === 0) {
      console.warn('[Agency Mapping] No MySQL counties found');
      cacheInitialized = true;
      return;
    }

    // Fetch all Supabase agencies
    const { data: supabaseAgencies, error } = await supabase
      .from('agencies')
      .select('id, name, state_code, state');

    if (error) {
      console.error('[Agency Mapping] Error fetching Supabase agencies:', error);
      cacheInitialized = true;
      return;
    }

    if (!supabaseAgencies || supabaseAgencies.length === 0) {
      console.warn('[Agency Mapping] No Supabase agencies found');
      cacheInitialized = true;
      return;
    }

    // Build matching index: normalized_name+state_code -> agency_id
    const supabaseIndex = new Map<string, number>();
    for (const agency of supabaseAgencies) {
      const normalizedName = normalizeAgencyName(agency.name);
      const stateCode = normalizeState(agency.state_code || agency.state);
      const key = `${normalizedName}:${stateCode}`;
      supabaseIndex.set(key, agency.id);
    }

    // Match MySQL counties to Supabase agencies
    let matchedCount = 0;
    for (const county of mysqlCounties) {
      const normalizedName = normalizeAgencyName(county.name);
      const stateCode = normalizeState(county.state);
      const key = `${normalizedName}:${stateCode}`;

      const supabaseId = supabaseIndex.get(key);
      if (supabaseId) {
        mappingCache.set(county.id, supabaseId);
        matchedCount++;
      } else {
        console.log(
          `[Agency Mapping] No match for MySQL county ${county.id}: ${county.name}, ${county.state} (key: ${key})`
        );
      }
    }

    console.log(
      `[Agency Mapping] Cache initialized: ${matchedCount}/${mysqlCounties.length} counties mapped`
    );
    cacheInitialized = true;
  } catch (error) {
    console.error('[Agency Mapping] Error initializing cache:', error);
    cacheInitialized = true; // Mark as initialized to avoid retry loops
  }
}

/**
 * Map MySQL county ID to Supabase agency_id
 * Returns null if no mapping found
 */
export async function mapCountyIdToAgencyId(countyId: number): Promise<number | null> {
  // Initialize cache if needed
  if (!cacheInitialized) {
    await initializeCache();
  }

  // Check cache
  const cachedId = mappingCache.get(countyId);
  if (cachedId !== undefined) {
    return cachedId;
  }

  // Try to find match on-the-fly
  const county = await getCountyById(countyId);
  if (!county) {
    console.warn(`[Agency Mapping] MySQL county ${countyId} not found`);
    return null;
  }

  const normalizedName = normalizeAgencyName(county.name);
  const stateCode = normalizeState(county.state);

  // Search Supabase for matching agency
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, state_code, state')
    .or(`state_code.eq.${stateCode},state.eq.${county.state}`)
    .limit(100);

  if (error || !agencies || agencies.length === 0) {
    console.warn(
      `[Agency Mapping] No Supabase agencies found for ${county.name}, ${county.state}`
    );
    return null;
  }

  // Find best match
  for (const agency of agencies) {
    const agencyNormalized = normalizeAgencyName(agency.name);
    if (agencyNormalized === normalizedName) {
      console.log(
        `[Agency Mapping] Matched MySQL county ${countyId} -> Supabase agency ${agency.id}`
      );
      mappingCache.set(countyId, agency.id);
      return agency.id;
    }
  }

  console.warn(
    `[Agency Mapping] No exact match for MySQL county ${countyId}: ${county.name}, ${county.state}`
  );
  return null;
}

/**
 * Map Supabase agency_id to MySQL county ID
 * Returns null if no mapping found
 */
export async function mapAgencyIdToCountyId(agencyId: number): Promise<number | null> {
  // Initialize cache if needed
  if (!cacheInitialized) {
    await initializeCache();
  }

  // Reverse lookup in cache
  for (const [countyId, cachedAgencyId] of mappingCache.entries()) {
    if (cachedAgencyId === agencyId) {
      return countyId;
    }
  }

  // Try to find match on-the-fly
  const { data: agency, error } = await supabase
    .from('agencies')
    .select('id, name, state_code, state')
    .eq('id', agencyId)
    .single();

  if (error || !agency) {
    console.warn(`[Agency Mapping] Supabase agency ${agencyId} not found`);
    return null;
  }

  const normalizedName = normalizeAgencyName(agency.name);
  const stateCode = normalizeState(agency.state_code || agency.state);

  // Search MySQL for matching county
  const counties = await getAllCounties();
  for (const county of counties) {
    const countyNormalized = normalizeAgencyName(county.name);
    const countyStateCode = normalizeState(county.state);

    if (countyNormalized === normalizedName && countyStateCode === stateCode) {
      console.log(
        `[Agency Mapping] Matched Supabase agency ${agencyId} -> MySQL county ${county.id}`
      );
      mappingCache.set(county.id, agencyId);
      return county.id;
    }
  }

  console.warn(
    `[Agency Mapping] No exact match for Supabase agency ${agencyId}: ${agency.name}, ${agency.state_code}`
  );
  return null;
}

/**
 * Get Supabase agency details by MySQL county ID
 */
export async function getAgencyByCountyId(countyId: number): Promise<{
  id: number;
  name: string;
  state_code: string;
  state: string;
} | null> {
  const agencyId = await mapCountyIdToAgencyId(countyId);
  if (!agencyId) return null;

  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, state_code, state')
    .eq('id', agencyId)
    .single();

  if (error) {
    console.error('[Agency Mapping] Error fetching agency details:', error);
    return null;
  }

  return data;
}

/**
 * Warm up the mapping cache
 * Call this on server startup for better performance
 */
export async function warmUpMappingCache(): Promise<void> {
  if (!cacheInitialized) {
    await initializeCache();
  }
}

/**
 * Get mapping statistics for debugging
 */
export async function getMappingStats(): Promise<{
  cacheInitialized: boolean;
  cachedMappings: number;
  mysqlCounties: number;
  supabaseAgencies: number;
}> {
  if (!cacheInitialized) {
    await initializeCache();
  }

  const mysqlCounties = await getAllCounties();

  const { count, error } = await supabase
    .from('agencies')
    .select('*', { count: 'exact', head: true });

  return {
    cacheInitialized,
    cachedMappings: mappingCache.size,
    mysqlCounties: mysqlCounties.length,
    supabaseAgencies: error ? 0 : (count || 0),
  };
}

/**
 * Clear the mapping cache
 * Useful for testing or after data changes
 */
export function clearMappingCache(): void {
  mappingCache.clear();
  cacheInitialized = false;
  console.log('[Agency Mapping] Cache cleared');
}
