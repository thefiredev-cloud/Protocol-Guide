import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  const { data, error } = await supabase
    .from('manus_protocol_chunks')
    .select('id, protocol_number, protocol_title, section, agency_name, state_code, state_name, source_pdf_url, content')
    .eq('protocol_number', 'LA-DROP');
  
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  console.log('\n=== LA-DROP Chunks in Database ===\n');
  console.log(`Total chunks: ${data?.length}\n`);
  
  data?.forEach((chunk, i) => {
    console.log(`--- Chunk ${i + 1} ---`);
    console.log(`ID: ${chunk.id}`);
    console.log(`Title: ${chunk.protocol_title}`);
    console.log(`Section: ${chunk.section}`);
    console.log(`Agency: ${chunk.agency_name}`);
    console.log(`State: ${chunk.state_name} (${chunk.state_code})`);
    console.log(`Source URL: ${chunk.source_pdf_url}`);
    console.log(`Content preview: ${chunk.content?.substring(0, 150)}...`);
    console.log();
  });
}

verify();
