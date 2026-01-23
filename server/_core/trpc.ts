import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import {
  logProcedureStart,
  logProcedureComplete,
  logProcedureError,
  createTraceLogger,
} from "./tracing";
import {
  type RateLimitInfo,
  RATE_LIMIT_HEADERS,
  setRateLimitHeaders,
  getNextMidnightUTC,
} from "./types/rateLimit";

// Re-export rate limit types and utilities for convenience
export { RATE_LIMIT_HEADERS, setRateLimitHeaders, type RateLimitInfo } from "./types/rateLimit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  /**
   * Error formatter that includes request ID in all error responses
   * This enables clients to report errors with trace context for debugging
   */
  errorFormatter({ shape, error, ctx }) {
    const requestId = ctx?.trace?.requestId;
    const traceLogger = ctx?.trace ? createTraceLogger(ctx.trace) : null;

    // Log the error with full trace context
    if (traceLogger) {
      traceLogger.error(
        {
          code: shape.code,
          httpStatus: shape.data?.httpStatus,
          path: shape.data?.path,
          errorMessage: error.message,
          errorCause: error.cause,
        },
        `tRPC error: ${error.message}`
      );
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        // Include request ID in error response for client-side debugging
        requestId,
        // Include timestamp for correlation
        timestamp: new Date().toISOString(),
      },
    };
  },
});

export const router = t.router;

// ============================================================================
// TRACING MIDDLEWARE
// ============================================================================

/**
 * Tracing middleware that logs all procedure calls with request context
 * Automatically tracks timing, logs start/complete/error, and enriches context
 */
const tracingMiddleware = t.middleware(async (opts) => {
  const { ctx, path, type, next } = opts;
  const startTime = Date.now();

  // Log procedure start
  logProcedureStart(ctx.trace, path, type, opts.rawInput);

  try {
    const result = await next({
      ctx: {
        ...ctx,
        // Add trace-aware logger to context for use in procedures
        log: createTraceLogger(ctx.trace),
      },
    });

    // Log procedure completion
    const durationMs = Date.now() - startTime;
    logProcedureComplete(ctx.trace, path, type, durationMs, true);

    return result;
  } catch (error) {
    // Log procedure error
    const durationMs = Date.now() - startTime;
    logProcedureError(ctx.trace, path, type, error, durationMs);

    throw error;
  }
});

/**
 * Base procedure with tracing enabled
 * All procedures automatically get request ID tracking and logging
 */
export const publicProcedure = t.procedure.use(tracingMiddleware);

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

/**
 * Protected procedure with tracing - requires authenticated user
 */
export const protectedProcedure = publicProcedure.use(requireUser);

/**
 * Admin procedure with tracing - requires admin role
 */
export const adminProcedure = publicProcedure.use(
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

/**
 * Paid procedure with tracing - requires Pro or Enterprise tier
 */
export const paidProcedure = publicProcedure.use(requirePaidTier);

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

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

/**
 * Rate-limited procedure with tracing - enforces daily query limits
 */
export const rateLimitedProcedure = publicProcedure.use(enforceRateLimit);
