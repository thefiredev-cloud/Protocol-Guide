/**
 * Protocol Lookup Edge Function
 * Fast protocol queries without AI processing
 *
 * Expected latency: 20-80ms (vs 100-300ms from origin)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabasePublic, verifyAndGetUser, supabaseAdmin } from "../_shared/supabase.ts";
import { cacheGet, cacheSet } from "../_shared/redis.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

interface ProtocolResult {
  id: number;
  protocol_number: string;
  protocol_title: string;
  section: string | null;
  content: string;
  agency_id: number;
  state_code: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const protocolNumber = url.searchParams.get("protocol_number");
    const agencyId = url.searchParams.get("agency_id");
    const stateCode = url.searchParams.get("state_code");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

    if (!protocolNumber && !agencyId && !stateCode) {
      return errorResponse("Must provide protocol_number, agency_id, or state_code", 400, req);
    }

    // Check cache first
    const cacheKey = `protocol:${protocolNumber || ""}:${agencyId || ""}:${stateCode || ""}:${limit}`;
    const cached = await cacheGet<ProtocolResult[]>(cacheKey);
    if (cached) {
      return jsonResponse({ results: cached, cached: true }, 200, req);
    }

    // Get user access level if authenticated
    let userTier = "free";
    let subscribedStates: string[] = [];
    let subscribedAgencies: number[] = [];

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { user } = await verifyAndGetUser(token);

      if (user) {
        // Get user access from our tables
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id, tier")
          .eq("supabase_id", user.id)
          .single();

        if (userData) {
          userTier = userData.tier;

          const { data: stateData } = await supabaseAdmin
            .from("user_states")
            .select("state_code")
            .eq("user_id", userData.id);

          const { data: agencyData } = await supabaseAdmin
            .from("user_agencies")
            .select("agency_id")
            .eq("user_id", userData.id);

          subscribedStates = stateData?.map((s) => s.state_code) || [];
          subscribedAgencies = agencyData?.map((a) => a.agency_id) || [];
        }
      }
    }

    // Build query
    let query = supabasePublic
      .from("manus_protocol_chunks")
      .select("id, protocol_number, protocol_title, section, content, agency_id, state_code")
      .limit(limit);

    if (protocolNumber) {
      query = query.ilike("protocol_number", `%${protocolNumber}%`);
    }

    if (agencyId) {
      query = query.eq("agency_id", parseInt(agencyId));
    }

    if (stateCode) {
      query = query.eq("state_code", stateCode.toUpperCase());
    }

    // Apply access control unless enterprise
    if (userTier !== "enterprise") {
      // Filter to public + subscribed content
      // Public = state_office agencies
      // Plus user's subscribed states and agencies
      const accessFilter = [];

      // Always allow public state protocols
      accessFilter.push("agency_type.eq.state_office");

      // Add subscribed states
      if (subscribedStates.length > 0) {
        accessFilter.push(`state_code.in.(${subscribedStates.join(",")})`);
      }

      // Add subscribed agencies
      if (subscribedAgencies.length > 0) {
        accessFilter.push(`agency_id.in.(${subscribedAgencies.join(",")})`);
      }

      // Note: This is simplified - real implementation would use RLS or RPC
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ProtocolLookup] Query error:", error);
      return errorResponse("Failed to fetch protocols", 500, req);
    }

    // Cache results for 5 minutes
    if (data && data.length > 0) {
      await cacheSet(cacheKey, data, 300);
    }

    return jsonResponse({
      results: data || [],
      cached: false,
      count: data?.length || 0,
    }, 200, req);
  } catch (error) {
    console.error("[ProtocolLookup] Error:", error);
    return errorResponse("Internal server error", 500, req);
  }
});
