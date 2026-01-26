import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get schema info for manus_protocol_chunks
  const { data: sample, error: sampleErr } = await supabase
    .from('manus_protocol_chunks')
    .select('*')
    .limit(1);
  
  console.log('Schema (sample row):', sample?.[0] ? Object.keys(sample[0]) : [], sampleErr);

  // Check for California agencies
  const { data: caChunks, error: caErr } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_name, state_code')
    .or('state_code.eq.CA,agency_name.ilike.%california%,agency_name.ilike.%sacramento%,agency_name.ilike.%los angeles%,agency_name.ilike.%orange%,agency_name.ilike.%san diego%')
    .limit(100);
  
  // Get distinct agencies  
  const agencySet = new Set<string>();
  caChunks?.forEach(c => agencySet.add(`${c.agency_name} (${c.state_code})`));
  
  console.log('\nCalifornia-related agencies found:');
  [...agencySet].forEach(a => console.log(`  ${a}`));

  // Count all chunks by state_code
  const { data: allChunks } = await supabase
    .from('manus_protocol_chunks')
    .select('state_code, agency_name')
    .limit(10000);
  
  const stateCount = new Map<string, number>();
  const agencyCount = new Map<string, number>();
  allChunks?.forEach(c => {
    stateCount.set(c.state_code, (stateCount.get(c.state_code) || 0) + 1);
    if (c.state_code === 'CA') {
      agencyCount.set(c.agency_name, (agencyCount.get(c.agency_name) || 0) + 1);
    }
  });
  
  console.log('\nChunks by state:');
  [...stateCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  console.log('\nCA agencies with chunk counts:');
  [...agencyCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([agency, count]) => {
    console.log(`  ${agency}: ${count}`);
  });
}

check();
