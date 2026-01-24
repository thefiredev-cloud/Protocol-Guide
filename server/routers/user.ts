/**
 * User Router
 * Handles user-related procedures including profile, counties, and queries
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import * as dbUserCounties from "../db-user-counties";
import { pushTokens } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const userRouter = router({
  usage: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserUsage(ctx.user.id);
  }),

  /**
   * P0 CRITICAL: Medical Disclaimer Acknowledgment
   * Records timestamp when user acknowledges medical disclaimer
   * Required for legal compliance before accessing protocol search
   */
  acknowledgeDisclaimer: protectedProcedure
    .mutation(async ({ ctx }) => {
      return db.acknowledgeDisclaimer(ctx.user.id);
    }),

  /**
   * Check if user has acknowledged the medical disclaimer
   */
  hasAcknowledgedDisclaimer: protectedProcedure
    .query(async ({ ctx }) => {
      const hasAcknowledged = await db.hasAcknowledgedDisclaimer(ctx.user.id);
      return { hasAcknowledged };
    }),

  selectCounty: protectedProcedure
    .input(z.object({ countyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserCounty(ctx.user.id, input.countyId);
      return { success: true };
    }),

  queries: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      return db.getUserQueries(ctx.user.id, input.limit);
    }),

  // Saved counties for tier-restricted access
  savedCounties: protectedProcedure.query(async ({ ctx }) => {
    const counties = await dbUserCounties.getUserCounties(ctx.user.id);
    const { canAdd, currentCount, maxAllowed, tier } = await dbUserCounties.canUserAddCounty(ctx.user.id);
    return {
      counties,
      canAdd,
      currentCount,
      maxAllowed,
      tier,
    };
  }),

  addCounty: protectedProcedure
    .input(z.object({
      countyId: z.number(),
      isPrimary: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await dbUserCounties.addUserCounty(
        ctx.user.id,
        input.countyId,
        input.isPrimary
      );
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to add county",
        });
      }
      return result;
    }),

  removeCounty: protectedProcedure
    .input(z.object({ countyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await dbUserCounties.removeUserCounty(ctx.user.id, input.countyId);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to remove county",
        });
      }
      return { success: true };
    }),

  setPrimaryCounty: protectedProcedure
    .input(z.object({ countyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await dbUserCounties.setUserPrimaryCounty(ctx.user.id, input.countyId);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to set primary county",
        });
      }
      return { success: true };
    }),

  primaryCounty: protectedProcedure.query(async ({ ctx }) => {
    return dbUserCounties.getUserPrimaryCounty(ctx.user.id);
  }),

  savePushToken: protectedProcedure
    .input(z.object({
      token: z.string(),
      platform: z.enum(['ios', 'android']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { token, platform } = input;
      const userId = ctx.user.id;

      // Upsert - update lastUsedAt if exists, insert if new
      const existing = await ctx.db
        .select()
        .from(pushTokens)
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(pushTokens)
          .set({ lastUsedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(pushTokens.id, existing[0].id));
      } else {
        await ctx.db.insert(pushTokens).values({ userId, token, platform });
      }

      return { success: true };
    }),
});

export type UserRouter = typeof userRouter;
