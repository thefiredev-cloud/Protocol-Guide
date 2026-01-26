/**
 * RAG Pipeline Configuration
 * Separated to avoid circular dependencies between modules
 */

export const RAG_CONFIG = {
  // Latency targets (milliseconds)
  latency: {
    target: 2000, // 2 second target
    embedding: 300, // Max for embedding generation
    vectorSearch: 200, // Max for vector search
    llmInference: 1500, // Max for Claude response
  },

  // Similarity thresholds (tiered by intent)
  // Lowered thresholds for better recall - re-ranking handles precision
  similarity: {
    // High precision for medication queries (safety critical)
    // Lowered from 0.45 to allow more candidates for re-ranking
    medication: 0.38,
    // Standard threshold for procedures
    procedure: 0.35,
    // Lower threshold for general queries (better recall)
    general: 0.30,
    // Minimum acceptable (below this = no results)
    minimum: 0.20,
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
