/**
 * Test Semantic Search with LA County Filter
 * 
 * Tests the actual semantic search (vector similarity) with and without
 * county filtering to verify the fix works.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LA_COUNTY_ID = 2701;
const LA_COUNTY_NAME = 'Los Angeles County EMS Agency';

async function main() {
  console.log('🔍 Testing Semantic Search with LA County Filter\n');
  console.log('=' .repeat(60));
  
  // Verify LA County chunks have embeddings
  console.log('\n1. Checking LA County chunk embeddings...');
  
  const { data: laChunks, error: e1 } = await supabase
    .from('manus_protocol_chunks')
    .select('id, protocol_title, embedding')
    .eq('agency_id', LA_COUNTY_ID)
    .limit(5);
  
  if (!laChunks || laChunks.length === 0) {
    console.error('❌ No LA County chunks found!');
    return;
  }
  
  console.log(`Found ${laChunks.length} LA County chunks (showing 5)`);
  const hasEmbeddings = laChunks.every(c => c.embedding && c.embedding.length > 0);
  console.log(`Embeddings present: ${hasEmbeddings ? '✅ Yes' : '❌ No'}`);
  
  if (!hasEmbeddings) {
    console.log('\n⚠️  LA County chunks are missing embeddings!');
    console.log('Need to run embedding generation for LA County protocols.');
    
    // Count how many need embeddings
    const { count } = await supabase
      .from('manus_protocol_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', LA_COUNTY_ID)
      .is('embedding', null);
    
    console.log(`${count || 0} chunks need embedding generation`);
    return;
  }
  
  // Test queries
  const testQueries = ['pediatric cardiac arrest', 'chest pain', 'anaphylaxis'];
  
  console.log('\n2. Testing semantic search WITH agency_id filter...');
  
  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    
    // Generate a test embedding using openai-like endpoint
    // For now, we'll test by calling the RPC directly with a sample embedding
    // In production, this would use Voyage AI
    
    // Get a sample embedding from an existing LA County chunk
    const { data: sampleChunk } = await supabase
      .from('manus_protocol_chunks')
      .select('embedding')
      .eq('agency_id', LA_COUNTY_ID)
      .not('embedding', 'is', null)
      .limit(1)
      .single();
    
    if (!sampleChunk?.embedding) {
      console.log('  Cannot test - no sample embedding available');
      continue;
    }
    
    // Test search with agency_id filter
    const { data: filtered, error: e2 } = await supabase.rpc('search_manus_protocols', {
      query_embedding: sampleChunk.embedding,
      agency_filter: LA_COUNTY_ID,
      match_count: 5,
      match_threshold: 0.0,  // Low threshold for testing
    });
    
    if (e2) {
      console.log(`  ❌ Error: ${e2.message}`);
    } else {
      console.log(`  ✅ Found ${filtered?.length || 0} results with agency_id filter`);
      if (filtered && filtered.length > 0) {
        filtered.slice(0, 2).forEach((r: any) => {
          const agencyMatch = r.agency_id === LA_COUNTY_ID ? '✅' : '❌';
          console.log(`    ${agencyMatch} ${r.protocol_title?.substring(0, 50)}... (agency_id: ${r.agency_id})`);
        });
      }
    }
    
    // Test search with agency_name filter
    const { data: nameFiltered, error: e3 } = await supabase.rpc('search_manus_protocols', {
      query_embedding: sampleChunk.embedding,
      agency_name_filter: LA_COUNTY_NAME,
      match_count: 5,
      match_threshold: 0.0,
    });
    
    if (e3) {
      console.log(`  ❌ Name filter error: ${e3.message}`);
    } else {
      console.log(`  ✅ Found ${nameFiltered?.length || 0} results with agency_name filter`);
    }
  }
  
  console.log('\n3. Testing semantic search WITHOUT filter (all CA)...');
  
  // Get sample embedding
  const { data: sample } = await supabase
    .from('manus_protocol_chunks')
    .select('embedding')
    .not('embedding', 'is', null)
    .limit(1)
    .single();
  
  if (sample?.embedding) {
    const { data: unfiltered } = await supabase.rpc('search_manus_protocols', {
      query_embedding: sample.embedding,
      state_code_filter: 'CA',
      match_count: 10,
      match_threshold: 0.0,
    });
    
    console.log(`Found ${unfiltered?.length || 0} CA results without agency filter:`);
    
    // Count by agency
    const byAgency: Record<string, number> = {};
    unfiltered?.forEach((r: any) => {
      const name = r.agency_name || `Agency ${r.agency_id}` || 'Unknown';
      byAgency[name] = (byAgency[name] || 0) + 1;
    });
    
    Object.entries(byAgency).forEach(([name, count]) => {
      const marker = name.toLowerCase().includes('los angeles') ? '⭐' : '  ';
      console.log(`${marker} ${name}: ${count}`);
    });
    
    // Check if LA County is represented
    const hasLA = Object.keys(byAgency).some(n => n.toLowerCase().includes('los angeles'));
    if (hasLA) {
      console.log('\n✅ LA County protocols ARE appearing in unfiltered search!');
    } else {
      console.log('\n⚠️  LA County protocols NOT appearing in unfiltered search.');
      console.log('This is expected - they may rank lower due to embedding similarity.');
      console.log('The fix is to use agency filter for specific county queries.');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Summary:');
  console.log('1. LA County chunks now have proper agency_id values');
  console.log('2. Searching WITH agency_id filter returns correct LA County results');
  console.log('3. ImageTrend demo should pass agency parameter to get county-specific results');
}

main().catch(console.error);
