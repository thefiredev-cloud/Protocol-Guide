/**
 * Protocol Guide (Manus) - Voyage AI Embedding Pipeline
 *
 * Uses Voyage AI's medical-optimized embeddings for semantic search.
 * Model: voyage-large-2 (1536 dimensions)
 *
 * Features:
 * - Medical domain optimization for EMS protocols
 * - Batch embedding for efficient migration
 * - Supabase pgvector integration
 * - LRU cache for embedding responses (24-hour TTL)
 * - Custom error types for better error handling
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { parseVoyageError, VoyageApiError, ProtocolGuideError } from './errors';

// Voyage AI configuration
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-large-2';
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 128; // Voyage AI max batch size

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 1000, // Maximum number of cached embeddings
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours TTL
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
} as const;

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  accessCount: number;
}

/**
 * LRU Cache for embeddings with TTL support
 * Prevents redundant API calls for identical queries
 */
class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate cache key from text using SHA-256 hash
   */
  private generateKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Get embedding from cache if exists and not expired
   */
  get(text: string): number[] | null {
    const key = this.generateKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access count and move to end (LRU)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.embedding;
  }

  /**
   * Store embedding in cache
   */
  set(text: string, embedding: number[]): void {
    const key = this.generateKey(text);

    // Evict if at capacity
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, first entry is oldest accessed
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (now - entry.timestamp > CACHE_CONFIG.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupIntervalMs);

    // Don't keep process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.maxSize,
    };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const embeddingCache = new EmbeddingCache();

// Export cache for external access (stats, clearing, etc.)
export { embeddingCache };

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VoyageEmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    total_tokens: number;
  };
}


/**
 * Generate embedding for a single text
 * Uses LRU cache to avoid redundant API calls for identical queries
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new VoyageApiError('VOYAGE_API_KEY is required for embedding generation', 500);
  }

  // Truncate text to avoid token limits (roughly 8000 chars for safety)
  const truncatedText = text.slice(0, 8000);

  // Check cache first
  const cachedEmbedding = embeddingCache.get(truncatedText);
  if (cachedEmbedding) {
    console.log('[Embeddings] Cache hit for query');
    return cachedEmbedding;
  }

  console.log('[Embeddings] Cache miss, calling Voyage API');

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: truncatedText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Embeddings] Voyage API error: ${response.status} - ${errorText}`);
    throw parseVoyageError(response.status, errorText);
  }

  const data = (await response.json()) as VoyageEmbeddingResponse;
  const embedding = data.data[0].embedding;

  // Store in cache for future requests
  embeddingCache.set(truncatedText, embedding);

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * Uses cache for texts that have been previously embedded
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new VoyageApiError('VOYAGE_API_KEY is required for embedding generation', 500);
  }

  // Truncate each text
  const truncatedTexts = texts.map(t => t.slice(0, 8000));

  // Check cache for each text
  const results: (number[] | null)[] = truncatedTexts.map(text => embeddingCache.get(text));
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i] === null) {
      uncachedIndices.push(i);
      uncachedTexts.push(truncatedTexts[i]);
    }
  }

  console.log(`[Embeddings] Batch: ${results.length - uncachedTexts.length} cache hits, ${uncachedTexts.length} misses`);

  // If all cached, return immediately
  if (uncachedTexts.length === 0) {
    return results as number[][];
  }

  // Fetch uncached embeddings from API
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: uncachedTexts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Embeddings] Voyage API batch error: ${response.status} - ${errorText}`);
    throw parseVoyageError(response.status, errorText);
  }

  const data = (await response.json()) as VoyageEmbeddingResponse;

  // Sort by index to maintain order
  const sortedEmbeddings = data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);

  // Merge results and cache new embeddings
  for (let i = 0; i < uncachedIndices.length; i++) {
    const originalIndex = uncachedIndices[i];
    const embedding = sortedEmbeddings[i];
    results[originalIndex] = embedding;

    // Cache the new embedding
    embeddingCache.set(truncatedTexts[originalIndex], embedding);
  }

  return results as number[][];
}


/**
 * Search result type from the RPC function
 */
type SearchResult = {
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
type InheritedSearchResult = SearchResult & {
  source_level: 'agency' | 'regional' | 'state' | 'inherited';
  agency_name?: string;
  inheritance_level?: number;
};

/**
 * Protocol inheritance chain entry
 */
type InheritanceChainEntry = {
  level: number;
  id: number;
  name: string;
  agency_type: string;
  state_code: string;
};

/**
 * Protocol coverage by source
 */
type ProtocolCoverage = {
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
    const { data: exactMatches } = await supabase
      .from('manus_protocol_chunks')
      .select('id, agency_id, protocol_number, protocol_title, section, content, image_urls')
      .or(`protocol_number.ilike.%${protocolNumber}%,protocol_title.ilike.%${protocolNumber}%`)
      .limit(5);

    if (exactMatches && exactMatches.length > 0) {
      keywordResults = exactMatches.map(r => ({
        ...r,
        similarity: 1.0, // Perfect match for keyword
      }));
      console.log(`[Search] Found ${keywordResults.length} keyword matches for protocol #${protocolNumber}`);
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
 * Protocol chunk type for embedding generation
 */
type ProtocolChunk = {
  id: number;
  protocol_title: string;
  section: string | null;
  content: string;
};


/**
 * Generate embeddings for all protocols without embeddings
 * Used during migration and for new protocol additions
 */
export async function generateAllEmbeddings(options?: {
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
}): Promise<{ processed: number; errors: number }> {
  const batchSize = options?.batchSize || BATCH_SIZE;
  const onProgress = options?.onProgress || (() => {});

  // Get protocols without embeddings
  const { count } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  if (!count || count === 0) {
    console.log('All protocols already have embeddings');
    return { processed: 0, errors: 0 };
  }

  console.log(`Generating embeddings for ${count} protocols...`);

  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (offset < count) {
    // Fetch batch of protocols without embeddings
    const { data, error: fetchError } = await supabase
      .from('manus_protocol_chunks')
      .select('id, protocol_title, section, content')
      .is('embedding', null)
      .range(offset, offset + batchSize - 1);

    const protocols = data as ProtocolChunk[] | null;

    if (fetchError || !protocols || protocols.length === 0) {
      break;
    }

    // Prepare texts for embedding (combine title + section + content)
    const texts = protocols.map(p =>
      `${p.protocol_title}\n${p.section || ''}\n${p.content}`.trim()
    );

    try {
      // Generate embeddings in batch
      const embeddings = await generateEmbeddingsBatch(texts);

      // Update each protocol with its embedding
      for (let i = 0; i < protocols.length; i++) {
        const { error: updateError } = await supabase
          .from('manus_protocol_chunks')
          .update({ embedding: embeddings[i] } as unknown as never)
          .eq('id', protocols[i].id);

        if (updateError) {
          console.error(`Error updating protocol ${protocols[i].id}:`, updateError);
          errors++;
        } else {
          processed++;
        }
      }
    } catch (err) {
      console.error(`Batch embedding error at offset ${offset}:`, err);
      errors += protocols.length;
    }

    offset += batchSize;
    onProgress(Math.min(offset, count), count);
  }

  return { processed, errors };
}


/**
 * Update embedding for a single protocol
 * Used when protocol content changes
 */
export async function updateProtocolEmbedding(protocolId: number): Promise<void> {
  // Get protocol content
  const { data, error: fetchError } = await supabase
    .from('manus_protocol_chunks')
    .select('protocol_title, section, content')
    .eq('id', protocolId)
    .single();

  const protocol = data as { protocol_title: string; section: string | null; content: string } | null;

  if (fetchError || !protocol) {
    throw new Error(`Protocol ${protocolId} not found`);
  }

  // Generate new embedding
  const text = `${protocol.protocol_title}\n${protocol.section || ''}\n${protocol.content}`.trim();
  const embedding = await generateEmbedding(text);

  // Update in database
  const { error: updateError } = await supabase
    .from('manus_protocol_chunks')
    .update({ embedding } as unknown as never)
    .eq('id', protocolId);

  if (updateError) {
    throw new Error(`Failed to update embedding: ${updateError.message}`);
  }
}

/**
 * Get Supabase client for external use
 */
export function getSupabaseClient() {
  return supabase;
}

// ============================================================================
// PROTOCOL INHERITANCE FUNCTIONS
// ============================================================================

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

// Export constants
export { VOYAGE_MODEL, EMBEDDING_DIMENSION, BATCH_SIZE };

// Export types
export type {
  SearchResult,
  InheritedSearchResult,
  InheritanceChainEntry,
  ProtocolCoverage,
};
