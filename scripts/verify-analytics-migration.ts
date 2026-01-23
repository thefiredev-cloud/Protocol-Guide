/**
 * Verify Analytics Migration
 *
 * Checks if all 9 analytics tables were created successfully
 * and verifies their indexes.
 */

import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function verifyAnalyticsMigration() {
  console.log('🔍 Verifying Analytics Migration for Protocol Guide...\n');

  const db = await getDb();

  try {
    // Check if analytics tables exist
    const tables = await db.execute(sql`
      SELECT TABLE_NAME, TABLE_ROWS,
             ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as SIZE_MB
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'analytics_events',
        'search_analytics',
        'protocol_access_logs',
        'session_analytics',
        'daily_metrics',
        'retention_cohorts',
        'content_gaps',
        'conversion_events',
        'feature_usage_stats'
      )
      ORDER BY TABLE_NAME
    `);

    console.log('✓ Analytics Tables Created:\n');
    console.table(tables.rows);
    console.log(`\nTotal: ${tables.rows.length} / 9 tables`);

    if (tables.rows.length === 9) {
      console.log('✅ All analytics tables exist!\n');
    } else {
      console.log('⚠️  Some analytics tables are missing!\n');
      const expectedTables = [
        'analytics_events',
        'search_analytics',
        'protocol_access_logs',
        'session_analytics',
        'daily_metrics',
        'retention_cohorts',
        'content_gaps',
        'conversion_events',
        'feature_usage_stats'
      ];
      const existingTables = tables.rows.map((r: any) => r.TABLE_NAME);
      const missingTables = expectedTables.filter(t => !existingTables.includes(t));
      console.log('Missing tables:', missingTables);
      return;
    }

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'analytics_events',
        'search_analytics',
        'protocol_access_logs',
        'session_analytics',
        'daily_metrics',
        'retention_cohorts',
        'content_gaps',
        'conversion_events',
        'feature_usage_stats'
      )
      AND INDEX_NAME != 'PRIMARY'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log(`✓ Indexes Created: ${indexes.rows.length} index columns\n`);

    // Group by table
    const indexesByTable: Record<string, string[]> = {};
    for (const row of indexes.rows as any[]) {
      if (!indexesByTable[row.TABLE_NAME]) {
        indexesByTable[row.TABLE_NAME] = [];
      }
      indexesByTable[row.TABLE_NAME].push(row.INDEX_NAME);
    }

    console.log('Indexes per table:\n');
    for (const [table, idxs] of Object.entries(indexesByTable)) {
      const uniqueIndexes = [...new Set(idxs)];
      console.log(`  ${table.padEnd(30)} ${uniqueIndexes.length} indexes`);
    }

    // Verify specific critical indexes
    console.log('\n🔍 Checking critical analytics indexes:\n');

    const criticalIndexes = [
      { table: 'analytics_events', index: 'idx_event_type' },
      { table: 'analytics_events', index: 'idx_user_id' },
      { table: 'analytics_events', index: 'idx_timestamp' },
      { table: 'search_analytics', index: 'idx_user_search' },
      { table: 'search_analytics', index: 'idx_no_results' },
      { table: 'protocol_access_logs', index: 'idx_protocol' },
      { table: 'protocol_access_logs', index: 'idx_user_access' },
      { table: 'session_analytics', index: 'idx_user_session' },
      { table: 'daily_metrics', index: 'unique_daily' },
      { table: 'retention_cohorts', index: 'unique_cohort' },
    ];

    const allIndexes = indexes.rows as any[];
    for (const { table, index } of criticalIndexes) {
      const exists = allIndexes.some(i => i.TABLE_NAME === table && i.INDEX_NAME === index);
      if (exists) {
        console.log(`  ✓ ${table}.${index}`);
      } else {
        console.log(`  ✗ ${table}.${index} - MISSING!`);
      }
    }

    console.log('\n✅ Analytics migration verification complete!\n');

    // Display next steps
    console.log('📋 Next Steps:\n');
    console.log('  1. Implement analytics tracking middleware');
    console.log('  2. Add search analytics logging');
    console.log('  3. Track protocol access events');
    console.log('  4. Set up daily aggregation jobs');
    console.log('  5. Build analytics dashboard\n');

  } catch (error) {
    console.error('❌ Error verifying analytics migration:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyAnalyticsMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyAnalyticsMigration };
