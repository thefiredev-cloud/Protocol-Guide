/**
 * Drizzle Kit Configuration for MySQL/TiDB (Secondary Database)
 *
 * This configuration is for the MySQL/TiDB database used for:
 * - Legacy data imports
 * - Batch processing
 * - Analytics backup
 *
 * PostgreSQL (Supabase) is the PRIMARY database.
 *
 * Usage:
 *   pnpm drizzle-kit generate --config=drizzle-mysql.config.ts
 *   pnpm drizzle-kit push --config=drizzle-mysql.config.ts
 *
 * @see /drizzle.config.ts - PostgreSQL config (PRIMARY)
 * @see /drizzle/mysql-schema.ts - MySQL schema
 */

import { defineConfig } from "drizzle-kit";

const connectionString = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("MYSQL_DATABASE_URL or DATABASE_URL is required for MySQL drizzle commands");
}

// Validate it's a MySQL connection string
if (!connectionString.startsWith('mysql://')) {
  console.warn(
    "Warning: DATABASE_URL does not start with 'mysql://'. " +
    "Set MYSQL_DATABASE_URL for TiDB/MySQL operations."
  );
}

export default defineConfig({
  schema: "./drizzle/mysql-schema.ts",
  out: "./drizzle/mysql-migrations",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
