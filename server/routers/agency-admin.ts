/**
 * Agency Admin Router
 * Handles agency management, staff, and protocol operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";
import crypto from "crypto";

// Agency admin middleware - checks if user is agency admin
const agencyAdminProcedure = protectedProcedure.use(async ({ ctx, next, rawInput }) => {
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

export const agencyAdminRouter = router({
  // ============ Agency Management ============

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

  // ============ Staff Management ============

  /**
   * List agency members
   */
  listMembers: agencyAdminProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const members = await db.getAgencyMembers(input.agencyId);

      // Get user details for each member
      const membersWithUsers = await Promise.all(
        members.map(async (member) => {
          const user = await db.getUserById(member.userId);
          return {
            ...member,
            user: user ? { id: user.id, name: user.name, email: user.email } : null,
          };
        })
      );

      return membersWithUsers;
    }),

  /**
   * Invite member to agency
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
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { agencyInvitations } = await import("../../drizzle/schema");
      await dbInstance.insert(agencyInvitations).values({
        agencyId: input.agencyId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.id,
        token,
        expiresAt,
      });

      // TODO: Send invitation email
      console.log(`[AgencyAdmin] Invitation created for ${input.email}, token: ${token}`);

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

  // ============ Protocol Management ============

  /**
   * List agency protocols
   */
  listProtocols: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      status: z.enum(["draft", "review", "approved", "published", "archived"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return db.getAgencyProtocolVersions(input.agencyId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Upload new protocol PDF
   */
  uploadProtocol: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      fileName: z.string().max(255),
      fileBase64: z.string(),
      mimeType: z.string().default("application/pdf"),
      protocolNumber: z.string().max(50),
      title: z.string().max(255),
      version: z.string().max(20).default("1.0"),
      effectiveDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate file type
      if (input.mimeType !== "application/pdf") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF files are supported" });
      }

      // Upload file to storage
      const timestamp = Date.now();
      const key = `protocols/${input.agencyId}/${timestamp}-${input.fileName}`;
      const buffer = Buffer.from(input.fileBase64, "base64");

      const { url } = await storagePut(key, buffer, input.mimeType);

      // Create upload job
      const uploadId = await db.createProtocolUpload({
        agencyId: input.agencyId,
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl: url,
        fileSize: buffer.length,
        mimeType: input.mimeType,
        status: "pending",
      });

      // Create protocol version record
      const versionId = await db.createProtocolVersion({
        agencyId: input.agencyId,
        protocolNumber: input.protocolNumber,
        title: input.title,
        version: input.version,
        status: "draft",
        sourceFileUrl: url,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
        createdBy: ctx.user.id,
      });

      return {
        success: true,
        uploadId,
        versionId,
        fileUrl: url,
      };
    }),

  /**
   * Get upload processing status
   */
  getUploadStatus: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      uploadId: z.number(),
    }))
    .query(async ({ input }) => {
      const upload = await db.getProtocolUpload(input.uploadId);

      if (!upload || upload.agencyId !== input.agencyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
      }

      return upload;
    }),

  /**
   * Update protocol status (workflow)
   */
  updateProtocolStatus: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      versionId: z.number(),
      status: z.enum(["draft", "review", "approved", "published", "archived"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate workflow transitions
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { protocolVersions } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [version] = await dbInstance
        .select()
        .from(protocolVersions)
        .where(
          and(
            eq(protocolVersions.id, input.versionId),
            eq(protocolVersions.agencyId, input.agencyId)
          )
        )
        .limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Protocol version not found" });
      }

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        draft: ["review", "archived"],
        review: ["draft", "approved", "archived"],
        approved: ["published", "draft"],
        published: ["archived"],
        archived: ["draft"],
      };

      if (!validTransitions[version.status]?.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${version.status} to ${input.status}`,
        });
      }

      await db.updateProtocolVersionStatus(
        input.versionId,
        input.status,
        input.status === "approved" ? ctx.user.id : undefined
      );

      return { success: true };
    }),

  /**
   * Publish protocol (makes it live in search)
   */
  publishProtocol: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      versionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Must be approved first
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { protocolVersions } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [version] = await dbInstance
        .select()
        .from(protocolVersions)
        .where(
          and(
            eq(protocolVersions.id, input.versionId),
            eq(protocolVersions.agencyId, input.agencyId)
          )
        )
        .limit(1);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Protocol version not found" });
      }

      if (version.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Protocol must be approved before publishing",
        });
      }

      await db.updateProtocolVersionStatus(input.versionId, "published");

      // Log audit event
      await db.logAuditEvent({
        userId: ctx.user.id,
        action: "PROTOCOL_MODIFIED",
        targetType: "protocol_version",
        targetId: String(input.versionId),
        details: {
          action: "published",
          protocolNumber: version.protocolNumber,
          title: version.title,
        },
      });

      return { success: true };
    }),

  /**
   * Archive protocol
   */
  archiveProtocol: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      versionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateProtocolVersionStatus(input.versionId, "archived");

      await db.logAuditEvent({
        userId: ctx.user.id,
        action: "PROTOCOL_MODIFIED",
        targetType: "protocol_version",
        targetId: String(input.versionId),
        details: { action: "archived" },
      });

      return { success: true };
    }),

  // ============ Version Control ============

  /**
   * List protocol versions
   */
  listVersions: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      protocolNumber: z.string(),
    }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];

      const { protocolVersions } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      return dbInstance
        .select()
        .from(protocolVersions)
        .where(
          and(
            eq(protocolVersions.agencyId, input.agencyId),
            eq(protocolVersions.protocolNumber, input.protocolNumber)
          )
        )
        .orderBy(desc(protocolVersions.createdAt));
    }),

  /**
   * Create new version from existing
   */
  createVersion: agencyAdminProcedure
    .input(z.object({
      agencyId: z.number(),
      fromVersionId: z.number(),
      newVersion: z.string().max(20),
      changes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { protocolVersions } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Get source version
      const [source] = await dbInstance
        .select()
        .from(protocolVersions)
        .where(
          and(
            eq(protocolVersions.id, input.fromVersionId),
            eq(protocolVersions.agencyId, input.agencyId)
          )
        )
        .limit(1);

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source version not found" });
      }

      // Create new version
      const newVersionId = await db.createProtocolVersion({
        agencyId: input.agencyId,
        protocolNumber: source.protocolNumber,
        title: source.title,
        version: input.newVersion,
        status: "draft",
        sourceFileUrl: source.sourceFileUrl,
        metadata: {
          ...source.metadata,
          changeLog: input.changes,
          supersedes: source.version,
        },
        createdBy: ctx.user.id,
      });

      return { success: true, versionId: newVersionId };
    }),
});
