/**
 * Search Execution Functions for RAG Pipeline
 * 
 * Orchestrates the complete search pipeline including:
 * - Query normalization
 * - Cache checking
 * - Multi-query fusion
 * - Re-ranking and boosting
 * - Result aggregation
 */

import { normalizeEmsQuery, generateQueryVariations, type NormalizedQuery } from '../ems-query-normalizer';
import type { 
  RetrievalResult, 
  RagMetrics, 
  OptimizedSearchParams, 
  OptimizedSearchResult 
} from './index';
import { RAG_CONFIG, queryCache, latencyMonitor } from './index';
import { rerankResults, advancedRerank, applyContextBoost, reciprocalRankFusion } from './scoring';
import { selectModel, selectSimilarityThreshold, selectResultLimit } from './model-selection';

// ============================================================================
// SEARCH OPTIONS
// ============================================================================

export interface OptimizedSearchOptions {
  /** Enable multi-query fusion for better recall (adds ~100-200ms latency) */
  enableMultiQueryFusion?: boolean;
  /** Use advanced re-ranking instead of basic */
  enableAdvancedRerank?: boolean;
  /** Enable context-aware boosting for user's agency/state */
  enableContextBoost?: boolean;
}

// ============================================================================
// MULTI-QUERY FUSION
// ============================================================================

/**
 * Execute multi-query search with fusion
 * Improves recall by searching with query variations
 */
export async function multiQueryFusion(
  params: OptimizedSearchParams,
  searchFn: (params: {
    query: string;
    agencyId?: number | null;
    agencyName?: string | null;
    stateCode?: string | null;
    limit: number;
    threshold: number;
  }) => Promise<RetrievalResult[]>,
  normalized: NormalizedQuery
): Promise<RetrievalResult[]> {
  // Generate query variations for better recall
  const variations = generateQueryVariations(params.query);

  // Limit to 3 variations to stay within latency budget
  const queryVariants = variations.slice(0, 3);

  // Select threshold based on intent
  const threshold = selectSimilarityThreshold(normalized);

  // Execute searches in parallel for all variants
  const searchPromises = queryVariants.map(async (queryVariant) => {
    try {
      return await searchFn({
        query: queryVariant,
        agencyId: params.agencyId,
        agencyName: params.agencyName,
        stateCode: params.stateCode,
        limit: RAG_CONFIG.results.initialFetch,
        threshold: threshold * 0.9, // Slightly lower threshold for variations
      });
    } catch (error) {
      console.warn('[RAG] Query variation failed: ' + queryVariant, error);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);

  // Filter out empty results
  const validResults = allResults.filter(r => r.length > 0);

  if (validResults.length === 0) {
    return [];
  }

  // Use RRF to merge results from all query variants
  return reciprocalRankFusion(validResults, RAG_CONFIG.results.initialFetch);
}

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
  }) => Promise<RetrievalResult[]>,
  options: OptimizedSearchOptions = {}
): Promise<OptimizedSearchResult> {
  const {
    enableMultiQueryFusion = false,
    enableAdvancedRerank = true,
    enableContextBoost = true,
  } = options;

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

  // Step 4: Execute search - use multi-query fusion for complex queries or when enabled
  const searchStart = Date.now();
  let rawResults: RetrievalResult[];

  const shouldUseMultiQuery = enableMultiQueryFusion ||
    normalizedQuery.isComplex ||
    normalizedQuery.intent === 'differential_diagnosis';

  if (shouldUseMultiQuery) {
    // Multi-query fusion for better recall on complex queries
    rawResults = await multiQueryFusion(params, searchFn, normalizedQuery);
    console.log('[RAG] Multi-query fusion returned ' + rawResults.length + ' results');
  } else {
    // Standard single-query search
    rawResults = await searchFn({
      query: normalizedQuery.normalized,
      agencyId: params.agencyId,
      agencyName: params.agencyName,
      stateCode: params.stateCode,
      limit: RAG_CONFIG.results.initialFetch,
      threshold,
    });
  }

  const searchDuration = Date.now() - searchStart;
  metrics.vectorSearchMs = searchDuration;
  latencyMonitor.record('vectorSearch', searchDuration);

  // Step 5: Re-rank results
  const rerankStart = Date.now();
  let rerankedResults: RetrievalResult[];

  if (enableAdvancedRerank) {
    // Use advanced re-ranking with additional semantic signals
    rerankedResults = advancedRerank(rawResults, normalizedQuery);
  } else {
    // Use basic re-ranking
    rerankedResults = rerankResults(rawResults, normalizedQuery);
  }

  // Step 5b: Apply context-aware boosting if enabled
  if (enableContextBoost && (params.agencyId || params.stateCode)) {
    rerankedResults = applyContextBoost(
      rerankedResults,
      params.agencyId,
      params.stateCode
    );
    // Re-sort after context boost
    rerankedResults.sort((a, b) => (b.rerankedScore || 0) - (a.rerankedScore || 0));
  }

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

  // Log optimization details
  console.log('[RAG] Search completed: ' + metrics.totalRetrievalMs + 'ms, ' +
    'multi-query: ' + shouldUseMultiQuery + ', advanced-rerank: ' + enableAdvancedRerank + ', ' +
    'results: ' + finalResults.length);

  return {
    results: finalResults,
    normalizedQuery,
    metrics: metrics as RagMetrics,
    suggestedModel: selectModel(normalizedQuery, params.userTier || 'free'),
  };
}

/**
 * High-accuracy search with all optimizations enabled
 * Use for critical queries where accuracy is more important than latency
 */
export async function highAccuracySearch(
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
  return optimizedSearch(params, searchFn, {
    enableMultiQueryFusion: true,
    enableAdvancedRerank: true,
    enableContextBoost: true,
  });
}
