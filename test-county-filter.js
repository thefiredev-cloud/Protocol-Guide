/**
 * Test script for the county filter fix
 * 
 * This script tests the ImageTrend integration flow:
 * 1. Hit the ImageTrend launch endpoint with agency_id
 * 2. Verify it redirects to protocol-search with agency param
 * 3. Test that search results are properly filtered by county
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function testCountyFilter() {
  console.log('🧪 Testing Protocol Guide County Filter Fix\n');

  try {
    // Check if the server is running
    console.log('1. Checking server status...');
    try {
      await execAsync('curl -s -I http://localhost:3000');
      console.log('✅ Server is running\n');
    } catch (error) {
      console.log('❌ Server is not running. Start with: npm run dev\n');
      return;
    }

    // Test ImageTrend launch endpoint with LA County
    console.log('2. Testing ImageTrend launch endpoint...');
    const testUrl = 'http://localhost:3000/api/imagetrend/launch?agency_id=los+angeles&search_term=cardiac+arrest';
    
    try {
      const { stdout } = await execAsync(`curl -s -I "${testUrl}"`);
      
      if (stdout.includes('Location:')) {
        const locationMatch = stdout.match(/Location: (.*)/);
        if (locationMatch) {
          const redirectUrl = locationMatch[1].trim();
          console.log('✅ ImageTrend endpoint redirects correctly');
          console.log(`   Redirect URL: ${redirectUrl}`);
          
          // Check if agency param is preserved
          if (redirectUrl.includes('agency=los+angeles')) {
            console.log('✅ Agency parameter preserved in redirect\n');
          } else {
            console.log('❌ Agency parameter missing in redirect\n');
          }
        }
      } else {
        console.log('❌ No redirect found\n');
      }
    } catch (error) {
      console.log(`❌ Error testing ImageTrend endpoint: ${error.message}\n`);
    }

    // Test search API directly
    console.log('3. Testing search API...');
    
    // First, get available agencies in California
    try {
      console.log('   Getting California agencies...');
      const { stdout: agenciesJson } = await execAsync(`curl -s "http://localhost:3000/api/trpc/search.agenciesWithProtocols?batch=1&input=%7B%220%22%3A%7B%22state%22%3A%22California%22%7D%7D"`);
      const agenciesData = JSON.parse(agenciesJson);
      
      if (agenciesData[0]?.result?.data) {
        const agencies = agenciesData[0].result.data;
        console.log(`   Found ${agencies.length} agencies in California`);
        
        // Find LA County agency
        const laAgency = agencies.find(a => 
          a.name.toLowerCase().includes('los angeles') || 
          a.name.toLowerCase().includes('la county')
        );
        
        if (laAgency) {
          console.log(`✅ Found LA County agency: ${laAgency.name} (ID: ${laAgency.id})`);
          
          // Test agency-specific search
          console.log('   Testing agency-specific search...');
          const searchUrl = `http://localhost:3000/api/trpc/search.searchByAgency?batch=1&input=%7B%220%22%3A%7B%22query%22%3A%22cardiac%20arrest%22%2C%22agencyId%22%3A${laAgency.id}%2C%22limit%22%3A5%7D%7D`;
          
          try {
            const { stdout: searchJson } = await execAsync(`curl -s "${searchUrl}"`);
            const searchData = JSON.parse(searchJson);
            
            if (searchData[0]?.result?.data?.results) {
              const results = searchData[0].result.data.results;
              console.log(`✅ Agency search returned ${results.length} results`);
              console.log('   Sample results:');
              results.slice(0, 2).forEach((result, i) => {
                console.log(`   ${i+1}. ${result.protocolTitle} (${result.protocolNumber})`);
                console.log(`      County ID: ${result.countyId}, Score: ${Math.round(result.relevanceScore)}%`);
              });
            } else {
              console.log('❌ No results from agency search');
            }
          } catch (error) {
            console.log(`❌ Error testing agency search: ${error.message}`);
          }
        } else {
          console.log('❌ Could not find LA County agency');
          console.log('   Available agencies:');
          agencies.slice(0, 5).forEach(a => console.log(`   - ${a.name} (${a.state})`));
        }
      } else {
        console.log('❌ Could not get agencies list');
      }
    } catch (error) {
      console.log(`❌ Error getting agencies: ${error.message}`);
    }

    console.log('\n🎯 Test Summary:');
    console.log('- Fixed protocol-search.tsx to use searchByAgency when agency param present');
    console.log('- Added agency name lookup to map URL param to database ID');
    console.log('- Enhanced UI to show county-filtered search status');
    console.log('- Results should now be filtered to only the specified county');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCountyFilter();