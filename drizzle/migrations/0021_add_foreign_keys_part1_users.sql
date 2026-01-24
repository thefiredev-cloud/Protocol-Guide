-- Migration: Add foreign key constraints - Part 1 (User relationships)
-- This migration adds foreign keys for all user-related relationships
-- Generated: 2026-01-23
--
-- PREREQUISITES:
-- - Run 0018_pre_migration_validation.sql to check for orphaned records
-- - Run 0019_fix_data_type_mismatches.sql to fix type issues
-- - Run 0020_add_unique_constraints.sql to add unique constraints
-- - Clean up any orphaned data found in validation
--
-- WARNING: This will enforce referential integrity. Ensure no orphaned records exist!

-- =============================================================================
-- USER RELATIONSHIPS
-- =============================================================================

-- bookmarks.userId → users.id
-- CASCADE DELETE: When user deleted, delete their bookmarks
ALTER TABLE `bookmarks`
ADD CONSTRAINT `fk_bookmarks_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- feedback.userId → users.id
-- CASCADE DELETE: When user deleted, delete their feedback
ALTER TABLE `feedback`
ADD CONSTRAINT `fk_feedback_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- queries.userId → users.id
-- CASCADE DELETE: When user deleted, delete their queries
ALTER TABLE `queries`
ADD CONSTRAINT `fk_queries_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- auditLogs.userId → users.id
-- SET NULL: When user deleted, preserve audit logs but set user to NULL
ALTER TABLE `audit_logs`
ADD CONSTRAINT `fk_audit_logs_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- userAuthProviders.userId → users.id
-- CASCADE DELETE: When user deleted, delete their auth providers
ALTER TABLE `user_auth_providers`
ADD CONSTRAINT `fk_user_auth_providers_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- agencyMembers.userId → users.id
-- CASCADE DELETE: When user deleted, remove from agencies
ALTER TABLE `agency_members`
ADD CONSTRAINT `fk_agency_members_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- agencyMembers.invitedBy → users.id
-- SET NULL: When inviter deleted, preserve membership but clear inviter
ALTER TABLE `agency_members`
ADD CONSTRAINT `fk_agency_members_inviter`
FOREIGN KEY (`invitedBy`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- protocolVersions.publishedBy → users.id
-- SET NULL: When publisher deleted, preserve version but clear publisher
ALTER TABLE `protocol_versions`
ADD CONSTRAINT `fk_protocol_versions_publisher`
FOREIGN KEY (`publishedBy`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- protocolUploads.uploadedBy → users.id
-- RESTRICT: Cannot delete user who has uploaded protocols (business rule)
ALTER TABLE `protocol_uploads`
ADD CONSTRAINT `fk_protocol_uploads_uploader`
FOREIGN KEY (`uploadedBy`)
REFERENCES `users`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- userCounties.userId → users.id
-- CASCADE DELETE: When user deleted, delete their county selections
ALTER TABLE `user_counties`
ADD CONSTRAINT `fk_user_counties_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- searchHistory.userId → users.id
-- CASCADE DELETE: When user deleted, delete their search history
ALTER TABLE `search_history`
ADD CONSTRAINT `fk_search_history_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- users.selectedCountyId → counties.id
-- SET NULL: When county deleted, clear user's selection
ALTER TABLE `users`
ADD CONSTRAINT `fk_users_selected_county`
FOREIGN KEY (`selectedCountyId`)
REFERENCES `counties`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- users.homeCountyId → counties.id
-- SET NULL: When county deleted, clear user's home county
ALTER TABLE `users`
ADD CONSTRAINT `fk_users_home_county`
FOREIGN KEY (`homeCountyId`)
REFERENCES `counties`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- =============================================================================
-- ANALYTICS TABLE USER RELATIONSHIPS
-- =============================================================================

-- analytics_events.userId → users.id
-- SET NULL: Keep analytics even if user deleted
ALTER TABLE `analytics_events`
ADD CONSTRAINT `fk_analytics_events_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- conversion_events.userId → users.id
-- RESTRICT: Critical business data, don't allow user deletion with conversions
ALTER TABLE `conversion_events`
ADD CONSTRAINT `fk_conversion_events_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- protocol_access_logs.userId → users.id
-- SET NULL: Keep access logs even if user deleted
ALTER TABLE `protocol_access_logs`
ADD CONSTRAINT `fk_protocol_access_logs_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- search_analytics.userId → users.id
-- SET NULL: Keep analytics even if user deleted
ALTER TABLE `search_analytics`
ADD CONSTRAINT `fk_search_analytics_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- session_analytics.userId → users.id
-- SET NULL: Keep analytics even if user deleted
ALTER TABLE `session_analytics`
ADD CONSTRAINT `fk_session_analytics_user`
FOREIGN KEY (`userId`)
REFERENCES `users`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- =============================================================================
-- NOTES
-- =============================================================================
-- CASCADE DELETE: User's personal data is deleted with the user
-- SET NULL: Analytics and audit trails preserved but anonymized
-- RESTRICT: Business-critical data prevents user deletion
-- =============================================================================
