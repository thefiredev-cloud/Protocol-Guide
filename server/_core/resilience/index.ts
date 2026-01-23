/**
 * Protocol Guide - Resilience Module
 *
 * Centralized exports for all resilience patterns:
 * - Circuit breakers for external services
 * - In-memory cache fallbacks
 * - Service health registry
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
