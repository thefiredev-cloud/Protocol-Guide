/**
 * Protocol Guide - Redis Search Cache
 *
 * Caches semantic search results in Upstash Redis for fast repeat queries.
 * Target: Repeat queries <10ms (vs 200-500ms for embedding + pgvector search)
 *
 * Cache key format: search:{md5(query:agencyId:stateCode:limit)}
 * TTL: 5 minutes (300 seconds) - balances freshness with performance
 */

import { getRedis, isRedisAvailable } from './redis';
import { logger } from './logger';
import { createHash } from 'crypto';

/** Cache TTL in seconds (1 hour for stable protocol data) */
export const CACHE_TTL = 3600; // 1 hour - protocols don't change frequently

/** Cache TTL for cache headers (public cacheability) */
export const CACHE_HEADER_MAX_AGE = 3600; // 1 hour
export const CACHE_HEADER_STALE_WHILE_REVALIDATE = 300; // 5 minutes

/** Cache key prefix */
const CACHE_PREFIX = 'search:';

/** Search parameters used for cache key generation */
export interface SearchCacheParams {
  query: string;
  agencyId?: number | null;
  agencyName?: string | null;
  stateCode?: string | null;
  limit?: number;
}

/** Cached search result structure */
export interface CachedSearchResult {
  results: {
    id: number;
    protocolNumber: string;
    protocolTitle: string;
    section: string | null;
    content: string;
    fullContent: string;
    sourcePdfUrl: string | null;
    relevanceScore: number;
    countyId: number;
    protocolEffectiveDate: string | null;
    lastVerifiedAt: string | null;
    protocolYear: number | null;
  }[];
  totalFound: number;
  query: string;
  cachedAt: number;
}

/** Cache statistics for monitoring */
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

// In-memory stats (reset on server restart)
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Generate a unique cache key for search parameters
 * Uses MD5 hash of normalized parameters for consistent, collision-resistant keys
 */
export function getSearchCacheKey(params: SearchCacheParams): string {
  // Normalize parameters for consistent hashing
  const normalized = {
    q: params.query.toLowerCase().trim(),
    a: params.agencyId ?? 0,
    n: params.agencyName?.toLowerCase().trim() ?? '',
    s: params.stateCode?.toUpperCase().trim() ?? '',
    l: params.limit ?? 10,
  };

  const hashInput = JSON.stringify(normalized);
  const hash = createHash('md5').update(hashInput).digest('hex');

  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached search results from Redis
 * Returns null if cache miss, expired, or Redis unavailable
 */
export async function getCachedSearchResults(
  key: string
): Promise<CachedSearchResult | null> {
  if (!isRedisAvailable()) {
    return null;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const startTime = performance.now();

  try {
    const cached = await redis.get<string>(key);

    if (!cached) {
      stats.misses++;
      return null;
    }

    // Parse cached JSON
    const parsed: CachedSearchResult =
      typeof cached === 'string' ? JSON.parse(cached) : cached;

    const duration = performance.now() - startTime;
    stats.hits++;

    logger.info(
      {
        cacheKey: key,
        durationMs: duration.toFixed(2),
        resultCount: parsed.results.length,
        cachedAt: new Date(parsed.cachedAt).toISOString(),
      },
      'Search cache HIT'
    );

    return parsed;
  } catch (error) {
    stats.errors++;
    logger.error(
      { error, cacheKey: key },
      'Search cache read error'
    );
    return null;
  }
}

/**
 * Cache search results in Redis with TTL
 */
export async function cacheSearchResults(
  key: string,
  results: Omit<CachedSearchResult, 'cachedAt'>
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const cacheEntry: CachedSearchResult = {
      ...results,
      cachedAt: Date.now(),
    };

    await redis.setex(key, CACHE_TTL, JSON.stringify(cacheEntry));

    logger.debug(
      {
        cacheKey: key,
        ttlSeconds: CACHE_TTL,
        resultCount: results.results.length,
      },
      'Search results cached'
    );

    return true;
  } catch (error) {
    stats.errors++;
    logger.error(
      { error, cacheKey: key },
      'Search cache write error'
    );
    return false;
  }
}

/**
 * Invalidate cached search results for a specific key
 */
export async function invalidateSearchCache(key: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    logger.debug({ cacheKey: key }, 'Search cache invalidated');
    return true;
  } catch (error) {
    logger.error({ error, cacheKey: key }, 'Search cache invalidation error');
    return false;
  }
}

/**
 * Invalidate all search cache entries
 * Uses SCAN to avoid blocking Redis with KEYS command
 */
export async function invalidateAllSearchCache(): Promise<number> {
  if (!isRedisAvailable()) {
    return 0;
  }

  const redis = getRedis();
  if (!redis) {
    return 0;
  }

  try {
    let cursor = 0;
    let deletedCount = 0;

    do {
      // Use SCAN to iterate through keys matching the search prefix
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${CACHE_PREFIX}*`,
        count: 100,
      });

      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    logger.info({ deletedCount }, 'All search cache entries invalidated');
    return deletedCount;
  } catch (error) {
    logger.error({ error }, 'Failed to invalidate all search cache');
    return 0;
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getSearchCacheStats(): CacheStats & {
  hitRate: number;
  available: boolean;
} {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? stats.hits / total : 0;

  return {
    ...stats,
    hitRate: Math.round(hitRate * 100) / 100,
    available: isRedisAvailable(),
  };
}

/**
 * Reset cache statistics (useful for testing)
 */
export function resetSearchCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.errors = 0;
}
