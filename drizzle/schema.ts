import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, longtext, json, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const bookmarks = mysqlTable("bookmarks", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	protocolNumber: varchar({ length: 50 }).notNull(),
	protocolTitle: varchar({ length: 255 }).notNull(),
	section: varchar({ length: 255 }),
	content: text().notNull(),
	agencyId: int(),
	agencyName: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const contactSubmissions = mysqlTable("contact_submissions", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','reviewed','resolved']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const counties = mysqlTable("counties", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	state: varchar({ length: 64 }).notNull(),
	usesStateProtocols: tinyint().notNull(),
	protocolVersion: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_counties_state").on(table.state),
]);

export const feedback = mysqlTable("feedback", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	category: mysqlEnum(['error','suggestion','general']).notNull(),
	protocolRef: varchar({ length: 255 }),
	countyId: int(),
	subject: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','reviewed','resolved','dismissed']).default('pending').notNull(),
	adminNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
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
export const integrationLogs = mysqlTable("integration_logs", {
	id: int().autoincrement().notNull(),
	partner: mysqlEnum(['imagetrend','esos','zoll','emscloud','none']).notNull(),
	agencyId: varchar({ length: 100 }),
	agencyName: varchar({ length: 255 }),
	searchTerm: varchar({ length: 500 }),
	// HIPAA: PHI columns removed - DO NOT ADD userAge or impression
	responseTimeMs: int(),
	resultCount: int(),
	ipAddress: varchar({ length: 45 }),
	userAgent: varchar({ length: 500 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_integration_logs_partner").on(table.partner),
	index("idx_integration_logs_created_at").on(table.createdAt),
	index("idx_integration_logs_agency_id").on(table.agencyId),
]);

export const protocolChunks = mysqlTable("protocolChunks", {
	id: int().autoincrement().notNull(),
	countyId: int().notNull(),
	protocolNumber: varchar({ length: 50 }).notNull(),
	protocolTitle: varchar({ length: 255 }).notNull(),
	section: varchar({ length: 255 }),
	content: longtext().notNull(),
	sourcePdfUrl: varchar({ length: 500 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	protocolEffectiveDate: varchar({ length: 20 }),
	lastVerifiedAt: timestamp({ mode: 'string' }),
	protocolYear: int(),
},
(table) => [
	index("idx_protocols_county").on(table.countyId),
	index("idx_protocols_section").on(table.section),
	index("idx_protocols_number").on(table.protocolNumber),
	index("idx_protocols_year").on(table.protocolYear),
]);

export const queries = mysqlTable("queries", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	countyId: int().notNull(),
	queryText: text().notNull(),
	responseText: text(),
	protocolRefs: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	tier: mysqlEnum(['free','pro','enterprise']).default('free').notNull(),
	queryCountToday: int().notNull(),
	lastQueryDate: varchar({ length: 10 }),
	selectedCountyId: int(),
	stripeCustomerId: varchar({ length: 255 }),
	subscriptionId: varchar({ length: 255 }),
	subscriptionStatus: varchar({ length: 50 }),
	subscriptionEndDate: timestamp({ mode: 'string' }),
	homeCountyId: int(),
	supabaseId: varchar({ length: 36 }),
	disclaimerAcknowledgedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_supabaseId_unique").on(table.supabaseId),
	index("idx_users_disclaimer_acknowledged").on(table.disclaimerAcknowledgedAt),
]);

// ========================================
// Tables added for server/db.ts imports
// ========================================

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().notNull(),
	userId: int(),
	action: varchar({ length: 50 }).notNull(),
	entityType: varchar({ length: 50 }),
	entityId: varchar({ length: 100 }),
	metadata: json(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_audit_logs_user").on(table.userId),
	index("idx_audit_logs_action").on(table.action),
	index("idx_audit_logs_created").on(table.createdAt),
]);

export const userAuthProviders = mysqlTable("user_auth_providers", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	provider: varchar({ length: 50 }).notNull(),
	providerUserId: varchar({ length: 255 }).notNull(),
	accessToken: text(),
	refreshToken: text(),
	expiresAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_auth_providers_user").on(table.userId),
	index("idx_auth_providers_provider").on(table.provider, table.providerUserId),
]);

export const agencies = mysqlTable("agencies", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 2 }),
	county: varchar({ length: 100 }),
	logoUrl: text(),
	settings: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_agencies_slug").on(table.slug),
	index("idx_agencies_state").on(table.state),
]);

export const agencyMembers = mysqlTable("agency_members", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull(),
	userId: int().notNull(),
	role: varchar({ length: 50 }).notNull().default('member'),
	invitedBy: int(),
	invitedAt: timestamp({ mode: 'string' }),
	joinedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_agency_members_agency").on(table.agencyId),
	index("idx_agency_members_user").on(table.userId),
]);

export const protocolVersions = mysqlTable("protocol_versions", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull(),
	version: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 20 }).notNull().default('draft'),
	publishedAt: timestamp({ mode: 'string' }),
	publishedBy: int(),
	changeLog: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_protocol_versions_agency").on(table.agencyId),
	index("idx_protocol_versions_status").on(table.status),
]);

export const protocolUploads = mysqlTable("protocol_uploads", {
	id: int().autoincrement().notNull(),
	versionId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	uploadedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_protocol_uploads_version").on(table.versionId),
	index("idx_protocol_uploads_uploader").on(table.uploadedBy),
]);

// ========================================
// Type exports
// ========================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "view" | "search";

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
