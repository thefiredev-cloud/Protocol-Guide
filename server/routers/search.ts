/**
 * Search Router
 * Handles semantic search across protocols using Voyage AI embeddings + pgvector
 * Optimized with query normalization, Redis caching, and latency monitoring
 */

import { z } from "zod";
import { publicProcedure, publicRateLimitedProcedure, router } from "../_core/trpc";
import { semanticSearchProtocols } from "../_core/embeddings";
import { getAgencyByCountyIdOptimized } from "../db-agency-mapping";
import { normalizeEmsQuery } from "../_core/ems-query-normalizer";
import {
  optimizedSearch,
  highAccuracySearch,
  latencyMonitor,
  type OptimizedSearchOptions,
} from "../_core/rag-optimizer";
import {
  getSearchCacheKey,
  getCachedSearchResults,
  cacheSearchResults,
  setSearchCacheHeaders,
} from "../_core/search-cache";
import { validateSearchLimit } from "../_core/tier-validation";
import * as db from "../db";

// Search result types
type SearchResultItem = {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  fullContent: string;
  sourcePdfUrl: null;
  relevanceScore: number;
  countyId: number;
  protocolEffectiveDate: null;
  lastVerifiedAt: null;
  protocolYear: null;
};

type CachedSearchResult = {
  results: SearchResultItem[];
  totalFound: number;
  query: string;
  normalizedQuery: string;
  fromCache: boolean;
  latencyMs: number;
};

// Helper to generate cache key
function generateSearchCacheKey(params: {
  query: string;
  agencyId?: number | null;
  stateFilter?: string;
}): string {
  return getSearchCacheKey({
    query: params.query,
    agencyId: params.agencyId ?? undefined,
    stateFilter: params.stateFilter,
  });
}

export const searchRouter = router({
  // Semantic search across all protocols using Voyage AI embeddings + pgvector
  // Optimized with query normalization, Redis caching, and latency monitoring
  // Rate limited: 10 requests per 15 minutes per IP to prevent DoS and abuse
  semantic: publicRateLimitedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      countyId: z.number().optional(),
      limit: z.number().min(1).max(50).default(10),
      stateFilter: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const searchStartTime = Date.now();

      // Validate and enforce tier-based result limits
      const userId = ctx.user?.id || null;
      const effectiveLimit = await validateSearchLimit(userId, input.limit);

      // Step 1: Normalize the EMS query (expand abbreviations, fix typos)
      const normalized = normalizeEmsQuery(input.query);

      // Log the normalization for debugging/monitoring
      if (normalized.normalized !== normalized.original.toLowerCase()) {
        console.log(`[Search] "${normalized.original}" -> "${normalized.normalized}"`);
        if (normalized.expandedAbbreviations.length > 0) {
          console.log(`[Search] Expanded: ${normalized.expandedAbbreviations.join(', ')}`);
        }
        if (normalized.correctedTypos.length > 0) {
          console.log(`[Search] Corrected: ${normalized.correctedTypos.join(', ')}`);
        }
      }

      // Step 2: Check Redis cache first
      const cacheKey = generateSearchCacheKey({
        query: normalized.normalized,
        agencyId: input.countyId,
        stateFilter: input.stateFilter,
      });

      const cachedResults = await getCachedSearchResults<CachedSearchResult>(cacheKey);
      if (cachedResults) {
        const latencyMs = Date.now() - searchStartTime;
        latencyMonitor.record('totalRetrieval', latencyMs);

        // Set cache headers for cache hit
        if (ctx.res) {
          setSearchCacheHeaders(ctx.res, true);
        }

        return {
          ...cachedResults,
          fromCache: true,
          latencyMs,
        };
      }

      // Step 3: Map MySQL county ID to Supabase agency_id (OPTIMIZED - single query)
      let agencyId: number | null = null;
      let agencyName: string | null = null;
      let stateCode: string | null = null;

      if (input.countyId) {
        const agency = await getAgencyByCountyIdOptimized(input.countyId);
        if (agency) {
          agencyId = agency.id;
          agencyName = agency.name;
          stateCode = agency.state_code;
        }
        console.log(`[Search] Mapped MySQL county ${input.countyId} -> Supabase agency ${agencyId}`);
      } else if (input.stateFilter) {
        stateCode = input.stateFilter;
      }

      // Step 4: Determine optimization options based on query type
      // Enable multi-query fusion for medication/safety queries (higher accuracy needed)
      const isMedicationQuery = normalized.intent === 'medication_dosing' ||
        normalized.intent === 'contraindication_check' ||
        normalized.extractedMedications.length > 0;

      const searchOptions: OptimizedSearchOptions = {
        // Use multi-query fusion for medication queries (safety-critical)
        enableMultiQueryFusion: isMedicationQuery || normalized.isComplex,
        // Always use advanced re-ranking
        enableAdvancedRerank: true,
        // Enable context boost when agency/state is specified
        enableContextBoost: !!(agencyId || stateCode),
      };

      // Step 5: Execute optimized search with the normalized query
      const optimizedResult = await optimizedSearch(
        {
          query: normalized.normalized,
          agencyId,
          agencyName,
          stateCode,
          limit: effectiveLimit,
        },
        async (params) => {
          const searchResults = await semanticSearchProtocols({
            query: params.query,
            agencyId: params.agencyId,
            agencyName: params.agencyName,
            stateCode: params.stateCode,
            limit: params.limit,
            threshold: params.threshold,
          });

          return searchResults.map(r => ({
            id: r.id,
            protocolNumber: r.protocol_number,
            protocolTitle: r.protocol_title,
            section: r.section,
            content: r.content,
            similarity: r.similarity,
            imageUrls: r.image_urls,
          }));
        },
        searchOptions
      );

      // Step 6: Build response
      const latencyMs = Date.now() - searchStartTime;
      latencyMonitor.record('totalRetrieval', latencyMs);

      const response: CachedSearchResult = {
        results: optimizedResult.results.map(r => ({
          id: r.id,
          protocolNumber: r.protocolNumber,
          protocolTitle: r.protocolTitle,
          section: r.section,
          content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
          fullContent: r.content,
          sourcePdfUrl: null,
          relevanceScore: r.rerankedScore ?? r.similarity,
          countyId: agencyId ?? 0,
          protocolEffectiveDate: null,
          lastVerifiedAt: null,
          protocolYear: null,
        })),
        totalFound: optimizedResult.results.length,
        query: input.query,
        normalizedQuery: normalized.normalized,
        fromCache: false,
        latencyMs,
      };

      // Step 6: Cache results in Redis (1 hour TTL)
      await cacheSearchResults(cacheKey, response);

      // Set cache headers for cache miss
      if (ctx.res) {
        setSearchCacheHeaders(ctx.res, false);
      }

      // Log performance metrics
      console.log(`[Search] Completed in ${latencyMs}ms (cache: ${optimizedResult.metrics.cacheHit}, rerank: ${optimizedResult.metrics.rerankingMs}ms)`);

      return response;
    }),

  // Get protocol by ID
  // Rate limited to prevent scraping and DoS attacks
  getProtocol: publicRateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return null;

      const { protocolChunks } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [protocol] = await dbInstance.select().from(protocolChunks)
        .where(eq(protocolChunks.id, input.id))
        .limit(1);

      return protocol || null;
    }),

  // Get protocol statistics
  // Rate limited to prevent abuse of stats endpoint (expensive queries)
  stats: publicRateLimitedProcedure.query(async () => {
    return db.getProtocolStats();
  }),

  // Get protocol coverage by state
  // Rate limited to prevent abuse of coverage queries (expensive aggregations)
  coverageByState: publicRateLimitedProcedure.query(async () => {
    return db.getProtocolCoverageByState();
  }),

  // Get total protocol statistics
  // Rate limited to prevent abuse of aggregation queries
  totalStats: publicRateLimitedProcedure.query(async () => {
    return db.getTotalProtocolStats();
  }),

  // Get agencies (counties) by state with protocol counts
  // Rate limited to prevent abuse and scraping
  agenciesByState: publicRateLimitedProcedure
    .input(z.object({ state: z.string() }))
    .query(async ({ input }) => {
      return db.getAgenciesByState(input.state);
    }),

  // Get all agencies with protocols (optionally filtered by state)
  // Rate limited to prevent scraping and database abuse
  agenciesWithProtocols: publicRateLimitedProcedure
    .input(z.object({ state: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return db.getAgenciesWithProtocols(input?.state);
    }),

  // Search by specific agency using Voyage AI + pgvector
  // Optimized with query normalization and Redis caching
  // Rate limited: 10 requests per 15 minutes per IP to prevent abuse
  searchByAgency: publicRateLimitedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      agencyId: z.number(), // MySQL county ID (will be mapped)
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      const searchStartTime = Date.now();

      // Validate and enforce tier-based result limits
      const userId = ctx.user?.id || null;
      const effectiveLimit = await validateSearchLimit(userId, input.limit);

      // Step 1: Normalize the EMS query
      const normalized = normalizeEmsQuery(input.query);

      if (normalized.normalized !== normalized.original.toLowerCase()) {
        console.log(`[Search:Agency] "${normalized.original}" -> "${normalized.normalized}"`);
      }

      // Step 2: Check Redis cache
      const cacheKey = generateSearchCacheKey({
        query: normalized.normalized,
        agencyId: input.agencyId,
      });

      const cachedResults = await getCachedSearchResults<CachedSearchResult>(cacheKey);
      if (cachedResults) {
        const latencyMs = Date.now() - searchStartTime;
        latencyMonitor.record('totalRetrieval', latencyMs);

        // Set cache headers for cache hit
        if (ctx.res) {
          setSearchCacheHeaders(ctx.res, true);
        }

        return { ...cachedResults, fromCache: true, latencyMs };
      }

      // Get agency details (OPTIMIZED - single query)
      const agency = await getAgencyByCountyIdOptimized(input.agencyId);
      const supabaseAgencyId = agency?.id || null;
      const agencyName = agency?.name || null;
      const stateCode = agency?.state_code || null;

      console.log(`[Search:Agency] MySQL ${input.agencyId} -> Supabase ${supabaseAgencyId}`);

      // Step 3: Determine optimization options based on query type
      const isMedicationQuery = normalized.intent === 'medication_dosing' ||
        normalized.intent === 'contraindication_check' ||
        normalized.extractedMedications.length > 0;

      const searchOptions: OptimizedSearchOptions = {
        enableMultiQueryFusion: isMedicationQuery || normalized.isComplex,
        enableAdvancedRerank: true,
        enableContextBoost: true, // Always boost for agency-specific search
      };

      // Step 4: Execute optimized search
      const optimizedResult = await optimizedSearch(
        {
          query: normalized.normalized,
          agencyId: supabaseAgencyId,
          agencyName,
          stateCode,
          limit: input.limit,
        },
        async (params) => {
          const searchResults = await semanticSearchProtocols({
            query: params.query,
            agencyId: params.agencyId,
            agencyName: params.agencyName,
            stateCode: params.stateCode,
            limit: params.limit,
            threshold: params.threshold,
          });

          return searchResults.map(r => ({
            id: r.id,
            protocolNumber: r.protocol_number,
            protocolTitle: r.protocol_title,
            section: r.section,
            content: r.content,
            similarity: r.similarity,
            imageUrls: r.image_urls,
          }));
        },
        searchOptions
      );

      const latencyMs = Date.now() - searchStartTime;
      latencyMonitor.record('totalRetrieval', latencyMs);

      const response: CachedSearchResult = {
        results: optimizedResult.results.map(r => ({
          id: r.id,
          protocolNumber: r.protocolNumber,
          protocolTitle: r.protocolTitle,
          section: r.section,
          content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
          fullContent: r.content,
          sourcePdfUrl: null,
          relevanceScore: r.rerankedScore ?? r.similarity,
          countyId: supabaseAgencyId ?? 0,
          protocolEffectiveDate: null,
          lastVerifiedAt: null,
          protocolYear: null,
        })),
        totalFound: optimizedResult.results.length,
        query: input.query,
        normalizedQuery: normalized.normalized,
        fromCache: false,
        latencyMs,
      };

      // Cache results (1 hour TTL)
      await cacheSearchResults(cacheKey, response);

      // Set cache headers for cache miss
      if (ctx.res) {
        setSearchCacheHeaders(ctx.res, false);
      }

      console.log(`[Search:Agency] Completed in ${latencyMs}ms`);

      return response;
    }),
});

export type SearchRouter = typeof searchRouter;
