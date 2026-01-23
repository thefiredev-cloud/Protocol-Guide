import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, longtext, json } from "drizzle-orm/mysql-core"
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
