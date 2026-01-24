/**
 * Query Router
 * Handles protocol query submission, history, and sync
 * Optimized with query normalization and intelligent model routing
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeClaudeRAG, type ProtocolContext, type UserTier } from "../_core/claude";
import { semanticSearchProtocols } from "../_core/embeddings";
import { normalizeEmsQuery } from "../_core/ems-query-normalizer";
import {
  optimizedSearch,
  highAccuracySearch,
  selectModel,
  latencyMonitor,
  type OptimizedSearchOptions,
} from "../_core/rag-optimizer";
import { validateTier, validateQueryLimit, validateSubscriptionActive, validateTierValue, getUserTierFeatures } from "../_core/tier-validation";
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

      // Get user and validate tier
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      const userTier: UserTier = validateTierValue(user.tier);

      // Validate subscription is active for paid tiers
      if (userTier !== 'free') {
        try {
          await validateSubscriptionActive(user);
        } catch (error) {
          return {
            success: false,
            error: error instanceof TRPCError ? error.message : "Subscription validation failed",
            response: null,
          };
        }
      }

      // SECURITY FIX: Use atomic increment-and-check to prevent TOCTOU race condition
      // Get tier limit for atomic check
      const features = await db.getUserTierFeatures(ctx.user.id);
      const tierLimit = features.dailyQueryLimit;

      // Skip atomic check if unlimited (Infinity)
      if (tierLimit !== Infinity) {
        const { allowed, newCount } = await db.incrementAndCheckQueryLimit(ctx.user.id, tierLimit);
        if (!allowed) {
          return {
            success: false,
            error: `Daily query limit (${tierLimit}) exceeded. Current count: ${newCount}. Upgrade to Pro for unlimited queries.`,
            response: null,
          };
        }
      }

      // Get agency name for context
      const county = await db.getCountyById(input.countyId);
      const agencyName = county?.name || 'Unknown Agency';

      try {
        // Step 1: Normalize the EMS query (expand abbreviations, fix typos)
        const normalized = normalizeEmsQuery(input.queryText);

        // Log normalization for monitoring
        if (normalized.normalized !== normalized.original.toLowerCase()) {
          console.log(`[Query] "${normalized.original}" -> "${normalized.normalized}"`);
        }

        // Step 2: Use selectModel() for intelligent Claude routing
        // This considers query complexity, intent, and user tier
        const suggestedModel = selectModel(normalized, userTier);
        console.log(`[Query] Model selection: ${suggestedModel} (tier: ${userTier}, complex: ${normalized.isComplex}, intent: ${normalized.intent})`);

        // Step 3: Determine optimization options based on query type and user tier
        const isMedicationQuery = normalized.intent === 'medication_dosing' ||
          normalized.intent === 'contraindication_check' ||
          normalized.extractedMedications.length > 0;

        // Pro users get enhanced accuracy for all queries
        // Free users get enhanced accuracy only for medication/safety queries
        const useEnhancedAccuracy = userTier !== 'free' || isMedicationQuery || normalized.isEmergent;

        const searchOptions: OptimizedSearchOptions = {
          // Multi-query fusion for better recall on critical queries
          enableMultiQueryFusion: useEnhancedAccuracy || normalized.isComplex,
          // Always use advanced re-ranking for query submissions
          enableAdvancedRerank: true,
          // Enable context boost when agency is specified
          enableContextBoost: agencyName !== 'Unknown Agency',
        };

        console.log(`[Query] Search options: multi-query=${searchOptions.enableMultiQueryFusion}, ` +
          `advanced-rerank=${searchOptions.enableAdvancedRerank}, ` +
          `context-boost=${searchOptions.enableContextBoost}`);

        // Step 4: Execute optimized search with normalized query
        const optimizedResult = await optimizedSearch(
          {
            query: normalized.normalized,
            agencyName: agencyName !== 'Unknown Agency' ? agencyName : null,
            limit: 10,
            userTier,
          },
          async (params) => {
            const searchResults = await semanticSearchProtocols({
              query: params.query,
              agencyName: params.agencyName,
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

        if (optimizedResult.results.length === 0) {
          return {
            success: false,
            error: "No matching protocols found. Try rephrasing your query.",
            response: null,
          };
        }

        // Convert to ProtocolContext format for Claude
        const protocols: ProtocolContext[] = optimizedResult.results.map(r => ({
          id: r.id,
          protocolNumber: r.protocolNumber,
          protocolTitle: r.protocolTitle,
          section: r.section,
          content: r.content,
          imageUrls: r.imageUrls,
          similarity: r.rerankedScore ?? r.similarity,
        }));

        // Step 4: Invoke Claude with optimized model selection
        // Pass the suggested model to invokeClaudeRAG for routing
        const claudeResponse = await invokeClaudeRAG({
          query: input.queryText, // Use original query for natural response
          protocols,
          userTier,
          agencyName,
          // suggestedModel is used internally by invokeClaudeRAG based on userTier
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

        // Note: Query count already incremented atomically before query execution
        // This prevents TOCTOU race condition where parallel requests could exceed limits

        // Record latency for monitoring
        latencyMonitor.record('totalRetrieval', responseTimeMs);

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
            // Include optimization metadata
            normalizedQuery: normalized.normalized,
            queryIntent: normalized.intent,
            isComplexQuery: normalized.isComplex,
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
      // Validate user has Pro tier or higher
      await validateTier(ctx, "pro");

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
