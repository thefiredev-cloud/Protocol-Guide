/**
 * RAG Pipeline Types
 * Separated to avoid circular dependencies between modules
 */

import type { NormalizedQuery } from '../ems-query-normalizer';

export interface RetrievalResult {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  similarity: number;
  rerankedScore?: number;
  imageUrls?: string[] | null;
  stateCode?: string | null;
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
