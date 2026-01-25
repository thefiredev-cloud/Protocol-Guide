-- P0 CRITICAL: Medical Disclaimer Acknowledgment Field
-- Required for legal compliance - tracks when users acknowledge medical disclaimer
-- Migration: 0013_add_disclaimer_acknowledgment.sql
-- Created: 2026-01-22

-- Add disclaimerAcknowledgedAt column to users table
ALTER TABLE `users` ADD COLUMN `disclaimerAcknowledgedAt` timestamp NULL;

-- Add index for efficient queries on disclaimer acknowledgment status
CREATE INDEX `idx_users_disclaimer_acknowledged` ON `users` (`disclaimerAcknowledgedAt`);

-- Comment explaining the field purpose
ALTER TABLE `users` MODIFY COLUMN `disclaimerAcknowledgedAt` timestamp NULL COMMENT 'Timestamp when user acknowledged medical disclaimer for legal compliance';
