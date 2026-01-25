/**
 * PostgreSQL Schema for Protocol Guide (Primary Database)
 *
 * This is the SOURCE OF TRUTH for all database tables.
 * MySQL schema (mysql-schema.ts) should mirror this file.
 *
 * @see /drizzle/mysql-schema.ts - MySQL mirror schema
 * @see /drizzle/shared-types.ts - Shared type definitions
 * @see /drizzle/relations.ts - Table relationships
 * @see /docs/database/SCHEMA_CONSOLIDATION.md - Architecture docs
 */

import { pgTable, pgEnum, serial, integer, varchar, text, timestamp, index, json, boolean, smallint, uuid, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ========================================
// Enum Definitions
// ========================================

export const contactStatusEnum = pgEnum('contact_status', ['pending', 'reviewed', 'resolved']);
export const feedbackCategoryEnum = pgEnum('feedback_category', ['error', 'suggestion', 'general']);
export const feedbackStatusEnum = pgEnum('feedback_status', ['pending', 'reviewed', 'resolved', 'dismissed']);
export const integrationPartnerEnum = pgEnum('integration_partner', ['imagetrend', 'esos', 'zoll', 'emscloud', 'none']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userTierEnum = pgEnum('user_tier', ['free', 'pro', 'enterprise']);
export const agencyTypeEnum = pgEnum('agency_type', ['fire_dept', 'ems_agency', 'hospital', 'state_office', 'regional_council']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['starter', 'professional', 'enterprise']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'protocol_author', 'member']);
export const memberStatusEnum = pgEnum('member_status', ['pending', 'active', 'suspended']);
export const protocolStatusEnum = pgEnum('protocol_status', ['draft', 'review', 'approved', 'published', 'archived']);
export const uploadStatusEnum = pgEnum('upload_status', ['pending', 'processing', 'chunking', 'embedding', 'completed', 'failed']);
export const accessLevelEnum = pgEnum('access_level', ['view', 'contribute', 'admin']);

// ========================================
// Table Definitions
// ========================================

export const bookmarks = pgTable("bookmarks", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	protocolNumber: varchar("protocol_number", { length: 50 }).notNull(),
	protocolTitle: varchar("protocol_title", { length: 255 }).notNull(),
	section: varchar("section", { length: 255 }),
	content: text("content").notNull(),
	agencyId: integer("agency_id"),
	agencyName: varchar("agency_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const contactSubmissions = pgTable("contact_submissions", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 320 }).notNull(),
	message: text("message").notNull(),
	status: contactStatusEnum("status").default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const counties = pgTable("counties", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	state: varchar("state", { length: 64 }).notNull(),
	usesStateProtocols: boolean("uses_state_protocols").notNull(),
	protocolVersion: varchar("protocol_version", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_counties_state").on(table.state),
]);

export const feedback = pgTable("feedback", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	category: feedbackCategoryEnum("category").notNull(),
	protocolRef: varchar("protocol_ref", { length: 255 }),
	countyId: integer("county_id"),
	subject: varchar("subject", { length: 255 }).notNull(),
	message: text("message").notNull(),
	status: feedbackStatusEnum("status").default('pending').notNull(),
	adminNotes: text("admin_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

/**
 * Integration access logs for partner analytics
 *
 * HIPAA COMPLIANCE (2026-01-23):
 * This table intentionally does NOT store PHI (Protected Health Information).
 * The following fields were REMOVED for HIPAA compliance:
 * - userAge: Patient age constitutes PHI when combined with timestamps
 * - impression: Clinical impression codes are medical PHI
 *
 * DO NOT re-add any patient-identifying fields to this table.
 * See migration: 0012_remove_phi_from_integration_logs.sql
 */
export const integrationLogs = pgTable("integration_logs", {
	id: serial("id").primaryKey(),
	partner: integrationPartnerEnum("partner").notNull(),
	agencyId: varchar("agency_id", { length: 100 }),
	agencyName: varchar("agency_name", { length: 255 }),
	searchTerm: varchar("search_term", { length: 500 }),
	// HIPAA: PHI columns removed - DO NOT ADD userAge or impression
	responseTimeMs: integer("response_time_ms"),
	resultCount: integer("result_count"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_integration_logs_partner").on(table.partner),
	index("idx_integration_logs_created_at").on(table.createdAt),
	index("idx_integration_logs_agency_id").on(table.agencyId),
]);

export const protocolChunks = pgTable("protocol_chunks", {
	id: serial("id").primaryKey(),
	countyId: integer("county_id").notNull(),
	protocolNumber: varchar("protocol_number", { length: 50 }).notNull(),
	protocolTitle: varchar("protocol_title", { length: 255 }).notNull(),
	section: varchar("section", { length: 255 }),
	content: text("content").notNull(),
	sourcePdfUrl: varchar("source_pdf_url", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	protocolEffectiveDate: varchar("protocol_effective_date", { length: 20 }),
	lastVerifiedAt: timestamp("last_verified_at", { mode: 'string' }),
	protocolYear: integer("protocol_year"),
},
(table) => [
	index("idx_protocols_county").on(table.countyId),
	index("idx_protocols_section").on(table.section),
	index("idx_protocols_number").on(table.protocolNumber),
	index("idx_protocols_year").on(table.protocolYear),
]);

export const queries = pgTable("queries", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	countyId: integer("county_id").notNull(),
	queryText: text("query_text").notNull(),
	responseText: text("response_text"),
	protocolRefs: json("protocol_refs"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// Note: This maps to the manus_users table in production Supabase
export const users = pgTable("manus_users", {
	id: serial("id").primaryKey(),
	authId: uuid("auth_id"), // Supabase auth.users.id
	openId: text("manus_open_id"), // Legacy Manus OAuth ID
	name: text("name"),
	email: text("email"),
	loginMethod: text("login_method"),
	role: text("role").default('user'),
	createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).defaultNow(),
	lastSignedIn: timestamp("last_signed_in", { mode: 'string', withTimezone: true }),
	tier: text("tier").default('free'),
	queryCountToday: integer("query_count_today").default(0),
	lastQueryDate: date("last_query_date"),
	selectedAgencyId: integer("selected_agency_id"),
	stripeCustomerId: text("stripe_customer_id"),
	subscriptionId: text("subscription_id"),
	subscriptionStatus: text("subscription_status"),
	subscriptionEndDate: timestamp("subscription_end_date", { mode: 'string', withTimezone: true }),
});

// ========================================
// Tables added for server/db.ts imports
// ========================================

export const auditLogs = pgTable("audit_logs", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	action: varchar("action", { length: 50 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: varchar("entity_id", { length: 100 }),
	metadata: json("metadata"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_audit_logs_user").on(table.userId),
	index("idx_audit_logs_action").on(table.action),
	index("idx_audit_logs_created").on(table.createdAt),
]);

export const userAuthProviders = pgTable("user_auth_providers", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	provider: varchar("provider", { length: 50 }).notNull(),
	providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_auth_providers_user").on(table.userId),
	index("idx_auth_providers_provider").on(table.provider, table.providerUserId),
]);

export const agencies = pgTable("agencies", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 100 }).notNull(),
	stateCode: varchar("state_code", { length: 2 }).notNull(),
	state: varchar("state", { length: 2 }),
	county: varchar("county", { length: 100 }),
	agencyType: agencyTypeEnum("agency_type"),
	logoUrl: varchar("logo_url", { length: 500 }),
	contactEmail: varchar("contact_email", { length: 320 }),
	contactPhone: varchar("contact_phone", { length: 20 }),
	address: text("address"),
	supabaseAgencyId: integer("supabase_agency_id"),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	subscriptionTier: subscriptionTierEnum("subscription_tier").default('starter'),
	subscriptionStatus: varchar("subscription_status", { length: 50 }),
	settings: json("settings"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_agencies_slug").on(table.slug),
	index("idx_agencies_state").on(table.state),
	index("idx_agencies_state_code").on(table.stateCode),
]);

export const agencyMembers = pgTable("agency_members", {
	id: serial("id").primaryKey(),
	agencyId: integer("agency_id").notNull(),
	userId: integer("user_id").notNull(),
	role: memberRoleEnum("role").notNull().default('member'),
	invitedBy: integer("invited_by"),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	status: memberStatusEnum("status").default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_agency_members_agency").on(table.agencyId),
	index("idx_agency_members_user").on(table.userId),
]);

export const protocolVersions = pgTable("protocol_versions", {
	id: serial("id").primaryKey(),
	agencyId: integer("agency_id").notNull(),
	protocolNumber: varchar("protocol_number", { length: 50 }).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	version: varchar("version", { length: 20 }).notNull(),
	status: protocolStatusEnum("status").notNull().default('draft'),
	sourceFileUrl: varchar("source_file_url", { length: 500 }),
	effectiveDate: timestamp("effective_date", { mode: 'string' }),
	expiresDate: timestamp("expires_date", { mode: 'string' }),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	publishedBy: integer("published_by"),
	chunksGenerated: integer("chunks_generated").default(0),
	metadata: json("metadata"),
	changeLog: text("change_log"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: integer("created_by").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_protocol_versions_agency").on(table.agencyId),
	index("idx_protocol_versions_status").on(table.status),
]);

export const protocolUploads = pgTable("protocol_uploads", {
	id: serial("id").primaryKey(),
	agencyId: integer("agency_id").notNull(),
	userId: integer("user_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 500 }).notNull(),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	status: uploadStatusEnum("status").default('pending'),
	progress: integer("progress").default(0),
	chunksCreated: integer("chunks_created").default(0),
	errorMessage: text("error_message"),
	processingStartedAt: timestamp("processing_started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_protocol_uploads_agency").on(table.agencyId),
	index("idx_protocol_uploads_user").on(table.userId),
]);

export const userCounties = pgTable("user_counties", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	countyId: integer("county_id").notNull(),
	isPrimary: boolean("is_primary").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_user_counties_user").on(table.userId),
	index("idx_user_counties_county").on(table.countyId),
]);

export const userStates = pgTable("user_states", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	stateCode: varchar("state_code", { length: 2 }).notNull(),
	accessLevel: accessLevelEnum("access_level").default('view'),
	subscribedAt: timestamp("subscribed_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
},
(table) => [
	index("idx_user_states_user").on(table.userId),
	index("idx_user_states_state").on(table.stateCode),
]);

export const userAgencies = pgTable("user_agencies", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	agencyId: integer("agency_id").notNull(),
	accessLevel: accessLevelEnum("access_level").default('view'),
	isPrimary: boolean("is_primary").default(false),
	role: varchar("role", { length: 100 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	subscribedAt: timestamp("subscribed_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
},
(table) => [
	index("idx_user_agencies_user").on(table.userId),
	index("idx_user_agencies_agency").on(table.agencyId),
]);

export const searchHistory = pgTable("search_history", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	countyId: integer("county_id"),
	searchQuery: text("search_query").notNull(),
	resultsCount: integer("results_count"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_search_history_user").on(table.userId),
	index("idx_search_history_created").on(table.createdAt),
]);

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
	id: serial("id").primaryKey(),
	eventId: varchar("event_id", { length: 255 }).notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	payload: json("payload"),
	processed: boolean("processed").default(false),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	error: text("error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_stripe_events_id").on(table.eventId),
	index("idx_stripe_events_type").on(table.eventType),
	index("idx_stripe_events_processed").on(table.processed),
]);

export const pushTokens = pgTable("push_tokens", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	token: text("token").notNull(),
	platform: varchar("platform", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("push_tokens_user_idx").on(table.userId),
]);

// ========================================
// Type exports
// ========================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "view"
  | "search"
  | "FEEDBACK_STATUS_CHANGED"
  | "USER_ROLE_CHANGED"
  | "CONTACT_STATUS_CHANGED"
  | "PROTOCOL_MODIFIED";

export type UserAuthProvider = typeof userAuthProviders.$inferSelect;
export type InsertUserAuthProvider = typeof userAuthProviders.$inferInsert;

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

export type AgencyMember = typeof agencyMembers.$inferSelect;
export type InsertAgencyMember = typeof agencyMembers.$inferInsert;

export type ProtocolVersion = typeof protocolVersions.$inferSelect;
export type InsertProtocolVersion = typeof protocolVersions.$inferInsert;

export type ProtocolUpload = typeof protocolUploads.$inferSelect;
export type InsertProtocolUpload = typeof protocolUploads.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

export type County = typeof counties.$inferSelect;
export type InsertCounty = typeof counties.$inferInsert;

export type ProtocolChunk = typeof protocolChunks.$inferSelect;
export type InsertProtocolChunk = typeof protocolChunks.$inferInsert;

export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;

export type UserCounty = typeof userCounties.$inferSelect;
export type InsertUserCounty = typeof userCounties.$inferInsert;

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type InsertStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

export const dripEmailsSent = pgTable("drip_emails_sent", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	emailType: varchar("email_type", { length: 50 }).notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("drip_emails_user_idx").on(table.userId),
	index("drip_emails_type_idx").on(table.emailType),
]);

export type DripEmailSent = typeof dripEmailsSent.$inferSelect;
export type InsertDripEmailSent = typeof dripEmailsSent.$inferInsert;

// Re-export shared types for convenience
export type {
  ContactStatus,
  FeedbackCategory,
  FeedbackStatus,
  IntegrationPartner,
  UserRole,
  UserTier,
  AgencyType,
  SubscriptionTier,
  MemberRole,
  MemberStatus,
  ProtocolStatus,
  UploadStatus,
  AccessLevel,
} from "./shared-types";
