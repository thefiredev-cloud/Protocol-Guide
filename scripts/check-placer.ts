import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Check counties table for California counties
  const { data: caCounties, error: e1 } = await supabase
    .from('counties')
    .select('id, name, state')
    .eq('state', 'California')
    .order('name');
  
  console.log('California counties in database:');
  caCounties?.forEach(c => console.log(`  ${c.id}: ${c.name}`));
  console.log(`Total: ${caCounties?.length || 0} counties`);
  
  // Check if Placer exists
  const placer = caCounties?.find(c => c.name.toLowerCase().includes('placer'));
  console.log('\nPlacer County:', placer || 'NOT FOUND');

  // Check protocol_chunks for California
  const { data: chunks, error: e2 } = await supabase
    .from('protocol_chunks')
    .select('county_id, count:id')
    .limit(5000);
  
  // Group by county_id
  const countyChunks = new Map<number, number>();
  chunks?.forEach(c => {
    const count = countyChunks.get(c.county_id) || 0;
    countyChunks.set(c.county_id, count + 1);
  });
  
  console.log('\nCounties with protocol_chunks:');
  for (const [countyId, count] of [...countyChunks.entries()].sort((a,b) => b[1] - a[1]).slice(0, 30)) {
    const county = caCounties?.find(c => c.id === countyId);
    console.log(`  ${countyId}: ${county?.name || 'Unknown'} - ${count} chunks`);
  }

  // Check agencies table
  const { data: agencies, error: e3 } = await supabase
    .from('agencies')
    .select('id, name, state, county_name')
    .or('state.eq.California,state.eq.CA')
    .order('name');
  
  console.log('\nCalifornia agencies:', agencies?.length);
  agencies?.slice(0, 20).forEach(a => console.log(`  ${a.id}: ${a.name} (${a.county_name})`));
}

check();
