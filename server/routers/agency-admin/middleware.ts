/**
 * Agency Admin Middleware
 * Shared middleware for agency admin authorization
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../_core/trpc";
import * as db from "../../db";

/**
 * Agency admin middleware - checks if user is agency admin
 * Validates agencyId in input and verifies user has admin access
 */
export const agencyAdminProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput();
  const input = rawInput as { agencyId?: number };
  if (!input.agencyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Agency ID required" });
  }

  const isAdmin = await db.isUserAgencyAdmin(ctx.user.id, input.agencyId);
  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this agency" });
  }

  return next({ ctx: { ...ctx, agencyId: input.agencyId } });
});
