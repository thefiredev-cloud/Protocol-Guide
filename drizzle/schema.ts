import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  supabaseId: varchar("supabaseId", { length: 36 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  tier: mysqlEnum("tier", ["free", "pro", "enterprise"]).default("free").notNull(),
  queryCountToday: int("queryCountToday").default(0).notNull(),
  lastQueryDate: varchar("lastQueryDate", { length: 10 }), // YYYY-MM-DD format
  selectedCountyId: int("selectedCountyId"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  subscriptionId: varchar("subscriptionId", { length: 255 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Counties/Agencies table
 */
export const counties = mysqlTable("counties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  state: varchar("state", { length: 64 }).notNull(),
  usesStateProtocols: boolean("usesStateProtocols").default(false).notNull(),
  protocolVersion: varchar("protocolVersion", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type County = typeof counties.$inferSelect;
export type InsertCounty = typeof counties.$inferInsert;

/**
 * Protocol chunks for RAG retrieval
 */
export const protocolChunks = mysqlTable("protocolChunks", {
  id: int("id").autoincrement().primaryKey(),
  countyId: int("countyId").notNull(),
  protocolNumber: varchar("protocolNumber", { length: 50 }).notNull(),
  protocolTitle: varchar("protocolTitle", { length: 255 }).notNull(),
  section: varchar("section", { length: 255 }),
  content: text("content").notNull(),
  // Note: For semantic search, we'll use LLM-based similarity since MySQL doesn't support vector
  // In production, this would use pgvector or a dedicated vector DB
  sourcePdfUrl: varchar("sourcePdfUrl", { length: 500 }),
  // Protocol currency tracking
  protocolEffectiveDate: varchar("protocolEffectiveDate", { length: 20 }), // When protocol became effective (e.g., "2025-01-01")
  lastVerifiedAt: timestamp("lastVerifiedAt"), // When we last verified this protocol was current
  protocolYear: int("protocolYear"), // Year of protocol for quick filtering
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProtocolChunk = typeof protocolChunks.$inferSelect;
export type InsertProtocolChunk = typeof protocolChunks.$inferInsert;

/**
 * Query logs for analytics and history
 */
export const queries = mysqlTable("queries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  countyId: int("countyId").notNull(),
  queryText: text("queryText").notNull(),
  responseText: text("responseText"),
  protocolRefs: json("protocolRefs").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;

/**
 * User feedback for protocol errors and suggestions
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["error", "suggestion", "general"]).notNull(),
  protocolRef: varchar("protocolRef", { length: 255 }), // Optional reference to specific protocol
  countyId: int("countyId"), // Optional county context
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

/**
 * Contact submissions from unauthenticated users
 */
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

/**
 * Stripe webhook events tracking for idempotency
 * Prevents duplicate processing of webhook events
 */
export const stripeWebhookEvents = mysqlTable("stripe_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 255 }).notNull().unique(), // Stripe event ID (evt_xxx)
  eventType: varchar("eventType", { length: 100 }).notNull(), // e.g., checkout.session.completed
  processedAt: timestamp("processedAt").defaultNow().notNull(),
  // Optional: Store event data for debugging
  eventData: json("eventData"),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type InsertStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;

/**
 * Audit log actions enum for tracking admin activities
 */
export const auditActionEnum = mysqlEnum("audit_action", [
  "USER_ROLE_CHANGED",
  "USER_TIER_CHANGED",
  "FEEDBACK_STATUS_CHANGED",
  "CONTACT_STATUS_CHANGED",
  "USER_DELETED",
  "PROTOCOL_MODIFIED",
]);

/**
 * Audit logs table for tracking admin actions
 * Provides compliance and accountability for administrative operations
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Admin who performed the action
  action: auditActionEnum.notNull(),
  targetType: varchar("targetType", { length: 50 }).notNull(), // e.g., "user", "feedback", "contact"
  targetId: varchar("targetId", { length: 50 }).notNull(), // ID of the affected entity
  details: json("details").$type<Record<string, unknown>>(), // Additional context (old/new values)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = "USER_ROLE_CHANGED" | "USER_TIER_CHANGED" | "FEEDBACK_STATUS_CHANGED" | "CONTACT_STATUS_CHANGED" | "USER_DELETED" | "PROTOCOL_MODIFIED";
