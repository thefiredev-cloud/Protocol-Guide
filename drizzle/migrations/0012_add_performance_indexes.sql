-- Migration: Add Performance Indexes
-- Created: 2026-01-22
-- Purpose: Improve query performance for common access patterns

-- Index for protocol chunks filtered by county
-- Used in: RAG retrieval queries, protocol search by county
CREATE INDEX idx_protocol_chunks_county ON protocolChunks(countyId);

-- Composite index for user query history with timestamp ordering
-- Used in: User dashboard query history, analytics
CREATE INDEX idx_queries_user_created ON queries(userId, createdAt DESC);

-- Composite index for search history with timestamp ordering
-- Used in: Pro user cloud sync, cross-device search history
CREATE INDEX idx_search_history_user_ts ON search_history(userId, timestamp DESC);

-- Composite index for agency member lookups
-- Used in: Agency portal access control, member management
CREATE INDEX idx_agency_members_user ON agencyMembers(userId, agencyId);
