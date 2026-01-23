/**
 * Protocol Guide - Resilience Module
 *
 * Centralized exports for all resilience patterns:
 * - Circuit breakers for external services
 * - In-memory cache fallbacks
 * - Service health registry
 * - Resilient wrappers for Redis, AI, and Database
 */

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  createDatabaseCircuitBreaker,
  createAICircuitBreaker,
  createRedisCircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from './circuit-breaker';

export {
  InMemoryCache,
  searchCache,
  aiResponseCache,
  rateLimitCache,
  generalCache,
  type CacheEntry,
  type InMemoryCacheConfig,
  type CacheStats,
} from './in-memory-cache';

export {
  ServiceRegistry,
  type ServiceName,
  type ServiceStatus,
  type ServiceRegistryStats,
} from './service-registry';

export {
  ResilientRedis,
  getResilientRedis,
  initResilientRedis,
  type ResilientRedisConfig,
} from './resilient-redis';

export {
  ResilientAIService,
  getResilientAI,
  initResilientAI,
  type AIQueryParams,
  type AIResponse,
  type FallbackConfig,
} from './resilient-ai';

export {
  ResilientDatabase,
  getResilientDb,
  initResilientDb,
  withResilience,
  DatabaseTimeoutError,
  DatabaseUnavailableError,
  type QueryOptions,
  type SlowQueryConfig,
} from './resilient-db';
