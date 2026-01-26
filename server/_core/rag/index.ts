/**
 * RAG Pipeline Optimizer for Protocol Guide
 *
 * Optimizations for 2-second latency target:
 * 1. Parallel execution where possible
 * 2. Tiered similarity thresholds
 * 3. Query result caching (Redis-ready)
 * 4. Re-ranking for improved accuracy
 * 5. Latency monitoring and adaptive routing
 * 6. Multi-query fusion for better recall
 * 7. Reciprocal Rank Fusion (RRF) for result merging
 * 8. Context-aware boosting
 */

import { normalizeEmsQuery } from '../ems-query-normalizer';

// ============================================================================
// CONFIGURATION (imported from separate file to avoid circular deps)
// ============================================================================

export { RAG_CONFIG } from './config';

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
  normalizedQuery: import('../ems-query-normalizer').NormalizedQuery;
  metrics: RagMetrics;
  suggestedModel: 'haiku' | 'sonnet';
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
    const agencyPart = params.agencyId || 'all';
    const statePart = params.stateCode || 'all';
    return normalized.normalized + ':' + agencyPart + ':' + statePart;
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
// RE-EXPORTS
// ============================================================================

// Re-export all scoring functions
export {
  rerankResults,
  advancedRerank,
  applyContextBoost,
  reciprocalRankFusion,
} from './scoring';

// Re-export all search execution functions
export {
  optimizedSearch,
  highAccuracySearch,
  multiQueryFusion,
  type OptimizedSearchOptions,
} from './search-execution';

// Re-export all model selection functions
export {
  selectModel,
  selectSimilarityThreshold,
  selectResultLimit,
} from './model-selection';
