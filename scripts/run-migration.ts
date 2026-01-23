/**
 * Script to manually run SQL migrations against the database
 */

import * as mysql from "mysql2/promise";
import * as fs from "fs/promises";
import * as path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function runMigration() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error("Usage: npx tsx scripts/run-migration.ts <migration-file>");
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationFile}\n`);

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), migrationFile);
    const sql = await fs.readFile(migrationPath, "utf-8");

    // Remove comments and split by semicolon
    const cleanedSql = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove /* */ comments

    const statements = cleanedSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        // Extract index name from CREATE INDEX statement for logging
        const indexMatch = statement.match(/CREATE INDEX (\w+)/i);

        try {
          if (indexMatch) {
            const indexName = indexMatch[1];
            process.stdout.write(`  Creating index: ${indexName}...`);
          }

          await connection.query(statement);

          if (indexMatch) {
            console.log(" ✓");
          }
        } catch (error: any) {
          // Skip if index already exists
          if (error.code === "ER_DUP_KEYNAME" || error.message.includes("already exists")) {
            if (indexMatch) {
              console.log(" ⊗ (already exists)");
            }
          } else {
            console.error(`\n❌ Error executing statement ${i + 1}:`, error.message);
            console.error("Statement:", statement.substring(0, 200));
            throw error;
          }
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
