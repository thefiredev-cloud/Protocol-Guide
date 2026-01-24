import "./load-env.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { counties } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool);

  try {
    const total = await db.select({ count: sql<number>`COUNT(*)` }).from(counties);
    console.log("Total entities in database:", total[0].count);

    const rows = await db.execute(sql`SELECT state, COUNT(*) as count FROM counties GROUP BY state ORDER BY count DESC LIMIT 25`);
    console.log("\nTop 25 states by entity count:");
    rows.rows.forEach((row: any) => {
      console.log(`  ${row.state}: ${row.count}`);
    });
  } catch (error) {
    console.error("Error checking database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

check().catch(console.error);
