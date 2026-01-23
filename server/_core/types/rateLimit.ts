/**
 * Protocol Guide - Rate Limit Types
 *
 * Shared types for rate limiting across the application.
 * Separated to avoid circular dependencies between context and trpc modules.
 */

/**
 * Rate limit header names following RFC 6585 and draft-ietf-httpapi-ratelimit-headers
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: "X-RateLimit-Limit",
  REMAINING: "X-RateLimit-Remaining",
  RESET: "X-RateLimit-Reset",
  DAILY_LIMIT: "X-RateLimit-Daily-Limit",
  DAILY_REMAINING: "X-RateLimit-Daily-Remaining",
  DAILY_RESET: "X-RateLimit-Daily-Reset",
  RETRY_AFTER: "Retry-After",
} as const;

/**
 * Rate limit info for a single request
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the current window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit window resets */
  resetTime: number;
  /** Daily usage limits (optional, for tier-based limiting) */
  daily?: {
    /** Daily limit or "unlimited" for premium tiers */
    limit: number | "unlimited";
    /** Remaining daily requests or "unlimited" */
    remaining: number | "unlimited";
    /** Unix timestamp (ms) when daily limit resets (midnight UTC) */
    resetTime: number;
  };
}

/**
 * Set rate limit headers on the response
 * Can be called from any Express route or tRPC procedure with access to res
 */
export function setRateLimitHeaders(
  res: { setHeader: (name: string, value: string | number) => void },
  info: RateLimitInfo
): void {
  res.setHeader(RATE_LIMIT_HEADERS.LIMIT, info.limit);
  res.setHeader(RATE_LIMIT_HEADERS.REMAINING, Math.max(0, info.remaining));
  res.setHeader(RATE_LIMIT_HEADERS.RESET, Math.ceil(info.resetTime / 1000));

  if (info.daily) {
    res.setHeader(
      RATE_LIMIT_HEADERS.DAILY_LIMIT,
      info.daily.limit === "unlimited" ? "unlimited" : info.daily.limit
    );
    res.setHeader(
      RATE_LIMIT_HEADERS.DAILY_REMAINING,
      info.daily.remaining === "unlimited"
        ? "unlimited"
        : Math.max(0, info.daily.remaining as number)
    );
    res.setHeader(
      RATE_LIMIT_HEADERS.DAILY_RESET,
      Math.ceil(info.daily.resetTime / 1000)
    );
  }
}

/**
 * Calculate next midnight UTC for daily reset
 */
export function getNextMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return tomorrow.getTime();
}
