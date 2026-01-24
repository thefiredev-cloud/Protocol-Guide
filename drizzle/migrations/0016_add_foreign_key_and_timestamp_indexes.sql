-- Migration: Add Foreign Key and Timestamp Indexes
-- Created: 2026-01-23
-- Purpose: Add missing indexes for foreign keys, timestamp columns, and frequently queried fields
-- Focus: Optimize JOIN operations, WHERE clauses, and ORDER BY queries

-- ============================================
-- BOOKMARKS TABLE
-- ============================================
-- Index for agency bookmarks (JOIN and filtering)
CREATE INDEX IF NOT EXISTS idx_bookmarks_agency ON bookmarks(agencyId);

-- ============================================
-- FEEDBACK TABLE
-- ============================================
-- Index for sorting by last updated (admin dashboard sorting)
CREATE INDEX IF NOT EXISTS idx_feedback_updated ON feedback(updatedAt DESC);

-- Composite index for user feedback timeline
CREATE INDEX IF NOT EXISTS idx_feedback_user_updated ON feedback(userId, updatedAt DESC);

-- ============================================
-- PROTOCOL CHUNKS TABLE
-- ============================================
-- Index for finding stale/unverified protocols (data quality queries)
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_verified ON protocolChunks(lastVerifiedAt);

-- Composite index for county + verification status
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_county_verified ON protocolChunks(countyId, lastVerifiedAt);

-- ============================================
-- QUERIES TABLE
-- ============================================
-- Index for global query timeline (analytics)
CREATE INDEX IF NOT EXISTS idx_queries_created ON queries(createdAt DESC);

-- Composite index for county-based query analysis
CREATE INDEX IF NOT EXISTS idx_queries_county_created ON queries(countyId, createdAt DESC);

-- ============================================
-- USERS TABLE
-- ============================================
-- Foreign key indexes for county relationships
CREATE INDEX IF NOT EXISTS idx_users_selected_county ON users(selectedCountyId);
CREATE INDEX IF NOT EXISTS idx_users_home_county ON users(homeCountyId);

-- Index for email lookups (user search, forgot password)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Composite index for tier + subscription status (billing queries)
CREATE INDEX IF NOT EXISTS idx_users_tier_subscription ON users(tier, subscriptionStatus);

-- Index for subscription end date (expiration notifications)
CREATE INDEX IF NOT EXISTS idx_users_subscription_end ON users(subscriptionEndDate);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
-- Composite index for entity-specific audit lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entityType, entityId);

-- Composite index for user + action timeline
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(userId, action, createdAt DESC);

-- Index for IP-based security analysis
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ipAddress);

-- ============================================
-- USER AUTH PROVIDERS TABLE
-- ============================================
-- Index for token expiration cleanup jobs
CREATE INDEX IF NOT EXISTS idx_auth_providers_expires ON userAuthProviders(expiresAt);

-- Composite index for user + expiration (token validation)
CREATE INDEX IF NOT EXISTS idx_auth_providers_user_expires ON userAuthProviders(userId, expiresAt);

-- ============================================
-- AGENCIES TABLE
-- ============================================
-- Index for sorting by last updated
CREATE INDEX IF NOT EXISTS idx_agencies_updated ON agencies(updatedAt DESC);

-- Index for county-based agency filtering
CREATE INDEX IF NOT EXISTS idx_agencies_county ON agencies(county);

-- Composite index for state + county lookups
CREATE INDEX IF NOT EXISTS idx_agencies_state_county ON agencies(state, county);

-- ============================================
-- AGENCY MEMBERS TABLE
-- ============================================
-- Foreign key index for invited by user (audit trail)
CREATE INDEX IF NOT EXISTS idx_agency_members_inviter ON agencyMembers(invitedBy);

-- Index for invitation timestamp (pending invitations)
CREATE INDEX IF NOT EXISTS idx_agency_members_invited ON agencyMembers(invitedAt);

-- Index for join timestamp (member activity tracking)
CREATE INDEX IF NOT EXISTS idx_agency_members_joined ON agencyMembers(joinedAt);

-- Composite index for agency + role (permission checks)
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_role ON agencyMembers(agencyId, role);

-- Composite index for pending invitations by agency
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_invited ON agencyMembers(agencyId, invitedAt DESC);

-- ============================================
-- PROTOCOL VERSIONS TABLE
-- ============================================
-- Foreign key index for published by user
CREATE INDEX IF NOT EXISTS idx_protocol_versions_publisher ON protocolVersions(publishedBy);

-- Index for published timestamp (chronological listing)
CREATE INDEX IF NOT EXISTS idx_protocol_versions_published ON protocolVersions(publishedAt DESC);

-- Composite index for agency + published date
CREATE INDEX IF NOT EXISTS idx_protocol_versions_agency_published ON protocolVersions(agencyId, publishedAt DESC);

-- Index for version updates
CREATE INDEX IF NOT EXISTS idx_protocol_versions_updated ON protocolVersions(updatedAt DESC);

-- ============================================
-- PROTOCOL UPLOADS TABLE
-- ============================================
-- Index for upload timestamp (chronological sorting)
CREATE INDEX IF NOT EXISTS idx_protocol_uploads_created ON protocolUploads(createdAt DESC);

-- Composite index for version + creation (version history)
CREATE INDEX IF NOT EXISTS idx_protocol_uploads_version_created ON protocolUploads(versionId, createdAt DESC);

-- ============================================
-- USER COUNTIES TABLE
-- ============================================
-- Composite index for primary county lookups
CREATE INDEX IF NOT EXISTS idx_user_counties_user_primary ON userCounties(userId, isPrimary);

-- Composite index for county + primary status
CREATE INDEX IF NOT EXISTS idx_user_counties_county_primary ON userCounties(countyId, isPrimary);

-- ============================================
-- SEARCH HISTORY TABLE
-- ============================================
-- Foreign key index for county (filter by county)
CREATE INDEX IF NOT EXISTS idx_search_history_county ON search_history(countyId);

-- Composite index for user + county search history
CREATE INDEX IF NOT EXISTS idx_search_history_user_county ON search_history(userId, countyId, createdAt DESC);

-- Index for results count analysis (zero-result searches)
CREATE INDEX IF NOT EXISTS idx_search_history_results ON search_history(resultsCount);

-- ============================================
-- STRIPE WEBHOOK EVENTS TABLE
-- ============================================
-- Index for event creation timeline
CREATE INDEX IF NOT EXISTS idx_stripe_events_created ON stripeWebhookEvents(createdAt DESC);

-- Index for processing timestamp (processing queue)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripeWebhookEvents(processedAt DESC);

-- Composite index for unprocessed events
CREATE INDEX IF NOT EXISTS idx_stripe_events_pending ON stripeWebhookEvents(processed, createdAt);

-- ============================================
-- INTEGRATION LOGS TABLE
-- ============================================
-- Note: Already has indexes from schema definition:
-- - idx_integration_logs_partner
-- - idx_integration_logs_created_at
-- - idx_integration_logs_agency_id

-- Composite index for partner analytics with date range
CREATE INDEX IF NOT EXISTS idx_integration_logs_partner_agency ON integrationLogs(partner, agencyId, createdAt DESC);

-- Index for response time analysis (performance monitoring)
CREATE INDEX IF NOT EXISTS idx_integration_logs_response_time ON integrationLogs(responseTimeMs);

-- ============================================
-- COUNTIES TABLE
-- ============================================
-- Index for protocol version filtering
CREATE INDEX IF NOT EXISTS idx_counties_version ON counties(protocolVersion);

-- Composite index for state + protocol usage
CREATE INDEX IF NOT EXISTS idx_counties_state_uses_protocols ON counties(state, usesStateProtocols);

-- ============================================
-- CONTACT SUBMISSIONS TABLE
-- ============================================
-- Index for email-based search
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contactSubmissions(email);

-- ============================================
-- PERFORMANCE NOTES
-- ============================================
-- These indexes optimize:
-- 1. Foreign key JOINs (userId, agencyId, countyId, etc.)
-- 2. Timestamp-based WHERE clauses (createdAt, updatedAt, lastVerifiedAt)
-- 3. Composite queries (user + county, agency + status, etc.)
-- 4. Sorting operations (ORDER BY timestamp DESC)
-- 5. Filtered lookups (status + timestamp, tier + subscription)
-- 6. Cleanup jobs (token expiration, webhook processing)
--
-- Index Cardinality Guidelines:
-- - High cardinality first in composite indexes (userId, agencyId)
-- - Low cardinality last (status, tier, role)
-- - Timestamp DESC for chronological queries
--
-- Maintenance:
-- - Monitor index usage with: SHOW INDEX FROM table_name;
-- - Check query performance with: EXPLAIN SELECT ...
-- - Drop unused indexes if needed to reduce write overhead
