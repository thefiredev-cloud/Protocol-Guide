import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, longtext, json, tinyint, foreignKey, unique, date, decimal, float } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

// =============================================================================
// CORE TABLES
// =============================================================================

export const users = mysqlTable("users", {
	id: int().autoincrement().primaryKey().notNull(),
	openId: varchar({ length: 64 }).notNull().unique(),
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
	selectedCountyId: int().references(() => counties.id, { onDelete: 'set null' }),
	stripeCustomerId: varchar({ length: 255 }),
	subscriptionId: varchar({ length: 255 }),
	subscriptionStatus: varchar({ length: 50 }),
	subscriptionEndDate: timestamp({ mode: 'string' }),
	homeCountyId: int().references(() => counties.id, { onDelete: 'set null' }),
	supabaseId: varchar({ length: 36 }).unique(),
	disclaimerAcknowledgedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_users_disclaimer_acknowledged").on(table.disclaimerAcknowledgedAt),
]);

export const counties = mysqlTable("counties", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	state: varchar({ length: 64 }).notNull(),
	usesStateProtocols: tinyint().notNull(),
	protocolVersion: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_counties_state").on(table.state),
]);

export const agencies = mysqlTable("agencies", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 100 }).notNull().unique(),
	state: varchar({ length: 2 }),
	county: varchar({ length: 100 }),
	logoUrl: text(),
	settings: json(),
	seatCount: int().default(1).notNull(),
	annualBilling: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_agencies_state").on(table.state),
]);

// =============================================================================
// USER-RELATED TABLES
// =============================================================================

export const bookmarks = mysqlTable("bookmarks", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	protocolNumber: varchar({ length: 50 }).notNull(),
	protocolTitle: varchar({ length: 255 }).notNull(),
	section: varchar({ length: 255 }),
	content: text().notNull(),
	agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
	agencyName: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const feedback = mysqlTable("feedback", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	category: mysqlEnum(['error','suggestion','general']).notNull(),
	protocolRef: varchar({ length: 255 }),
	countyId: int().references(() => counties.id, { onDelete: 'set null' }),
	subject: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','reviewed','resolved','dismissed']).default('pending').notNull(),
	adminNotes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const queries = mysqlTable("queries", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	countyId: int().notNull().references(() => counties.id, { onDelete: 'cascade' }),
	queryText: text().notNull(),
	responseText: text(),
	protocolRefs: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: 'set null' }),
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
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
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
	unique("unique_user_provider").on(table.userId, table.provider),
]);

export const userCounties = mysqlTable("user_counties", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	countyId: int().notNull().references(() => counties.id, { onDelete: 'cascade' }),
	isPrimary: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_counties_user").on(table.userId),
	index("idx_user_counties_county").on(table.countyId),
	unique("uniq_user_county").on(table.userId, table.countyId),
]);

export const searchHistory = mysqlTable("search_history", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	countyId: int().references(() => counties.id, { onDelete: 'set null' }),
	searchQuery: text().notNull(),
	resultsCount: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_search_history_user").on(table.userId),
	index("idx_search_history_created").on(table.createdAt),
]);

// =============================================================================
// PROTOCOL-RELATED TABLES
// =============================================================================

export const protocolChunks = mysqlTable("protocolChunks", {
	id: int().autoincrement().primaryKey().notNull(),
	countyId: int().notNull().references(() => counties.id, { onDelete: 'restrict' }),
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

export const protocolVersions = mysqlTable("protocol_versions", {
	id: int().autoincrement().primaryKey().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: 'cascade' }),
	version: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 20 }).notNull().default('draft'),
	publishedAt: timestamp({ mode: 'string' }),
	publishedBy: int().references(() => users.id, { onDelete: 'set null' }),
	changeLog: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_protocol_versions_agency").on(table.agencyId),
	index("idx_protocol_versions_status").on(table.status),
]);

export const protocolUploads = mysqlTable("protocol_uploads", {
	id: int().autoincrement().primaryKey().notNull(),
	versionId: int().notNull().references(() => protocolVersions.id, { onDelete: 'cascade' }),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	uploadedBy: int().notNull().references(() => users.id, { onDelete: 'restrict' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_protocol_uploads_version").on(table.versionId),
	index("idx_protocol_uploads_uploader").on(table.uploadedBy),
]);

// =============================================================================
// AGENCY-RELATED TABLES
// =============================================================================

export const agencyMembers = mysqlTable("agency_members", {
	id: int().autoincrement().primaryKey().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: 'cascade' }),
	userId: int().notNull().references(() => users.id, { onDelete: 'cascade' }),
	role: varchar({ length: 50 }).notNull().default('member'),
	invitedBy: int().references(() => users.id, { onDelete: 'set null' }),
	invitedAt: timestamp({ mode: 'string' }),
	joinedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_agency_members_agency").on(table.agencyId),
	index("idx_agency_members_user").on(table.userId),
	unique("unique_agency_user").on(table.agencyId, table.userId),
]);

// =============================================================================
// CONTACT & FEEDBACK
// =============================================================================

export const contactSubmissions = mysqlTable("contact_submissions", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','reviewed','resolved']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// =============================================================================
// INTEGRATION & EXTERNAL LOGS
// =============================================================================

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
	id: int().autoincrement().primaryKey().notNull(),
	partner: mysqlEnum(['imagetrend','esos','zoll','emscloud','none']).notNull(),
	agencyId: varchar({ length: 100 }),
	internalAgencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
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
	index("idx_integration_logs_internal_agency").on(table.internalAgencyId),
]);

export const stripeWebhookEvents = mysqlTable("stripe_webhook_events", {
	id: int().autoincrement().primaryKey().notNull(),
	eventId: varchar({ length: 255 }).notNull().unique(),
	eventType: varchar({ length: 100 }).notNull(),
	payload: json(),
	processed: tinyint().default(0),
	processedAt: timestamp({ mode: 'string' }),
	error: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_stripe_events_type").on(table.eventType),
	index("idx_stripe_events_processed").on(table.processed),
]);

// =============================================================================
// ANALYTICS TABLES
// =============================================================================

export const analyticsEvents = mysqlTable("analytics_events", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: 'set null' }),
	sessionId: varchar({ length: 64 }).notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	eventName: varchar({ length: 100 }).notNull(),
	properties: json(),
	deviceType: varchar({ length: 20 }),
	appVersion: varchar({ length: 20 }),
	osVersion: varchar({ length: 20 }),
	screenName: varchar({ length: 100 }),
	referrer: varchar({ length: 255 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: varchar({ length: 500 }),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_event_type").on(table.eventType),
	index("idx_user_id").on(table.userId),
	index("idx_timestamp").on(table.timestamp),
	index("idx_session").on(table.sessionId),
]);

export const conversionEvents = mysqlTable("conversion_events", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: 'restrict' }),
	sessionId: varchar({ length: 64 }),
	eventType: varchar({ length: 50 }).notNull(),
	fromTier: varchar({ length: 20 }),
	toTier: varchar({ length: 20 }),
	plan: varchar({ length: 20 }),
	promptLocation: varchar({ length: 100 }),
	triggerFeature: varchar({ length: 100 }),
	amount: decimal({ precision: 10, scale: 2 }),
	currency: varchar({ length: 3 }).default('USD'),
	stripeSessionId: varchar({ length: 255 }),
	completed: tinyint().default(0),
	completedAt: timestamp({ mode: 'string' }),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_conversion").on(table.userId),
	index("idx_event_type").on(table.eventType),
	index("idx_timestamp").on(table.timestamp),
]);

export const protocolAccessLogs = mysqlTable("protocol_access_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: 'set null' }),
	sessionId: varchar({ length: 64 }),
	protocolChunkId: int().notNull().references(() => protocolChunks.id, { onDelete: 'cascade' }),
	protocolNumber: varchar({ length: 50 }),
	protocolTitle: varchar({ length: 255 }),
	agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
	stateCode: varchar({ length: 2 }),
	accessSource: varchar({ length: 50 }),
	timeSpentSeconds: int(),
	scrollDepth: float(),
	copiedContent: tinyint().default(0),
	sharedProtocol: tinyint().default(0),
	fromSearchQuery: varchar({ length: 500 }),
	searchResultRank: int(),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_protocol").on(table.protocolChunkId),
	index("idx_user_access").on(table.userId, table.timestamp),
	index("idx_state").on(table.stateCode),
	index("idx_source").on(table.accessSource),
]);

export const searchAnalytics = mysqlTable("search_analytics", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: 'set null' }),
	sessionId: varchar({ length: 64 }).notNull(),
	queryText: varchar({ length: 500 }).notNull(),
	queryTokenCount: int(),
	stateFilter: varchar({ length: 2 }),
	agencyId: int().references(() => agencies.id, { onDelete: 'set null' }),
	resultsCount: int().notNull(),
	topResultProtocolId: int().references(() => protocolChunks.id, { onDelete: 'set null' }),
	topResultScore: float(),
	selectedResultRank: int(),
	selectedProtocolId: int().references(() => protocolChunks.id, { onDelete: 'set null' }),
	timeToFirstResult: int(),
	totalSearchTime: int(),
	searchMethod: varchar({ length: 20 }),
	isVoiceQuery: tinyint().default(0),
	voiceTranscriptionTime: int(),
	noResultsFound: tinyint().default(0),
	queryCategory: varchar({ length: 50 }),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_search").on(table.userId, table.timestamp),
	index("idx_no_results").on(table.noResultsFound, table.timestamp),
	index("idx_state").on(table.stateFilter),
	index("idx_category").on(table.queryCategory),
]);

export const sessionAnalytics = mysqlTable("session_analytics", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().references(() => users.id, { onDelete: 'set null' }),
	sessionId: varchar({ length: 64 }).notNull().unique(),
	deviceType: varchar({ length: 20 }),
	appVersion: varchar({ length: 20 }),
	platform: varchar({ length: 20 }),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	durationSeconds: int(),
	searchCount: int().default(0),
	protocolsViewed: int().default(0),
	queriesSubmitted: int().default(0),
	screenTransitions: int().default(0),
	isNewUser: tinyint().default(0),
	userTier: varchar({ length: 20 }),
	referralSource: varchar({ length: 100 }),
	entryScreen: varchar({ length: 100 }),
	exitScreen: varchar({ length: 100 }),
	userCertificationLevel: varchar({ length: 50 }),
},
(table) => [
	index("idx_user_session").on(table.userId),
	index("idx_start").on(table.startTime),
]);

export const contentGaps = mysqlTable("content_gaps", {
	id: int().autoincrement().primaryKey().notNull(),
	queryPattern: varchar({ length: 500 }).notNull(),
	occurrences: int().default(1),
	lastOccurred: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	firstOccurred: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	statesRequested: json(),
	suggestedCategory: varchar({ length: 50 }),
	priority: varchar({ length: 20 }).default('low'),
	status: varchar({ length: 20 }).default('open'),
	resolvedAt: timestamp({ mode: 'string' }),
	notes: text(),
},
(table) => [
	index("idx_occurrences").on(table.occurrences),
	index("idx_priority").on(table.priority),
	index("idx_status").on(table.status),
]);

export const dailyMetrics = mysqlTable("daily_metrics", {
	id: int().autoincrement().primaryKey().notNull(),
	date: date({ mode: 'string' }).notNull(),
	metricType: varchar({ length: 50 }).notNull(),
	dimension: varchar({ length: 100 }),
	dimensionValue: varchar({ length: 100 }),
	count: int().default(0),
	sumValue: decimal({ precision: 15, scale: 2 }),
	avgValue: decimal({ precision: 15, scale: 4 }),
	p50Value: decimal({ precision: 15, scale: 4 }),
	p95Value: decimal({ precision: 15, scale: 4 }),
	minValue: decimal({ precision: 15, scale: 4 }),
	maxValue: decimal({ precision: 15, scale: 4 }),
},
(table) => [
	index("idx_date").on(table.date),
	index("idx_metric").on(table.metricType),
	unique("unique_daily").on(table.date, table.metricType, table.dimension, table.dimensionValue),
]);

export const featureUsageStats = mysqlTable("feature_usage_stats", {
	id: int().autoincrement().primaryKey().notNull(),
	date: date({ mode: 'string' }).notNull(),
	featureName: varchar({ length: 100 }).notNull(),
	uniqueUsers: int().default(0),
	totalUsage: int().default(0),
	avgUsagePerUser: decimal({ precision: 10, scale: 2 }),
	tierBreakdown: json(),
	deviceBreakdown: json(),
},
(table) => [
	index("idx_feature").on(table.featureName),
	unique("unique_feature_date").on(table.date, table.featureName),
]);

export const retentionCohorts = mysqlTable("retention_cohorts", {
	id: int().autoincrement().primaryKey().notNull(),
	cohortDate: date({ mode: 'string' }).notNull(),
	cohortType: varchar({ length: 20 }).notNull(),
	cohortSize: int().notNull(),
	d1Retained: int(),
	d7Retained: int(),
	d14Retained: int(),
	d30Retained: int(),
	d60Retained: int(),
	d90Retained: int(),
	segment: varchar({ length: 50 }),
	acquisitionSource: varchar({ length: 100 }),
	calculatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_cohort_date").on(table.cohortDate),
	unique("unique_cohort").on(table.cohortDate, table.cohortType, table.segment),
]);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

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
