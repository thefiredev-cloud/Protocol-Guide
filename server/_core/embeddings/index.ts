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

// Re-export cache for external access
export { embeddingCache } from './cache';

// Re-export core embedding generation (moved to separate file to avoid circular deps)
export { generateEmbedding, VOYAGE_MODEL, EMBEDDING_DIMENSION } from './generate';

// Re-export batch functions
export {
  generateEmbeddingsBatch,
  generateAllEmbeddings,
  updateProtocolEmbedding,
  BATCH_SIZE,
} from './batch';

// Re-export search functions and types
export {
  semanticSearchProtocols,
  semanticSearchWithInheritance,
  semanticSearchProtocolsEnhanced,
  getProtocolInheritanceChain,
  getAgencyProtocolCoverage,
  getSupabaseClient,
  type SearchResult,
  type InheritedSearchResult,
  type InheritanceChainEntry,
  type ProtocolCoverage,
} from './search';
