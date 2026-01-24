/**
 * Agency management database operations
 * Handles agency CRUD, members, and permissions
 */

import { eq, and, sql, desc } from "drizzle-orm";
import {
  agencies, agencyMembers,
  type Agency, type InsertAgency, type AgencyMember, type InsertAgencyMember
} from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Get agency by ID
 */
export async function getAgencyById(agencyId: number): Promise<Agency | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get agency by slug
 */
export async function getAgencyBySlug(slug: string): Promise<Agency | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agencies).where(eq(agencies.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new agency
 */
export async function createAgency(data: InsertAgency): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(agencies).values(data).returning({ id: agencies.id });
  return result.id;
}

/**
 * Update agency
 */
export async function updateAgency(
  agencyId: number,
  data: Partial<InsertAgency>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agencies).set(data).where(eq(agencies.id, agencyId));
}

/**
 * Get agency members
 */
export async function getAgencyMembers(agencyId: number): Promise<AgencyMember[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(agencyMembers)
    .where(eq(agencyMembers.agencyId, agencyId))
    .orderBy(desc(agencyMembers.createdAt));
}

/**
 * Add member to agency
 */
export async function addAgencyMember(data: InsertAgencyMember): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agencyMembers).values(data);
  return result[0].insertId;
}

/**
 * Update agency member role
 */
export async function updateAgencyMemberRole(
  memberId: number,
  role: "owner" | "admin" | "protocol_author" | "member"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agencyMembers).set({ role }).where(eq(agencyMembers.id, memberId));
}

/**
 * Remove member from agency
 */
export async function removeAgencyMember(memberId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(agencyMembers).where(eq(agencyMembers.id, memberId));
}

/**
 * Get user's agencies (where they are a member)
 */
export async function getUserAgencies(userId: number): Promise<Agency[]> {
  const db = await getDb();
  if (!db) return [];

  const memberships = await db
    .select({ agencyId: agencyMembers.agencyId })
    .from(agencyMembers)
    .where(and(eq(agencyMembers.userId, userId), eq(agencyMembers.status, "active")));

  if (memberships.length === 0) return [];

  const agencyIds = memberships.map((m) => m.agencyId);
  const result = await db
    .select()
    .from(agencies)
    .where(sql`${agencies.id} IN (${sql.join(agencyIds.map(id => sql`${id}`), sql`, `)})`);

  return result;
}

/**
 * Check if user is agency admin
 */
export async function isUserAgencyAdmin(userId: number, agencyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(agencyMembers)
    .where(
      and(
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.agencyId, agencyId),
        eq(agencyMembers.status, "active"),
        sql`${agencyMembers.role} IN ('owner', 'admin')`
      )
    )
    .limit(1);

  return result.length > 0;
}
