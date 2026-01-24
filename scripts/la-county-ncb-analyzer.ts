#!/usr/bin/env npx tsx
/**
 * LA County No-Bid Contract Analyzer
 *
 * Analyzes California State DGS Non-Competitive Bids (NCB) data
 * filtered for LA County agencies to identify potential fraud patterns.
 *
 * Data Source: CA State Dept of General Services
 * https://data.ca.gov/dataset/de4d1bda-09cf-42d5-a8e7-7d3cddbe34eb
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const NCB_DATA_URL = 'https://data.ca.gov/dataset/de4d1bda-09cf-42d5-a8e7-7d3cddbe34eb/resource/14932789-485b-481b-910a-dafb40d3471c/download/dgs-pd-ncb-file-for-open-data-portal-2025-nov-monthend.xlsx';

// LA County agency identifiers (partial matches)
const LA_COUNTY_IDENTIFIERS = [
  'LOS ANGELES',
  'LA COUNTY',
  'L.A. COUNTY',
  'COUNTY OF LOS ANGELES',
  'LA CO',
  'LAC ',
  'LACOUNTY',
];

interface NCBContract {
  ncbNumber: string;
  contractNumber: string;
  department: string;
  vendor: string;
  commodityDescription: string;
  dollarAmount: number;
  startDate: string;
  endDate: string;
  justification: string;
  ncbType: string;
}

interface VendorStats {
  name: string;
  contractCount: number;
  totalAmount: number;
  contracts: NCBContract[];
  avgContractSize: number;
  agencies: Set<string>;
}

interface SuspiciousPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  contracts: NCBContract[];
  totalAmount: number;
  metadata?: Record<string, unknown>;
}

interface AnalysisReport {
  generatedAt: string;
  dataSource: string;
  totalLACountyContracts: number;
  totalAmount: number;
  byDepartment: Record<string, { count: number; amount: number }>;
  topVendors: VendorStats[];
  suspiciousPatterns: SuspiciousPattern[];
  largestContracts: NCBContract[];
  thresholdAnalysis: {
    threshold: string;
    count: number;
    amount: number;
  }[];
}

/**
 * Download file from URL with redirect handling
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Parse Excel file using xlsx library
 * Note: Requires xlsx library: npm install xlsx
 */
async function parseExcelOrFallback(filePath: string): Promise<NCBContract[]> {
  // Try to dynamically import xlsx
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    return data.map((row: Record<string, unknown>) => ({
      ncbNumber: String(row['NCB Number'] || row['NCB_NUMBER'] || ''),
      contractNumber: String(row['Contract Number'] || row['CONTRACT_NUMBER'] || ''),
      department: String(row['Department'] || row['DEPARTMENT'] || row['Agency'] || ''),
      vendor: String(row['Vendor'] || row['VENDOR'] || row['Contractor'] || ''),
      commodityDescription: String(row['Commodity Description'] || row['Description'] || ''),
      dollarAmount: parseFloat(String(row['Dollar Amount'] || row['Amount'] || row['VALUE'] || 0)) || 0,
      startDate: String(row['Start Date'] || row['START_DATE'] || ''),
      endDate: String(row['End Date'] || row['END_DATE'] || ''),
      justification: String(row['Justification'] || row['NCB Justification'] || ''),
      ncbType: String(row['NCB Type'] || row['TYPE'] || ''),
    }));
  } catch {
    console.warn('xlsx library not available. Install with: npm install xlsx');
    console.warn('Attempting alternative data fetch...');
    return [];
  }
}

/**
 * Fetch NCB data from CA Open Data API directly
 */
async function fetchNCBDataFromAPI(): Promise<NCBContract[]> {
  const apiUrl = 'https://data.ca.gov/api/3/action/datastore_search?resource_id=14932789-485b-481b-910a-dafb40d3471c&limit=10000';

  console.log('Fetching NCB data from CA Open Data API...');

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.result?.records) {
      throw new Error('Invalid API response format');
    }

    return data.result.records.map((row: any) => ({
      ncbNumber: String(row.ncb_number || row.NCB_NUMBER || ''),
      contractNumber: String(row.contract_number || row.CONTRACT_NUMBER || ''),
      department: String(row.department || row.DEPARTMENT || row.agency || ''),
      vendor: String(row.vendor || row.VENDOR || row.contractor || ''),
      commodityDescription: String(row.commodity_description || row.description || ''),
      dollarAmount: parseFloat(row.dollar_amount || row.amount || row.value || 0) || 0,
      startDate: String(row.start_date || row.START_DATE || ''),
      endDate: String(row.end_date || row.END_DATE || ''),
      justification: String(row.justification || row.ncb_justification || ''),
      ncbType: String(row.ncb_type || row.type || ''),
    }));
  } catch (error) {
    console.error('API fetch failed:', error);
    return [];
  }
}

/**
 * Filter contracts for LA County agencies
 */
function filterLACountyContracts(contracts: NCBContract[]): NCBContract[] {
  return contracts.filter(contract => {
    const deptUpper = contract.department.toUpperCase();
    return LA_COUNTY_IDENTIFIERS.some(id => deptUpper.includes(id));
  });
}

/**
 * Detect suspicious patterns in contracts
 */
function detectSuspiciousPatterns(contracts: NCBContract[]): SuspiciousPattern[] {
  const patterns: SuspiciousPattern[] = [];

  // Pattern 1: Threshold clustering ($999K-$1M, $4.9M-$5M, $9.9M-$10M)
  const thresholds = [
    { limit: 1000000, name: '$1M', floor: 950000 },
    { limit: 5000000, name: '$5M', floor: 4750000 },
    { limit: 10000000, name: '$10M', floor: 9500000 },
    { limit: 25000000, name: '$25M', floor: 23750000 },
  ];

  for (const threshold of thresholds) {
    const clustered = contracts.filter(
      c => c.dollarAmount >= threshold.floor && c.dollarAmount < threshold.limit
    );

    if (clustered.length >= 3) {
      patterns.push({
        type: `THRESHOLD_CLUSTERING_${threshold.name}`,
        severity: clustered.length >= 10 ? 'high' : 'medium',
        description: `${clustered.length} contracts clustered just below ${threshold.name} threshold`,
        contracts: clustered.slice(0, 10),
        totalAmount: clustered.reduce((sum, c) => sum + c.dollarAmount, 0),
      });
    }
  }

  // Pattern 2: Repeat vendors (same vendor, multiple NCB contracts)
  const vendorContracts = new Map<string, NCBContract[]>();
  for (const contract of contracts) {
    const vendorKey = contract.vendor.toUpperCase().trim();
    if (!vendorContracts.has(vendorKey)) {
      vendorContracts.set(vendorKey, []);
    }
    vendorContracts.get(vendorKey)!.push(contract);
  }

  const repeatVendors = Array.from(vendorContracts.entries())
    .filter(([_, contracts]) => contracts.length >= 5)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [vendor, vendorList] of repeatVendors.slice(0, 15)) {
    const total = vendorList.reduce((sum, c) => sum + c.dollarAmount, 0);
    patterns.push({
      type: 'REPEAT_VENDOR',
      severity: vendorList.length >= 20 ? 'critical' : vendorList.length >= 10 ? 'high' : 'medium',
      description: `${vendor} received ${vendorList.length} no-bid contracts totaling $${(total / 1e6).toFixed(2)}M`,
      contracts: vendorList.slice(0, 5),
      totalAmount: total,
      metadata: { vendorName: vendor, contractCount: vendorList.length },
    });
  }

  // Pattern 3: Same vendor-department pairs
  const vendorDeptPairs = new Map<string, NCBContract[]>();
  for (const contract of contracts) {
    const key = `${contract.vendor.toUpperCase()}|${contract.department.toUpperCase()}`;
    if (!vendorDeptPairs.has(key)) {
      vendorDeptPairs.set(key, []);
    }
    vendorDeptPairs.get(key)!.push(contract);
  }

  const suspiciousPairs = Array.from(vendorDeptPairs.entries())
    .filter(([_, contracts]) => contracts.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [pair, pairContracts] of suspiciousPairs.slice(0, 10)) {
    const [vendor, dept] = pair.split('|');
    const total = pairContracts.reduce((sum, c) => sum + c.dollarAmount, 0);
    patterns.push({
      type: 'VENDOR_DEPARTMENT_PATTERN',
      severity: pairContracts.length >= 10 ? 'high' : 'medium',
      description: `${vendor} has ${pairContracts.length} no-bid contracts with ${dept}`,
      contracts: pairContracts.slice(0, 5),
      totalAmount: total,
    });
  }

  // Pattern 4: Contracts with minimal/vague justifications
  const vagueJustificationKeywords = ['SOLE SOURCE', 'EMERGENCY', 'ONLY PROVIDER', 'UNIQUE'];
  const vagueContracts = contracts.filter(c => {
    const justUpper = c.justification.toUpperCase();
    return c.justification.length < 50 ||
           vagueJustificationKeywords.some(k => justUpper.includes(k));
  });

  if (vagueContracts.length > 20) {
    patterns.push({
      type: 'VAGUE_JUSTIFICATIONS',
      severity: 'medium',
      description: `${vagueContracts.length} contracts have minimal or boilerplate justifications`,
      contracts: vagueContracts.slice(0, 10),
      totalAmount: vagueContracts.reduce((sum, c) => sum + c.dollarAmount, 0),
    });
  }

  // Pattern 5: Very large single contracts ($10M+)
  const largeContracts = contracts.filter(c => c.dollarAmount >= 10000000);
  if (largeContracts.length > 0) {
    patterns.push({
      type: 'MEGA_CONTRACTS',
      severity: 'critical',
      description: `${largeContracts.length} no-bid contracts over $10M`,
      contracts: largeContracts.sort((a, b) => b.dollarAmount - a.dollarAmount),
      totalAmount: largeContracts.reduce((sum, c) => sum + c.dollarAmount, 0),
    });
  }

  return patterns.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Calculate vendor statistics
 */
function calculateVendorStats(contracts: NCBContract[]): VendorStats[] {
  const vendorMap = new Map<string, VendorStats>();

  for (const contract of contracts) {
    const vendorKey = contract.vendor.toUpperCase().trim();

    if (!vendorMap.has(vendorKey)) {
      vendorMap.set(vendorKey, {
        name: contract.vendor,
        contractCount: 0,
        totalAmount: 0,
        contracts: [],
        avgContractSize: 0,
        agencies: new Set(),
      });
    }

    const stats = vendorMap.get(vendorKey)!;
    stats.contractCount++;
    stats.totalAmount += contract.dollarAmount;
    stats.contracts.push(contract);
    stats.agencies.add(contract.department);
  }

  const vendorStats = Array.from(vendorMap.values());
  for (const stats of vendorStats) {
    stats.avgContractSize = stats.totalAmount / stats.contractCount;
  }

  return vendorStats.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Print analysis report to console
 */
function printReport(report: AnalysisReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('LA COUNTY NO-BID CONTRACT ANALYSIS');
  console.log('='.repeat(80));

  console.log(`\nGenerated: ${report.generatedAt}`);
  console.log(`Data Source: ${report.dataSource}`);
  console.log(`Total LA County NCB Contracts: ${report.totalLACountyContracts.toLocaleString()}`);
  console.log(`Total Value: ${formatCurrency(report.totalAmount)}`);

  console.log('\n' + '-'.repeat(40));
  console.log('BY DEPARTMENT');
  console.log('-'.repeat(40));
  const sortedDepts = Object.entries(report.byDepartment)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 15);
  for (const [dept, stats] of sortedDepts) {
    console.log(`  ${dept}`);
    console.log(`    ${stats.count} contracts, ${formatCurrency(stats.amount)}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOP 20 VENDORS');
  console.log('-'.repeat(40));
  for (const vendor of report.topVendors.slice(0, 20)) {
    console.log(`  ${vendor.name}`);
    console.log(`    ${vendor.contractCount} contracts, ${formatCurrency(vendor.totalAmount)}`);
    console.log(`    Avg: ${formatCurrency(vendor.avgContractSize)}, Agencies: ${vendor.agencies.size}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUSPICIOUS PATTERNS DETECTED');
  console.log('='.repeat(80));

  for (const pattern of report.suspiciousPatterns) {
    const severityColors: Record<string, string> = {
      critical: '\x1b[31m',
      high: '\x1b[33m',
      medium: '\x1b[36m',
      low: '\x1b[37m',
    };
    const color = severityColors[pattern.severity] || '';
    const reset = '\x1b[0m';

    console.log(`\n${color}[${pattern.severity.toUpperCase()}]${reset} ${pattern.type}`);
    console.log(`  ${pattern.description}`);
    console.log(`  Total Amount: ${formatCurrency(pattern.totalAmount)}`);

    if (pattern.contracts.length > 0) {
      console.log('  Sample contracts:');
      for (const c of pattern.contracts.slice(0, 3)) {
        console.log(`    - ${c.vendor}: ${formatCurrency(c.dollarAmount)} (${c.department})`);
      }
    }
  }

  console.log('\n' + '-'.repeat(40));
  console.log('LARGEST NO-BID CONTRACTS');
  console.log('-'.repeat(40));
  for (const contract of report.largestContracts.slice(0, 15)) {
    console.log(`\n  ${formatCurrency(contract.dollarAmount)}`);
    console.log(`    Vendor: ${contract.vendor}`);
    console.log(`    Department: ${contract.department}`);
    console.log(`    Description: ${contract.commodityDescription.slice(0, 80)}...`);
    console.log(`    Justification: ${contract.justification.slice(0, 80)}...`);
  }
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  console.log('LA County No-Bid Contract Analyzer');
  console.log('===================================\n');

  // Create output directory
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Try to fetch data from API first
  let allContracts = await fetchNCBDataFromAPI();

  // If API fails, try downloading Excel file
  if (allContracts.length === 0) {
    console.log('API fetch returned no data. Attempting Excel download...');
    const tempFile = path.join(outputDir, 'ca-ncb-data.xlsx');

    try {
      await downloadFile(NCB_DATA_URL, tempFile);
      console.log('Downloaded Excel file.');
      allContracts = await parseExcelOrFallback(tempFile);
    } catch (error) {
      console.error('Failed to download or parse Excel file:', error);
    }
  }

  if (allContracts.length === 0) {
    console.error('\nNo data available. Please ensure:');
    console.error('1. You have internet connectivity');
    console.error('2. Install xlsx library: npm install xlsx');
    console.error('3. Or manually download data from:');
    console.error(`   ${NCB_DATA_URL}`);
    process.exit(1);
  }

  console.log(`\nTotal CA state NCB contracts: ${allContracts.length}`);

  // Filter for LA County
  const laCountyContracts = filterLACountyContracts(allContracts);
  console.log(`LA County contracts found: ${laCountyContracts.length}`);

  if (laCountyContracts.length === 0) {
    console.log('\nNo LA County contracts found. Analyzing all CA state data...');
    // Fall back to all contracts for demonstration
    const demoContracts = allContracts.slice(0, 500);
    console.log(`Analyzing first ${demoContracts.length} contracts as demo...`);
  }

  const contractsToAnalyze = laCountyContracts.length > 0 ? laCountyContracts : allContracts;

  // Calculate statistics
  const totalAmount = contractsToAnalyze.reduce((sum, c) => sum + c.dollarAmount, 0);

  // By department
  const byDepartment: Record<string, { count: number; amount: number }> = {};
  for (const contract of contractsToAnalyze) {
    const dept = contract.department;
    if (!byDepartment[dept]) {
      byDepartment[dept] = { count: 0, amount: 0 };
    }
    byDepartment[dept].count++;
    byDepartment[dept].amount += contract.dollarAmount;
  }

  // Vendor statistics
  const vendorStats = calculateVendorStats(contractsToAnalyze);

  // Suspicious patterns
  const suspiciousPatterns = detectSuspiciousPatterns(contractsToAnalyze);

  // Largest contracts
  const largestContracts = [...contractsToAnalyze]
    .sort((a, b) => b.dollarAmount - a.dollarAmount)
    .slice(0, 50);

  // Threshold analysis
  const thresholdAnalysis = [
    { threshold: '< $100K', filter: (c: NCBContract) => c.dollarAmount < 100000 },
    { threshold: '$100K - $500K', filter: (c: NCBContract) => c.dollarAmount >= 100000 && c.dollarAmount < 500000 },
    { threshold: '$500K - $1M', filter: (c: NCBContract) => c.dollarAmount >= 500000 && c.dollarAmount < 1000000 },
    { threshold: '$1M - $5M', filter: (c: NCBContract) => c.dollarAmount >= 1000000 && c.dollarAmount < 5000000 },
    { threshold: '$5M - $10M', filter: (c: NCBContract) => c.dollarAmount >= 5000000 && c.dollarAmount < 10000000 },
    { threshold: '$10M+', filter: (c: NCBContract) => c.dollarAmount >= 10000000 },
  ].map(t => {
    const filtered = contractsToAnalyze.filter(t.filter);
    return {
      threshold: t.threshold,
      count: filtered.length,
      amount: filtered.reduce((sum, c) => sum + c.dollarAmount, 0),
    };
  });

  // Build report
  const report: AnalysisReport = {
    generatedAt: new Date().toISOString(),
    dataSource: 'CA State DGS Non-Competitive Bids',
    totalLACountyContracts: contractsToAnalyze.length,
    totalAmount,
    byDepartment,
    topVendors: vendorStats.slice(0, 50).map(v => ({
      ...v,
      agencies: v.agencies,
      contracts: v.contracts.slice(0, 10),
    })),
    suspiciousPatterns,
    largestContracts,
    thresholdAnalysis,
  };

  // Print report
  printReport(report);

  // Save JSON report
  const jsonPath = path.join(outputDir, 'la-county-ncb-analysis.json');
  const reportForSave = {
    ...report,
    topVendors: report.topVendors.map(v => ({
      ...v,
      agencies: Array.from(v.agencies),
    })),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(reportForSave, null, 2));
  console.log(`\n\nFull report saved to: ${jsonPath}`);

  // Save CSV summary
  const csvPath = path.join(outputDir, 'la-county-ncb-vendors.csv');
  const csvLines = [
    'Vendor,Contract Count,Total Amount,Avg Contract Size,Agency Count',
    ...report.topVendors.map(v =>
      `"${v.name.replace(/"/g, '""')}",${v.contractCount},${v.totalAmount},${v.avgContractSize},${v.agencies.size}`
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`Vendor summary saved to: ${csvPath}`);

  // Save patterns
  const patternsPath = path.join(outputDir, 'la-county-ncb-patterns.json');
  fs.writeFileSync(patternsPath, JSON.stringify(suspiciousPatterns, null, 2));
  console.log(`Suspicious patterns saved to: ${patternsPath}`);
}

main().catch(console.error);
