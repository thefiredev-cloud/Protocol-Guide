/**
 * Download San Benito County EMS PDF using Playwright
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PDF_URL = 'https://www.sanbenitocountyca.gov/home/showpublisheddocument/13572/638733278379100000';
const REFERRER = 'https://www.sanbenitocountyca.gov/departments/office-of-emergency-services-oes-and-emergency-medical-services/emergency-medical-services-ems/policy-and-procedure-manual';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'san-benito-protocols', 'SBC_EMS_Manual_2025_Full.pdf');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // First visit the referrer page to establish session
  console.log('Visiting referrer page...');
  await page.goto(REFERRER, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Set up download listener
  console.log('Navigating to PDF...');
  
  // Use route to intercept the PDF response
  let pdfBuffer: Buffer | null = null;
  
  await page.route('**/*.pdf', async (route) => {
    console.log('Intercepted PDF route');
    const response = await route.fetch();
    pdfBuffer = await response.body();
    console.log(`Got PDF: ${pdfBuffer.length} bytes`);
    await route.fulfill({ response });
  });
  
  // Also listen for response
  page.on('response', async (response) => {
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/pdf') && !pdfBuffer) {
      try {
        pdfBuffer = await response.body();
        console.log(`Got PDF from response: ${pdfBuffer.length} bytes`);
      } catch (e) {
        // May fail if already consumed
      }
    }
  });
  
  // Navigate to PDF
  try {
    await page.goto(PDF_URL, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.log('Navigation completed or timed out');
  }
  
  await page.waitForTimeout(5000);
  
  // If we got the PDF, save it
  if (pdfBuffer && pdfBuffer.length > 1000) {
    fs.writeFileSync(OUTPUT_PATH, pdfBuffer);
    console.log(`Saved ${pdfBuffer.length} bytes to ${OUTPUT_PATH}`);
  } else {
    console.log('PDF not captured via route. Trying alternative method...');
    
    // Try to fetch via page context
    const result = await page.evaluate(async (url) => {
      try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) return { error: `HTTP ${response.status}` };
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ base64, size: blob.size });
          };
          reader.readAsDataURL(blob);
        });
      } catch (e: any) {
        return { error: e.message };
      }
    }, PDF_URL);
    
    console.log('Fetch result:', typeof result === 'object' && 'size' in result ? `${result.size} bytes` : result);
    
    if (result && typeof result === 'object' && 'base64' in result) {
      const buffer = Buffer.from(result.base64 as string, 'base64');
      fs.writeFileSync(OUTPUT_PATH, buffer);
      console.log(`Saved ${buffer.length} bytes to ${OUTPUT_PATH}`);
    }
  }
  
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
