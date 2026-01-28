/**
 * Search Router
 * Handles semantic search across protocols using Voyage AI embeddings + pgvector
 * Optimized with query normalization, Redis caching, and latency monitoring
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, publicRateLimitedProcedure, router } from "../_core/trpc";
import { semanticSearchProtocols } from "../_core/embeddings";
import { getAgencyByCountyIdOptimized } from "../db-agency-mapping";
import { normalizeEmsQuery } from "../_core/ems-query-normalizer";
import {
  optimizedSearch,
  highAccuracySearch,
  latencyMonitor,
  type OptimizedSearchOptions,
} from "../_core/rag";
import {
  getSearchCacheKey,
  getCachedSearchResults,
  cacheSearchResults,
  setSearchCacheHeaders,
} from "../_core/search-cache";
import { validateSearchLimit } from "../_core/tier-validation";
import { toStateCode } from "../lib/state-codes";
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

      try {
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

        try {
          const cachedResults = await getCachedSearchResults(cacheKey);
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
        } catch (cacheError) {
          // Cache errors shouldn't fail the search - log and continue
          console.warn('[Search] Cache read error, continuing with fresh search:', cacheError);
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
          // Convert state name (e.g., "California") to 2-letter code (e.g., "CA")
          stateCode = toStateCode(input.stateFilter);
          if (!stateCode) {
            console.warn(`[Search] Invalid state filter: "${input.stateFilter}"`);
          }
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
              stateCode: r.state_code ?? null,
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
            stateCode: r.stateCode ?? null,
          })),
          totalFound: optimizedResult.results.length,
          query: input.query,
          normalizedQuery: normalized.normalized,
          fromCache: false,
          latencyMs,
        };

        // Step 7: Cache results in Redis (1 hour TTL) - don't fail on cache error
        try {
          await cacheSearchResults(cacheKey, response);
        } catch (cacheError) {
          console.warn('[Search] Cache write error:', cacheError);
        }

        // Set cache headers for cache miss
        if (ctx.res) {
          setSearchCacheHeaders(ctx.res, false);
        }

        // Log performance metrics
        console.log(`[Search] Completed in ${latencyMs}ms (cache: ${optimizedResult.metrics.cacheHit}, rerank: ${optimizedResult.metrics.rerankingMs}ms)`);

        return response;
      } catch (error) {
        console.error('[Search] semantic search error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Search failed. Please try again.',
          cause: error,
        });
      }
    }),

  // Get protocol by ID
  // Rate limited to prevent scraping and DoS attacks
  getProtocol: publicRateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection unavailable',
          });
        }

        const { protocolChunks } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const [protocol] = await dbInstance.select().from(protocolChunks)
          .where(eq(protocolChunks.id, input.id))
          .limit(1);

        return protocol || null;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Search] getProtocol error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch protocol',
          cause: error,
        });
      }
    }),

  // Get protocol statistics
  // Rate limited to prevent abuse of stats endpoint (expensive queries)
  stats: publicRateLimitedProcedure.query(async () => {
    try {
      return await db.getProtocolStats();
    } catch (error) {
      console.error('[Search] stats endpoint error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to fetch protocol statistics',
        cause: error,
      });
    }
  }),

  // Get protocol coverage by state
  // Rate limited to prevent abuse of coverage queries (expensive aggregations)
  coverageByState: publicRateLimitedProcedure.query(async () => {
    try {
      return await db.getProtocolCoverageByState();
    } catch (error) {
      console.error('[Search] coverageByState endpoint error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to fetch coverage data',
      });
    }
  }),

  // Get total protocol statistics
  // Rate limited to prevent abuse of aggregation queries
  totalStats: publicRateLimitedProcedure.query(async () => {
    try {
      return await db.getTotalProtocolStats();
    } catch (error) {
      console.error('[Search] totalStats endpoint error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to fetch total statistics',
        cause: error,
      });
    }
  }),

  // Get agencies (counties) by state with protocol counts
  // Rate limited to prevent abuse and scraping
  agenciesByState: publicRateLimitedProcedure
    .input(z.object({ state: z.string() }))
    .query(async ({ input }) => {
      try {
        const agencies = await db.getAgenciesByState(input.state);
        return agencies ?? [];
      } catch (error) {
        console.error('[Search] agenciesByState error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to fetch agencies for state',
          cause: error,
        });
      }
    }),

  // Get all agencies with protocols (optionally filtered by state)
  // Rate limited to prevent scraping and database abuse
  agenciesWithProtocols: publicRateLimitedProcedure
    .input(z.object({ state: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const agencies = await db.getAgenciesWithProtocols(input?.state);
        return agencies ?? [];
      } catch (error) {
        console.error('[Search] agenciesWithProtocols error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to fetch agencies',
          cause: error,
        });
      }
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

      try {
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

        try {
          const cachedResults = await getCachedSearchResults(cacheKey);
          if (cachedResults) {
            const latencyMs = Date.now() - searchStartTime;
            latencyMonitor.record('totalRetrieval', latencyMs);

            // Set cache headers for cache hit
            if (ctx.res) {
              setSearchCacheHeaders(ctx.res, true);
            }

            return { ...cachedResults, fromCache: true, latencyMs };
          }
        } catch (cacheError) {
          // Cache errors shouldn't fail the search - log and continue
          console.warn('[Search:Agency] Cache read error, continuing with fresh search:', cacheError);
        }

        // NOTE: input.agencyId is already a Supabase agency ID (from agenciesWithProtocols)
        // No MySQL mapping needed - use directly
        const supabaseAgencyId = input.agencyId;
        
        // Fetch agency details from Supabase directly if needed for context boosting
        let agencyName: string | null = null;
        let stateCode: string | null = null;
        
        try {
          // Quick lookup for agency metadata (for context boosting)
          const agencyInfo = await db.getAgenciesWithProtocols();
          const matchedAgency = agencyInfo.find(a => a.id === input.agencyId);
          if (matchedAgency) {
            agencyName = matchedAgency.name;
            // Convert state name to code for filtering
            const stateCodeMap: Record<string, string> = {
              'California': 'CA', 'Texas': 'TX', 'Florida': 'FL', 'New York': 'NY',
              'Illinois': 'IL', 'Pennsylvania': 'PA', 'Ohio': 'OH', 'Georgia': 'GA',
              'North Carolina': 'NC', 'Michigan': 'MI', 'New Jersey': 'NJ', 'Virginia': 'VA',
              'Washington': 'WA', 'Arizona': 'AZ', 'Massachusetts': 'MA', 'Tennessee': 'TN',
              'Indiana': 'IN', 'Missouri': 'MO', 'Maryland': 'MD', 'Wisconsin': 'WI',
              'Colorado': 'CO', 'Minnesota': 'MN', 'South Carolina': 'SC', 'Alabama': 'AL',
              'Louisiana': 'LA', 'Kentucky': 'KY', 'Oregon': 'OR', 'Oklahoma': 'OK',
              'Connecticut': 'CT', 'Utah': 'UT', 'Iowa': 'IA', 'Nevada': 'NV',
              'Arkansas': 'AR', 'Mississippi': 'MS', 'Kansas': 'KS', 'New Mexico': 'NM',
              'Nebraska': 'NE', 'Idaho': 'ID', 'West Virginia': 'WV', 'Hawaii': 'HI',
              'New Hampshire': 'NH', 'Maine': 'ME', 'Montana': 'MT', 'Rhode Island': 'RI',
              'Delaware': 'DE', 'South Dakota': 'SD', 'North Dakota': 'ND', 'Alaska': 'AK',
              'Vermont': 'VT', 'Wyoming': 'WY',
            };
            stateCode = matchedAgency.state.length === 2 
              ? matchedAgency.state 
              : stateCodeMap[matchedAgency.state] || matchedAgency.state.slice(0, 2).toUpperCase();
          }
        } catch (e) {
          console.warn('[Search:Agency] Failed to fetch agency metadata:', e);
        }

        console.log(`[Search:Agency] Using Supabase agency ID directly: ${supabaseAgencyId} (${agencyName || 'unknown'})`);

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
              stateCode: r.state_code ?? null,
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
            stateCode: r.stateCode ?? null,
          })),
          totalFound: optimizedResult.results.length,
          query: input.query,
          normalizedQuery: normalized.normalized,
          fromCache: false,
          latencyMs,
        };

        // Cache results (1 hour TTL) - don't fail on cache error
        try {
          await cacheSearchResults(cacheKey, response);
        } catch (cacheError) {
          console.warn('[Search:Agency] Cache write error:', cacheError);
        }

        // Set cache headers for cache miss
        if (ctx.res) {
          setSearchCacheHeaders(ctx.res, false);
        }

        console.log(`[Search:Agency] Completed in ${latencyMs}ms`);

        return response;
      } catch (error) {
        console.error('[Search:Agency] search error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Agency search failed. Please try again.',
          cause: error,
        });
      }
    }),

  // Summarize protocol content for field medics
  // Rate limited to prevent abuse of Claude API
  summarize: publicRateLimitedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      content: z.string().min(1).max(10000),
      protocolTitle: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { invokeClaudeSimple } = await import("../_core/claude");

        // Ultra-concise prompt - optimized for field use
        const prompt = `You are an EMS protocol summarizer. Output MUST fit on one phone screen.

RULES:
- MAX 5 lines total
- Each line: action + dose + route (if applicable)
- Use abbreviations: IV, IO, IM, SQ, PO, mg, mcg, mL
- No explanations, no headers, no bullets
- Start with most critical action
- Include specific numbers (doses, joules, rates)

QUERY: ${input.query}
PROTOCOL: ${input.protocolTitle || "Unknown"}

CONTENT:
${input.content.substring(0, 4000)}

OUTPUT (5 lines max, numbered):`;

        const response = await invokeClaudeSimple({
          query: prompt,
          userTier: 'free', // Summarization always uses Haiku for speed
          systemPrompt: 'You are an EMS protocol summarizer. Be extremely concise.',
        });

        const summary = response.content;

        // Clean up the summary - ensure it's truly concise
        const cleanSummary = cleanupSummary(summary);

        return { summary: cleanSummary };
      } catch (error) {
        console.error('[Search] summarize error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate summary',
          cause: error,
        });
      }
    }),
});

/**
 * Clean up LLM output to ensure ultra-concise format
 */
function cleanupSummary(text: string): string {
  if (!text) return "";

  // Split into lines and clean
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 5); // Max 5 lines

  // Remove any markdown or extra formatting
  const cleaned = lines.map(line => {
    return line
      .replace(/^\*\*|\*\*$/g, '') // Remove bold markers
      .replace(/^[-•]\s*/, '')     // Remove bullets
      .replace(/^\d+\.\s*/, '')    // Remove existing numbers
      .trim();
  });

  // Re-number
  return cleaned.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

export type SearchRouter = typeof searchRouter;
