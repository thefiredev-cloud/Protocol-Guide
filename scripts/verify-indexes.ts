/**
 * Script to verify database indexes were created successfully
 * Queries information_schema to list all indexes on key tables
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function verifyIndexes() {
  console.log("🔍 Verifying database indexes...\n");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Key tables to check
  const tables = [
    "feedback",
    "audit_logs",
    "user_counties",
    "user_auth_providers",
    "contact_submissions",
    "stripe_webhook_events",
    "protocolChunks",
    "protocol_access_logs",
    "search_analytics",
    "analytics_events",
    "session_analytics",
    "conversion_events",
    "agencies",
    "agency_invitations",
    "protocol_versions",
    "protocol_uploads",
    "user_states",
    "user_agencies",
    "users",
  ];

  for (const table of tables) {
    try {
      const [rows] = await connection.query(
        `
        SELECT
          INDEX_NAME,
          COLUMN_NAME,
          SEQ_IN_INDEX,
          NON_UNIQUE
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME != 'PRIMARY'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `,
        [table]
      );

      console.log(`\n📊 Table: ${table}`);
      console.log("─".repeat(60));

      if (Array.isArray(rows) && rows.length > 0) {
        const indexes = new Map<string, string[]>();

        for (const row of rows as any[]) {
          if (!indexes.has(row.INDEX_NAME)) {
            indexes.set(row.INDEX_NAME, []);
          }
          indexes.get(row.INDEX_NAME)!.push(row.COLUMN_NAME);
        }

        indexes.forEach((columns, indexName) => {
          const unique = (rows as any[]).find(
            (r) => r.INDEX_NAME === indexName
          )?.NON_UNIQUE === 0;
          console.log(
            `  ${unique ? "🔑" : "📇"} ${indexName}: ${columns.join(", ")}`
          );
        });
      } else {
        console.log("  ⚠️  No indexes found (besides PRIMARY)");
      }
    } catch (error) {
      console.log(`  ❌ Error checking table: ${error}`);
    }
  }

  await connection.end();
  console.log("\n✅ Index verification complete!");
}

verifyIndexes().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
