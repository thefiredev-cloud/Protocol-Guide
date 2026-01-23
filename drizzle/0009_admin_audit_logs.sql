-- Migration: Add audit_logs table for admin action tracking
-- This table provides compliance and accountability for administrative operations

CREATE TABLE `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `action` enum('USER_ROLE_CHANGED','USER_TIER_CHANGED','FEEDBACK_STATUS_CHANGED','CONTACT_STATUS_CHANGED','USER_DELETED','PROTOCOL_MODIFIED') NOT NULL,
  `targetType` varchar(50) NOT NULL,
  `targetId` varchar(50) NOT NULL,
  `details` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);

-- Add index for common queries
CREATE INDEX `audit_logs_userId_idx` ON `audit_logs` (`userId`);
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);
CREATE INDEX `audit_logs_createdAt_idx` ON `audit_logs` (`createdAt`);
