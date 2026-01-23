/**
 * CORS headers for edge functions
 *
 * SECURITY: Uses origin whitelist instead of wildcard to prevent CSRF attacks.
 * Only whitelisted origins can make cross-origin requests with credentials.
 */

// Deno global type declaration for Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Allowed origins - add production domains here
const ALLOWED_ORIGINS = [
  "https://protocol-guide.com",
  "https://www.protocol-guide.com",
  "https://app.protocol-guide.com",
  // Netlify deploy previews (pattern: deploy-preview-*--protocol-guide.netlify.app)
  // These are validated dynamically below
];

// Development origins (only in non-production)
const DEV_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:3000",
];

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow Netlify deploy previews
  if (origin.match(/^https:\/\/deploy-preview-\d+--protocol-guide\.netlify\.app$/)) {
    return true;
  }

  // Allow branch deploys
  if (origin.match(/^https:\/\/[a-z0-9-]+--protocol-guide\.netlify\.app$/)) {
    return true;
  }

  // Allow development origins in non-production
  // DENO_DEPLOYMENT_ID is set automatically by Supabase Edge Functions in production
  const isProduction = typeof Deno !== "undefined" && Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
  if (!isProduction && DEV_ORIGINS.includes(origin)) {
    return true;
  }

  return false;
}

/**
 * Get CORS headers for a specific origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };
}

/**
 * Handle CORS preflight request
 * Returns Response for OPTIONS requests, null otherwise
 */
export function handleCors(req: Request): Response | null {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    // Preflight request - validate origin and return appropriate headers
    if (!isAllowedOrigin(origin)) {
      // Return 403 for disallowed origins on preflight
      return new Response("CORS origin not allowed", {
        status: 403,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  return null;
}

/**
 * Add CORS headers to response
 */
export function withCors(response: Response, req: Request): Response {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) { // Only set non-empty values
      newHeaders.set(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Create JSON response with CORS headers
 * @param data - Response data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param req - Original request (for extracting origin)
 */
export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  const origin = req?.headers.get("origin") ?? null;
  const corsHeaders = getCorsHeaders(origin);

  // Only include non-empty CORS headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) headers[key] = value;
  });

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Create error response with CORS headers
 */
export function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}

// Re-export for backwards compatibility (deprecated - use functions with req parameter)
export const corsHeaders = getCorsHeaders(null);
