import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get all tables
  const { data: tables, error: tablesErr } = await supabase.rpc('get_tables');
  console.log('Tables via RPC:', tables, tablesErr);
  
  // Try direct query
  const { data, error } = await supabase
    .from('protocol_chunks')
    .select('id, county_id, protocol_number')
    .order('id', { ascending: false })
    .limit(5);
  
  console.log('\nRecent protocol_chunks:');
  console.log('Data:', data);
  console.log('Error:', error);

  // Try manus_protocol_chunks
  const { data: manus, error: manusErr } = await supabase
    .from('manus_protocol_chunks')
    .select('id, agency_name, protocol_number')
    .limit(5);
  
  console.log('\nmanus_protocol_chunks:');
  console.log('Data:', manus);
  console.log('Error:', manusErr);

  // Check counties for California
  const { data: caCount, error: caErr } = await supabase
    .from('protocol_chunks')
    .select('county_id')
    .gte('county_id', 177)
    .lte('county_id', 234);
  
  console.log('\nCA county chunks count:', caCount?.length);
}

check();
