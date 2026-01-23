-- Migration: Add Missing Indexes to Existing Tables
-- Created: 2026-01-23
-- Purpose: Add indexes for commonly queried columns on existing tables only
-- Tables: feedback, contact_submissions, protocolChunks, queries, users, integration_logs

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
-- CONTACT SUBMISSIONS TABLE INDEXES
-- ============================================
-- Index for admin filtering by status
CREATE INDEX idx_contact_status ON contact_submissions(status);

-- Composite index for recent submissions by status
CREATE INDEX idx_contact_status_created ON contact_submissions(status, createdAt DESC);

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
-- QUERIES TABLE INDEXES
-- ============================================
-- Composite index for user query history with timestamp ordering
CREATE INDEX idx_queries_user_created ON queries(userId, createdAt DESC);

-- Index for county-based query filtering
CREATE INDEX idx_queries_county ON queries(countyId);

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

-- Index for openId lookups (should be unique but add for performance)
CREATE INDEX idx_users_openid ON users(openId);

-- ============================================
-- INTEGRATION LOGS TABLE INDEXES
-- ============================================
-- Index for filtering by partner
CREATE INDEX idx_integration_partner ON integration_logs(partner);

-- Index for agency lookups
CREATE INDEX idx_integration_agency ON integration_logs(agencyId);

-- Composite index for recent logs by partner
CREATE INDEX idx_integration_partner_created ON integration_logs(partner, createdAt DESC);

-- Index for search term analysis
CREATE INDEX idx_integration_search ON integration_logs(searchTerm);

-- ============================================
-- BOOKMARKS TABLE INDEXES
-- ============================================
-- Index for user bookmarks
CREATE INDEX idx_bookmarks_user ON bookmarks(userId);

-- Composite index for user bookmarks with timestamp
CREATE INDEX idx_bookmarks_user_created ON bookmarks(userId, createdAt DESC);

-- Index for protocol number lookups
CREATE INDEX idx_bookmarks_protocol ON bookmarks(protocolNumber);

-- ============================================
-- COUNTIES TABLE INDEXES
-- ============================================
-- Index for state lookups (already exists, but verifying)
-- CREATE INDEX idx_counties_state ON counties(state); -- Already exists

-- Index for state protocol filtering
CREATE INDEX idx_counties_state_protocols ON counties(state, usesStateProtocols);
