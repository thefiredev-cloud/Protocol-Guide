// Test the ACTUAL production flow - simulates frontend API call
const fetch = require('node-fetch');
require('dotenv').config();

const PRODUCTION_API = 'https://protocol-guide.com/api/trpc';

async function generateEmbedding(text) {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'voyage-large-2',
    }),
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function testProduction() {
  console.log('🌐 Testing PRODUCTION site (protocol-guide.com)...\n');
  
  const query = 'cardiac arrest adult';
  console.log(`Query: "${query}"`);
  
  // Generate embedding
  console.log('\n📡 Generating embedding...');
  const embedding = await generateEmbedding(query);
  
  // Test 1: Search with California filter (what user selected)
  console.log('\n🧪 Test: User selects California + Los Angeles, searches "cardiac arrest"');
  console.log('Expected: ONLY California protocols');
  console.log('');
  
  const tRPCRequest = {
    '0': {
      json: {
        query: query,
        limit: 10,
        stateFilter: 'California'
      }
    }
  };
  
  console.log('Making tRPC request to production...');
  const response = await fetch(`${PRODUCTION_API}/search.semantic?batch=1&input=${encodeURIComponent(JSON.stringify(tRPCRequest))}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    return;
  }
  
  const data = await response.json();
  console.log('\n📊 Results:');
  
  if (data && data[0] && data[0].result && data[0].result.data && data[0].result.data.json) {
    const results = data[0].result.data.json.results;
    console.log(`✅ Found ${results.length} protocols\n`);
    
    // Check state_code field
    const statesFound = new Set();
    const protocolsWithState = [];
    const protocolsWithoutState = [];
    
    results.forEach((r, i) => {
      if (r.state_code) {
        statesFound.add(r.state_code);
        protocolsWithState.push(r);
      } else {
        protocolsWithoutState.push(r);
      }
      
      if (i < 5) {
        const stateInfo = r.state_code ? `(${r.state_code})` : '(NO STATE)';
        console.log(`${i+1}. ${r.protocolTitle} ${stateInfo}`);
      }
    });
    
    console.log('\n📍 State distribution:');
    if (statesFound.size > 0) {
      console.log(`   States found: ${[...statesFound].join(', ')}`);
    } else {
      console.log('   ⚠️  No state_code field in results!');
    }
    
    if (protocolsWithoutState.length > 0) {
      console.log(`   ⚠️  ${protocolsWithoutState.length} protocols missing state_code`);
    }
    
    // VERDICT
    console.log('\n' + '='.repeat(70));
    if (statesFound.size === 0) {
      console.log('❌ FAIL: Results have no state_code field');
      console.log('   Problem: Backend not returning state_code in response');
      console.log('   Fix needed: Update backend search router to include state_code');
    } else if (statesFound.size === 1 && statesFound.has('CA')) {
      console.log('✅ PASS: All results are California!');
      console.log('   State filter is working correctly.');
    } else {
      console.log(`❌ FAIL: Found multiple states: ${[...statesFound].join(', ')}`);
      console.log('   Illinois protocols are still leaking through!');
      
      // Show which results are wrong
      results.forEach(r => {
        if (r.state_code && r.state_code !== 'CA') {
          console.log(`   ❌ ${r.protocolTitle} (${r.state_code})`);
        }
      });
    }
    
  } else {
    console.error('❌ Unexpected response structure');
    console.log(JSON.stringify(data, null, 2));
  }
}

testProduction().catch(console.error);
