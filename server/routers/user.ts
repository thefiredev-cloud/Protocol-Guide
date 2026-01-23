/**
 * User Router
 * Handles user-related procedures including profile, counties, and queries
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import * as dbUserCounties from "../db-user-counties";

export const userRouter = router({
  usage: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserUsage(ctx.user.id);
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
});

export type UserRouter = typeof userRouter;
