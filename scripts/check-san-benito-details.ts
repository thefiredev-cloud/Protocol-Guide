import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get distinct sections
  const { data: sections } = await supabase
    .from('manus_protocol_chunks')
    .select('section')
    .ilike('agency_name', '%san benito%');
  
  const uniqueSections = [...new Set(sections?.map(s => s.section))].sort();
  console.log('\nSections:');
  uniqueSections.forEach(s => console.log(`  - ${s}`));
  
  // Get protocol numbers and titles
  const { data: protocols } = await supabase
    .from('manus_protocol_chunks')
    .select('protocol_number, protocol_title')
    .ilike('agency_name', '%san benito%');
  
  const uniqueProtocols = [...new Map(protocols?.map(p => [p.protocol_number, p.protocol_title]))];
  console.log(`\nTotal unique protocols: ${uniqueProtocols.length}`);
  console.log('\nSample protocols (first 15):');
  uniqueProtocols.slice(0, 15).forEach(([num, title]) => {
    console.log(`  ${num}: ${title}`);
  });
  
  // Check embedding coverage
  const { data: withEmbedding, count: embeddingCount } = await supabase
    .from('manus_protocol_chunks')
    .select('id', { count: 'exact', head: true })
    .ilike('agency_name', '%san benito%')
    .not('embedding', 'is', null);
  
  console.log(`\nChunks with embeddings: ${embeddingCount}/185`);
}

main();
