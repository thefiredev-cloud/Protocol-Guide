/**
 * Protocol Guide - Resilient AI Service
 *
 * Claude AI wrapper with graceful degradation:
 * - Circuit breaker for API failures
 * - Response caching for repeated queries
 * - Fallback responses when AI is unavailable
 * - Timeout handling
 */

import { createHash } from 'crypto';
import { logger } from '../logger';
import { ServiceRegistry } from './service-registry';
import { aiResponseCache, InMemoryCache } from './in-memory-cache';
import { CircuitBreakerOpenError } from './circuit-breaker';
import { getResilientRedis } from './resilient-redis';

export interface AIQueryParams {
  query: string;
  context?: string;
  userTier?: 'free' | 'pro' | 'enterprise';
  agencyName?: string;
  /** Skip cache lookup (default: false) */
  skipCache?: boolean;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  cached: boolean;
  fallback: boolean;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

export interface FallbackConfig {
  /** Enable fallback responses (default: true) */
  enabled: boolean;
  /** Custom fallback message generator */
  messageGenerator?: (params: AIQueryParams) => string;
}

// Cache TTL for AI responses (30 minutes)
const AI_CACHE_TTL_SECONDS = 30 * 60;

// Default timeout for AI requests
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Generate cache key for AI query
 */
function generateCacheKey(params: AIQueryParams): string {
  const normalized = {
    q: params.query.toLowerCase().trim(),
    t: params.userTier || 'free',
    a: params.agencyName?.toLowerCase().trim() || '',
  };
  const hash = createHash('md5').update(JSON.stringify(normalized)).digest('hex');
  return `ai:response:${hash}`;
}

/**
 * Default fallback message when AI is unavailable
 */
function getDefaultFallbackMessage(params: AIQueryParams): string {
  return `**Service Temporarily Unavailable**

We're experiencing technical difficulties with our AI service. Your query "${params.query.slice(0, 50)}${params.query.length > 50 ? '...' : ''}" could not be processed at this time.

**What you can do:**
- Try again in a few moments
- Search our protocol database directly
- Contact medical control for urgent guidance

We apologize for the inconvenience. Our team has been notified and is working to restore service.

---
*This is an automated fallback response. For medical emergencies, always contact medical control directly.*`;
}

/**
 * Check cache for existing response
 */
async function getCachedResponse(
  cacheKey: string,
  localCache: InMemoryCache
): Promise<AIResponse | null> {
  // Try Redis first (via resilient client)
  try {
    const redis = getResilientRedis();
    const cached = await redis.get<AIResponse>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  } catch (error) {
    logger.debug({ error, cacheKey }, 'Redis cache lookup failed');
  }

  // Try local in-memory cache
  const local = localCache.get(cacheKey) as AIResponse | null;
  if (local) {
    return { ...local, cached: true };
  }

  return null;
}

/**
 * Store response in cache
 */
async function cacheResponse(
  cacheKey: string,
  response: AIResponse,
  localCache: InMemoryCache
): Promise<void> {
  // Store in local cache immediately
  localCache.set(cacheKey, response, AI_CACHE_TTL_SECONDS * 1000);

  // Try to store in Redis (non-blocking)
  try {
    const redis = getResilientRedis();
    await redis.setex(cacheKey, AI_CACHE_TTL_SECONDS, response);
  } catch (error) {
    logger.debug({ error, cacheKey }, 'Failed to cache AI response in Redis');
  }
}

/**
 * Wrap a promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Resilient AI service with caching and fallback
 */
export class ResilientAIService {
  private localCache: InMemoryCache;
  private fallbackConfig: FallbackConfig;

  constructor(config?: { fallback?: FallbackConfig; cache?: InMemoryCache }) {
    this.localCache = config?.cache ?? aiResponseCache;
    this.fallbackConfig = config?.fallback ?? { enabled: true };
  }

  /**
   * Execute AI query with resilience patterns
   */
  async query(
    params: AIQueryParams,
    executeAI: (params: AIQueryParams) => Promise<Omit<AIResponse, 'cached' | 'fallback' | 'latencyMs'>>
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(params);
    const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Check cache first (unless skipped)
    if (!params.skipCache) {
      const cached = await getCachedResponse(cacheKey, this.localCache);
      if (cached) {
        logger.info({ cacheKey, query: params.query.slice(0, 50) }, 'AI response served from cache');
        return {
          ...cached,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // Check if AI service is available via circuit breaker
    if (!ServiceRegistry.isAvailable('ai-claude')) {
      logger.warn({ query: params.query.slice(0, 50) }, 'AI service circuit breaker is open');

      if (this.fallbackConfig.enabled) {
        return this.createFallbackResponse(params, startTime, 'Circuit breaker open');
      }

      throw new CircuitBreakerOpenError('ai-claude', 60000);
    }

    // Execute AI query with circuit breaker and timeout
    try {
      const result = await ServiceRegistry.execute(
        'ai-claude',
        () => withTimeout(executeAI(params), timeoutMs, 'AI query'),
        // Fallback function if circuit breaker triggers
        this.fallbackConfig.enabled
          ? () => ({
              content: this.getFallbackMessage(params),
              model: 'fallback',
              inputTokens: 0,
              outputTokens: 0,
            })
          : undefined
      );

      const response: AIResponse = {
        ...result,
        cached: false,
        fallback: result.model === 'fallback',
        latencyMs: Date.now() - startTime,
      };

      // Cache successful non-fallback responses
      if (!response.fallback) {
        await cacheResponse(cacheKey, response, this.localCache);
      }

      return response;
    } catch (error) {
      logger.error(
        { error, query: params.query.slice(0, 50), timeoutMs },
        'AI query failed'
      );

      // Return fallback if enabled
      if (this.fallbackConfig.enabled) {
        return this.createFallbackResponse(params, startTime, error);
      }

      throw error;
    }
  }

  /**
   * Create a fallback response
   */
  private createFallbackResponse(
    params: AIQueryParams,
    startTime: number,
    reason: unknown
  ): AIResponse {
    const reasonStr = reason instanceof Error ? reason.message : String(reason);
    logger.info(
      { query: params.query.slice(0, 50), reason: reasonStr },
      'Returning AI fallback response'
    );

    return {
      content: this.getFallbackMessage(params),
      model: 'fallback',
      cached: false,
      fallback: true,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get fallback message
   */
  private getFallbackMessage(params: AIQueryParams): string {
    if (this.fallbackConfig.messageGenerator) {
      return this.fallbackConfig.messageGenerator(params);
    }
    return getDefaultFallbackMessage(params);
  }

  /**
   * Manually invalidate cached response
   */
  async invalidateCache(params: AIQueryParams): Promise<void> {
    const cacheKey = generateCacheKey(params);

    // Remove from local cache
    this.localCache.delete(cacheKey);

    // Remove from Redis
    try {
      const redis = getResilientRedis();
      await redis.del(cacheKey);
    } catch (error) {
      logger.debug({ error, cacheKey }, 'Failed to invalidate Redis cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    localCache: ReturnType<InMemoryCache['getStats']>;
    serviceAvailable: boolean;
    circuitState: string;
  } {
    const cb = ServiceRegistry.getCircuitBreaker('ai-claude');
    return {
      localCache: this.localCache.getStats(),
      serviceAvailable: ServiceRegistry.isAvailable('ai-claude'),
      circuitState: cb?.getState() || 'UNKNOWN',
    };
  }

  /**
   * Check if fallback is enabled
   */
  isFallbackEnabled(): boolean {
    return this.fallbackConfig.enabled;
  }

  /**
   * Update fallback configuration
   */
  setFallbackConfig(config: FallbackConfig): void {
    this.fallbackConfig = config;
  }
}

// Singleton instance
let _resilientAI: ResilientAIService | null = null;

/**
 * Get the singleton ResilientAIService instance
 */
export function getResilientAI(): ResilientAIService {
  if (!_resilientAI) {
    _resilientAI = new ResilientAIService();
  }
  return _resilientAI;
}

/**
 * Initialize ResilientAIService with custom config
 */
export function initResilientAI(config?: {
  fallback?: FallbackConfig;
  cache?: InMemoryCache;
}): ResilientAIService {
  _resilientAI = new ResilientAIService(config);
  return _resilientAI;
}
