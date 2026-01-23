-- Migration: Add Missing Database Indexes
-- Created: 2026-01-23
-- Purpose: Add indexes for commonly queried columns to improve query performance
-- Focus: User lookups, analytics queries, admin operations, and session analysis

-- ============================================
-- FEEDBACK TABLE INDEXES
-- ============================================
-- Index for user feedback lookups (user dashboard, feedback history)
CREATE INDEX idx_feedback_user ON feedback(userId);

-- Index for admin feedback filtering by status
CREATE INDEX idx_feedback_status ON feedback(status);

-- Composite index for feedback timeline queries (recent feedback by status)
CREATE INDEX idx_feedback_status_created ON feedback(status, createdAt DESC);

-- Index for county-specific feedback
CREATE INDEX idx_feedback_county ON feedback(countyId);

-- ============================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================
-- Index for admin action history lookups
CREATE INDEX idx_audit_user ON audit_logs(userId);

-- Index for filtering by action type
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Composite index for audit log timeline (recent actions by user)
CREATE INDEX idx_audit_user_created ON audit_logs(userId, createdAt DESC);

-- Index for finding actions on specific entity types
CREATE INDEX idx_audit_target ON audit_logs(targetType, targetId);

-- ============================================
-- USER COUNTIES TABLE INDEXES
-- ============================================
-- Index for user county lookups (user profile, saved agencies)
CREATE INDEX idx_user_counties_user ON user_counties(userId);

-- Index for finding all users of a county
CREATE INDEX idx_user_counties_county ON user_counties(countyId);

-- Composite index for primary county lookups
CREATE INDEX idx_user_counties_primary ON user_counties(userId, isPrimary);

-- ============================================
-- USER AUTH PROVIDERS TABLE INDEXES
-- ============================================
-- Index for user OAuth provider lookups
CREATE INDEX idx_auth_providers_user ON user_auth_providers(userId);

-- Composite unique index for OAuth provider lookups (prevent duplicate accounts)
CREATE INDEX idx_auth_providers_lookup ON user_auth_providers(provider, providerUserId);

-- ============================================
-- CONTACT SUBMISSIONS TABLE INDEXES
-- ============================================
-- Index for admin filtering by status
CREATE INDEX idx_contact_status ON contact_submissions(status);

-- Composite index for recent submissions by status
CREATE INDEX idx_contact_status_created ON contact_submissions(status, createdAt DESC);

-- ============================================
-- STRIPE WEBHOOK EVENTS TABLE INDEXES
-- ============================================
-- Index for filtering webhook events by type (already has unique on eventId)
CREATE INDEX idx_stripe_event_type ON stripe_webhook_events(eventType);

-- Index for webhook processing timeline
CREATE INDEX idx_stripe_processed ON stripe_webhook_events(processedAt DESC);

-- ============================================
-- PROTOCOL CHUNKS TABLE INDEXES
-- ============================================
-- Index for protocol number lookups (protocol detail pages, cross-references)
CREATE INDEX idx_protocol_chunks_number ON protocolChunks(protocolNumber);

-- Composite index for county + protocol lookups
CREATE INDEX idx_protocol_chunks_county_number ON protocolChunks(countyId, protocolNumber);

-- Index for finding protocols by year
CREATE INDEX idx_protocol_chunks_year ON protocolChunks(protocolYear);

-- ============================================
-- PROTOCOL ACCESS LOGS (ANALYTICS)
-- ============================================
-- Index for agency-specific analytics
CREATE INDEX idx_protocol_access_agency ON protocol_access_logs(agencyId);

-- Index for protocol number analytics (popular protocols)
CREATE INDEX idx_protocol_access_number ON protocol_access_logs(protocolNumber);

-- Composite index for session-based analysis
CREATE INDEX idx_protocol_access_session ON protocol_access_logs(sessionId, timestamp);

-- ============================================
-- SEARCH ANALYTICS TABLE
-- ============================================
-- Index for agency-specific search analytics
CREATE INDEX idx_search_agency ON search_analytics(agencyId);

-- Composite index for session search analysis
CREATE INDEX idx_search_session ON search_analytics(sessionId, timestamp);

-- Index for search method analysis (text vs voice)
CREATE INDEX idx_search_method ON search_analytics(searchMethod);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
-- Composite index for user event type queries
CREATE INDEX idx_events_user_type ON analytics_events(userId, eventType, timestamp);

-- Index for device type analytics
CREATE INDEX idx_events_device ON analytics_events(deviceType);

-- ============================================
-- SESSION ANALYTICS TABLE
-- ============================================
-- Index for tier-based analytics (free vs pro behavior)
CREATE INDEX idx_session_tier ON session_analytics(userTier);

-- Index for device type session analytics
CREATE INDEX idx_session_device ON session_analytics(deviceType);

-- Composite index for new user analysis
CREATE INDEX idx_session_new_user ON session_analytics(isNewUser, startTime);

-- ============================================
-- CONVERSION EVENTS TABLE
-- ============================================
-- Index for conversion completion tracking
CREATE INDEX idx_conversion_completed ON conversion_events(completed, timestamp);

-- Index for Stripe session lookups
CREATE INDEX idx_conversion_stripe ON conversion_events(stripeSessionId);

-- ============================================
-- AGENCY TABLES INDEXES
-- ============================================
-- Index for agency slug lookups (public agency pages)
CREATE INDEX idx_agencies_slug ON agencies(slug);

-- Index for state-based agency filtering
CREATE INDEX idx_agencies_state ON agencies(stateCode);

-- Index for subscription status filtering
CREATE INDEX idx_agencies_subscription ON agencies(subscriptionStatus);

-- Index for agency invitation token lookups
CREATE INDEX idx_invitations_token ON agency_invitations(token);

-- Index for finding invitations by email
CREATE INDEX idx_invitations_email ON agency_invitations(email);

-- Composite index for pending invitations by agency
CREATE INDEX idx_invitations_agency ON agency_invitations(agencyId, acceptedAt);

-- ============================================
-- PROTOCOL VERSIONS TABLE INDEXES
-- ============================================
-- Index for agency protocol lookups
CREATE INDEX idx_protocol_versions_agency ON protocol_versions(agencyId);

-- Index for protocol status filtering (draft, published, etc.)
CREATE INDEX idx_protocol_versions_status ON protocol_versions(status);

-- Composite index for published protocols by agency
CREATE INDEX idx_protocol_versions_published ON protocol_versions(agencyId, status, publishedAt);

-- Index for protocol number lookups
CREATE INDEX idx_protocol_versions_number ON protocol_versions(protocolNumber);

-- ============================================
-- PROTOCOL UPLOADS TABLE INDEXES
-- ============================================
-- Index for agency upload history
CREATE INDEX idx_uploads_agency ON protocol_uploads(agencyId);

-- Index for user upload history
CREATE INDEX idx_uploads_user ON protocol_uploads(userId);

-- Index for upload status filtering
CREATE INDEX idx_uploads_status ON protocol_uploads(status);

-- Composite index for recent uploads by status
CREATE INDEX idx_uploads_status_created ON protocol_uploads(status, createdAt DESC);

-- ============================================
-- USER STATES TABLE INDEXES
-- ============================================
-- Index for user state subscriptions
CREATE INDEX idx_user_states_user ON user_states(userId);

-- Index for state code lookups
CREATE INDEX idx_user_states_state ON user_states(stateCode);

-- ============================================
-- USER AGENCIES TABLE INDEXES
-- ============================================
-- Index for user agency subscriptions
CREATE INDEX idx_user_agencies_user ON user_agencies(userId);

-- Index for agency member lookups
CREATE INDEX idx_user_agencies_agency ON user_agencies(agencyId);

-- Composite index for primary agency lookups
CREATE INDEX idx_user_agencies_primary ON user_agencies(userId, isPrimary);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================
-- Index for Stripe customer lookups
CREATE INDEX idx_users_stripe ON users(stripeCustomerId);

-- Index for subscription status filtering
CREATE INDEX idx_users_subscription ON users(subscriptionStatus);

-- Index for tier-based filtering
CREATE INDEX idx_users_tier ON users(tier);

-- Index for last sign-in activity
CREATE INDEX idx_users_last_signin ON users(lastSignedIn DESC);
