/**
 * Query Router
 * Handles protocol query submission, history, and sync
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeClaudeRAG, type ProtocolContext, type UserTier } from "../_core/claude";
import { semanticSearchProtocols } from "../_core/embeddings";
import * as db from "../db";
import * as dbUserCounties from "../db-user-counties";

export const queryRouter = router({
  submit: protectedProcedure
    .input(z.object({
      countyId: z.number(),
      queryText: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Check usage limits
      const canQuery = await db.canUserQuery(ctx.user.id);
      if (!canQuery) {
        return {
          success: false,
          error: "Daily query limit reached. Upgrade to Pro for unlimited queries.",
          response: null,
        };
      }

      // Get user tier for model routing
      const user = await db.getUserById(ctx.user.id);
      const userTier: UserTier = (user?.tier as UserTier) || 'free';

      // Get agency name for context
      const county = await db.getCountyById(input.countyId);
      const agencyName = county?.name || 'Unknown Agency';

      try {
        // Semantic search with Voyage AI embeddings
        // Filter by agency name (from MySQL county lookup)
        const searchResults = await semanticSearchProtocols({
          query: input.queryText,
          agencyName: agencyName !== 'Unknown Agency' ? agencyName : null,
          limit: 10,
          threshold: 0.3,
        });

        if (searchResults.length === 0) {
          return {
            success: false,
            error: "No matching protocols found. Try rephrasing your query.",
            response: null,
          };
        }

        // Convert to ProtocolContext format for Claude
        const protocols: ProtocolContext[] = searchResults.map(r => ({
          id: r.id,
          protocolNumber: r.protocol_number,
          protocolTitle: r.protocol_title,
          section: r.section,
          content: r.content,
          imageUrls: r.image_urls,
          similarity: r.similarity,
        }));

        // Invoke Claude with tiered routing (Haiku for free/simple, Sonnet for complex Pro)
        const claudeResponse = await invokeClaudeRAG({
          query: input.queryText,
          protocols,
          userTier,
          agencyName,
        });

        const protocolRefs = protocols.map(p => `${p.protocolNumber} - ${p.protocolTitle}`);
        const responseTimeMs = Date.now() - startTime;

        // Log the query
        await db.createQuery({
          userId: ctx.user.id,
          countyId: input.countyId,
          queryText: input.queryText,
          responseText: claudeResponse.content,
          protocolRefs,
        });

        // Increment usage
        await db.incrementUserQueryCount(ctx.user.id);

        return {
          success: true,
          error: null,
          response: {
            text: claudeResponse.content,
            protocolRefs,
            model: claudeResponse.model,
            tokens: {
              input: claudeResponse.inputTokens,
              output: claudeResponse.outputTokens,
            },
            responseTimeMs,
          },
        };
      } catch (error) {
        console.error('Query error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Query failed',
          response: null,
        };
      }
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return db.getUserQueries(ctx.user.id, input.limit);
    }),

  // Search history for cloud sync (Pro feature)
  searchHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return dbUserCounties.getUserSearchHistory(ctx.user.id, input.limit);
    }),

  // Sync local search history to cloud (Pro feature)
  syncHistory: protectedProcedure
    .input(z.object({
      localQueries: z.array(z.object({
        queryText: z.string().min(1).max(500),
        countyId: z.number().optional(),
        timestamp: z.string().or(z.date()),
        deviceId: z.string().max(64).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is Pro/Enterprise
      const user = await db.getUserById(ctx.user.id);
      if (!user || user.tier === 'free') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Search history sync requires Pro subscription",
        });
      }

      const result = await dbUserCounties.syncSearchHistory(
        ctx.user.id,
        input.localQueries
      );

      return {
        success: result.success,
        merged: result.merged,
        serverHistory: result.serverHistory,
      };
    }),

  // Clear search history
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await dbUserCounties.clearSearchHistory(ctx.user.id);
    return result;
  }),

  // Delete single history entry
  deleteHistoryEntry: protectedProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await dbUserCounties.deleteSearchHistoryEntry(ctx.user.id, input.entryId);
      if (!result.success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: result.error || "Entry not found",
        });
      }
      return { success: true };
    }),
});

export type QueryRouter = typeof queryRouter;
