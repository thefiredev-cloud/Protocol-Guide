/**
 * Protocol Guide - Resilient Redis Client
 *
 * Redis client wrapper with graceful degradation:
 * - Circuit breaker for Redis failures
 * - Automatic fallback to in-memory cache
 * - Health monitoring and recovery detection
 */

import { Redis } from '@upstash/redis';
import { logger } from '../logger';
import { ServiceRegistry } from './service-registry';
import { generalCache, InMemoryCache } from './in-memory-cache';

export interface ResilientRedisConfig {
  /** Redis URL */
  url?: string;
  /** Redis token */
  token?: string;
  /** Enable in-memory fallback (default: true) */
  enableFallback?: boolean;
  /** Custom in-memory cache instance */
  fallbackCache?: InMemoryCache;
}

/**
 * Resilient Redis client with automatic failover
 */
export class ResilientRedis {
  private redis: Redis | null = null;
  private fallbackCache: InMemoryCache;
  private enableFallback: boolean;
  private isRedisHealthy = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds

  constructor(config: ResilientRedisConfig = {}) {
    this.enableFallback = config.enableFallback ?? true;
    this.fallbackCache = config.fallbackCache ?? generalCache;

    const url = config.url || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = config.token || process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        this.redis = new Redis({ url, token });
        this.isRedisHealthy = true;
        logger.info('Resilient Redis initialized with Upstash backend');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Redis client');
        this.isRedisHealthy = false;
      }
    } else {
      logger.warn('Redis not configured - using in-memory fallback only');
      this.isRedisHealthy = false;
    }
  }

  /**
   * Check if Redis is available (with circuit breaker)
   */
  isAvailable(): boolean {
    return this.isRedisHealthy && ServiceRegistry.isAvailable('redis');
  }

  /**
   * Check if using fallback mode
   */
  isUsingFallback(): boolean {
    return !this.isAvailable() && this.enableFallback;
  }

  /**
   * Get a value with automatic fallback
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.isAvailable() && this.redis) {
      try {
        const result = await ServiceRegistry.execute(
          'redis',
          async () => {
            const value = await this.redis!.get<string>(key);
            return value;
          }
        );

        if (result !== null) {
          // Also store in fallback cache for redundancy
          if (this.enableFallback) {
            try {
              const parsed = typeof result === 'string' ? JSON.parse(result) : result;
              this.fallbackCache.set(key, parsed);
            } catch {
              this.fallbackCache.set(key, result);
            }
          }
          return (typeof result === 'string' ? JSON.parse(result) : result) as T;
        }
        return null;
      } catch (error) {
        logger.warn({ error, key }, 'Redis get failed, trying fallback');
        this.handleRedisError(error);
      }
    }

    // Fallback to in-memory cache
    if (this.enableFallback) {
      const cached = this.fallbackCache.get(key);
      if (cached !== null) {
        logger.debug({ key }, 'Served from in-memory fallback cache');
        return cached as T;
      }
    }

    return null;
  }

  /**
   * Set a value with automatic fallback
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const serialized = JSON.stringify(value);
    let redisSuccess = false;

    // Try Redis first if available
    if (this.isAvailable() && this.redis) {
      try {
        await ServiceRegistry.execute('redis', async () => {
          if (ttlSeconds) {
            await this.redis!.setex(key, ttlSeconds, serialized);
          } else {
            await this.redis!.set(key, serialized);
          }
        });
        redisSuccess = true;
      } catch (error) {
        logger.warn({ error, key }, 'Redis set failed, using fallback');
        this.handleRedisError(error);
      }
    }

    // Always update fallback cache for redundancy
    if (this.enableFallback) {
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
      this.fallbackCache.set(key, value, ttlMs);
    }

    return redisSuccess || this.enableFallback;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<boolean> {
    let redisSuccess = false;

    if (this.isAvailable() && this.redis) {
      try {
        await ServiceRegistry.execute('redis', async () => {
          await this.redis!.del(key);
        });
        redisSuccess = true;
      } catch (error) {
        logger.warn({ error, key }, 'Redis del failed');
        this.handleRedisError(error);
      }
    }

    // Also delete from fallback
    if (this.enableFallback) {
      this.fallbackCache.delete(key);
    }

    return redisSuccess || this.enableFallback;
  }

  /**
   * Increment a counter (for rate limiting)
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    // Try Redis first if available
    if (this.isAvailable() && this.redis) {
      try {
        const result = await ServiceRegistry.execute('redis', async () => {
          const value = await this.redis!.incr(key);
          if (ttlSeconds) {
            await this.redis!.expire(key, ttlSeconds);
          }
          return value;
        });
        return result;
      } catch (error) {
        logger.warn({ error, key }, 'Redis incr failed, using fallback');
        this.handleRedisError(error);
      }
    }

    // Fallback to in-memory counter
    if (this.enableFallback) {
      const current = this.fallbackCache.get(key) as number | null;
      const newValue = (current ?? 0) + 1;
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : 60000;
      this.fallbackCache.set(key, newValue, ttlMs);
      return newValue;
    }

    return 1;
  }

  /**
   * Set with expiration (common pattern for caching)
   */
  async setex(key: string, ttlSeconds: number, value: unknown): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.ping();
      this.isRedisHealthy = true;
      ServiceRegistry.markHealthy('redis');
      return true;
    } catch (error) {
      this.isRedisHealthy = false;
      ServiceRegistry.markUnhealthy('redis', 'Ping failed');
      return false;
    }
  }

  /**
   * Perform health check (with throttling)
   */
  async healthCheck(): Promise<{
    redis: boolean;
    fallback: boolean;
    mode: 'redis' | 'fallback' | 'both';
  }> {
    const now = Date.now();

    // Throttle health checks
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return {
        redis: this.isRedisHealthy,
        fallback: this.enableFallback,
        mode: this.isRedisHealthy ? 'redis' : 'fallback',
      };
    }

    this.lastHealthCheck = now;

    // Actually ping Redis
    const redisHealthy = await this.ping();

    return {
      redis: redisHealthy,
      fallback: this.enableFallback,
      mode: redisHealthy ? 'redis' : 'fallback',
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    redisAvailable: boolean;
    usingFallback: boolean;
    fallbackStats: ReturnType<InMemoryCache['getStats']>;
    circuitState: string;
  } {
    const cb = ServiceRegistry.getCircuitBreaker('redis');
    return {
      redisAvailable: this.isAvailable(),
      usingFallback: this.isUsingFallback(),
      fallbackStats: this.fallbackCache.getStats(),
      circuitState: cb?.getState() || 'UNKNOWN',
    };
  }

  /**
   * Handle Redis errors - update health status
   */
  private handleRedisError(error: unknown): void {
    this.isRedisHealthy = false;
    ServiceRegistry.recordFailure('redis', error);
  }

  /**
   * Get the underlying Redis client (for advanced operations)
   * Returns null if Redis is not available
   */
  getRedisClient(): Redis | null {
    return this.isAvailable() ? this.redis : null;
  }
}

// Singleton instance for general use
let _resilientRedis: ResilientRedis | null = null;

/**
 * Get the singleton ResilientRedis instance
 */
export function getResilientRedis(): ResilientRedis {
  if (!_resilientRedis) {
    _resilientRedis = new ResilientRedis();
  }
  return _resilientRedis;
}

/**
 * Initialize ResilientRedis with custom config
 */
export function initResilientRedis(config?: ResilientRedisConfig): ResilientRedis {
  _resilientRedis = new ResilientRedis(config);
  return _resilientRedis;
}
