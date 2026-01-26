import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  // Count SSVEMS chunks
  const { data: chunks, count } = await supabase
    .from('manus_protocol_chunks')
    .select('protocol_number, protocol_title, content', { count: 'exact' })
    .eq('agency_name', 'Sierra-Sacramento Valley EMS Agency')
    .order('protocol_number');
  
  console.log('='.repeat(60));
  console.log('SSVEMS Protocol Verification');
  console.log('='.repeat(60));
  console.log(`Total chunks: ${count}`);
  
  // Group by protocol
  const protocols = new Map<string, { title: string; chunks: number; sampleContent: string }>();
  chunks?.forEach(c => {
    const existing = protocols.get(c.protocol_number);
    if (existing) {
      existing.chunks++;
    } else {
      protocols.set(c.protocol_number, { 
        title: c.protocol_title, 
        chunks: 1,
        sampleContent: c.content.substring(0, 100)
      });
    }
  });
  
  console.log(`\nUnique protocols: ${protocols.size}`);
  console.log('\nProtocol list:');
  [...protocols.entries()].forEach(([num, info]) => {
    console.log(`  ${num.padEnd(10)} ${info.title.substring(0, 50).padEnd(52)} [${info.chunks} chunks]`);
  });
  
  // Sample content check
  console.log('\nSample content from first chunk:');
  if (chunks && chunks[0]) {
    console.log(`  Protocol: ${chunks[0].protocol_number} - ${chunks[0].protocol_title}`);
    console.log(`  Content preview: ${chunks[0].content.substring(0, 200)}...`);
  }
  
  // Check CA agencies summary
  const { data: caAgencies } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_name')
    .eq('state_code', 'CA')
    .limit(5000);
  
  const agencyCount = new Map<string, number>();
  caAgencies?.forEach(c => {
    agencyCount.set(c.agency_name, (agencyCount.get(c.agency_name) || 0) + 1);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('California EMS Agencies in Database:');
  console.log('='.repeat(60));
  [...agencyCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([agency, cnt]) => {
    console.log(`  ${agency}: ${cnt} chunks`);
  });
}

verify();
