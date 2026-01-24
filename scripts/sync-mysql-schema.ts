#!/usr/bin/env npx tsx
/**
 * MySQL Schema Sync Script
 *
 * Validates and syncs the MySQL schema with PostgreSQL schema changes.
 * Run this after making changes to drizzle/schema.ts to ensure MySQL stays in sync.
 *
 * Usage:
 *   pnpm tsx scripts/sync-mysql-schema.ts
 *   pnpm tsx scripts/sync-mysql-schema.ts --help
 */

import * as fs from "fs";
import * as path from "path";

// Table names that should exist in both schemas
const EXPECTED_TABLES = [
  // Core
  "users",
  "counties",
  "agencies",

  // User-related
  "bookmarks",
  "feedback",
  "queries",
  "auditLogs",
  "userAuthProviders",
  "userCounties",
  "userStates",
  "userAgencies",
  "searchHistory",

  // Protocol-related
  "protocolChunks",
  "protocolVersions",
  "protocolUploads",

  // Agency-related
  "agencyMembers",

  // Contact
  "contactSubmissions",

  // Integration
  "integrationLogs",
  "stripeWebhookEvents",
  "pushTokens",
  "dripEmailsSent",

  // Analytics
  "analyticsEvents",
  "searchAnalytics",
  "protocolAccessLogs",
  "sessionAnalytics",
  "dailyMetrics",
  "retentionCohorts",
  "contentGaps",
  "conversionEvents",
  "featureUsageStats",
];

interface SchemaTable {
  name: string;
  exported: boolean;
}

function parseExportedTables(content: string): SchemaTable[] {
  const tables: SchemaTable[] = [];
  const exportRegex = /export const (\w+)\s*=\s*(pgTable|mysqlTable)\s*\(/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    tables.push({
      name: match[1],
      exported: true,
    });
  }

  return tables;
}

function validateSchemas(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const drizzlePath = path.join(process.cwd(), "drizzle");

  // Read PostgreSQL schema
  const pgSchemaPath = path.join(drizzlePath, "schema.ts");
  const analyticsSchemaPath = path.join(drizzlePath, "analytics-schema.ts");
  const mysqlSchemaPath = path.join(drizzlePath, "mysql-schema.ts");

  if (!fs.existsSync(pgSchemaPath)) {
    errors.push("PostgreSQL schema not found: drizzle/schema.ts");
    return { valid: false, errors, warnings };
  }

  if (!fs.existsSync(mysqlSchemaPath)) {
    errors.push("MySQL schema not found: drizzle/mysql-schema.ts");
    return { valid: false, errors, warnings };
  }

  const pgSchema = fs.readFileSync(pgSchemaPath, "utf-8");
  const analyticsSchema = fs.existsSync(analyticsSchemaPath)
    ? fs.readFileSync(analyticsSchemaPath, "utf-8")
    : "";
  const mysqlSchema = fs.readFileSync(mysqlSchemaPath, "utf-8");

  // Parse tables
  const pgTables = parseExportedTables(pgSchema);
  const analyticsTables = parseExportedTables(analyticsSchema);
  const mysqlTables = parseExportedTables(mysqlSchema);

  const allPgTables = [...pgTables, ...analyticsTables];

  console.log("\n=== Schema Validation Report ===\n");
  console.log("PostgreSQL tables (schema.ts): " + pgTables.length);
  console.log("PostgreSQL tables (analytics-schema.ts): " + analyticsTables.length);
  console.log("MySQL tables (mysql-schema.ts): " + mysqlTables.length);
  console.log();

  // Check for missing tables in MySQL
  const pgTableNames = new Set(allPgTables.map((t) => t.name));
  const mysqlTableNames = new Set(mysqlTables.map((t) => t.name));

  const missingInMysql = Array.from(pgTableNames).filter((t) => !mysqlTableNames.has(t));
  const extraInMysql = Array.from(mysqlTableNames).filter((t) => !pgTableNames.has(t));

  if (missingInMysql.length > 0) {
    warnings.push("Tables in PostgreSQL but missing in MySQL: " + missingInMysql.join(", "));
  }

  if (extraInMysql.length > 0) {
    warnings.push("Tables in MySQL but not in PostgreSQL: " + extraInMysql.join(", "));
  }

  // Check expected tables
  const missingExpected = EXPECTED_TABLES.filter(
    (t) => !pgTableNames.has(t) && !mysqlTableNames.has(t)
  );

  if (missingExpected.length > 0) {
    warnings.push("Expected tables missing from both schemas: " + missingExpected.join(", "));
  }

  // Print results
  console.log("=== Validation Results ===\n");

  if (errors.length > 0) {
    console.log("ERRORS:");
    errors.forEach((e) => console.log("  - " + e));
    console.log();
  }

  if (warnings.length > 0) {
    console.log("WARNINGS:");
    warnings.forEach((w) => console.log("  - " + w));
    console.log();
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("All schemas are in sync!");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function printUsage() {
  console.log("\nMySQL Schema Sync Script");
  console.log("========================\n");
  console.log("This script validates that the MySQL schema (mysql-schema.ts) is in sync");
  console.log("with the PostgreSQL schema (schema.ts + analytics-schema.ts).\n");
  console.log("Commands:");
  console.log("  pnpm tsx scripts/sync-mysql-schema.ts           Validate schemas");
  console.log("  pnpm tsx scripts/sync-mysql-schema.ts --help    Show this help\n");
  console.log("Database Architecture:");
  console.log("  - PostgreSQL (Supabase) is the PRIMARY database");
  console.log("  - MySQL (TiDB) is SECONDARY, used for legacy imports\n");
  console.log("When to run:");
  console.log("  - After modifying drizzle/schema.ts");
  console.log("  - After modifying drizzle/analytics-schema.ts");
  console.log("  - Before deploying changes that affect database structure\n");
  console.log("Schema Files:");
  console.log("  - drizzle/schema.ts           PostgreSQL main schema (SOURCE OF TRUTH)");
  console.log("  - drizzle/analytics-schema.ts PostgreSQL analytics tables");
  console.log("  - drizzle/mysql-schema.ts     MySQL mirror schema");
  console.log("  - drizzle/shared-types.ts     Shared type definitions");
  console.log("  - drizzle/relations.ts        Table relationships\n");
}

// Main
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

const result = validateSchemas();

if (!result.valid) {
  console.error("\nSchema validation failed!");
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.log("\nSchema validation passed with warnings.");
  process.exit(0);
}

console.log("\nSchema validation passed!");
process.exit(0);
