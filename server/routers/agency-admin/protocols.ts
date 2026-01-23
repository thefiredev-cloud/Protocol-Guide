/**
 * Protocol Management Procedures
 * Handles protocol CRUD and workflow operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../../_core/trpc";
import * as db from "../../db";
import { storagePut } from "../../storage";
import { agencyAdminProcedure } from "./middleware";

export const protocolProcedures = router({
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

      const { protocolVersions } = await import("../../../drizzle/schema");
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

      const currentStatus = version.status ?? "draft";
      if (!validTransitions[currentStatus]?.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${currentStatus} to ${input.status}`,
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

      const { protocolVersions } = await import("../../../drizzle/schema");
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
});
