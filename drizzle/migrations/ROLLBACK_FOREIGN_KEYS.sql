-- ROLLBACK: Remove all foreign key constraints
-- Use this if you need to reverse the foreign key migration
-- Generated: 2026-01-23

-- =============================================================================
-- WARNING: This will remove all data integrity enforcement!
-- =============================================================================

-- User relationship foreign keys
ALTER TABLE `bookmarks` DROP FOREIGN KEY IF EXISTS `fk_bookmarks_user`;
ALTER TABLE `feedback` DROP FOREIGN KEY IF EXISTS `fk_feedback_user`;
ALTER TABLE `queries` DROP FOREIGN KEY IF EXISTS `fk_queries_user`;
ALTER TABLE `audit_logs` DROP FOREIGN KEY IF EXISTS `fk_audit_logs_user`;
ALTER TABLE `user_auth_providers` DROP FOREIGN KEY IF EXISTS `fk_user_auth_providers_user`;
ALTER TABLE `agency_members` DROP FOREIGN KEY IF EXISTS `fk_agency_members_user`;
ALTER TABLE `agency_members` DROP FOREIGN KEY IF EXISTS `fk_agency_members_inviter`;
ALTER TABLE `protocol_versions` DROP FOREIGN KEY IF EXISTS `fk_protocol_versions_publisher`;
ALTER TABLE `protocol_uploads` DROP FOREIGN KEY IF EXISTS `fk_protocol_uploads_uploader`;
ALTER TABLE `user_counties` DROP FOREIGN KEY IF EXISTS `fk_user_counties_user`;
ALTER TABLE `search_history` DROP FOREIGN KEY IF EXISTS `fk_search_history_user`;
ALTER TABLE `users` DROP FOREIGN KEY IF EXISTS `fk_users_selected_county`;
ALTER TABLE `users` DROP FOREIGN KEY IF EXISTS `fk_users_home_county`;

-- Analytics user foreign keys
ALTER TABLE `analytics_events` DROP FOREIGN KEY IF EXISTS `fk_analytics_events_user`;
ALTER TABLE `conversion_events` DROP FOREIGN KEY IF EXISTS `fk_conversion_events_user`;
ALTER TABLE `protocol_access_logs` DROP FOREIGN KEY IF EXISTS `fk_protocol_access_logs_user`;
ALTER TABLE `search_analytics` DROP FOREIGN KEY IF EXISTS `fk_search_analytics_user`;
ALTER TABLE `session_analytics` DROP FOREIGN KEY IF EXISTS `fk_session_analytics_user`;

-- County relationship foreign keys
ALTER TABLE `protocolChunks` DROP FOREIGN KEY IF EXISTS `fk_protocol_chunks_county`;
ALTER TABLE `queries` DROP FOREIGN KEY IF EXISTS `fk_queries_county`;
ALTER TABLE `feedback` DROP FOREIGN KEY IF EXISTS `fk_feedback_county`;
ALTER TABLE `user_counties` DROP FOREIGN KEY IF EXISTS `fk_user_counties_county`;
ALTER TABLE `search_history` DROP FOREIGN KEY IF EXISTS `fk_search_history_county`;

-- Agency relationship foreign keys
ALTER TABLE `bookmarks` DROP FOREIGN KEY IF EXISTS `fk_bookmarks_agency`;
ALTER TABLE `agency_members` DROP FOREIGN KEY IF EXISTS `fk_agency_members_agency`;
ALTER TABLE `protocol_versions` DROP FOREIGN KEY IF EXISTS `fk_protocol_versions_agency`;
ALTER TABLE `integration_logs` DROP FOREIGN KEY IF EXISTS `fk_integration_logs_agency`;
ALTER TABLE `protocol_access_logs` DROP FOREIGN KEY IF EXISTS `fk_protocol_access_logs_agency`;
ALTER TABLE `search_analytics` DROP FOREIGN KEY IF EXISTS `fk_search_analytics_agency`;

-- Protocol relationship foreign keys
ALTER TABLE `protocol_uploads` DROP FOREIGN KEY IF EXISTS `fk_protocol_uploads_version`;
ALTER TABLE `protocol_access_logs` DROP FOREIGN KEY IF EXISTS `fk_protocol_access_logs_chunk`;

-- =============================================================================
-- ROLLBACK UNIQUE CONSTRAINTS (revert to indexes)
-- =============================================================================

-- user_auth_providers: remove unique, add back index
ALTER TABLE `user_auth_providers` DROP INDEX IF EXISTS `unique_user_provider`;
CREATE INDEX IF NOT EXISTS `idx_auth_providers_user_provider` ON `user_auth_providers` (`userId`, `provider`);

-- agency_members: remove unique
ALTER TABLE `agency_members` DROP INDEX IF EXISTS `unique_agency_user`;

-- stripe_webhook_events: remove unique, add back index
ALTER TABLE `stripe_webhook_events` DROP INDEX IF EXISTS `unique_stripe_event`;
CREATE INDEX IF NOT EXISTS `idx_stripe_events_id` ON `stripe_webhook_events` (`eventId`);

-- agencies: remove unique slug
ALTER TABLE `agencies` DROP INDEX IF EXISTS `unique_agency_slug`;

-- users: revert to indexes
ALTER TABLE `users` DROP INDEX IF EXISTS `unique_user_openid`;
CREATE INDEX IF NOT EXISTS `users_openId_unique` ON `users` (`openId`);

ALTER TABLE `users` DROP INDEX IF EXISTS `unique_user_supabase`;
CREATE INDEX IF NOT EXISTS `users_supabaseId_unique` ON `users` (`supabaseId`);

-- =============================================================================
-- ROLLBACK DATA TYPE CHANGES
-- =============================================================================

-- Remove internalAgencyId from integration_logs
ALTER TABLE `integration_logs` DROP INDEX IF EXISTS `idx_integration_logs_internal_agency`;
ALTER TABLE `integration_logs` DROP COLUMN IF EXISTS `internalAgencyId`;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all foreign keys removed
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Should return no rows (or only built-in constraints)
