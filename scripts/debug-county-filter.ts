/**
 * Debug County Filter Bug
 * 
 * This script tests the county filter issue where generic queries like 
 * "pediatric cardiac arrest" return other CA counties instead of LA County.
 * 
 * Run with: npx tsx scripts/debug-county-filter.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test queries that should return LA County protocols
const TEST_QUERIES = [
  'pediatric cardiac arrest',
  'chest pain',
  'cardiac arrest',
  'anaphylaxis',
  'pediatric seizure',
];

// Target county for the demo
const TARGET_COUNTY = 'Los Angeles';

async function main() {
  console.log('🔍 County Filter Debug Script\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check what agencies/counties exist in the database
  console.log('\n📊 Step 1: Database Overview\n');
  
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, name, state_code, state')
    .eq('state_code', 'CA')
    .order('name');
  
  if (agenciesError) {
    console.error('Error fetching agencies:', agenciesError);
    return;
  }
  
  console.log(`Found ${agencies?.length || 0} California agencies:`);
  
  // Find LA County specifically
  const laAgency = agencies?.find(a => 
    a.name.toLowerCase().includes('los angeles') || 
    a.name.toLowerCase().includes('la county')
  );
  
  if (laAgency) {
    console.log(`✅ Found LA County: "${laAgency.name}" (ID: ${laAgency.id})`);
  } else {
    console.log('❌ LA County agency not found!');
    console.log('Available CA agencies:');
    agencies?.slice(0, 10).forEach(a => console.log(`  - ${a.name} (ID: ${a.id})`));
    return;
  }
  
  // Step 2: Count chunks by agency
  console.log('\n📊 Step 2: Protocol Chunks by County\n');
  
  const { data: chunkCounts, error: countError } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_id, agency_name')
    .eq('state_code', 'CA');
  
  if (countError) {
    console.error('Error fetching chunk counts:', countError);
    return;
  }
  
  // Group by agency
  const agencyChunks: Record<string, number> = {};
  chunkCounts?.forEach(chunk => {
    const name = chunk.agency_name || `Agency ${chunk.agency_id}`;
    agencyChunks[name] = (agencyChunks[name] || 0) + 1;
  });
  
  // Sort by count and display
  const sortedAgencies = Object.entries(agencyChunks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  
  console.log('Top 15 CA agencies by chunk count:');
  sortedAgencies.forEach(([name, count], i) => {
    const marker = name.toLowerCase().includes('los angeles') ? '⭐' : '  ';
    console.log(`${marker} ${i + 1}. ${name}: ${count.toLocaleString()} chunks`);
  });
  
  // Check LA County specifically
  const laChunkCount = Object.entries(agencyChunks)
    .find(([name]) => name.toLowerCase().includes('los angeles'));
  
  if (laChunkCount) {
    console.log(`\n✅ LA County has ${laChunkCount[1].toLocaleString()} indexed chunks`);
  } else {
    console.log('\n❌ LA County has no indexed chunks!');
  }
  
  // Step 3: Test search WITHOUT agency filter
  console.log('\n📊 Step 3: Search WITHOUT County Filter (BUG TEST)\n');
  
  for (const query of TEST_QUERIES.slice(0, 2)) {
    console.log(`Query: "${query}"`);
    
    // Generate a simple embedding for testing
    // Note: In production this uses Voyage AI, but for debugging we'll use raw SQL
    const { data: results, error: searchError } = await supabase
      .from('manus_protocol_chunks')
      .select('id, agency_name, protocol_title, state_code')
      .eq('state_code', 'CA')
      .textSearch('content', query.split(' ').join(' & '))
      .limit(10);
    
    if (searchError) {
      console.error(`  Error: ${searchError.message}`);
      continue;
    }
    
    console.log(`  Found ${results?.length || 0} results:`);
    
    // Count by agency
    const resultsByAgency: Record<string, number> = {};
    results?.forEach(r => {
      const name = r.agency_name || 'Unknown';
      resultsByAgency[name] = (resultsByAgency[name] || 0) + 1;
    });
    
    Object.entries(resultsByAgency).forEach(([name, count]) => {
      const marker = name.toLowerCase().includes('los angeles') ? '✅' : '❓';
      console.log(`  ${marker} ${name}: ${count} results`);
    });
    
    // Check if any LA County results
    const hasLA = Object.keys(resultsByAgency).some(
      name => name.toLowerCase().includes('los angeles')
    );
    
    if (!hasLA) {
      console.log('  ⚠️  BUG: No LA County results returned!');
    }
    console.log('');
  }
  
  // Step 4: Test search WITH agency filter
  console.log('\n📊 Step 4: Search WITH LA County Filter (EXPECTED BEHAVIOR)\n');
  
  for (const query of TEST_QUERIES.slice(0, 2)) {
    console.log(`Query: "${query}" (filtered to LA County ID: ${laAgency.id})`);
    
    const { data: results, error: searchError } = await supabase
      .from('manus_protocol_chunks')
      .select('id, agency_name, protocol_title, state_code')
      .eq('agency_id', laAgency.id)
      .textSearch('content', query.split(' ').join(' & '))
      .limit(10);
    
    if (searchError) {
      console.error(`  Error: ${searchError.message}`);
      continue;
    }
    
    console.log(`  Found ${results?.length || 0} LA County results`);
    
    if (results && results.length > 0) {
      console.log('  ✅ County filter working correctly');
      results.slice(0, 3).forEach(r => {
        console.log(`    - ${r.protocol_title?.substring(0, 60)}...`);
      });
    } else {
      console.log('  ⚠️  No results - check if LA County has this content');
    }
    console.log('');
  }
  
  // Step 5: Recommendations
  console.log('\n📋 Summary & Recommendations\n');
  console.log('=' .repeat(60));
  
  console.log(`
ISSUE: The semantic search without agency_filter returns results from ALL 
California counties. The vector similarity might rank other counties higher
if they have more specific or relevant embeddings for a given query.

CURRENT FIX (PR #2): 
- ImageTrend integration page uses searchByAgency when agency param is present
- Falls back to California state filter if agency not found

ADDITIONAL FIXES NEEDED:

1. DEFAULT COUNTY FOR IMAGETREND DEMO:
   When source=imagetrend but no agency specified, default to LA County:
   - Check for source=imagetrend in URL params
   - If no agency param, auto-set to LA County (ID: ${laAgency.id})

2. USER PREFERENCE STORAGE:
   Allow users to set their home county in settings
   Store in AsyncStorage/localStorage
   Use as default filter for all searches

3. SEARCH RANKING BOOST:
   Modify search_manus_protocols RPC to optionally boost results 
   from a preferred county even when not filtering strictly

The fix is partially complete. The ImageTrend deep-link flow with agency
parameter works. The remaining issue is generic searches without agency filter.
  `);
}

main().catch(console.error);
