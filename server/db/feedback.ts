/**
 * Feedback and contact submission database operations
 * Handles user feedback and contact form submissions
 */

import { eq, sql, desc } from "drizzle-orm";
import { feedback, contactSubmissions, type InsertFeedback, type InsertContactSubmission } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============ Feedback Functions ============

export async function createFeedback(data: InsertFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(feedback).values(data).returning({ id: feedback.id });
  return result.id;
}

export async function getUserFeedback(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(sql`${feedback.createdAt} DESC`)
    .limit(limit);
}

export async function getAllFeedback(status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed') {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return db.select().from(feedback)
      .where(eq(feedback.status, status))
      .orderBy(sql`${feedback.createdAt} DESC`);
  }

  return db.select().from(feedback)
    .orderBy(sql`${feedback.createdAt} DESC`);
}

export async function updateFeedbackStatus(
  feedbackId: number,
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  adminNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: { status: typeof status; adminNotes?: string } = { status };
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }

  await db.update(feedback).set(updateData).where(eq(feedback.id, feedbackId));
}

export async function getAllFeedbackPaginated(options: {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options;

  // Get total count
  let countQuery;
  if (status) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(feedback)
      .where(eq(feedback.status, status));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(feedback);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (status) {
    itemsQuery = db.select().from(feedback)
      .where(eq(feedback.status, status))
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

export async function getFeedbackById(feedbackId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(feedback).where(eq(feedback.id, feedbackId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Contact Submission Functions ============

export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contactSubmissions).values(data);
  return result[0].insertId;
}

export async function getAllContactSubmissionsPaginated(options: {
  status?: 'pending' | 'reviewed' | 'resolved';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options;

  // Get total count
  let countQuery;
  if (status) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, status));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(contactSubmissions);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (status) {
    itemsQuery = db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.status, status))
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

export async function updateContactSubmissionStatus(
  submissionId: number,
  status: 'pending' | 'reviewed' | 'resolved'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, submissionId));
}

export async function getContactSubmissionById(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, submissionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
