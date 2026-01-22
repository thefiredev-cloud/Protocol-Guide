/**
 * Protocol Guide - Rate Limiting Middleware
 *
 * In-memory rate limiting for Express routes.
 * Uses sliding window algorithm for accurate rate limiting.
 *
 * Features:
 * - IP-based rate limiting (default)
 * - Per-user subscription tier limits
 * - Daily query limits by tier (Free: 10, Pro: 100, Unlimited: no limit)
 */

import { Request, Response, NextFunction } from "express";

// ============================================================================
// SUBSCRIPTION TIER CONFIGURATION
// ============================================================================

/**
 * Subscription tier types
 */
export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

/**
 * Daily query limits by subscription tier
 */
export const TIER_DAILY_LIMITS: Record<SubscriptionTier, number> = {
  free: 10,       // Free tier: 10 queries/day
  pro: 100,       // Pro tier: 100 queries/day
  unlimited: -1,  // Unlimited tier: no limit (-1 = unlimited)
} as const;

/**
 * Per-minute rate limits by subscription tier (for burst protection)
 */
export const TIER_MINUTE_LIMITS: Record<SubscriptionTier, number> = {
  free: 5,        // Free tier: 5 queries/minute
  pro: 20,        // Pro tier: 20 queries/minute
  unlimited: 60,  // Unlimited tier: 60 queries/minute
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

export interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window (default: 100) */
  max?: number;
  /** Message to return when rate limited */
  message?: string;
  /** HTTP status code when rate limited (default: 429) */
  statusCode?: number;
  /** Key generator function (default: uses IP) */
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Creates a rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = 60000,
    max = 100,
    message = "Too many requests, please try again later.",
    statusCode = 429,
    keyGenerator = getClientKey,
  } = config;

  // In-memory store for rate limit tracking
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const entries = Array.from(store.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 60000);

  // Prevent interval from keeping process alive (Node.js only)
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    (cleanupInterval as NodeJS.Timeout).unref();
  }

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(key);

    // Reset if window has passed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    entry.count++;
    store.set(key, entry);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000));
      res.status(statusCode).json({
        error: "RATE_LIMITED",
        message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Extract client key from request for rate limiting
 * Uses X-Forwarded-For for proxied requests, falls back to IP
 */
function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list, use first IP
    const firstIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0];
    return firstIp.trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  /** Public endpoints: 100 requests per minute */
  public: { windowMs: 60000, max: 100 },
  /** Search endpoints: 30 requests per minute */
  search: { windowMs: 60000, max: 30 },
  /** AI query endpoints: 10 requests per minute */
  ai: { windowMs: 60000, max: 10 },
  /** Auth endpoints: 5 requests per minute (prevent brute force) */
  auth: { windowMs: 60000, max: 5 },
} as const;
