/**
 * RAG Pipeline Optimizer for Protocol Guide
 *
 * Optimizations for 2-second latency target:
 * 1. Parallel execution where possible
 * 2. Tiered similarity thresholds
 * 3. Query result caching (Redis-ready)
 * 4. Re-ranking for improved accuracy
 * 5. Latency monitoring and adaptive routing
 */

import { normalizeEmsQuery, type NormalizedQuery } from './ems-query-normalizer';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const RAG_CONFIG = {
  // Latency targets (milliseconds)
  latency: {
    target: 2000, // 2 second target
    embedding: 300, // Max for embedding generation
    vectorSearch: 200, // Max for vector search
    llmInference: 1500, // Max for Claude response
  },

  // Similarity thresholds (tiered by intent)
  similarity: {
    // High precision for medication queries (safety critical)
    medication: 0.45,
    // Standard threshold for procedures
    procedure: 0.40,
    // Lower threshold for general queries (better recall)
    general: 0.35,
    // Minimum acceptable (below this = no results)
    minimum: 0.25,
  },

  // Result limits
  results: {
    // Initial retrieval (before re-ranking)
    initialFetch: 20,
    // After re-ranking
    finalReturn: 5,
    // For complex/differential queries
    complexReturn: 8,
  },

  // Cache configuration
  cache: {
    // Query result cache TTL (1 hour for common queries)
    queryTtlMs: 60 * 60 * 1000,
    // Embedding cache TTL (24 hours)
    embeddingTtlMs: 24 * 60 * 60 * 1000,
    // Max cached queries
    maxQueries: 5000,
  },

  // Re-ranking configuration
  rerank: {
    enabled: true,
    // Keywords that boost relevance
    boostKeywords: [
      'dose', 'dosage', 'mg', 'mcg', 'route',
      'indication', 'contraindication', 'warning',
      'pediatric', 'adult', 'geriatric',
      'step', 'procedure', 'technique',
    ],
    // Section priority (higher = more relevant)
    sectionPriority: {
      'treatment': 10,
      'medication': 10,
      'dosing': 10,
      'procedure': 8,
      'assessment': 7,
      'indication': 7,
      'contraindication': 9,
      'overview': 3,
      'general': 2,
    } as Record<string, number>,
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface RetrievalResult {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  similarity: number;
  rerankedScore?: number;
  imageUrls?: string[] | null;
  metadata?: Record<string, unknown>;
}

export interface RagMetrics {
  queryNormalizationMs: number;
  embeddingGenerationMs: number;
  vectorSearchMs: number;
  rerankingMs: number;
  totalRetrievalMs: number;
  resultCount: number;
  cacheHit: boolean;
}

export interface OptimizedSearchParams {
  query: string;
  agencyId?: number | null;
  agencyName?: string | null;
  stateCode?: string | null;
  limit?: number;
  userTier?: 'free' | 'pro' | 'enterprise';
}

export interface OptimizedSearchResult {
  results: RetrievalResult[];
  normalizedQuery: NormalizedQuery;
  metrics: RagMetrics;
  suggestedModel: 'haiku' | 'sonnet';
}

// ============================================================================
// SIMILARITY THRESHOLD SELECTION
// ============================================================================

/**
 * Select optimal similarity threshold based on query intent
 */
export function selectSimilarityThreshold(normalized: NormalizedQuery): number {
  const { intent, extractedMedications } = normalized;

  // Medication queries need high precision for safety
  if (intent === 'medication_dosing' || extractedMedications.length > 0) {
    return RAG_CONFIG.similarity.medication;
  }

  // Procedure queries need good precision
  if (intent === 'procedure_steps') {
    return RAG_CONFIG.similarity.procedure;
  }

  // Contraindication checks are safety critical
  if (intent === 'contraindication_check') {
    return RAG_CONFIG.similarity.medication;
  }

  // Default to general threshold for better recall
  return RAG_CONFIG.similarity.general;
}

/**
 * Select result limit based on query complexity
 */
export function selectResultLimit(normalized: NormalizedQuery): number {
  if (normalized.isComplex) {
    return RAG_CONFIG.results.complexReturn;
  }

  if (normalized.intent === 'differential_diagnosis') {
    return RAG_CONFIG.results.complexReturn;
  }

  return RAG_CONFIG.results.finalReturn;
}

// ============================================================================
// RE-RANKING
// ============================================================================

/**
 * Re-rank results for improved relevance
 * Uses lightweight heuristics to avoid additional LLM calls
 */
export function rerankResults(
  results: RetrievalResult[],
  normalized: NormalizedQuery
): RetrievalResult[] {
  if (!RAG_CONFIG.rerank.enabled || results.length === 0) {
    return results;
  }

  const queryTerms = normalized.normalized.toLowerCase().split(/\s+/);
  const medications = normalized.extractedMedications;
  const conditions = normalized.extractedConditions;

  const scored = results.map(result => {
    let score = result.similarity * 100; // Base score from vector similarity

    const contentLower = result.content.toLowerCase();
    const titleLower = result.protocolTitle.toLowerCase();
    const sectionLower = (result.section || '').toLowerCase();

    // Boost for title matches
    for (const term of queryTerms) {
      if (term.length > 2 && titleLower.includes(term)) {
        score += 5;
      }
    }

    // Boost for medication matches in content
    for (const med of medications) {
      if (contentLower.includes(med)) {
        score += 8;
      }
    }

    // Boost for condition matches
    for (const condition of conditions) {
      if (contentLower.includes(condition)) {
        score += 6;
      }
    }

    // Boost for section relevance
    for (const [sectionKeyword, priority] of Object.entries(RAG_CONFIG.rerank.sectionPriority)) {
      if (sectionLower.includes(sectionKeyword)) {
        score += priority;
      }
    }

    // Boost for boost keywords
    for (const keyword of RAG_CONFIG.rerank.boostKeywords) {
      if (contentLower.includes(keyword)) {
        score += 2;
      }
    }

    // Penalty for very short content (likely incomplete)
    if (result.content.length < 200) {
      score -= 5;
    }

    // Bonus for content with specific dosing information
    if (/\d+\s*(?:mg|mcg|ml|units?|g)\b/i.test(result.content)) {
      if (normalized.intent === 'medication_dosing') {
        score += 10;
      }
    }

    return {
      ...result,
      rerankedScore: score,
    };
  });

  // Sort by reranked score
  return scored.sort((a, b) => (b.rerankedScore || 0) - (a.rerankedScore || 0));
}

// ============================================================================
// MODEL ROUTING
// ============================================================================

/**
 * Determine optimal model based on query analysis
 */
export function selectModel(
  normalized: NormalizedQuery,
  userTier: 'free' | 'pro' | 'enterprise'
): 'haiku' | 'sonnet' {
  // Free tier always uses Haiku
  if (userTier === 'free') {
    return 'haiku';
  }

  // Use Sonnet for complex queries
  if (normalized.isComplex) {
    return 'sonnet';
  }

  // Use Sonnet for differential diagnosis
  if (normalized.intent === 'differential_diagnosis') {
    return 'sonnet';
  }

  // Use Sonnet for pediatric medication queries (weight-based dosing is complex)
  if (
    normalized.intent === 'pediatric_specific' &&
    normalized.extractedMedications.length > 0
  ) {
    return 'sonnet';
  }

  // Default to Haiku for speed
  return 'haiku';
}

// ============================================================================
// QUERY RESULT CACHE
// ============================================================================

interface CachedQueryResult {
  results: RetrievalResult[];
  timestamp: number;
  queryHash: string;
}

/**
 * In-memory query cache (can be replaced with Redis for distributed)
 */
class QueryCache {
  private cache: Map<string, CachedQueryResult> = new Map();
  private accessOrder: string[] = [];

  /**
   * Generate cache key from query parameters
   */
  private generateKey(params: OptimizedSearchParams): string {
    const normalized = normalizeEmsQuery(params.query);
    return `${normalized.normalized}:${params.agencyId || 'all'}:${params.stateCode || 'all'}`;
  }

  /**
   * Get cached result if valid
   */
  get(params: OptimizedSearchParams): RetrievalResult[] | null {
    const key = this.generateKey(params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > RAG_CONFIG.cache.queryTtlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access order (LRU)
    const idx = this.accessOrder.indexOf(key);
    if (idx > -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(key);

    return cached.results;
  }

  /**
   * Store result in cache
   */
  set(params: OptimizedSearchParams, results: RetrievalResult[]): void {
    const key = this.generateKey(params);

    // Evict if at capacity
    while (this.cache.size >= RAG_CONFIG.cache.maxQueries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      queryHash: key,
    });
    this.accessOrder.push(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: RAG_CONFIG.cache.maxQueries,
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

// Global query cache instance
export const queryCache = new QueryCache();

// ============================================================================
// LATENCY MONITORING
// ============================================================================

interface LatencyMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
}

/**
 * Latency monitor for adaptive optimization
 */
class LatencyMonitor {
  private metrics: LatencyMetric[] = [];
  private readonly maxMetrics = 1000;

  /**
   * Record a latency metric
   */
  record(operation: string, durationMs: number): void {
    this.metrics.push({
      operation,
      durationMs,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get average latency for an operation
   */
  getAverage(operation: string, windowMs: number = 60000): number {
    const cutoff = Date.now() - windowMs;
    const relevant = this.metrics.filter(
      m => m.operation === operation && m.timestamp > cutoff
    );

    if (relevant.length === 0) {
      return 0;
    }

    const sum = relevant.reduce((acc, m) => acc + m.durationMs, 0);
    return sum / relevant.length;
  }

  /**
   * Get P95 latency for an operation
   */
  getP95(operation: string, windowMs: number = 60000): number {
    const cutoff = Date.now() - windowMs;
    const relevant = this.metrics
      .filter(m => m.operation === operation && m.timestamp > cutoff)
      .map(m => m.durationMs)
      .sort((a, b) => a - b);

    if (relevant.length === 0) {
      return 0;
    }

    const idx = Math.floor(relevant.length * 0.95);
    return relevant[idx];
  }

  /**
   * Check if we're meeting latency targets
   */
  isHealthy(): boolean {
    const embeddingP95 = this.getP95('embedding');
    const searchP95 = this.getP95('vectorSearch');
    const totalP95 = this.getP95('totalRetrieval');

    return (
      embeddingP95 < RAG_CONFIG.latency.embedding * 1.5 &&
      searchP95 < RAG_CONFIG.latency.vectorSearch * 1.5 &&
      totalP95 < RAG_CONFIG.latency.target * 1.2
    );
  }

  /**
   * Get health report
   */
  getHealthReport(): Record<string, unknown> {
    return {
      embedding: {
        avgMs: Math.round(this.getAverage('embedding')),
        p95Ms: Math.round(this.getP95('embedding')),
        targetMs: RAG_CONFIG.latency.embedding,
      },
      vectorSearch: {
        avgMs: Math.round(this.getAverage('vectorSearch')),
        p95Ms: Math.round(this.getP95('vectorSearch')),
        targetMs: RAG_CONFIG.latency.vectorSearch,
      },
      totalRetrieval: {
        avgMs: Math.round(this.getAverage('totalRetrieval')),
        p95Ms: Math.round(this.getP95('totalRetrieval')),
        targetMs: RAG_CONFIG.latency.target,
      },
      isHealthy: this.isHealthy(),
    };
  }
}

// Global latency monitor
export const latencyMonitor = new LatencyMonitor();

// ============================================================================
// OPTIMIZED SEARCH WRAPPER
// ============================================================================

/**
 * Wrapper function that applies all optimizations
 * This is the main entry point for optimized search
 */
export async function optimizedSearch(
  params: OptimizedSearchParams,
  searchFn: (params: {
    query: string;
    agencyId?: number | null;
    agencyName?: string | null;
    stateCode?: string | null;
    limit: number;
    threshold: number;
  }) => Promise<RetrievalResult[]>
): Promise<OptimizedSearchResult> {
  const startTime = Date.now();
  const metrics: Partial<RagMetrics> = {
    cacheHit: false,
  };

  // Step 1: Normalize query
  const normStart = Date.now();
  const normalizedQuery = normalizeEmsQuery(params.query);
  metrics.queryNormalizationMs = Date.now() - normStart;

  // Step 2: Check cache
  const cachedResults = queryCache.get(params);
  if (cachedResults) {
    metrics.cacheHit = true;
    metrics.embeddingGenerationMs = 0;
    metrics.vectorSearchMs = 0;
    metrics.rerankingMs = 0;
    metrics.totalRetrievalMs = Date.now() - startTime;
    metrics.resultCount = cachedResults.length;

    return {
      results: cachedResults,
      normalizedQuery,
      metrics: metrics as RagMetrics,
      suggestedModel: selectModel(normalizedQuery, params.userTier || 'free'),
    };
  }

  // Step 3: Select optimal threshold and limit
  const threshold = selectSimilarityThreshold(normalizedQuery);
  const finalLimit = selectResultLimit(normalizedQuery);

  // Step 4: Execute search with optimized parameters
  const searchStart = Date.now();
  const rawResults = await searchFn({
    query: normalizedQuery.normalized,
    agencyId: params.agencyId,
    agencyName: params.agencyName,
    stateCode: params.stateCode,
    limit: RAG_CONFIG.results.initialFetch,
    threshold,
  });
  const searchDuration = Date.now() - searchStart;
  metrics.vectorSearchMs = searchDuration;
  latencyMonitor.record('vectorSearch', searchDuration);

  // Step 5: Re-rank results
  const rerankStart = Date.now();
  const rerankedResults = rerankResults(rawResults, normalizedQuery);
  metrics.rerankingMs = Date.now() - rerankStart;

  // Step 6: Trim to final limit
  const finalResults = rerankedResults.slice(0, finalLimit);

  // Step 7: Cache results
  queryCache.set(params, finalResults);

  // Record total metrics
  metrics.totalRetrievalMs = Date.now() - startTime;
  metrics.resultCount = finalResults.length;
  metrics.embeddingGenerationMs = 0; // Will be set by caller if embedding was generated
  latencyMonitor.record('totalRetrieval', metrics.totalRetrievalMs);

  return {
    results: finalResults,
    normalizedQuery,
    metrics: metrics as RagMetrics,
    suggestedModel: selectModel(normalizedQuery, params.userTier || 'free'),
  };
}

