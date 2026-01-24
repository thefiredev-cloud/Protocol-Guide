/**
 * Script to verify database indexes on existing tables only
 */

import * as mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function verifyIndexes() {
  console.log("🔍 Verifying database indexes on existing tables...\n");

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Get list of actual tables
    const [tableRows] = await connection.query("SHOW TABLES");
    const tables = (tableRows as any[]).map((row) => Object.values(row)[0] as string);

    console.log(`📊 Found ${tables.length} tables in database\n`);

    for (const table of tables) {
      if (table === "__drizzle_migrations") continue; // Skip migrations table

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

          console.log(`  ✓ Total indexes: ${indexes.size}`);
        } else {
          console.log("  ⚠️  No indexes found (besides PRIMARY)");
        }
      } catch (error) {
        console.log(`  ❌ Error checking table: ${error}`);
      }
    }

    console.log("\n✅ Index verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  } finally {
    // Always close connection, even on error
    await connection.end();
  }
}

verifyIndexes();
