/**
 * Protocol Search Module
 * Handles semantic search with protocol number extraction and inheritance support
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './generate';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Search result type from the RPC function
 */
export type SearchResult = {
  id: number;
  agency_id: number;
  protocol_number: string;
  protocol_title: string;
  section: string | null;
  content: string;
  image_urls: string[] | null;
  similarity: number;
};

/**
 * Enhanced search result with inheritance info
 */
export type InheritedSearchResult = SearchResult & {
  source_level: 'agency' | 'regional' | 'state' | 'inherited';
  agency_name?: string;
  inheritance_level?: number;
};

/**
 * Protocol inheritance chain entry
 */
export type InheritanceChainEntry = {
  level: number;
  id: number;
  name: string;
  agency_type: string;
  state_code: string;
};

/**
 * Protocol coverage by source
 */
export type ProtocolCoverage = {
  source_agency_id: number;
  source_agency_name: string;
  source_level: string;
  protocol_count: number;
};

/**
 * Extract protocol number from query if present
 * Matches: "814", "502", "Ref 502", "Ref. No. 814", "policy 510"
 */
function extractProtocolNumber(query: string): string | null {
  // Match standalone numbers or "Ref/Policy + number" patterns
  const patterns = [
    /\b(?:ref\.?\s*(?:no\.?)?\s*)?(\d{3,4})\b/i,  // "Ref. No. 502" or "502"
    /\bpolicy\s+(\d{3,4})\b/i,                     // "policy 814"
    /\bprotocol\s+(\d{3,4})\b/i,                   // "protocol 510"
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Hybrid search: combines keyword match for protocol numbers + semantic search
 * Supports filtering by agency name and state code (denormalized in chunks table)
 */
export async function semanticSearchProtocols(params: {
  query: string;
  agencyId?: number | null;
  agencyName?: string | null;
  stateCode?: string | null;
  limit?: number;
  threshold?: number;
}): Promise<SearchResult[]> {
  const { query, agencyId, agencyName, stateCode, limit = 10, threshold = 0.3 } = params;

  // Check if query contains a protocol number
  const protocolNumber = extractProtocolNumber(query);
  let keywordResults: SearchResult[] = [];

  if (protocolNumber) {
    // First, try exact match on protocol_number field
    // Build query with location filters applied
    let keywordQuery = supabase
      .from('manus_protocol_chunks')
      .select('id, agency_id, protocol_number, protocol_title, section, content, image_urls, state_code')
      .or(`protocol_number.ilike.%${protocolNumber}%,protocol_title.ilike.%${protocolNumber}%`);
    
    // Apply location filters to keyword search (same as semantic search)
    if (agencyId) {
      keywordQuery = keywordQuery.eq('agency_id', agencyId);
    } else if (stateCode) {
      keywordQuery = keywordQuery.eq('state_code', stateCode);
    }
    
    const { data: exactMatches } = await keywordQuery.limit(5);

    if (exactMatches && exactMatches.length > 0) {
      keywordResults = exactMatches.map(r => ({
        ...r,
        similarity: 1.0, // Perfect match for keyword
      }));
      console.log(`[Search] Found ${keywordResults.length} keyword matches for protocol #${protocolNumber}${stateCode ? ` (state: ${stateCode})` : ''}${agencyId ? ` (agency: ${agencyId})` : ''}`);
    }
  }

  // Always do semantic search
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('search_manus_protocols', {
    query_embedding: queryEmbedding,
    agency_filter: agencyId ?? null,
    state_filter: null, // Deprecated, use state_code_filter
    match_count: limit,
    match_threshold: threshold,
    agency_name_filter: agencyName ?? null,
    state_code_filter: stateCode ?? null,
  } as any);

  if (error) {
    console.error('Semantic search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  const semanticResults = (data as SearchResult[]) || [];

  // Merge results: keyword matches first, then semantic (deduplicated)
  const seenIds = new Set(keywordResults.map(r => r.id));
  const mergedResults = [
    ...keywordResults,
    ...semanticResults.filter(r => !seenIds.has(r.id)),
  ].slice(0, limit);

  return mergedResults;
}

/**
 * Get the protocol inheritance chain for an agency
 * Returns the hierarchy: Agency -> Regional Council -> State Office
 */
export async function getProtocolInheritanceChain(
  agencyId: number
): Promise<InheritanceChainEntry[]> {
  const { data, error } = await supabase.rpc('get_protocol_inheritance_chain', {
    agency_id_param: agencyId,
  });

  if (error) {
    console.error('Error getting inheritance chain:', error);
    return [];
  }

  return (data as InheritanceChainEntry[]) || [];
}

/**
 * Get protocol coverage summary for an agency including inherited protocols
 */
export async function getAgencyProtocolCoverage(
  agencyId: number
): Promise<ProtocolCoverage[]> {
  const { data, error } = await supabase.rpc('get_agency_protocol_coverage', {
    agency_id_param: agencyId,
  });

  if (error) {
    console.error('Error getting protocol coverage:', error);
    return [];
  }

  return (data as ProtocolCoverage[]) || [];
}

/**
 * Search protocols with inheritance support
 * Includes protocols from parent agencies (regional, state)
 */
export async function semanticSearchWithInheritance(params: {
  query: string;
  agencyId: number;
  limit?: number;
  threshold?: number;
}): Promise<InheritedSearchResult[]> {
  const { query, agencyId, limit = 10, threshold = 0.3 } = params;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Use the inherited search RPC
  const { data, error } = await supabase.rpc('search_manus_protocols_inherited', {
    query_embedding: queryEmbedding,
    agency_id_param: agencyId,
    match_count: limit,
    match_threshold: threshold,
  });

  if (error) {
    console.error('Inherited search error:', error);
    // Fallback to regular search
    return semanticSearchProtocols({
      query,
      agencyId,
      limit,
      threshold,
    }) as Promise<InheritedSearchResult[]>;
  }

  return (data as InheritedSearchResult[]) || [];
}

/**
 * Enhanced semantic search with optional inheritance
 * Backward-compatible wrapper that adds inheritance parameter
 */
export async function semanticSearchProtocolsEnhanced(params: {
  query: string;
  agencyId?: number | null;
  agencyName?: string | null;
  stateCode?: string | null;
  limit?: number;
  threshold?: number;
  includeInherited?: boolean;
}): Promise<InheritedSearchResult[]> {
  const {
    query,
    agencyId,
    agencyName,
    stateCode,
    limit = 10,
    threshold = 0.3,
    includeInherited = false,
  } = params;

  // Check if query contains a protocol number
  const protocolNumber = extractProtocolNumber(query);
  let keywordResults: InheritedSearchResult[] = [];

  if (protocolNumber) {
    const { data: exactMatches } = await supabase
      .from('manus_protocol_chunks')
      .select('id, agency_id, protocol_number, protocol_title, section, content, image_urls')
      .or(`protocol_number.ilike.%${protocolNumber}%,protocol_title.ilike.%${protocolNumber}%`)
      .limit(5);

    if (exactMatches && exactMatches.length > 0) {
      keywordResults = exactMatches.map(r => ({
        ...r,
        similarity: 1.0,
        source_level: 'agency' as const,
      }));
    }
  }

  // Generate embedding and search
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('search_manus_protocols', {
    query_embedding: queryEmbedding,
    agency_filter: agencyId ?? null,
    state_filter: null,
    match_count: limit,
    match_threshold: threshold,
    agency_name_filter: agencyName ?? null,
    state_code_filter: stateCode ?? null,
    include_inherited: includeInherited,
  } as any);

  if (error) {
    console.error('Enhanced semantic search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  const semanticResults = (data as InheritedSearchResult[]) || [];

  // Merge results
  const seenIds = new Set(keywordResults.map(r => r.id));
  return [
    ...keywordResults,
    ...semanticResults.filter(r => !seenIds.has(r.id)),
  ].slice(0, limit);
}

/**
 * Get Supabase client for external use
 */
export function getSupabaseClient() {
  return supabase;
}
