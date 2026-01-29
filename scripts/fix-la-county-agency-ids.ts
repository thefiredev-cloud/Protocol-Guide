/**
 * Fix LA County Agency IDs
 * 
 * Updates manus_protocol_chunks to set proper agency_id values
 * based on agency_name matching
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Fixing LA County Agency IDs\n');
  
  // Step 1: Get LA County agency ID
  const { data: laAgency, error: e1 } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('name', 'Los Angeles County EMS Agency')
    .single();
  
  if (!laAgency) {
    console.error('LA County agency not found in agencies table');
    return;
  }
  
  console.log(`✅ Found LA County Agency: ID ${laAgency.id}`);
  
  // Step 2: Count chunks that need updating
  const { count: nullCount, error: e2 } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('agency_name', 'Los Angeles County EMS Agency')
    .is('agency_id', null);
  
  console.log(`Found ${nullCount || 0} LA County chunks with NULL agency_id`);
  
  if (!nullCount || nullCount === 0) {
    console.log('Nothing to fix!');
    return;
  }
  
  // Step 3: Update the chunks
  console.log(`\nUpdating agency_id to ${laAgency.id}...`);
  
  const { error: updateError, count: updatedCount } = await supabase
    .from('manus_protocol_chunks')
    .update({ agency_id: laAgency.id })
    .eq('agency_name', 'Los Angeles County EMS Agency')
    .is('agency_id', null);
  
  if (updateError) {
    console.error('Update failed:', updateError);
    return;
  }
  
  console.log(`✅ Updated ${updatedCount || nullCount} chunks`);
  
  // Step 4: Verify the fix
  const { count: verifyCount } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', laAgency.id);
  
  console.log(`\n✅ Verification: LA County now has ${verifyCount || 0} chunks with agency_id=${laAgency.id}`);
  
  // Step 5: Do the same for all CA agencies
  console.log('\n📋 Checking other CA agencies with NULL agency_ids...');
  
  // Get all CA agencies
  const { data: caAgencies } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('state_code', 'CA');
  
  for (const agency of (caAgencies || [])) {
    const { count } = await supabase
      .from('manus_protocol_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('agency_name', agency.name)
      .is('agency_id', null);
    
    if (count && count > 0) {
      console.log(`  Found ${count} chunks for ${agency.name} with NULL agency_id`);
      
      const { error } = await supabase
        .from('manus_protocol_chunks')
        .update({ agency_id: agency.id })
        .eq('agency_name', agency.name)
        .is('agency_id', null);
      
      if (error) {
        console.log(`    ❌ Update failed: ${error.message}`);
      } else {
        console.log(`    ✅ Updated ${count} chunks`);
      }
    }
  }
  
  console.log('\n✅ Done! Run debug-county-filter.ts to verify the fix.');
}

main().catch(console.error);
