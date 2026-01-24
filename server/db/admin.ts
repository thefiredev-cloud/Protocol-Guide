/**
 * Admin operations and audit logging
 * Handles administrative functions and audit trail
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { users, auditLogs, type AuditAction } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Log an audit event for admin actions
 */
export async function logAuditEvent(data: {
  userId: number;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log audit event: database not available");
    return;
  }

  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || null,
    });
  } catch (error) {
    console.error("[Database] Failed to log audit event:", error);
    // Don't throw - audit logging failures shouldn't break admin operations
  }
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(options: {
  userId?: number;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { userId, action, limit = 50, offset = 0 } = options;

  // Build conditions
  const conditions = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(eq(auditLogs.action, action));

  // Get total count
  let countQuery;
  if (conditions.length > 0) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(and(...conditions));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (conditions.length > 0) {
    itemsQuery = db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

/**
 * Get all users with optional tier filter and pagination
 */
export async function getAllUsersPaginated(options: {
  tier?: 'free' | 'pro' | 'enterprise';
  role?: 'user' | 'admin';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { tier, role, limit = 50, offset = 0 } = options;

  // Build conditions array
  const conditions = [];
  if (tier) conditions.push(eq(users.tier, tier));
  if (role) conditions.push(eq(users.role, role));

  // Get total count
  let countQuery;
  if (conditions.length > 0) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(...conditions));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(users);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (conditions.length > 0) {
    itemsQuery = db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      tier: users.tier,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      tier: users.tier,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}
