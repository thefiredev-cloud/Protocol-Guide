/**
 * Rate Limit Edge Function
 * Applies rate limiting at the edge before requests hit origin
 *
 * Expected latency: 5-20ms (vs 50-100ms from origin)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyAndGetUser } from "../_shared/supabase.ts";
import { checkRateLimit } from "../_shared/redis.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

// Rate limit tiers
const RATE_LIMITS = {
  free: { limit: 5, windowSeconds: 86400 }, // 5 per day
  pro: { limit: 1000, windowSeconds: 86400 }, // 1000 per day
  enterprise: { limit: 10000, windowSeconds: 86400 }, // 10000 per day
  anonymous: { limit: 10, windowSeconds: 3600 }, // 10 per hour
} as const;

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  tier: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get identifier (user ID or IP)
    let identifier: string;
    let tier: keyof typeof RATE_LIMITS = "anonymous";

    // Try to get user from token
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { user } = await verifyAndGetUser(token);

      if (user) {
        identifier = `user:${user.id}`;
        // Get user tier from metadata or default to free
        tier = (user.user_metadata?.tier as keyof typeof RATE_LIMITS) || "free";
      } else {
        // Invalid token, use IP
        identifier = `ip:${req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown"}`;
      }
    } else {
      // No token, use IP
      identifier = `ip:${req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown"}`;
    }

    // Check rate limit
    const rateLimitConfig = RATE_LIMITS[tier];
    const result = await checkRateLimit(
      identifier,
      rateLimitConfig.limit,
      rateLimitConfig.windowSeconds
    );

    const response: RateLimitResponse = {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
      tier,
    };

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": rateLimitConfig.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.resetAt.toString(),
    };

    if (!result.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", ...response }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...headers,
          "Retry-After": Math.max(0, result.resetAt - Math.floor(Date.now() / 1000)).toString(),
        },
      });
    }

    return jsonResponse(response);
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    // On error, allow request but log
    return jsonResponse({
      allowed: true,
      remaining: -1,
      resetAt: 0,
      tier: "error",
    });
  }
});
