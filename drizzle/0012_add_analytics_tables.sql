CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`eventName` varchar(100) NOT NULL,
	`properties` json,
	`deviceType` varchar(20),
	`appVersion` varchar(20),
	`osVersion` varchar(20),
	`screenName` varchar(100),
	`referrer` varchar(255),
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_gaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryPattern` varchar(500) NOT NULL,
	`occurrences` int DEFAULT 1,
	`lastOccurred` timestamp NOT NULL DEFAULT (now()),
	`firstOccurred` timestamp NOT NULL DEFAULT (now()),
	`statesRequested` json,
	`suggestedCategory` varchar(50),
	`priority` varchar(20) DEFAULT 'low',
	`status` varchar(20) DEFAULT 'open',
	`resolvedAt` timestamp,
	`notes` text,
	CONSTRAINT `content_gaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversion_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64),
	`eventType` varchar(50) NOT NULL,
	`fromTier` varchar(20),
	`toTier` varchar(20),
	`plan` varchar(20),
	`promptLocation` varchar(100),
	`triggerFeature` varchar(100),
	`amount` decimal(10,2),
	`currency` varchar(3) DEFAULT 'USD',
	`stripeSessionId` varchar(255),
	`completed` boolean DEFAULT false,
	`completedAt` timestamp,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversion_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`metricType` varchar(50) NOT NULL,
	`dimension` varchar(100),
	`dimensionValue` varchar(100),
	`count` int DEFAULT 0,
	`sumValue` decimal(15,2),
	`avgValue` decimal(15,4),
	`p50Value` decimal(15,4),
	`p95Value` decimal(15,4),
	`minValue` decimal(15,4),
	`maxValue` decimal(15,4),
	CONSTRAINT `daily_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_daily` UNIQUE(`date`,`metricType`,`dimension`,`dimensionValue`)
);
--> statement-breakpoint
CREATE TABLE `feature_usage_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`featureName` varchar(100) NOT NULL,
	`uniqueUsers` int DEFAULT 0,
	`totalUsage` int DEFAULT 0,
	`avgUsagePerUser` decimal(10,2),
	`tierBreakdown` json,
	`deviceBreakdown` json,
	CONSTRAINT `feature_usage_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_feature_date` UNIQUE(`date`,`featureName`)
);
--> statement-breakpoint
CREATE TABLE `protocol_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64),
	`protocolChunkId` int NOT NULL,
	`protocolNumber` varchar(50),
	`protocolTitle` varchar(255),
	`agencyId` int,
	`stateCode` varchar(2),
	`accessSource` varchar(50),
	`timeSpentSeconds` int,
	`scrollDepth` float,
	`copiedContent` boolean DEFAULT false,
	`sharedProtocol` boolean DEFAULT false,
	`fromSearchQuery` varchar(500),
	`searchResultRank` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retention_cohorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cohortDate` date NOT NULL,
	`cohortType` varchar(20) NOT NULL,
	`cohortSize` int NOT NULL,
	`d1Retained` int,
	`d7Retained` int,
	`d14Retained` int,
	`d30Retained` int,
	`d60Retained` int,
	`d90Retained` int,
	`segment` varchar(50),
	`acquisitionSource` varchar(100),
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `retention_cohorts_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_cohort` UNIQUE(`cohortDate`,`cohortType`,`segment`)
);
--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`queryText` varchar(500) NOT NULL,
	`queryTokenCount` int,
	`stateFilter` varchar(2),
	`agencyId` int,
	`resultsCount` int NOT NULL,
	`topResultProtocolId` int,
	`topResultScore` float,
	`selectedResultRank` int,
	`selectedProtocolId` int,
	`timeToFirstResult` int,
	`totalSearchTime` int,
	`searchMethod` varchar(20),
	`isVoiceQuery` boolean DEFAULT false,
	`voiceTranscriptionTime` int,
	`noResultsFound` boolean DEFAULT false,
	`queryCategory` varchar(50),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64) NOT NULL,
	`deviceType` varchar(20),
	`appVersion` varchar(20),
	`platform` varchar(20),
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`durationSeconds` int,
	`searchCount` int DEFAULT 0,
	`protocolsViewed` int DEFAULT 0,
	`queriesSubmitted` int DEFAULT 0,
	`screenTransitions` int DEFAULT 0,
	`isNewUser` boolean DEFAULT false,
	`userTier` varchar(20),
	`referralSource` varchar(100),
	`entryScreen` varchar(100),
	`exitScreen` varchar(100),
	`userCertificationLevel` varchar(50),
	CONSTRAINT `session_analytics_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_analytics_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
ALTER TABLE `agencies` ADD `seatCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `agencies` ADD `annualBilling` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `disclaimerAcknowledgedAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `analytics_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `analytics_events` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `analytics_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_session` ON `analytics_events` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_occurrences` ON `content_gaps` (`occurrences`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `content_gaps` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `content_gaps` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_conversion` ON `conversion_events` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `conversion_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `conversion_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `daily_metrics` (`date`);--> statement-breakpoint
CREATE INDEX `idx_metric` ON `daily_metrics` (`metricType`);--> statement-breakpoint
CREATE INDEX `idx_feature` ON `feature_usage_stats` (`featureName`);--> statement-breakpoint
CREATE INDEX `idx_protocol` ON `protocol_access_logs` (`protocolChunkId`);--> statement-breakpoint
CREATE INDEX `idx_user_access` ON `protocol_access_logs` (`userId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_state` ON `protocol_access_logs` (`stateCode`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `protocol_access_logs` (`accessSource`);--> statement-breakpoint
CREATE INDEX `idx_cohort_date` ON `retention_cohorts` (`cohortDate`);--> statement-breakpoint
CREATE INDEX `idx_user_search` ON `search_analytics` (`userId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_no_results` ON `search_analytics` (`noResultsFound`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_state` ON `search_analytics` (`stateFilter`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `search_analytics` (`queryCategory`);--> statement-breakpoint
CREATE INDEX `idx_user_session` ON `session_analytics` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_start` ON `session_analytics` (`startTime`);--> statement-breakpoint
CREATE INDEX `idx_agency_members_user` ON `agency_members` (`userId`,`agencyId`);--> statement-breakpoint
CREATE INDEX `idx_protocol_chunks_county` ON `protocolChunks` (`countyId`);--> statement-breakpoint
CREATE INDEX `idx_queries_user_created` ON `queries` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_search_history_user_ts` ON `search_history` (`userId`,`timestamp`);--> statement-breakpoint
ALTER TABLE `integration_logs` DROP COLUMN `userAge`;--> statement-breakpoint
ALTER TABLE `integration_logs` DROP COLUMN `impression`;