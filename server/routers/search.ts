/**
 * Search Router
 * Handles semantic search across protocols using Voyage AI embeddings + pgvector
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { semanticSearchProtocols } from "../_core/embeddings";
import { mapCountyIdToAgencyId, getAgencyByCountyId } from "../db-agency-mapping";
import * as db from "../db";

export const searchRouter = router({
  // Semantic search across all protocols using Voyage AI embeddings + pgvector
  semantic: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      countyId: z.number().optional(),
      limit: z.number().min(1).max(50).default(10),
      stateFilter: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Use Voyage AI embeddings + Supabase pgvector for true semantic search
      // Map MySQL county ID to Supabase agency_id
      let agencyId: number | null = null;
      let agencyName: string | null = null;
      let stateCode: string | null = null;

      if (input.countyId) {
        // Map MySQL county ID -> Supabase agency_id
        agencyId = await mapCountyIdToAgencyId(input.countyId);

        // Get agency details for name/state filtering
        const agency = await getAgencyByCountyId(input.countyId);
        if (agency) {
          agencyName = agency.name;
          stateCode = agency.state_code;
        }

        console.log(`[Search] Mapped MySQL county ${input.countyId} -> Supabase agency ${agencyId}`);
      } else if (input.stateFilter) {
        // State-only filter (no specific county)
        stateCode = input.stateFilter;
      }

      const results = await semanticSearchProtocols({
        query: input.query,
        agencyId,
        agencyName,
        stateCode,
        limit: input.limit,
        threshold: 0.3,
      });

      return {
        results: results.map(r => ({
          id: r.id,
          protocolNumber: r.protocol_number,
          protocolTitle: r.protocol_title,
          section: r.section,
          content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
          fullContent: r.content,
          sourcePdfUrl: null, // pgvector results don't include this
          relevanceScore: r.similarity,
          countyId: r.agency_id,
          // Protocol currency information not in pgvector results
          protocolEffectiveDate: null,
          lastVerifiedAt: null,
          protocolYear: null,
        })),
        totalFound: results.length,
        query: input.query,
      };
    }),

  // Get protocol by ID
  getProtocol: publicProcedure
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
  stats: publicProcedure.query(async () => {
    return db.getProtocolStats();
  }),

  // Get protocol coverage by state
  coverageByState: publicProcedure.query(async () => {
    return db.getProtocolCoverageByState();
  }),

  // Get total protocol statistics
  totalStats: publicProcedure.query(async () => {
    return db.getTotalProtocolStats();
  }),

  // Get agencies (counties) by state with protocol counts
  agenciesByState: publicProcedure
    .input(z.object({ state: z.string() }))
    .query(async ({ input }) => {
      return db.getAgenciesByState(input.state);
    }),

  // Get all agencies with protocols (optionally filtered by state)
  agenciesWithProtocols: publicProcedure
    .input(z.object({ state: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return db.getAgenciesWithProtocols(input?.state);
    }),

  // Search by specific agency using Voyage AI + pgvector
  searchByAgency: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      agencyId: z.number(), // MySQL county ID (will be mapped)
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      // Map MySQL county ID -> Supabase agency_id
      const supabaseAgencyId = await mapCountyIdToAgencyId(input.agencyId);

      // Get agency details
      const agency = await getAgencyByCountyId(input.agencyId);
      const agencyName = agency?.name || null;
      const stateCode = agency?.state_code || null;

      console.log(`[Search] Agency search - MySQL ${input.agencyId} -> Supabase ${supabaseAgencyId}`);

      const results = await semanticSearchProtocols({
        query: input.query,
        agencyId: supabaseAgencyId,
        agencyName,
        stateCode,
        limit: input.limit,
        threshold: 0.3,
      });

      return {
        results: results.map(r => ({
          id: r.id,
          protocolNumber: r.protocol_number,
          protocolTitle: r.protocol_title,
          section: r.section,
          content: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''),
          fullContent: r.content,
          sourcePdfUrl: null,
          relevanceScore: r.similarity,
          countyId: r.agency_id,
          protocolEffectiveDate: null,
          lastVerifiedAt: null,
          protocolYear: null,
        })),
        totalFound: results.length,
        query: input.query,
      };
    }),
});

export type SearchRouter = typeof searchRouter;
