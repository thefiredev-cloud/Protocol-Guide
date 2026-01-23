/**
 * ImageTrend Integration Endpoint
 *
 * Handles deep linking from ImageTrend Elite ePCR to Protocol Guide.
 * When EMS crews are documenting a patient in ImageTrend, they can
 * launch Protocol Guide with pre-filled search parameters.
 *
 * Endpoint: GET /api/imagetrend/launch
 *
 * Parameters:
 *   agency_id    - ImageTrend agency identifier (e.g., "la-county-fd")
 *   search_term  - Protocol search query (e.g., "cardiac arrest")
 *   user_age     - Patient age for age-specific protocols
 *   impression   - Clinical impression code
 *   return_url   - URL to return to after protocol lookup (e.g., "elite://back")
 */

import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { getFlags } from "../../lib/feature-flags";
import { getDb } from "../db";
import { integrationLogs } from "../../drizzle/schema";

// Supabase client for agency lookup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validate agency has ImageTrend integration enabled
 */
async function validateImageTrendAgency(
  agencyId: string
): Promise<{ valid: boolean; agencyName?: string; error?: string }> {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[ImageTrend] Supabase not configured");
    return { valid: true }; // Allow in dev mode without Supabase
  }

  try {
    // Look up agency in manus_agencies table
    const { data, error } = await supabase
      .from("manus_agencies")
      .select("id, name, integration_partner")
      .or(`name.ilike.%${agencyId}%,id.eq.${agencyId}`)
      .limit(1)
      .single();

    if (error || !data) {
      return { valid: false, error: "Agency not found" };
    }

    if (data.integration_partner !== "imagetrend") {
      return { valid: false, error: "Agency not configured for ImageTrend" };
    }

    return { valid: true, agencyName: data.name };
  } catch (err) {
    console.error("[ImageTrend] Agency validation error:", err);
    return { valid: true }; // Fail open in case of errors
  }
}

/**
 * Log integration access for analytics
 */
async function logIntegrationAccess(params: {
  agencyId: string;
  agencyName?: string;
  searchTerm?: string;
  userAge?: number;
  impression?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(integrationLogs).values({
      partner: "imagetrend",
      agencyId: params.agencyId,
      agencyName: params.agencyName || null,
      searchTerm: params.searchTerm || null,
      userAge: params.userAge || null,
      impression: params.impression || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (err) {
    console.error("[ImageTrend] Failed to log access:", err);
    // Don't fail the request if logging fails
  }
}

/**
 * ImageTrend Launch Handler
 * GET /api/imagetrend/launch
 *
 * Validates the agency, logs the access, and redirects to protocol search
 */
export async function imageTrendLaunchHandler(
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();

  // Check feature flag
  const flags = getFlags();
  if (!flags.enable_imagetrend_deep_linking) {
    res.status(503).json({
      error: "ImageTrend integration is not currently enabled",
      code: "INTEGRATION_DISABLED",
    });
    return;
  }

  // Extract parameters
  const {
    agency_id,
    search_term,
    user_age,
    impression,
    return_url,
  } = req.query;

  // Validate required parameters
  if (!agency_id || typeof agency_id !== "string") {
    res.status(400).json({
      error: "Missing required parameter: agency_id",
      code: "MISSING_AGENCY_ID",
    });
    return;
  }

  // Validate agency has ImageTrend integration
  const validation = await validateImageTrendAgency(agency_id);
  if (!validation.valid) {
    res.status(403).json({
      error: validation.error || "Agency not authorized",
      code: "AGENCY_NOT_AUTHORIZED",
    });
    return;
  }

  // Extract client info for logging
  const ipAddress =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    undefined;
  const userAgent = req.headers["user-agent"] || undefined;

  // Parse optional parameters
  const parsedAge = user_age ? parseInt(user_age as string, 10) : undefined;
  const searchQuery = search_term ? String(search_term).trim() : undefined;
  const clinicalImpression = impression ? String(impression).trim() : undefined;

  // Log the integration access
  await logIntegrationAccess({
    agencyId: agency_id,
    agencyName: validation.agencyName,
    searchTerm: searchQuery,
    userAge: parsedAge && !isNaN(parsedAge) ? parsedAge : undefined,
    impression: clinicalImpression,
    ipAddress,
    userAgent,
  });

  // Build redirect URL to protocol search
  const baseUrl = process.env.APP_URL || "https://protocol-guide.com";
  const searchParams = new URLSearchParams();

  if (searchQuery) {
    searchParams.set("query", searchQuery);
  }
  if (parsedAge && !isNaN(parsedAge)) {
    searchParams.set("age", String(parsedAge));
  }
  if (clinicalImpression) {
    searchParams.set("impression", clinicalImpression);
  }
  searchParams.set("agency", agency_id);
  searchParams.set("source", "imagetrend");

  // Store return URL in session/cookie if provided
  if (return_url && typeof return_url === "string") {
    searchParams.set("return_url", return_url);
  }

  const redirectUrl = `${baseUrl}/app/protocol-search?${searchParams.toString()}`;

  // Log response time
  const responseTime = Date.now() - startTime;
  console.log(
    `[ImageTrend] Launch: agency=${agency_id}, search="${searchQuery || "none"}", time=${responseTime}ms`
  );

  // Redirect to protocol search
  res.redirect(302, redirectUrl);
}

/**
 * ImageTrend Health Check Handler
 * GET /api/imagetrend/health
 *
 * Returns integration status for monitoring
 */
export async function imageTrendHealthHandler(
  req: Request,
  res: Response
): Promise<void> {
  const flags = getFlags();

  res.json({
    status: flags.enable_imagetrend_deep_linking ? "enabled" : "disabled",
    partner: "imagetrend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
