-- Migration: Add Additional FULLTEXT Indexes for Search Performance
-- Description: Adds FULLTEXT indexes to tables with text search use cases
-- Date: 2026-01-23
-- Author: Database Performance Optimization
--
-- This migration adds FULLTEXT indexes to improve performance for:
-- 1. Admin search functionality (users, contact submissions)
-- 2. Agency lookup and discovery
-- 3. Search analytics (search history, integration logs)
-- 4. Protocol management (protocol versions, bookmarks)
-- 5. Security auditing (audit logs)

-- ============================================
-- AGENCIES TABLE - Agency Discovery & Search
-- ============================================
-- Users frequently search for their agency by name or location
-- FULLTEXT enables fast "find my agency" functionality
ALTER TABLE agencies
  ADD FULLTEXT INDEX ft_agencies_search (name, county);

-- ============================================
-- SEARCH HISTORY TABLE - Search Analytics
-- ============================================
-- Enables fast duplicate detection and search pattern analysis
-- Helps identify common queries and improve autocomplete
ALTER TABLE search_history
  ADD FULLTEXT INDEX ft_search_history_query (searchQuery);

-- ============================================
-- CONTACT SUBMISSIONS TABLE - Admin Support Search
-- ============================================
-- Admins need to search through support requests by name, email, or content
-- FULLTEXT enables fast "find that ticket about X" queries
ALTER TABLE contact_submissions
  ADD FULLTEXT INDEX ft_contact_search (name, email, message);

-- ============================================
-- INTEGRATION LOGS TABLE - Partner Analytics
-- ============================================
-- Enables analysis of what partner systems are searching for
-- Helps identify integration patterns and popular queries
ALTER TABLE integration_logs
  ADD FULLTEXT INDEX ft_integration_search (searchTerm, agencyName);

-- ============================================
-- USERS TABLE - Admin User Management
-- ============================================
-- Admins need fast lookup by name or email when managing users
-- FULLTEXT enables "find user X" queries in admin dashboards
ALTER TABLE users
  ADD FULLTEXT INDEX ft_users_search (name, email);

-- ============================================
-- PROTOCOL VERSIONS TABLE - Protocol Management
-- ============================================
-- Agency admins search through protocol versions by title and changes
-- Enables "what changed in version X" and "find protocol about Y" queries
ALTER TABLE protocol_versions
  ADD FULLTEXT INDEX ft_protocol_versions_search (title, changeLog);

-- ============================================
-- BOOKMARKS TABLE - User Bookmark Search
-- ============================================
-- Users search through their saved bookmarks by protocol title
-- Enables fast "find that protocol I bookmarked" functionality
ALTER TABLE bookmarks
  ADD FULLTEXT INDEX ft_bookmarks_search (protocolTitle, section, content);

-- ============================================
-- AUDIT LOGS TABLE - Security Analytics
-- ============================================
-- Security team searches audit logs by user agent for threat detection
-- Enables "find all requests from bot X" and pattern analysis
ALTER TABLE audit_logs
  ADD FULLTEXT INDEX ft_audit_logs_useragent (userAgent);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify indexes were created successfully:
--
-- SHOW INDEX FROM agencies WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM search_history WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM contact_submissions WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM integration_logs WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM users WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM protocol_versions WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM bookmarks WHERE Key_name LIKE 'ft_%';
-- SHOW INDEX FROM audit_logs WHERE Key_name LIKE 'ft_%';

-- ============================================
-- PERFORMANCE TESTING QUERIES
-- ============================================
-- Test FULLTEXT index performance with these example queries:
--
-- -- Agency search (before/after comparison):
-- SELECT * FROM agencies WHERE MATCH(name, county) AGAINST('Los Angeles' IN NATURAL LANGUAGE MODE);
--
-- -- Search history analysis:
-- SELECT searchQuery, COUNT(*) as frequency
-- FROM search_history
-- WHERE MATCH(searchQuery) AGAINST('cardiac arrest' IN NATURAL LANGUAGE MODE)
-- GROUP BY searchQuery;
--
-- -- Contact support search:
-- SELECT * FROM contact_submissions
-- WHERE MATCH(name, email, message) AGAINST('billing issue' IN NATURAL LANGUAGE MODE);
--
-- -- Integration analytics:
-- SELECT agencyName, COUNT(*) as searches
-- FROM integration_logs
-- WHERE MATCH(searchTerm, agencyName) AGAINST('trauma' IN NATURAL LANGUAGE MODE)
-- GROUP BY agencyName;
--
-- -- User lookup:
-- SELECT * FROM users
-- WHERE MATCH(name, email) AGAINST('john smith' IN NATURAL LANGUAGE MODE);
--
-- -- Protocol version search:
-- SELECT * FROM protocol_versions
-- WHERE MATCH(title, changeLog) AGAINST('dosage update' IN NATURAL LANGUAGE MODE);
--
-- -- Bookmark search:
-- SELECT * FROM bookmarks
-- WHERE MATCH(protocolTitle, section, content) AGAINST('pediatric airway' IN NATURAL LANGUAGE MODE);

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- If you need to remove these indexes, run:
--
-- ALTER TABLE agencies DROP INDEX ft_agencies_search;
-- ALTER TABLE search_history DROP INDEX ft_search_history_query;
-- ALTER TABLE contact_submissions DROP INDEX ft_contact_search;
-- ALTER TABLE integration_logs DROP INDEX ft_integration_search;
-- ALTER TABLE users DROP INDEX ft_users_search;
-- ALTER TABLE protocol_versions DROP INDEX ft_protocol_versions_search;
-- ALTER TABLE bookmarks DROP INDEX ft_bookmarks_search;
-- ALTER TABLE audit_logs DROP INDEX ft_audit_logs_useragent;

-- ============================================
-- INDEX SIZE MONITORING
-- ============================================
-- Monitor index sizes to ensure they don't grow too large:
--
-- SELECT
--   table_name,
--   index_name,
--   ROUND(stat_value * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
-- FROM mysql.innodb_index_stats
-- WHERE index_name LIKE 'ft_%'
--   AND database_name = DATABASE()
-- ORDER BY stat_value DESC;

-- ============================================
-- NOTES
-- ============================================
-- 1. FULLTEXT indexes in MySQL have a minimum word length (default 4 chars for InnoDB)
--    To search shorter terms, configure ft_min_word_len in my.cnf
--
-- 2. FULLTEXT searches use NATURAL LANGUAGE MODE by default
--    Use BOOLEAN MODE for advanced search with +/- operators
--
-- 3. FULLTEXT indexes are updated immediately on INSERT/UPDATE
--    This adds minimal overhead but greatly improves search performance
--
-- 4. For very large tables, consider using IN BOOLEAN MODE with query expansion:
--    MATCH(col) AGAINST('term' WITH QUERY EXPANSION)
--
-- 5. Monitor index fragmentation and rebuild if needed:
--    OPTIMIZE TABLE table_name;
