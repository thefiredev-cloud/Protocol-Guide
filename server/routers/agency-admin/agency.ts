/**
 * Agency Management Procedures
 * Handles agency CRUD operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import * as db from "../../db";
import { agencyAdminProcedure } from "./middleware";

export const agencyProcedures = router({
  /**
   * Get current user's agencies
   */
  myAgencies: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserAgencies(ctx.user.id);
  }),

  /**
   * Get agency details
   */
  getAgency: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const agency = await db.getAgencyById(input.agencyId);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      return agency;
    }),

  /**
   * Update agency settings (admin only)
   */
  updateAgency: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1).max(255).optional(),
      contactEmail: z.string().email().max(320).optional(),
      contactPhone: z.string().max(20).optional(),
      address: z.string().max(500).optional(),
      settings: z.object({
        brandColor: z.string().optional(),
        allowSelfRegistration: z.boolean().optional(),
        requireEmailVerification: z.boolean().optional(),
        protocolApprovalRequired: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const { agencyId, ...data } = input;
      await db.updateAgency(agencyId, data);
      return { success: true };
    }),
});
