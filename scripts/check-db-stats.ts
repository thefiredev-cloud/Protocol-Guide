import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Count total protocol_chunks
  const { count: totalChunks } = await supabase
    .from('protocol_chunks')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total protocol_chunks:', totalChunks);

  // Get sample chunks
  const { data: sampleChunks } = await supabase
    .from('protocol_chunks')
    .select('county_id, protocol_number, protocol_title')
    .limit(10);
  
  console.log('\nSample chunks:', sampleChunks);

  // Check Placer County specifically
  const { data: placerChunks, count: placerCount } = await supabase
    .from('protocol_chunks')
    .select('*', { count: 'exact' })
    .eq('county_id', 207);
  
  console.log('\nPlacer County (207) chunks:', placerCount);

  // Get California counties that have protocols
  const caCountyIds = Array.from({ length: 58 }, (_, i) => 177 + i);
  
  for (const countyId of [177, 183, 185, 191, 195, 197, 200, 204, 206, 207, 209, 210, 213, 214, 215, 216, 217, 218, 219, 220, 224, 232, 233]) {
    const { count } = await supabase
      .from('protocol_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('county_id', countyId);
    
    const { data: county } = await supabase
      .from('counties')
      .select('name')
      .eq('id', countyId)
      .single();
    
    if (count && count > 0) {
      console.log(`  ${county?.name}: ${count} chunks`);
    }
  }
}

check();
