/**
 * Protocol Guide - Redis-Based Rate Limiting
 *
 * Production-ready rate limiting with Redis backend.
 * Supports per-user limits based on subscription tiers.
 * Falls back to in-memory for development.
 */

import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, isRedisAvailable } from "./redis";
import { logger } from "./logger";
import { createRateLimiter as createInMemoryLimiter } from "./rateLimit";

export interface RateLimitTier {
  /** Max requests per window */
  max: number;
  /** Window in milliseconds */
  windowMs: number;
}

export interface RateLimitTiers {
  free: RateLimitTier;
  pro: RateLimitTier;
  premium: RateLimitTier;
}

export interface EnhancedRateLimitConfig {
  /** Default tier limits */
  defaultTier: RateLimitTier;
  /** Tier-based limits */
  tiers?: RateLimitTiers;
  /** Rate limit message */
  message?: string;
  /** Include user info in key (default: true) */
  includeUser?: boolean;
}

/**
 * Subscription tier rate limits for different endpoints
 */
export const TIER_LIMITS = {
  // Search endpoints
  search: {
    free: { max: 30, windowMs: 60000 },    // 30/min
    pro: { max: 100, windowMs: 60000 },    // 100/min
    premium: { max: 500, windowMs: 60000 }, // 500/min
  },
  // AI query endpoints
  ai: {
    free: { max: 10, windowMs: 60000 },    // 10/min
    pro: { max: 50, windowMs: 60000 },     // 50/min
    premium: { max: 200, windowMs: 60000 }, // 200/min
  },
  // Public endpoints
  public: {
    free: { max: 100, windowMs: 60000 },   // 100/min
    pro: { max: 300, windowMs: 60000 },    // 300/min
    premium: { max: 1000, windowMs: 60000 }, // 1000/min
  },
} as const;

/**
 * Create Redis-based rate limiter
 */
export function createRedisRateLimiter(config: EnhancedRateLimitConfig) {
  const {
    defaultTier,
    tiers,
    message = "Too many requests, please try again later.",
    includeUser = true,
  } = config;

  const redis = getRedis();

  // Fallback to in-memory if Redis not available
  if (!redis || !isRedisAvailable()) {
    logger.warn("Redis not available, using in-memory rate limiter");
    return createInMemoryLimiter({
      windowMs: defaultTier.windowMs,
      max: defaultTier.max,
      message,
    });
  }

  // Create Redis rate limiters for each tier
  const limiters: Record<string, Ratelimit> = {};

  if (tiers) {
    limiters.free = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        tiers.free.max,
        `${tiers.free.windowMs} ms`
      ),
      analytics: true,
      prefix: "ratelimit:free",
    });

    limiters.pro = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        tiers.pro.max,
        `${tiers.pro.windowMs} ms`
      ),
      analytics: true,
      prefix: "ratelimit:pro",
    });

    limiters.premium = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        tiers.premium.max,
        `${tiers.premium.windowMs} ms`
      ),
      analytics: true,
      prefix: "ratelimit:premium",
    });
  } else {
    // Single tier limiter
    limiters.default = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        defaultTier.max,
        `${defaultTier.windowMs} ms`
      ),
      analytics: true,
      prefix: "ratelimit:default",
    });
  }

  return async function redisRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get user context from request
      const user = (req as any).user;
      const userId = user?.id || "anonymous";
      const subscriptionTier = user?.subscriptionTier || "free";

      // Build rate limit key
      const ip = getClientIp(req);
      const key = includeUser && user ? `user:${userId}` : `ip:${ip}`;

      // Select appropriate limiter
      const limiter = limiters[subscriptionTier] || limiters.default || limiters.free;

      // Check rate limit
      const { success, limit, remaining, reset } = await limiter.limit(key);

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(reset / 1000));

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        res.setHeader("Retry-After", retryAfter);

        logger.warn({
          userId,
          subscriptionTier,
          ip,
          path: req.path,
          limit,
        }, "Rate limit exceeded");

        res.status(429).json({
          error: "RATE_LIMITED",
          message,
          retryAfter,
          limit,
          subscriptionTier,
        });
        return;
      }

      next();
    } catch (error) {
      // Log error but don't block request
      logger.error({ error }, "Rate limiter error");
      next();
    }
  };
}

/**
 * Extract client IP from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const firstIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0];
    return firstIp.trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Convenience functions for common rate limit patterns
 */
export const createSearchLimiter = () =>
  createRedisRateLimiter({
    defaultTier: TIER_LIMITS.search.free,
    tiers: TIER_LIMITS.search,
    message: "Search rate limit exceeded. Upgrade to Pro for higher limits.",
  });

export const createAiLimiter = () =>
  createRedisRateLimiter({
    defaultTier: TIER_LIMITS.ai.free,
    tiers: TIER_LIMITS.ai,
    message: "AI query rate limit exceeded. Upgrade to Pro for higher limits.",
  });

export const createPublicLimiter = () =>
  createRedisRateLimiter({
    defaultTier: TIER_LIMITS.public.free,
    tiers: TIER_LIMITS.public,
    includeUser: false, // IP-based only for public endpoints
  });
