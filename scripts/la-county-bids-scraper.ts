/**
 * LA County Bids Portal Scraper
 * Downloads and parses real solicitation data from LA County
 *
 * Source: https://camisvr.co.la.ca.us/lacobids/BidLookUp/OpenBidList
 * Output: scripts/output/la-county-bids-data.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface BidRecord {
  bidUrl: string;
  bidNumber: string;
  title: string;
  bidType: string;
  department: string;
  description: string;
  commodityCode: string;
  commodityDescription: string;
  openDate: string;
  closingDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

interface ScraperResult {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  totalBids: number;
  bids: BidRecord[];
  byDepartment: Record<string, { count: number; bids: string[] }>;
  byBidType: Record<string, { count: number }>;
  byCommodity: Record<string, { count: number }>;
  upcomingClosings: BidRecord[];
  closingSoon: BidRecord[];
}

const CSV_URL = 'https://camisvr.co.la.ca.us/LACoBids/Download/Rpt_Listing/OpenBidList.csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function parseCSV(csvContent: string): BidRecord[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Skip header row
  const records: BidRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 12) continue;

    // Clean up commodity code (remove leading =")
    let commodityCode = fields[6] || '';
    if (commodityCode.startsWith('="')) {
      commodityCode = commodityCode.slice(2);
    }
    if (commodityCode.endsWith('"')) {
      commodityCode = commodityCode.slice(0, -1);
    }

    records.push({
      bidUrl: fields[0] || '',
      bidNumber: fields[1] || '',
      title: fields[2] || '',
      bidType: fields[3] || '',
      department: fields[4] || '',
      description: fields[5] || '',
      commodityCode,
      commodityDescription: fields[7] || '',
      openDate: fields[8] || '',
      closingDate: fields[9] || '',
      contactName: fields[10] || '',
      contactPhone: fields[11] || '',
      contactEmail: fields[12] || '',
    });
  }

  return records;
}

function downloadCSV(): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(__dirname, 'output/la-county-open-bids.csv');

    // Check if we have a recent local copy (less than 1 hour old)
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs < 3600000) {
        console.log('Using cached CSV (less than 1 hour old)');
        resolve(fs.readFileSync(outputPath, 'utf8'));
        return;
      }
    }

    console.log('Downloading fresh data from LA County Bids Portal...');

    https.get(CSV_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        // Save to cache
        fs.writeFileSync(outputPath, data);
        console.log(`Downloaded ${data.length} bytes`);
        resolve(data);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('LA County Bids Scraper');
  console.log('======================');
  console.log('');
  console.log(`Source: ${CSV_URL}`);
  console.log('');

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Download or use cached CSV
  const csvContent = await downloadCSV();
  const bids = parseCSV(csvContent);

  console.log(`Parsed ${bids.length} solicitations`);
  console.log('');

  // Aggregate by department
  const byDepartment: Record<string, { count: number; bids: string[] }> = {};
  for (const bid of bids) {
    const dept = bid.department || 'Unknown';
    if (!byDepartment[dept]) {
      byDepartment[dept] = { count: 0, bids: [] };
    }
    byDepartment[dept].count++;
    byDepartment[dept].bids.push(bid.bidNumber);
  }

  // Aggregate by bid type
  const byBidType: Record<string, { count: number }> = {};
  for (const bid of bids) {
    const type = bid.bidType || 'Unknown';
    if (!byBidType[type]) {
      byBidType[type] = { count: 0 };
    }
    byBidType[type].count++;
  }

  // Aggregate by commodity (top-level category from description)
  const byCommodity: Record<string, { count: number }> = {};
  for (const bid of bids) {
    // Extract first word/phrase as category
    let category = bid.commodityDescription.split(':')[0].trim();
    if (category.length > 40) {
      category = category.substring(0, 40) + '...';
    }
    if (!category) category = 'Uncategorized';

    if (!byCommodity[category]) {
      byCommodity[category] = { count: 0 };
    }
    byCommodity[category].count++;
  }

  // Parse closing dates and find upcoming
  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const bidsWithDates = bids.map(bid => {
    // Parse closing date like "01/23/2026 12:00PM"
    const dateMatch = bid.closingDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    let closingDateObj: Date | null = null;
    if (dateMatch) {
      closingDateObj = new Date(`${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`);
    }
    return { ...bid, closingDateObj };
  });

  const upcomingClosings = bidsWithDates
    .filter(b => b.closingDateObj && b.closingDateObj <= twoWeeksOut && b.closingDateObj >= now)
    .sort((a, b) => (a.closingDateObj?.getTime() || 0) - (b.closingDateObj?.getTime() || 0))
    .slice(0, 20);

  const closingSoon = bidsWithDates
    .filter(b => b.closingDateObj && b.closingDateObj <= threeDaysOut && b.closingDateObj >= now)
    .sort((a, b) => (a.closingDateObj?.getTime() || 0) - (b.closingDateObj?.getTime() || 0));

  // Print summary
  console.log('Top Departments by Open Bids:');
  Object.entries(byDepartment)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([dept, stats]) => {
      console.log(`  ${dept}: ${stats.count} bids`);
    });

  console.log('');
  console.log('Bid Types:');
  Object.entries(byBidType)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([type, stats]) => {
      console.log(`  ${type}: ${stats.count} bids`);
    });

  console.log('');
  console.log(`Closing within 3 days: ${closingSoon.length} bids`);
  console.log(`Closing within 14 days: ${upcomingClosings.length} bids`);

  // Build result
  const result: ScraperResult = {
    generatedAt: new Date().toISOString(),
    source: 'LA County Internal Services Department - Bids Portal',
    sourceUrl: 'https://camisvr.co.la.ca.us/lacobids/BidLookUp/OpenBidList',
    totalBids: bids.length,
    bids,
    byDepartment,
    byBidType,
    byCommodity,
    upcomingClosings,
    closingSoon,
  };

  // Save JSON
  const outputPath = path.join(outputDir, 'la-county-bids-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log('');
  console.log(`Data saved: ${outputPath}`);
  console.log('');
  console.log('Run: node scripts/generate-la-county-report.js');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
