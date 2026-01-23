-- Migration: Add user_counties and search_history tables for monetization features
-- B1: County Restriction - Free users limited to 1 saved county
-- B3: Search History Cloud Sync - Pro users can sync search history across devices

CREATE TABLE IF NOT EXISTS `user_counties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `countyId` int NOT NULL,
  `isPrimary` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_counties_user` (`userId`),
  KEY `idx_user_counties_county` (`countyId`),
  UNIQUE KEY `uniq_user_county` (`userId`, `countyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `search_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `queryText` varchar(500) NOT NULL,
  `countyId` int DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deviceId` varchar(64) DEFAULT NULL,
  `synced` boolean NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  KEY `idx_search_history_user` (`userId`),
  KEY `idx_search_history_timestamp` (`userId`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
