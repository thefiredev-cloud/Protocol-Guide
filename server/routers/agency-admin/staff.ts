/**
 * Staff Management Procedures
 * Handles agency member operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../../_core/trpc";
import * as db from "../../db";
import crypto from "crypto";
import { agencyAdminProcedure } from "./middleware";

export const staffProcedures = router({
  /**
   * List agency members
   */
  listMembers: agencyAdminProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const members = await db.getAgencyMembers(input.agencyId);

      // OPTIMIZED: Batch fetch all users in single query (prevents N+1)
      const dbInstance = await db.getDb();
      if (!dbInstance || members.length === 0) {
        return members.map(member => ({
          ...member,
          user: null,
        }));
      }

      const { users } = await import("../../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");

      // Get all unique user IDs
      const userIds = [...new Set(members.map(m => m.userId))];

      // Single batch query for all users
      const userList = await dbInstance
        .select()
        .from(users)
        .where(inArray(users.id, userIds));

      // Create user lookup map for O(1) access
      const userMap = new Map(userList.map(u => [u.id, u]));

      // Merge members with users
      const membersWithUsers = members.map(member => {
        const user = userMap.get(member.userId);
        return {
          ...member,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      });

      return membersWithUsers;
    }),

  /**
   * Invite member to agency
   * TODO: Add agencyInvitations table to drizzle/schema.ts to enable this feature
   */
  inviteMember: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      email: z.string().email(),
      role: z.enum(["admin", "protocol_author", "member"]).default("member"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate invitation token
      const token = crypto.randomBytes(32).toString("hex");
      const _expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Invitation feature not yet implemented - agencyInvitations table needed
      // TODO: Create agencyInvitations table migration and uncomment below
      /*
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { agencyInvitations } = await import("../../../drizzle/schema");
      await dbInstance.insert(agencyInvitations).values({
        agencyId: input.agencyId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.id,
        token,
        expiresAt: _expiresAt,
      });
      */

      // TODO: Send invitation email
      console.log(`[AgencyAdmin] Invitation feature pending - would invite ${input.email} to agency ${input.agencyId}`);

      return { success: true, token };
    }),

  /**
   * Update member role
   */
  updateMemberRole: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      memberId: z.number(),
      role: z.enum(["admin", "protocol_author", "member"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Cannot change owner role
      const members = await db.getAgencyMembers(input.agencyId);
      const targetMember = members.find((m) => m.id === input.memberId);

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (targetMember.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change owner role" });
      }

      // Cannot demote yourself
      if (targetMember.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change your own role" });
      }

      await db.updateAgencyMemberRole(input.memberId, input.role);
      return { success: true };
    }),

  /**
   * Remove member from agency
   */
  removeMember: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const members = await db.getAgencyMembers(input.agencyId);
      const targetMember = members.find((m) => m.id === input.memberId);

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      // Cannot remove owner
      if (targetMember.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove agency owner" });
      }

      // Cannot remove yourself (use leave instead)
      if (targetMember.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Use leave agency instead" });
      }

      await db.removeAgencyMember(input.memberId);
      return { success: true };
    }),
});
