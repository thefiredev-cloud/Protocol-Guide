/**
 * Supabase Database Health Check Script
 * Verifies database connectivity, tables, indexes, and enum types
 */

import "./load-env.js";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expected table count
const EXPECTED_TABLES = 22;

async function checkHealth() {
  console.log("🔍 Protocol Guide Supabase Health Check");
  console.log("==========================================\n");

  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

  try {
    // 1. Test basic connectivity via Supabase client
    console.log("1️⃣ Testing Supabase Client Connectivity...");
    const { data: testData, error: testError } = await supabase
      .from("users")
      .select("count", { count: "exact", head: true });

    if (testError) {
      console.error("❌ Supabase client error:", testError.message);
    } else {
      console.log("✅ Supabase client connected successfully\n");
    }

    // 2. Get database connection info
    // Note: Direct SQL requires PostgreSQL connection string
    console.log("2️⃣ Attempting Direct PostgreSQL Connection...");

    // Try to construct PostgreSQL connection string
    // Supabase format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (!projectRef) {
      console.error("❌ Could not extract project ref from SUPABASE_URL");
      return;
    }

    console.log(`   Project Ref: ${projectRef}`);

    // Check if DATABASE_URL is set for PostgreSQL
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
      console.log("⚠️  DATABASE_URL not configured for PostgreSQL");
      console.log("   Current DATABASE_URL:", databaseUrl ? "MySQL/TiDB" : "Not set");
      console.log("\n📋 To enable full health checks, set DATABASE_URL to:");
      console.log(`   postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`);
      console.log("\n   Get your password from: Supabase Dashboard → Settings → Database\n");
      return;
    }

    // Connect to PostgreSQL directly
    console.log("   Connecting to PostgreSQL...");
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    // 3. Execute: SELECT current_database(), current_user, version();
    console.log("\n3️⃣ Database Information:");
    const dbInfo = await pool.query("SELECT current_database(), current_user, version()");
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    console.log(`   Version: ${dbInfo.rows[0].version.split(" ").slice(0, 2).join(" ")}`);

    // 4. Check connection pool
    console.log("\n4️⃣ Connection Pool Status:");
    const poolStats = await pool.query("SELECT count(*) FROM pg_stat_activity");
    console.log(`   Active Connections: ${poolStats.rows[0].count}`);

    // 5. List all tables and verify 22 tables exist
    console.log("\n5️⃣ Table Verification:");
    const tables = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`   Expected Tables: ${EXPECTED_TABLES}`);
    console.log(`   Found Tables: ${tables.rows.length}`);

    if (tables.rows.length === EXPECTED_TABLES) {
      console.log("   ✅ Table count matches!");
    } else {
      console.log(`   ⚠️  Table count mismatch! (${tables.rows.length}/${EXPECTED_TABLES})`);
    }

    console.log("\n   Tables:");
    tables.rows.forEach((row, i) => {
      console.log(`   ${(i + 1).toString().padStart(2, " ")}. ${row.tablename}`);
    });

    // 6. Check indexes
    console.log("\n6️⃣ Index Verification:");
    const indexes = await pool.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    console.log(`   Total Indexes: ${indexes.rows.length}`);

    // Group by table
    const indexesByTable: Record<string, string[]> = {};
    indexes.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push(row.indexname);
    });

    console.log("\n   Indexes by Table:");
    Object.entries(indexesByTable).forEach(([table, idxList]) => {
      console.log(`   ${table}: ${idxList.length} indexes`);
    });

    // 7. Verify enum types
    console.log("\n7️⃣ Enum Type Verification:");
    const enums = await pool.query(`
      SELECT typname
      FROM pg_type
      WHERE typcategory = 'E'
      ORDER BY typname
    `);

    console.log(`   Total Enum Types: ${enums.rows.length}`);
    console.log("\n   Enums:");
    enums.rows.forEach((row, i) => {
      console.log(`   ${(i + 1).toString().padStart(2, " ")}. ${row.typname}`);
    });

    // 8. Summary
    console.log("\n==========================================");
    console.log("✅ Health Check Complete");
    console.log("==========================================\n");

    await pool.end();

  } catch (error) {
    console.error("\n❌ Health check failed:", error);
    throw error;
  }
}

checkHealth().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
