import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Middleware that requires paid tier (pro or enterprise)
const requirePaidTier = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (ctx.user.tier !== "pro" && ctx.user.tier !== "enterprise") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires a Pro or Enterprise subscription",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const paidProcedure = t.procedure.use(requirePaidTier);

// ============================================================================
// RATE LIMIT HEADERS UTILITY
// ============================================================================

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
 * Rate limit info returned from usage check
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  daily?: {
    limit: number | "unlimited";
    remaining: number | "unlimited";
    resetTime: number;
  };
}

/**
 * Set rate limit headers on the response
 * Can be called from any tRPC procedure with access to ctx.res
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
      info.daily.remaining === "unlimited" ? "unlimited" : Math.max(0, info.daily.remaining as number)
    );
    res.setHeader(RATE_LIMIT_HEADERS.DAILY_RESET, Math.ceil(info.daily.resetTime / 1000));
  }
}

/**
 * Calculate next midnight UTC for daily reset
 */
function getNextMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow.getTime();
}

// Middleware that enforces daily query limits based on tier
const enforceRateLimit = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Import getUserUsage dynamically to avoid circular dependency
  const { getUserUsage } = await import("../db.js");
  const usage = await getUserUsage(ctx.user.id);

  // Calculate rate limit info for headers
  const rateLimitInfo: RateLimitInfo = {
    limit: usage.limit,
    remaining: Math.max(0, usage.limit - usage.count),
    resetTime: getNextMidnightUTC(),
    daily: {
      limit: usage.limit === -1 ? "unlimited" : usage.limit,
      remaining: usage.limit === -1 ? "unlimited" : Math.max(0, usage.limit - usage.count),
      resetTime: getNextMidnightUTC(),
    },
  };

  // Always set rate limit headers (even for successful requests)
  setRateLimitHeaders(ctx.res, rateLimitInfo);

  if (usage.count >= usage.limit && usage.limit !== -1) {
    // Set Retry-After header when rate limited
    const retryAfter = Math.ceil((getNextMidnightUTC() - Date.now()) / 1000);
    ctx.res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Daily query limit reached (${usage.limit}). Upgrade to Pro for unlimited queries.`,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      rateLimitInfo, // Pass rate limit info to procedures if needed
    },
  });
});

export const rateLimitedProcedure = t.procedure.use(enforceRateLimit);
