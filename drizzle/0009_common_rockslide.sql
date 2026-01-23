CREATE TABLE `agencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`stateCode` varchar(2) NOT NULL,
	`agencyType` enum('fire_dept','ems_agency','hospital','state_office','regional_council'),
	`logoUrl` varchar(500),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`address` text,
	`supabaseAgencyId` int,
	`stripeCustomerId` varchar(255),
	`subscriptionTier` enum('starter','professional','enterprise') DEFAULT 'starter',
	`subscriptionStatus` varchar(50),
	`settings` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `agencies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `agency_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','protocol_author','member') DEFAULT 'member',
	`invitedBy` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `agency_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `agency_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `agency_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','protocol_author','member') DEFAULT 'member',
	`invitedBy` int,
	`invitedAt` timestamp,
	`acceptedAt` timestamp,
	`status` enum('pending','active','suspended') DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `agency_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`audit_action` enum('USER_ROLE_CHANGED','USER_TIER_CHANGED','FEEDBACK_STATUS_CHANGED','CONTACT_STATUS_CHANGED','USER_DELETED','PROTOCOL_MODIFIED') NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`targetId` varchar(50) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integration_partner` enum('imagetrend','esos','zoll','emscloud','none') NOT NULL,
	`agencyId` varchar(100),
	`agencyName` varchar(255),
	`searchTerm` varchar(500),
	`userAge` int,
	`impression` varchar(255),
	`responseTimeMs` int,
	`resultCount` int,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`status` enum('pending','processing','chunking','embedding','completed','failed') DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`chunksCreated` int DEFAULT 0,
	`errorMessage` text,
	`processingStartedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `protocol_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`protocolNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`version` varchar(20) NOT NULL,
	`status` enum('draft','review','approved','published','archived') DEFAULT 'draft',
	`sourceFileUrl` varchar(500),
	`effectiveDate` timestamp,
	`expiresDate` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`publishedAt` timestamp,
	`chunksGenerated` int DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `protocol_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`queryText` varchar(500) NOT NULL,
	`countyId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`deviceId` varchar(64),
	`synced` boolean NOT NULL DEFAULT true,
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_agencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agencyId` int NOT NULL,
	`accessLevel` enum('view','contribute','admin') DEFAULT 'view',
	`isPrimary` boolean DEFAULT false,
	`role` varchar(100),
	`verifiedAt` timestamp,
	`subscribedAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `user_agencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_auth_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(64) NOT NULL,
	`providerUserId` varchar(255) NOT NULL,
	`email` varchar(320),
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_auth_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_counties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`countyId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_counties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stateCode` varchar(2) NOT NULL,
	`accessLevel` enum('view','contribute','admin') DEFAULT 'view',
	`subscribedAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `user_states_id` PRIMARY KEY(`id`)
);
