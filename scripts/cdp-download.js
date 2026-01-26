// Use CDP to fetch PDF from browser
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'data', 'san-benito-protocols', 'SBC_Manual_2025_CDP.pdf');

async function main() {
  try {
    const client = await CDP({ port: 18800 });
    const { Network, Page, Fetch } = client;
    
    // Enable network
    await Network.enable();
    await Fetch.enable({
      patterns: [{ urlPattern: '*', requestStage: 'Response' }]
    });

    // Look for PDF responses
    Fetch.on('requestPaused', async (params) => {
      const { requestId, responseHeaders, responseStatusCode } = params;
      
      // Check if it's the PDF
      const contentType = responseHeaders?.find(h => h.name.toLowerCase() === 'content-type');
      if (contentType?.value?.includes('pdf')) {
        console.log('Found PDF response!');
        const body = await Fetch.getResponseBody({ requestId });
        const buffer = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8');
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved ${buffer.length} bytes to ${outputPath}`);
      }
      
      await Fetch.continueRequest({ requestId });
    });

    // Navigate to PDF
    await Page.navigate({ url: 'https://www.sanbenitocountyca.gov/home/showpublisheddocument/13572/638733278379100000' });
    
    // Wait for loading
    await new Promise(r => setTimeout(r, 10000));
    
    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
