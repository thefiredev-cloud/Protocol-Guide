/**
 * Protocol version and upload management
 * Handles protocol versioning, approval workflow, and upload processing
 */

import { eq, and, sql, desc } from "drizzle-orm";
import {
  protocolVersions, protocolUploads,
  type ProtocolVersion, type InsertProtocolVersion,
  type ProtocolUpload, type InsertProtocolUpload
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============ Protocol Version Functions ============

/**
 * Get protocol versions for agency
 */
export async function getAgencyProtocolVersions(
  agencyId: number,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<{ items: ProtocolVersion[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options || {};

  const conditions = [eq(protocolVersions.agencyId, agencyId)];
  if (status) {
    conditions.push(eq(protocolVersions.status, status as any));
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(protocolVersions)
    .where(and(...conditions));

  const items = await db
    .select()
    .from(protocolVersions)
    .where(and(...conditions))
    .orderBy(desc(protocolVersions.createdAt))
    .limit(limit)
    .offset(offset);

  return { items, total: countResult?.count || 0 };
}

/**
 * Create protocol version
 */
export async function createProtocolVersion(data: InsertProtocolVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(protocolVersions).values(data).returning({ id: protocolVersions.id });
  return result.id;
}

/**
 * Update protocol version status
 */
export async function updateProtocolVersionStatus(
  versionId: number,
  status: "draft" | "review" | "approved" | "published" | "archived",
  approvedBy?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertProtocolVersion> = { status };
  if (status === "approved" && approvedBy) {
    updateData.approvedBy = approvedBy;
    updateData.approvedAt = new Date().toISOString();
  }
  if (status === "published") {
    updateData.publishedAt = new Date().toISOString();
  }

  await db.update(protocolVersions).set(updateData).where(eq(protocolVersions.id, versionId));
}

// ============ Protocol Upload Functions ============

/**
 * Create protocol upload job
 */
export async function createProtocolUpload(data: InsertProtocolUpload): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(protocolUploads).values(data).returning({ id: protocolUploads.id });
  return result.id;
}

/**
 * Get protocol upload by ID
 */
export async function getProtocolUpload(uploadId: number): Promise<ProtocolUpload | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(protocolUploads).where(eq(protocolUploads.id, uploadId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update protocol upload status
 */
export async function updateProtocolUploadStatus(
  uploadId: number,
  status: "pending" | "processing" | "chunking" | "embedding" | "completed" | "failed",
  details?: { progress?: number; chunksCreated?: number; errorMessage?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertProtocolUpload> = { status };
  if (details?.progress !== undefined) updateData.progress = details.progress;
  if (details?.chunksCreated !== undefined) updateData.chunksCreated = details.chunksCreated;
  if (details?.errorMessage) updateData.errorMessage = details.errorMessage;

  if (status === "processing") {
    updateData.processingStartedAt = new Date();
  }
  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date();
  }

  await db.update(protocolUploads).set(updateData).where(eq(protocolUploads.id, uploadId));
}

/**
 * Get pending protocol uploads for processing
 */
export async function getPendingProtocolUploads(limit = 10): Promise<ProtocolUpload[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(protocolUploads)
    .where(eq(protocolUploads.status, "pending"))
    .orderBy(protocolUploads.createdAt)
    .limit(limit);
}
