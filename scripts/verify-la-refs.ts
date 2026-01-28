import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Verifying LA County Destination Reference Documents\n');
  
  // Get all LA County chunks
  const { count: totalCount } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('agency_name', 'Los Angeles County EMS Agency');
  
  console.log(`Total LA County chunks: ${totalCount}`);
  
  // Get reference documents specifically
  const { data: refDocs, error } = await supabase
    .from('manus_protocol_chunks')
    .select('protocol_title, section, content')
    .eq('agency_name', 'Los Angeles County EMS Agency')
    .like('protocol_title', 'Ref%');
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  // Group by title
  const byTitle = new Map<string, { section: string; chunks: number }>();
  refDocs?.forEach(d => {
    const existing = byTitle.get(d.protocol_title);
    if (existing) {
      existing.chunks++;
    } else {
      byTitle.set(d.protocol_title, { section: d.section, chunks: 1 });
    }
  });
  
  console.log(`\nReference documents indexed (${byTitle.size} unique):\n`);
  
  const sorted = Array.from(byTitle.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [title, info] of sorted) {
    console.log(`  ✓ ${title}`);
    console.log(`    Section: ${info.section}, Chunks: ${info.chunks}`);
  }
  
  console.log('\n✓ Verification complete');
}

main();
