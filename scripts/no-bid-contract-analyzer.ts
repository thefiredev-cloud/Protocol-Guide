#!/usr/bin/env npx tsx
/**
 * No-Bid Government Contract Analyzer
 * Queries USASpending.gov API for non-competed contracts (2000-2025)
 * Identifies suspicious patterns for fraud detection
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://api.usaspending.gov/api/v2';

// Non-competed contract codes
const NON_COMPETED_CODES = [
  'A',   // Not Available for Competition
  'B',   // Follow On to Competed Action
  'C',   // Not Competed
  'D',   // Full and Open Competition after exclusion of sources
  'CDO', // Competitive Delivery Order
  'NDO', // Non-Competitive Delivery Order
  'G',   // Not Competed under SAP
];

interface Contract {
  award_id: string;
  recipient_name: string;
  award_amount: number;
  awarding_agency: string;
  description: string;
  start_date: string;
  end_date: string;
  extent_competed: string;
  naics_code: string;
  recipient_uei: string;
}

interface SuspiciousPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  contracts: Contract[];
  total_amount: number;
}

interface AnalysisReport {
  generated_at: string;
  date_range: { start: string; end: string };
  total_contracts: number;
  total_amount: number;
  by_year: Record<string, { count: number; amount: number }>;
  by_agency: Record<string, { count: number; amount: number }>;
  top_vendors: { name: string; count: number; amount: number }[];
  suspicious_patterns: SuspiciousPattern[];
  largest_contracts: Contract[];
}

async function fetchContracts(
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 100
): Promise<{ results: any[]; hasNext: boolean }> {
  const payload = {
    filters: {
      time_period: [{ start_date: startDate, end_date: endDate }],
      extent_competed: NON_COMPETED_CODES,
      award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Description',
      'Start Date',
      'End Date',
      'Extent Competed',
      'NAICS Code',
      'Recipient UEI',
    ],
    page,
    limit,
    sort: 'Award Amount',
    order: 'desc',
  };

  try {
    const response = await fetch(`${API_BASE}/search/spending_by_award/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      hasNext: data.page_metadata?.hasNext || false,
    };
  } catch (error) {
    console.error(`Fetch error for ${startDate} to ${endDate}:`, error);
    return { results: [], hasNext: false };
  }
}

function normalizeContract(raw: any): Contract {
  return {
    award_id: raw['Award ID'] || '',
    recipient_name: raw['Recipient Name'] || 'Unknown',
    award_amount: parseFloat(raw['Award Amount']) || 0,
    awarding_agency: raw['Awarding Agency'] || 'Unknown',
    description: raw['Description'] || '',
    start_date: raw['Start Date'] || '',
    end_date: raw['End Date'] || '',
    extent_competed: raw['Extent Competed'] || '',
    naics_code: raw['NAICS Code'] || '',
    recipient_uei: raw['Recipient UEI'] || '',
  };
}

function detectSuspiciousPatterns(contracts: Contract[]): SuspiciousPattern[] {
  const patterns: SuspiciousPattern[] = [];

  // Pattern 1: Contracts just under reporting thresholds ($250K, $750K, $1M, $10M)
  const thresholds = [
    { limit: 250000, name: '$250K', tolerance: 0.05 },
    { limit: 750000, name: '$750K', tolerance: 0.05 },
    { limit: 1000000, name: '$1M', tolerance: 0.03 },
    { limit: 10000000, name: '$10M', tolerance: 0.02 },
  ];

  for (const threshold of thresholds) {
    const floor = threshold.limit * (1 - threshold.tolerance);
    const ceiling = threshold.limit * 0.999;
    const suspicious = contracts.filter(
      (c) => c.award_amount >= floor && c.award_amount < ceiling
    );
    if (suspicious.length > 10) {
      patterns.push({
        type: `THRESHOLD_CLUSTERING_${threshold.name}`,
        severity: suspicious.length > 50 ? 'high' : 'medium',
        description: `${suspicious.length} contracts clustered just below ${threshold.name} threshold`,
        contracts: suspicious.slice(0, 20),
        total_amount: suspicious.reduce((sum, c) => sum + c.award_amount, 0),
      });
    }
  }

  // Pattern 2: Repeat vendors with excessive no-bid contracts
  const vendorCounts = new Map<string, Contract[]>();
  for (const contract of contracts) {
    const name = contract.recipient_name.toUpperCase().trim();
    if (!vendorCounts.has(name)) vendorCounts.set(name, []);
    vendorCounts.get(name)!.push(contract);
  }

  const repeatOffenders = Array.from(vendorCounts.entries())
    .filter(([_, contracts]) => contracts.length > 100)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [vendor, vendorContracts] of repeatOffenders.slice(0, 20)) {
    const totalAmount = vendorContracts.reduce((sum, c) => sum + c.award_amount, 0);
    patterns.push({
      type: 'REPEAT_VENDOR',
      severity: vendorContracts.length > 500 ? 'critical' : 'high',
      description: `${vendor} received ${vendorContracts.length} no-bid contracts totaling $${(totalAmount / 1e9).toFixed(2)}B`,
      contracts: vendorContracts.slice(0, 10),
      total_amount: totalAmount,
    });
  }

  // Pattern 3: Very large single contracts (>$100M)
  const megaContracts = contracts.filter((c) => c.award_amount > 100000000);
  if (megaContracts.length > 0) {
    patterns.push({
      type: 'MEGA_CONTRACTS',
      severity: 'critical',
      description: `${megaContracts.length} no-bid contracts over $100M`,
      contracts: megaContracts.slice(0, 50),
      total_amount: megaContracts.reduce((sum, c) => sum + c.award_amount, 0),
    });
  }

  // Pattern 4: Same vendor, same agency, multiple contracts same day
  const dailyDuplicates: Contract[] = [];
  const byVendorAgencyDate = new Map<string, Contract[]>();
  for (const contract of contracts) {
    const key = `${contract.recipient_name}|${contract.awarding_agency}|${contract.start_date}`;
    if (!byVendorAgencyDate.has(key)) byVendorAgencyDate.set(key, []);
    byVendorAgencyDate.get(key)!.push(contract);
  }

  Array.from(byVendorAgencyDate.entries()).forEach(([_, group]) => {
    if (group.length >= 3) {
      dailyDuplicates.push(...group);
    }
  });

  if (dailyDuplicates.length > 0) {
    patterns.push({
      type: 'SPLIT_CONTRACTS',
      severity: 'high',
      description: `${dailyDuplicates.length} potential split contracts (same vendor/agency/date)`,
      contracts: dailyDuplicates.slice(0, 20),
      total_amount: dailyDuplicates.reduce((sum, c) => sum + c.award_amount, 0),
    });
  }

  return patterns.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

async function analyzeYearRange(
  startYear: number,
  endYear: number,
  maxContractsPerYear: number = 5000
): Promise<AnalysisReport> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`NO-BID CONTRACT ANALYSIS: ${startYear} - ${endYear}`);
  console.log(`${'='.repeat(60)}\n`);

  const allContracts: Contract[] = [];
  const byYear: Record<string, { count: number; amount: number }> = {};
  const byAgency: Record<string, { count: number; amount: number }> = {};

  for (let year = startYear; year <= endYear; year++) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    let page = 1;
    let yearContracts: Contract[] = [];
    let hasNext = true;

    console.log(`Fetching ${year}...`);

    while (hasNext && yearContracts.length < maxContractsPerYear) {
      const { results, hasNext: more } = await fetchContracts(startDate, endDate, page, 100);
      const normalized = results.map(normalizeContract);
      yearContracts.push(...normalized);
      hasNext = more;
      page++;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 200));

      if (page % 10 === 0) {
        console.log(`  Page ${page}, ${yearContracts.length} contracts...`);
      }
    }

    console.log(`  ${year}: ${yearContracts.length} contracts`);

    // Aggregate by year
    const yearTotal = yearContracts.reduce((sum, c) => sum + c.award_amount, 0);
    byYear[year.toString()] = { count: yearContracts.length, amount: yearTotal };

    // Aggregate by agency
    for (const contract of yearContracts) {
      const agency = contract.awarding_agency;
      if (!byAgency[agency]) byAgency[agency] = { count: 0, amount: 0 };
      byAgency[agency].count++;
      byAgency[agency].amount += contract.award_amount;
    }

    allContracts.push(...yearContracts);
  }

  console.log(`\nTotal contracts fetched: ${allContracts.length}`);
  console.log('Analyzing patterns...\n');

  // Calculate totals
  const totalAmount = allContracts.reduce((sum, c) => sum + c.award_amount, 0);

  // Top vendors
  const vendorTotals = new Map<string, { count: number; amount: number }>();
  for (const contract of allContracts) {
    const name = contract.recipient_name;
    if (!vendorTotals.has(name)) vendorTotals.set(name, { count: 0, amount: 0 });
    const v = vendorTotals.get(name)!;
    v.count++;
    v.amount += contract.award_amount;
  }

  const topVendors = Array.from(vendorTotals.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 100);

  // Detect suspicious patterns
  const suspiciousPatterns = detectSuspiciousPatterns(allContracts);

  // Largest contracts
  const largestContracts = [...allContracts]
    .sort((a, b) => b.award_amount - a.award_amount)
    .slice(0, 100);

  const report: AnalysisReport = {
    generated_at: new Date().toISOString(),
    date_range: { start: `${startYear}-01-01`, end: `${endYear}-12-31` },
    total_contracts: allContracts.length,
    total_amount: totalAmount,
    by_year: byYear,
    by_agency: Object.fromEntries(
      Object.entries(byAgency).sort((a, b) => b[1].amount - a[1].amount)
    ),
    top_vendors: topVendors,
    suspicious_patterns: suspiciousPatterns,
    largest_contracts: largestContracts,
  };

  return report;
}

function formatCurrency(amount: number): string {
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function printReport(report: AnalysisReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS REPORT: NO-BID GOVERNMENT CONTRACTS');
  console.log('='.repeat(80));

  console.log(`\nGenerated: ${report.generated_at}`);
  console.log(`Date Range: ${report.date_range.start} to ${report.date_range.end}`);
  console.log(`Total Contracts: ${report.total_contracts.toLocaleString()}`);
  console.log(`Total Value: ${formatCurrency(report.total_amount)}`);

  console.log('\n' + '-'.repeat(40));
  console.log('SPENDING BY YEAR');
  console.log('-'.repeat(40));
  for (const [year, stats] of Object.entries(report.by_year)) {
    console.log(`  ${year}: ${stats.count.toLocaleString()} contracts, ${formatCurrency(stats.amount)}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOP 20 AGENCIES BY NO-BID SPENDING');
  console.log('-'.repeat(40));
  const topAgencies = Object.entries(report.by_agency).slice(0, 20);
  for (const [agency, stats] of topAgencies) {
    console.log(`  ${agency}`);
    console.log(`    ${stats.count.toLocaleString()} contracts, ${formatCurrency(stats.amount)}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOP 20 VENDORS BY NO-BID CONTRACTS');
  console.log('-'.repeat(40));
  for (const vendor of report.top_vendors.slice(0, 20)) {
    console.log(`  ${vendor.name}`);
    console.log(`    ${vendor.count.toLocaleString()} contracts, ${formatCurrency(vendor.amount)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUSPICIOUS PATTERNS DETECTED');
  console.log('='.repeat(80));

  for (const pattern of report.suspicious_patterns) {
    const severityColor = {
      critical: '\x1b[31m', // red
      high: '\x1b[33m',     // yellow
      medium: '\x1b[36m',   // cyan
      low: '\x1b[37m',      // white
    }[pattern.severity];
    const reset = '\x1b[0m';

    console.log(`\n${severityColor}[${pattern.severity.toUpperCase()}]${reset} ${pattern.type}`);
    console.log(`  ${pattern.description}`);
    console.log(`  Total Amount: ${formatCurrency(pattern.total_amount)}`);

    if (pattern.contracts.length > 0) {
      console.log('  Sample contracts:');
      for (const c of pattern.contracts.slice(0, 5)) {
        console.log(`    - ${c.recipient_name}: ${formatCurrency(c.award_amount)} (${c.awarding_agency})`);
      }
    }
  }

  console.log('\n' + '-'.repeat(40));
  console.log('LARGEST NO-BID CONTRACTS');
  console.log('-'.repeat(40));
  for (const contract of report.largest_contracts.slice(0, 25)) {
    console.log(`\n  ${formatCurrency(contract.award_amount)}`);
    console.log(`    Vendor: ${contract.recipient_name}`);
    console.log(`    Agency: ${contract.awarding_agency}`);
    console.log(`    Date: ${contract.start_date}`);
    console.log(`    Description: ${contract.description?.slice(0, 100)}...`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const startYear = parseInt(args[0]) || 2000;
  const endYear = parseInt(args[1]) || 2025;
  const maxPerYear = parseInt(args[2]) || 5000;

  console.log('Starting No-Bid Contract Analysis...');
  console.log(`Years: ${startYear} - ${endYear}`);
  console.log(`Max contracts per year: ${maxPerYear}`);
  console.log('\nNote: USASpending data is most complete from 2008 onwards (FFATA)');
  console.log('Earlier years may have limited data.\n');

  const report = await analyzeYearRange(startYear, endYear, maxPerYear);

  // Print to console
  printReport(report);

  // Save to file
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `no-bid-analysis-${startYear}-${endYear}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n\nFull report saved to: ${outputPath}`);

  // Save summary CSV
  const csvPath = path.join(outputDir, `no-bid-summary-${startYear}-${endYear}.csv`);
  const csvLines = [
    'Vendor,Contract Count,Total Amount,Avg Contract Size',
    ...report.top_vendors.map(
      (v) => `"${v.name.replace(/"/g, '""')}",${v.count},${v.amount},${v.amount / v.count}`
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`Vendor summary saved to: ${csvPath}`);

  // Save suspicious patterns
  const patternsPath = path.join(outputDir, `suspicious-patterns-${startYear}-${endYear}.json`);
  fs.writeFileSync(patternsPath, JSON.stringify(report.suspicious_patterns, null, 2));
  console.log(`Suspicious patterns saved to: ${patternsPath}`);
}

main().catch(console.error);
