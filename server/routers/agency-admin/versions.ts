/**
 * Version Control Procedures
 * Handles protocol versioning operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../../_core/trpc";
import * as db from "../../db";
import { agencyAdminProcedure } from "./middleware";

export const versionProcedures = router({
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

      const { protocolVersions } = await import("../../../drizzle/schema");
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

      const { protocolVersions } = await import("../../../drizzle/schema");
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
      // Safely merge existing metadata (unknown type from json column) with new fields
      const existingMetadata = (source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata))
        ? source.metadata as Record<string, unknown>
        : {};

      const newVersionId = await db.createProtocolVersion({
        agencyId: input.agencyId,
        protocolNumber: source.protocolNumber,
        title: source.title,
        version: input.newVersion,
        status: "draft",
        sourceFileUrl: source.sourceFileUrl,
        metadata: {
          ...existingMetadata,
          changeLog: input.changes,
          supersedes: source.version,
        },
        createdBy: ctx.user.id,
      });

      return { success: true, versionId: newVersionId };
    }),
});
