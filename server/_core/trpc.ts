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
import crypto from "crypto";
import { logger } from "./logger";

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

// ============================================================================
// CSRF PROTECTION MIDDLEWARE
// ============================================================================

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf_token";

/**
 * CSRF protection middleware for tRPC mutations
 * Only validates mutations (not queries) to prevent CSRF attacks
 *
 * Security mechanism:
 * - Requires `x-csrf-token` header to match `csrf_token` cookie
 * - Uses constant-time comparison to prevent timing attacks
 * - Only enforces on mutation procedures (queries are safe from CSRF)
 *
 * @throws TRPCError with code 'FORBIDDEN' if token is missing or invalid
 */
const csrfProtection = t.middleware(async (opts) => {
  const { ctx, type, next, path } = opts;

  // Only validate mutations - queries are safe from CSRF attacks
  if (type === "mutation") {
    const token = ctx.req.headers[CSRF_TOKEN_HEADER] as string | undefined;
    const cookieToken = ctx.req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;

    // Token must be present in both header and cookie
    if (!token || !cookieToken) {
      logger.warn(
        {
          path,
          type,
          ip: ctx.req.ip,
          hasToken: !!token,
          hasCookie: !!cookieToken,
          requestId: ctx.trace?.requestId,
        },
        "CSRF token missing in tRPC mutation"
      );

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "CSRF token missing",
      });
    }

    // Tokens must match (constant-time comparison to prevent timing attacks)
    try {
      const tokensMatch = crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(cookieToken)
      );

      if (!tokensMatch) {
        logger.warn(
          {
            path,
            type,
            ip: ctx.req.ip,
            requestId: ctx.trace?.requestId,
          },
          "CSRF token mismatch in tRPC mutation"
        );

        throw new TRPCError({
          code: "FORBIDDEN",
          message: "CSRF token mismatch",
        });
      }
    } catch (error) {
      // Catch errors from Buffer.from or timingSafeEqual (e.g., length mismatch)
      logger.warn(
        {
          path,
          type,
          ip: ctx.req.ip,
          error: error instanceof Error ? error.message : String(error),
          requestId: ctx.trace?.requestId,
        },
        "CSRF token validation error in tRPC mutation"
      );

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "CSRF token invalid",
      });
    }

    logger.debug(
      {
        path,
        type,
        requestId: ctx.trace?.requestId,
      },
      "CSRF token validated successfully for tRPC mutation"
    );
  }

  return next();
});

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
 * CSRF-protected procedure - requires CSRF token but NOT authentication
 * Use for public mutations that need CSRF protection (e.g., logout)
 */
export const csrfProtectedProcedure = publicProcedure.use(csrfProtection);

/**
 * Protected procedure with tracing and CSRF protection - requires authenticated user
 */
export const protectedProcedure = csrfProtectedProcedure.use(requireUser);

/**
 * Admin procedure with tracing and CSRF protection - requires admin role
 */
export const adminProcedure = csrfProtectedProcedure.use(
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
  })
);

// Middleware that requires paid tier (pro or enterprise)
const requirePaidTier = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const isPaidTier = ctx.user.tier === "pro" || ctx.user.tier === "enterprise";
  const isActive = ctx.user.subscriptionStatus === "active" || ctx.user.subscriptionStatus === "trialing";
  const notExpired = !ctx.user.subscriptionEndDate || new Date(ctx.user.subscriptionEndDate) > new Date();

  if (!isPaidTier || !isActive || !notExpired) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Active Pro or Enterprise subscription required",
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
 * Paid procedure with tracing and CSRF protection - requires Pro or Enterprise tier
 */
export const paidProcedure = csrfProtectedProcedure.use(requirePaidTier);

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
 * Rate-limited procedure with tracing and CSRF protection - enforces daily query limits
 */
export const rateLimitedProcedure = publicProcedure.use(csrfProtection).use(enforceRateLimit);

// ============================================================================
// PUBLIC RATE LIMIT MIDDLEWARE (IP-BASED)
// ============================================================================

// In-memory store for public endpoint rate limiting (IP-based)
// Key: IP address, Value: { count: number, resetTime: number }
const publicRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of publicRateLimitStore.entries()) {
    if (data.resetTime < now) {
      publicRateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Public rate limit middleware - IP-based rate limiting for unauthenticated endpoints
 * Default: 10 requests per 15 minutes per IP
 */
const enforcePublicRateLimit = (options?: { maxRequests?: number; windowMs?: number }) => {
  const maxRequests = options?.maxRequests ?? 10;
  const windowMs = options?.windowMs ?? 15 * 60 * 1000; // 15 minutes

  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    // Get IP address from request
    const ip =
      ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      ctx.req.headers["x-real-ip"]?.toString() ||
      ctx.req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const rateLimitData = publicRateLimitStore.get(ip);

    // Initialize or reset if window expired
    if (!rateLimitData || rateLimitData.resetTime < now) {
      publicRateLimitStore.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
    } else {
      // Check if limit exceeded
      if (rateLimitData.count >= maxRequests) {
        const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
        ctx.res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
        ctx.res.setHeader(RATE_LIMIT_HEADERS.LIMIT, maxRequests);
        ctx.res.setHeader(RATE_LIMIT_HEADERS.REMAINING, 0);
        ctx.res.setHeader(RATE_LIMIT_HEADERS.RESET, Math.floor(rateLimitData.resetTime / 1000));

        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        });
      }

      // Increment count
      rateLimitData.count++;
      publicRateLimitStore.set(ip, rateLimitData);
    }

    // Set rate limit headers
    const currentData = publicRateLimitStore.get(ip)!;
    ctx.res.setHeader(RATE_LIMIT_HEADERS.LIMIT, maxRequests);
    ctx.res.setHeader(RATE_LIMIT_HEADERS.REMAINING, Math.max(0, maxRequests - currentData.count));
    ctx.res.setHeader(RATE_LIMIT_HEADERS.RESET, Math.floor(currentData.resetTime / 1000));

    return next();
  });
};

/**
 * Public rate-limited procedure - for unauthenticated endpoints
 * Default: 10 requests per 15 minutes per IP
 */
export const publicRateLimitedProcedure = publicProcedure.use(
  enforcePublicRateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000 })
);

/**
 * Strict public rate-limited procedure - for sensitive public endpoints
 * Stricter limits: 5 requests per 15 minutes per IP
 */
export const strictPublicRateLimitedProcedure = publicProcedure.use(
  enforcePublicRateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 })
);
