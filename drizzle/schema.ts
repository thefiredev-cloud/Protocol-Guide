import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, index } from "drizzle-orm/mysql-core";

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

/**
 * User saved counties - tracks which counties/agencies a user has saved
 * Free users can save 1 county, Pro users can save unlimited
 */
export const userCounties = mysqlTable("user_counties", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  countyId: int("countyId").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserCounty = typeof userCounties.$inferSelect;
export type InsertUserCounty = typeof userCounties.$inferInsert;

/**
 * Search history for cloud sync - stores individual search queries for Pro users
 * Enables cross-device sync and search history persistence
 */
export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  queryText: varchar("queryText", { length: 500 }).notNull(),
  countyId: int("countyId"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  deviceId: varchar("deviceId", { length: 64 }), // Optional device identifier for sync tracking
  synced: boolean("synced").default(true).notNull(), // Whether this was synced from a local device
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

// ============ Phase 1: OAuth Provider Tables ============

/**
 * User OAuth providers - tracks linked authentication providers
 * Enables Google/Apple OAuth and account linking
 */
export const userAuthProviders = mysqlTable("user_auth_providers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(), // 'google', 'apple'
  providerUserId: varchar("providerUserId", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
});

export type UserAuthProvider = typeof userAuthProviders.$inferSelect;
export type InsertUserAuthProvider = typeof userAuthProviders.$inferInsert;

// ============ Phase 2: State/Agency Subscription Tables ============

/**
 * User state subscriptions - tracks which states a user has access to
 * Pro users can subscribe to states for access to all state protocols
 */
export const userStates = mysqlTable("user_states", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stateCode: varchar("stateCode", { length: 2 }).notNull(),
  accessLevel: mysqlEnum("accessLevel", ["view", "contribute", "admin"]).default("view"),
  subscribedAt: timestamp("subscribedAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
});

export type UserState = typeof userStates.$inferSelect;
export type InsertUserState = typeof userStates.$inferInsert;

/**
 * User agency subscriptions - tracks which agencies a user has access to
 * Replaces userCounties with richer access control
 */
export const userAgencies = mysqlTable("user_agencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agencyId: int("agencyId").notNull(),
  accessLevel: mysqlEnum("accessLevel", ["view", "contribute", "admin"]).default("view"),
  isPrimary: boolean("isPrimary").default(false),
  role: varchar("role", { length: 100 }), // e.g., "Paramedic", "Medical Director"
  verifiedAt: timestamp("verifiedAt"),
  subscribedAt: timestamp("subscribedAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
});

export type UserAgency = typeof userAgencies.$inferSelect;
export type InsertUserAgency = typeof userAgencies.$inferInsert;

// ============ Phase 4: Agency Admin Portal Tables ============

/**
 * Agency settings type definition
 */
export interface AgencySettings {
  brandColor?: string;
  logoUrl?: string;
  allowSelfRegistration?: boolean;
  requireEmailVerification?: boolean;
  defaultAccessLevel?: "view" | "contribute";
  protocolApprovalRequired?: boolean;
  auditLogRetentionDays?: number;
}

/**
 * Protocol metadata type definition
 */
export interface ProtocolMetadata {
  originalFileName?: string;
  pageCount?: number;
  wordCount?: number;
  categories?: string[];
  tags?: string[];
  supersedes?: string; // Protocol number this replaces
  relatedProtocols?: string[];
  changeLog?: string;
}

/**
 * Agency organization accounts
 * Represents fire departments, EMS agencies, hospitals, state offices
 */
export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  stateCode: varchar("stateCode", { length: 2 }).notNull(),
  agencyType: mysqlEnum("agencyType", ["fire_dept", "ems_agency", "hospital", "state_office", "regional_council"]),
  logoUrl: varchar("logoUrl", { length: 500 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  address: text("address"),
  supabaseAgencyId: int("supabaseAgencyId"), // Links to manus_agencies in Supabase
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["starter", "professional", "enterprise"]).default("starter"),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }),
  settings: json("settings").$type<AgencySettings>(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

/**
 * Agency staff memberships
 * Tracks which users belong to which agencies and their roles
 */
export const agencyMembers = mysqlTable("agency_members", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "protocol_author", "member"]).default("member"),
  invitedBy: int("invitedBy"),
  invitedAt: timestamp("invitedAt"),
  acceptedAt: timestamp("acceptedAt"),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type AgencyMember = typeof agencyMembers.$inferSelect;
export type InsertAgencyMember = typeof agencyMembers.$inferInsert;

/**
 * Protocol versions for agency management
 * Enables version control for agency protocols
 */
export const protocolVersions = mysqlTable("protocol_versions", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  protocolNumber: varchar("protocolNumber", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "archived"]).default("draft"),
  sourceFileUrl: varchar("sourceFileUrl", { length: 500 }), // Original PDF
  effectiveDate: timestamp("effectiveDate"),
  expiresDate: timestamp("expiresDate"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  publishedAt: timestamp("publishedAt"),
  chunksGenerated: int("chunksGenerated").default(0),
  metadata: json("metadata").$type<ProtocolMetadata>(),
  createdAt: timestamp("createdAt").defaultNow(),
  createdBy: int("createdBy").notNull(),
});

export type ProtocolVersion = typeof protocolVersions.$inferSelect;
export type InsertProtocolVersion = typeof protocolVersions.$inferInsert;

/**
 * Protocol upload jobs
 * Tracks the status of protocol PDF processing
 */
export const protocolUploads = mysqlTable("protocol_uploads", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  status: mysqlEnum("status", ["pending", "processing", "chunking", "embedding", "completed", "failed"]).default("pending"),
  progress: int("progress").default(0),
  chunksCreated: int("chunksCreated").default(0),
  errorMessage: text("errorMessage"),
  processingStartedAt: timestamp("processingStartedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ProtocolUpload = typeof protocolUploads.$inferSelect;
export type InsertProtocolUpload = typeof protocolUploads.$inferInsert;

/**
 * Agency invitations
 * Tracks pending invitations to join agencies
 */
export const agencyInvitations = mysqlTable("agency_invitations", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "protocol_author", "member"]).default("member"),
  invitedBy: int("invitedBy").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type AgencyInvitation = typeof agencyInvitations.$inferSelect;
export type InsertAgencyInvitation = typeof agencyInvitations.$inferInsert;

// ============ Phase 5: Integration Tracking Tables ============

/**
 * Integration partners enum
 */
export const integrationPartnerEnum = mysqlEnum("integration_partner", [
  "imagetrend",
  "esos",
  "zoll",
  "emscloud",
  "none",
]);

/**
 * Integration access logs
 * Tracks when integration partners access Protocol Guide
 * Used for analytics and partnership reporting
 */
export const integrationLogs = mysqlTable("integration_logs", {
  id: int("id").autoincrement().primaryKey(),
  partner: integrationPartnerEnum.notNull(),
  agencyId: varchar("agencyId", { length: 100 }), // Partner's agency identifier
  agencyName: varchar("agencyName", { length: 255 }),
  searchTerm: varchar("searchTerm", { length: 500 }),
  userAge: int("userAge"), // Patient age if provided
  impression: varchar("impression", { length: 255 }), // Clinical impression
  responseTimeMs: int("responseTimeMs"),
  resultCount: int("resultCount"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;
export type IntegrationPartner = "imagetrend" | "esos" | "zoll" | "emscloud" | "none";

// ============ Analytics Schema ============

export {
  analyticsEvents,
  searchAnalytics,
  protocolAccessLogs,
  sessionAnalytics,
  dailyMetrics,
  retentionCohorts,
  contentGaps,
  conversionEvents,
  featureUsageStats,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type ProtocolAccessLog,
  type InsertProtocolAccessLog,
  type SessionAnalytics,
  type InsertSessionAnalytics,
  type DailyMetric,
  type InsertDailyMetric,
  type RetentionCohort,
  type InsertRetentionCohort,
  type ContentGap,
  type InsertContentGap,
  type ConversionEvent,
  type InsertConversionEvent,
  type FeatureUsageStat,
  type InsertFeatureUsageStat,
  type EventType,
  type SearchMethod,
  type AccessSource,
  type QueryCategory,
} from "./analytics-schema";
