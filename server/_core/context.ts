import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";
import type { RateLimitInfo } from "./types/rateLimit";
import {
  type TraceContext,
  createTraceContext,
  extractRequestId,
  createTraceLogger,
  getTraceResponseHeaders,
} from "./tracing";
import { isTokenRevoked } from "./token-blacklist";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Rate limit info (populated by rate limit middleware) */
  rateLimitInfo?: RateLimitInfo;
  /** Trace context for distributed tracing */
  trace: TraceContext;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  // Extract or generate request ID for distributed tracing
  const existingRequestId = extractRequestId(opts.req.headers as Record<string, string | string[] | undefined>);

  // Determine request source from user agent or custom header
  const userAgent = opts.req.headers["user-agent"] || "";
  const customSource = opts.req.headers["x-client-source"] as string | undefined;
  let source: TraceContext["source"] = "api";

  if (customSource === "web" || customSource === "mobile" || customSource === "api") {
    source = customSource;
  } else if (userAgent.includes("Expo") || userAgent.includes("okhttp") || userAgent.includes("Darwin")) {
    source = "mobile";
  } else if (userAgent.includes("Mozilla") || userAgent.includes("Chrome") || userAgent.includes("Safari")) {
    source = "web";
  }

  try {
    // Extract Bearer token from Authorization header
    const authHeader = opts.req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      // Verify token with Supabase
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (supabaseUser && !error) {
        // Find or create user in our database
        user = await db.findOrCreateUserBySupabaseId(supabaseUser.id, {
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
        });

        // Check if user's tokens have been revoked
        if (user && await isTokenRevoked(user.id.toString())) {
          user = null;
        }
      }
    }
  } catch (error) {
    console.error("[Context] Auth error:", error);
    user = null;
  }

  // Create trace context with user info if available
  const trace = createTraceContext({
    existingRequestId,
    source,
    userId: user?.id?.toString(),
    userTier: user?.tier || undefined,
  });

  // Log context creation
  const traceLogger = createTraceLogger(trace);
  traceLogger.debug(
    {
      method: opts.req.method,
      url: opts.req.url,
      hasUser: !!user,
    },
    "tRPC context created"
  );

  // Set trace headers on response for client debugging
  const responseHeaders = getTraceResponseHeaders(trace);
  for (const [key, value] of Object.entries(responseHeaders)) {
    opts.res.setHeader(key, value);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    trace,
  };
}
