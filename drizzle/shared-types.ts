/**
 * Shared Types for Protocol Guide Database
 *
 * This file provides database-agnostic type definitions that work
 * with both PostgreSQL (Supabase - primary) and MySQL (TiDB - secondary).
 *
 * DATABASE ARCHITECTURE:
 * - PostgreSQL (Supabase): Primary runtime database for all operations
 * - MySQL (TiDB): Secondary, used only for legacy data imports
 *
 * @see /drizzle/schema.ts - PostgreSQL schema (SOURCE OF TRUTH)
 * @see /drizzle/analytics-schema.ts - PostgreSQL analytics tables
 * @see /drizzle/mysql-schema.ts - MySQL schema (sync target)
 */

// =============================================================================
// ENUM TYPES
// These must match the values defined in both database schemas
// =============================================================================

export type ContactStatus = 'pending' | 'reviewed' | 'resolved';

export type FeedbackCategory = 'error' | 'suggestion' | 'general';

export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export type IntegrationPartner = 'imagetrend' | 'esos' | 'zoll' | 'emscloud' | 'none';

export type UserRole = 'user' | 'admin';

export type UserTier = 'free' | 'pro' | 'enterprise';

export type AgencyType = 'fire_dept' | 'ems_agency' | 'hospital' | 'state_office' | 'regional_council';

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export type MemberRole = 'owner' | 'admin' | 'protocol_author' | 'member';

export type MemberStatus = 'pending' | 'active' | 'suspended';

export type ProtocolStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export type UploadStatus = 'pending' | 'processing' | 'chunking' | 'embedding' | 'completed' | 'failed';

export type AccessLevel = 'view' | 'contribute' | 'admin';

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export type EventType = 'search' | 'protocol' | 'user' | 'conversion' | 'feature' | 'error';

export type SearchMethod = 'text' | 'voice' | 'example_click';

export type AccessSource = 'search' | 'history' | 'bookmark' | 'deep_link' | 'integration';

export type QueryCategory =
  | 'cardiac'
  | 'respiratory'
  | 'trauma'
  | 'pediatric'
  | 'ob_gyn'
  | 'behavioral'
  | 'medical'
  | 'medication'
  | 'procedure'
  | 'other';

// =============================================================================
// AUDIT TYPES
// =============================================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'view'
  | 'search'
  | 'FEEDBACK_STATUS_CHANGED'
  | 'USER_ROLE_CHANGED'
  | 'CONTACT_STATUS_CHANGED'
  | 'PROTOCOL_MODIFIED';

// =============================================================================
// ENTITY INTERFACES
// These define the shape of data regardless of database
// =============================================================================

export interface IUser {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
  tier: UserTier;
  queryCountToday: number;
  lastQueryDate: string | null;
  selectedCountyId: number | null;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  homeCountyId: number | null;
  supabaseId: string | null;
  disclaimerAcknowledgedAt: string | null;
}

export interface ICounty {
  id: number;
  name: string;
  state: string;
  usesStateProtocols: boolean;
  protocolVersion: string | null;
  createdAt: string;
}

export interface IAgency {
  id: number;
  name: string;
  slug: string;
  stateCode: string;
  state: string | null;
  county: string | null;
  agencyType: AgencyType | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  supabaseAgencyId: number | null;
  stripeCustomerId: string | null;
  subscriptionTier: SubscriptionTier | null;
  subscriptionStatus: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProtocolChunk {
  id: number;
  countyId: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  sourcePdfUrl: string | null;
  createdAt: string;
  protocolEffectiveDate: string | null;
  lastVerifiedAt: string | null;
  protocolYear: number | null;
}

export interface IBookmark {
  id: number;
  userId: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  agencyId: number | null;
  agencyName: string | null;
  createdAt: string;
}

export interface IFeedback {
  id: number;
  userId: number;
  category: FeedbackCategory;
  protocolRef: string | null;
  countyId: number | null;
  subject: string;
  message: string;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IContactSubmission {
  id: number;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export interface IIntegrationLog {
  id: number;
  partner: IntegrationPartner;
  agencyId: string | null;
  agencyName: string | null;
  searchTerm: string | null;
  responseTimeMs: number | null;
  resultCount: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface IQuery {
  id: number;
  userId: number;
  countyId: number;
  queryText: string;
  responseText: string | null;
  protocolRefs: unknown | null;
  createdAt: string;
}

export interface IAuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ISearchHistory {
  id: number;
  userId: number;
  countyId: number | null;
  searchQuery: string;
  resultsCount: number | null;
  createdAt: string;
}

// =============================================================================
// ANALYTICS INTERFACES
// =============================================================================

export interface IAnalyticsEvent {
  id: number;
  userId: number | null;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, unknown> | null;
  deviceType: string | null;
  appVersion: string | null;
  osVersion: string | null;
  screenName: string | null;
  referrer: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface ISearchAnalytics {
  id: number;
  userId: number | null;
  sessionId: string;
  queryText: string;
  queryTokenCount: number | null;
  stateFilter: string | null;
  agencyId: number | null;
  resultsCount: number;
  topResultProtocolId: number | null;
  topResultScore: number | null;
  selectedResultRank: number | null;
  selectedProtocolId: number | null;
  timeToFirstResult: number | null;
  totalSearchTime: number | null;
  searchMethod: string | null;
  isVoiceQuery: boolean;
  voiceTranscriptionTime: number | null;
  noResultsFound: boolean;
  queryCategory: string | null;
  timestamp: string;
}

export interface ISessionAnalytics {
  id: number;
  userId: number | null;
  sessionId: string;
  deviceType: string | null;
  appVersion: string | null;
  platform: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  searchCount: number;
  protocolsViewed: number;
  queriesSubmitted: number;
  screenTransitions: number;
  isNewUser: boolean;
  userTier: string | null;
  referralSource: string | null;
  entryScreen: string | null;
  exitScreen: string | null;
  userCertificationLevel: string | null;
}

export interface IConversionEvent {
  id: number;
  userId: number;
  sessionId: string | null;
  eventType: string;
  fromTier: string | null;
  toTier: string | null;
  plan: string | null;
  promptLocation: string | null;
  triggerFeature: string | null;
  amount: string | null;
  currency: string;
  stripeSessionId: string | null;
  completed: boolean;
  completedAt: string | null;
  timestamp: string;
}

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

/**
 * Database configuration for the Protocol Guide application
 */
export const DATABASE_CONFIG = {
  /**
   * PostgreSQL (Supabase) - Primary runtime database
   * Used for: All CRUD operations, real-time queries, authentication
   */
  primary: {
    type: 'postgresql' as const,
    name: 'Supabase',
    features: ['pgvector', 'realtime', 'rls', 'auth'],
  },

  /**
   * MySQL (TiDB) - Secondary database for data imports
   * Used for: Legacy data migrations, batch imports, analytics backup
   */
  secondary: {
    type: 'mysql' as const,
    name: 'TiDB Cloud',
    features: ['fulltext-search', 'distributed'],
  },
} as const;

/**
 * Type mapping between PostgreSQL and MySQL
 * Use this when converting between database types
 */
export const TYPE_MAPPING = {
  // PostgreSQL -> MySQL
  pg_to_mysql: {
    serial: 'int().autoincrement()',
    boolean: 'tinyint()',
    numeric: 'decimal()',
    real: 'float()',
    text: 'text()',
    'timestamp with time zone': 'timestamp()',
  },
  // MySQL -> PostgreSQL
  mysql_to_pg: {
    'int().autoincrement()': 'serial',
    tinyint: 'boolean',
    decimal: 'numeric',
    float: 'real',
    longtext: 'text',
    timestamp: 'timestamp',
  },
} as const;
