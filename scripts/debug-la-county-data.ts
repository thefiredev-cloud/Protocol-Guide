/**
 * Debug LA County Data Location
 * 
 * Find where LA County protocols actually are in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Finding LA County Protocol Data\n');
  
  // Check manus_protocol_chunks for any LA-related entries
  console.log('1. Searching manus_protocol_chunks for LA-related agency names...');
  
  const { data: laChunks, error: e1 } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_id, agency_name, state_code')
    .or('agency_name.ilike.%los angeles%,agency_name.ilike.%la county%,agency_name.ilike.%l.a.%')
    .limit(10);
  
  console.log(`Found: ${laChunks?.length || 0} chunks with LA-related names`);
  if (laChunks && laChunks.length > 0) {
    console.log('Sample:', laChunks.slice(0, 3));
  }
  
  // Check all distinct agency names
  console.log('\n2. All distinct agency names in manus_protocol_chunks:');
  
  const { data: allNames, error: e2 } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_name')
    .limit(1000);
  
  const uniqueNames = [...new Set(allNames?.map(r => r.agency_name).filter(Boolean))];
  console.log(`Found ${uniqueNames.length} unique agency names:`);
  uniqueNames.sort().forEach(name => console.log(`  - ${name}`));
  
  // Check agencies table for LA County
  console.log('\n3. Checking agencies table for LA County...');
  
  const { data: laAgency, error: e3 } = await supabase
    .from('agencies')
    .select('*')
    .or('name.ilike.%los angeles%,name.ilike.%la county%');
  
  console.log(`Found ${laAgency?.length || 0} LA agencies:`);
  laAgency?.forEach(a => {
    console.log(`  - ID: ${a.id}, Name: ${a.name}, State: ${a.state_code}`);
  });
  
  // Check if there are chunks with LA agency IDs
  console.log('\n4. Checking chunks by LA agency IDs...');
  
  if (laAgency && laAgency.length > 0) {
    for (const agency of laAgency) {
      const { count, error } = await supabase
        .from('manus_protocol_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agency.id);
      
      console.log(`  Agency ${agency.id} (${agency.name}): ${count || 0} chunks`);
    }
  }
  
  // Check total chunks and distribution
  console.log('\n5. Total chunk count and state distribution:');
  
  const { data: stateDist, error: e5 } = await supabase
    .from('manus_protocol_chunks')
    .select('state_code');
  
  const stateCount: Record<string, number> = {};
  stateDist?.forEach(r => {
    const state = r.state_code || 'NULL';
    stateCount[state] = (stateCount[state] || 0) + 1;
  });
  
  console.log('Chunks by state:');
  Object.entries(stateCount)
    .sort(([,a], [,b]) => b - a)
    .forEach(([state, count]) => console.log(`  ${state}: ${count}`));
  
  // Check if there's another protocol chunks table
  console.log('\n6. Checking for other protocol-related tables...');
  
  // Try protocol_chunks table
  try {
    const { count: pcCount } = await supabase
      .from('protocol_chunks')
      .select('*', { count: 'exact', head: true });
    console.log(`  protocol_chunks table: ${pcCount || 'N/A'} rows`);
  } catch (e) {
    console.log('  protocol_chunks table: does not exist');
  }
  
  // Check local protocol data
  console.log('\n7. Checking if LA County data exists in local data/ folder...');
  console.log('   (Check C:\\Users\\Tanner\\Protocol-Guide\\data\\la-county-protocols\\)');
}

main().catch(console.error);
