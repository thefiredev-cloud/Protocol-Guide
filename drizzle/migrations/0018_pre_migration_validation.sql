-- Migration: Pre-migration validation - Find orphaned records
-- Run this BEFORE adding foreign keys to identify data issues
-- Generated: 2026-01-23

-- =============================================================================
-- ORPHANED RECORD DETECTION
-- =============================================================================
-- This migration helps identify records that would violate foreign key constraints
-- Run these queries and fix data BEFORE proceeding to add foreign keys

-- Check for orphaned bookmarks (userId not in users)
SELECT 'Orphaned bookmarks' as issue_type, COUNT(*) as count
FROM bookmarks b
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.userId);

-- Check for orphaned bookmarks (agencyId not in agencies)
SELECT 'Orphaned bookmarks (agency)' as issue_type, COUNT(*) as count
FROM bookmarks b
WHERE b.agencyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM agencies a WHERE a.id = b.agencyId);

-- Check for orphaned feedback (userId)
SELECT 'Orphaned feedback (user)' as issue_type, COUNT(*) as count
FROM feedback f
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = f.userId);

-- Check for orphaned feedback (countyId)
SELECT 'Orphaned feedback (county)' as issue_type, COUNT(*) as count
FROM feedback f
WHERE f.countyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = f.countyId);

-- Check for orphaned protocolChunks (countyId)
SELECT 'Orphaned protocolChunks' as issue_type, COUNT(*) as count
FROM protocolChunks pc
WHERE NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = pc.countyId);

-- Check for orphaned queries (userId)
SELECT 'Orphaned queries (user)' as issue_type, COUNT(*) as count
FROM queries q
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = q.userId);

-- Check for orphaned queries (countyId)
SELECT 'Orphaned queries (county)' as issue_type, COUNT(*) as count
FROM queries q
WHERE NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = q.countyId);

-- Check for orphaned auditLogs
SELECT 'Orphaned auditLogs' as issue_type, COUNT(*) as count
FROM audit_logs al
WHERE al.userId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = al.userId);

-- Check for orphaned userAuthProviders
SELECT 'Orphaned userAuthProviders' as issue_type, COUNT(*) as count
FROM user_auth_providers uap
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = uap.userId);

-- Check for orphaned agencyMembers (userId)
SELECT 'Orphaned agencyMembers (user)' as issue_type, COUNT(*) as count
FROM agency_members am
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = am.userId);

-- Check for orphaned agencyMembers (agencyId)
SELECT 'Orphaned agencyMembers (agency)' as issue_type, COUNT(*) as count
FROM agency_members am
WHERE NOT EXISTS (SELECT 1 FROM agencies a WHERE a.id = am.agencyId);

-- Check for orphaned agencyMembers (invitedBy)
SELECT 'Orphaned agencyMembers (inviter)' as issue_type, COUNT(*) as count
FROM agency_members am
WHERE am.invitedBy IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = am.invitedBy);

-- Check for orphaned protocolVersions
SELECT 'Orphaned protocolVersions' as issue_type, COUNT(*) as count
FROM protocol_versions pv
WHERE NOT EXISTS (SELECT 1 FROM agencies a WHERE a.id = pv.agencyId);

-- Check for orphaned protocolUploads (versionId)
SELECT 'Orphaned protocolUploads (version)' as issue_type, COUNT(*) as count
FROM protocol_uploads pu
WHERE NOT EXISTS (SELECT 1 FROM protocol_versions pv WHERE pv.id = pu.versionId);

-- Check for orphaned protocolUploads (uploadedBy)
SELECT 'Orphaned protocolUploads (uploader)' as issue_type, COUNT(*) as count
FROM protocol_uploads pu
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pu.uploadedBy);

-- Check for orphaned userCounties (userId)
SELECT 'Orphaned userCounties (user)' as issue_type, COUNT(*) as count
FROM user_counties uc
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = uc.userId);

-- Check for orphaned userCounties (countyId)
SELECT 'Orphaned userCounties (county)' as issue_type, COUNT(*) as count
FROM user_counties uc
WHERE NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = uc.countyId);

-- Check for orphaned searchHistory (userId)
SELECT 'Orphaned searchHistory (user)' as issue_type, COUNT(*) as count
FROM search_history sh
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = sh.userId);

-- Check for orphaned searchHistory (countyId)
SELECT 'Orphaned searchHistory (county)' as issue_type, COUNT(*) as count
FROM search_history sh
WHERE sh.countyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = sh.countyId);

-- Check for users with invalid selectedCountyId
SELECT 'Users with invalid selectedCountyId' as issue_type, COUNT(*) as count
FROM users u
WHERE u.selectedCountyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = u.selectedCountyId);

-- Check for users with invalid homeCountyId
SELECT 'Users with invalid homeCountyId' as issue_type, COUNT(*) as count
FROM users u
WHERE u.homeCountyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM counties c WHERE c.id = u.homeCountyId);

-- Check for orphaned search_analytics (userId)
SELECT 'Orphaned search_analytics (user)' as issue_type, COUNT(*) as count
FROM search_analytics sa
WHERE sa.userId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = sa.userId);

-- Check for orphaned search_analytics (agencyId)
SELECT 'Orphaned search_analytics (agency)' as issue_type, COUNT(*) as count
FROM search_analytics sa
WHERE sa.agencyId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM agencies a WHERE a.id = sa.agencyId);

-- Check for orphaned search_analytics (topResultProtocolId)
SELECT 'Orphaned search_analytics (top protocol)' as issue_type, COUNT(*) as count
FROM search_analytics sa
WHERE sa.topResultProtocolId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM protocolChunks pc WHERE pc.id = sa.topResultProtocolId);

-- Check for orphaned search_analytics (selectedProtocolId)
SELECT 'Orphaned search_analytics (selected protocol)' as issue_type, COUNT(*) as count
FROM search_analytics sa
WHERE sa.selectedProtocolId IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM protocolChunks pc WHERE pc.id = sa.selectedProtocolId);

-- =============================================================================
-- DUPLICATE DETECTION (for unique constraints)
-- =============================================================================

-- Check for duplicate user auth providers
SELECT 'Duplicate auth providers' as issue_type, COUNT(*) as count
FROM (
  SELECT userId, provider, COUNT(*) as cnt
  FROM user_auth_providers
  GROUP BY userId, provider
  HAVING cnt > 1
) duplicates;

-- Check for duplicate agency members
SELECT 'Duplicate agency members' as issue_type, COUNT(*) as count
FROM (
  SELECT agencyId, userId, COUNT(*) as cnt
  FROM agency_members
  GROUP BY agencyId, userId
  HAVING cnt > 1
) duplicates;

-- Check for duplicate stripe webhook events
SELECT 'Duplicate stripe events' as issue_type, COUNT(*) as count
FROM (
  SELECT eventId, COUNT(*) as cnt
  FROM stripe_webhook_events
  GROUP BY eventId
  HAVING cnt > 1
) duplicates;

-- =============================================================================
-- CLEANUP SUGGESTIONS
-- =============================================================================
-- If orphaned records are found, you can clean them up with commands like:
--
-- DELETE FROM bookmarks WHERE userId NOT IN (SELECT id FROM users);
-- DELETE FROM queries WHERE countyId NOT IN (SELECT id FROM counties);
-- etc.
--
-- OR set them to NULL if the column is nullable:
-- UPDATE feedback SET countyId = NULL WHERE countyId NOT IN (SELECT id FROM counties);
-- =============================================================================
