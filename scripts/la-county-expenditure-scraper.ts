#!/usr/bin/env npx tsx
/**
 * LA County Expenditure Scraper
 *
 * Queries LA County Open Data portal for expenditure datasets
 * and cross-references with NCB data to identify non-competitive spending.
 *
 * Data Sources:
 * - LA County Open Data: https://data.lacounty.gov/
 * - LA County Bids Portal: https://camisvr.co.la.ca.us/lacobids
 */

import * as fs from 'fs';
import * as path from 'path';

// LA County Open Data API endpoints
const LA_COUNTY_DATA_ENDPOINTS = {
  // Socrata-based datasets
  baseUrl: 'https://data.lacounty.gov/resource',
  // Known dataset identifiers (Socrata 4x4 codes)
  datasets: {
    // These may need to be updated based on available datasets
    expenditures: 'expenditures', // Placeholder - actual ID needed
    contracts: 'contracts',       // Placeholder - actual ID needed
    vendors: 'vendors',           // Placeholder - actual ID needed
  },
};

// LA County Bids portal URL
const LA_BIDS_URL = 'https://camisvr.co.la.ca.us/lacobids';

interface Expenditure {
  id: string;
  fiscalYear: string;
  department: string;
  vendor: string;
  description: string;
  amount: number;
  category: string;
  contractNumber: string;
  paymentDate: string;
}

interface BidRecord {
  bidNumber: string;
  title: string;
  department: string;
  status: string;
  openDate: string;
  closeDate: string;
  awardAmount: number;
  awardedVendor: string;
  bidType: string;
}

interface VendorAnalysis {
  name: string;
  totalSpending: number;
  expenditureCount: number;
  departments: Set<string>;
  categories: Set<string>;
  avgTransactionSize: number;
  hasNCBHistory: boolean;
}

interface ExpenditureReport {
  generatedAt: string;
  dataSources: string[];
  totalExpenditures: number;
  totalAmount: number;
  byDepartment: Record<string, { count: number; amount: number }>;
  byCategory: Record<string, { count: number; amount: number }>;
  byFiscalYear: Record<string, { count: number; amount: number }>;
  topVendors: VendorAnalysis[];
  potentialNCBSpending: {
    vendor: string;
    amount: number;
    transactionCount: number;
    departments: string[];
  }[];
  largeTransactions: Expenditure[];
}

/**
 * Search LA County Open Data catalog for available datasets
 */
async function searchLACountyDatasets(query: string): Promise<Record<string, unknown>[]> {
  const catalogUrl = `https://data.lacounty.gov/api/catalog/v1?q=${encodeURIComponent(query)}&limit=20`;

  console.log(`Searching LA County data catalog for: ${query}`);

  try {
    const response = await fetch(catalogUrl);
    if (!response.ok) {
      throw new Error(`Catalog search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Catalog search error:', error);
    return [];
  }
}

/**
 * Fetch data from a Socrata dataset
 */
async function fetchSocrataDataset(
  datasetId: string,
  query?: Record<string, string>,
  limit: number = 10000
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    $limit: String(limit),
    ...query,
  });

  const url = `https://data.lacounty.gov/resource/${datasetId}.json?${params}`;
  console.log(`Fetching dataset: ${datasetId}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Dataset ${datasetId} not found`);
        return [];
      }
      throw new Error(`Dataset fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${datasetId}:`, error);
    return [];
  }
}

/**
 * Discover available expenditure-related datasets
 */
async function discoverExpenditureDatasets(): Promise<{
  id: string;
  name: string;
  description: string;
}[]> {
  const searchTerms = ['expenditure', 'spending', 'payment', 'contract', 'vendor', 'procurement'];
  const discoveredDatasets: Map<string, { id: string; name: string; description: string }> = new Map();

  for (const term of searchTerms) {
    const results = await searchLACountyDatasets(term);

    for (const result of results) {
      const resource = result as Record<string, Record<string, unknown> | unknown>;
      const nested = resource.resource as Record<string, unknown> | undefined;
      const id = String(nested?.id || resource.id || '');
      if (id && !discoveredDatasets.has(id)) {
        discoveredDatasets.set(id, {
          id,
          name: String(nested?.name || resource.name || 'Unknown'),
          description: String(nested?.description || resource.description || ''),
        });
      }
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  return Array.from(discoveredDatasets.values());
}

/**
 * Parse expenditure record from various possible formats
 */
function parseExpenditure(row: Record<string, unknown>): Expenditure | null {
  // Common field mappings for different dataset formats
  const amount = parseFloat(
    String(
      row.amount ||
      row.total_amount ||
      row.payment_amount ||
      row.expenditure_amount ||
      row.value ||
      0
    )
  );

  if (isNaN(amount) || amount === 0) {
    return null;
  }

  return {
    id: String(row.id || row.transaction_id || row.record_id || Math.random().toString(36).slice(2)),
    fiscalYear: String(row.fiscal_year || row.fy || row.year || ''),
    department: String(row.department || row.dept || row.agency || row.department_name || ''),
    vendor: String(row.vendor || row.vendor_name || row.payee || row.contractor || ''),
    description: String(row.description || row.purpose || row.memo || row.item_description || ''),
    amount,
    category: String(row.category || row.expense_type || row.account_type || row.fund || ''),
    contractNumber: String(row.contract_number || row.contract_id || row.po_number || ''),
    paymentDate: String(row.payment_date || row.date || row.transaction_date || ''),
  };
}

/**
 * Analyze vendors for potential NCB patterns
 */
function analyzeVendors(expenditures: Expenditure[]): VendorAnalysis[] {
  const vendorMap = new Map<string, VendorAnalysis>();

  for (const exp of expenditures) {
    const vendorKey = exp.vendor.toUpperCase().trim();
    if (!vendorKey) continue;

    if (!vendorMap.has(vendorKey)) {
      vendorMap.set(vendorKey, {
        name: exp.vendor,
        totalSpending: 0,
        expenditureCount: 0,
        departments: new Set(),
        categories: new Set(),
        avgTransactionSize: 0,
        hasNCBHistory: false,
      });
    }

    const vendor = vendorMap.get(vendorKey)!;
    vendor.totalSpending += exp.amount;
    vendor.expenditureCount++;
    if (exp.department) vendor.departments.add(exp.department);
    if (exp.category) vendor.categories.add(exp.category);
  }

  // Calculate averages and sort
  const vendors = Array.from(vendorMap.values());
  for (const vendor of vendors) {
    vendor.avgTransactionSize = vendor.totalSpending / vendor.expenditureCount;
  }

  return vendors.sort((a, b) => b.totalSpending - a.totalSpending);
}

/**
 * Identify potential non-competitive spending patterns
 */
function identifyPotentialNCBSpending(
  expenditures: Expenditure[],
  vendors: VendorAnalysis[]
): ExpenditureReport['potentialNCBSpending'] {
  const potentialNCB: ExpenditureReport['potentialNCBSpending'] = [];

  // Criteria for potential NCB:
  // 1. High concentration with single vendor
  // 2. Multiple large transactions
  // 3. Vendor serves multiple departments (possible favoritism)

  for (const vendor of vendors.slice(0, 100)) {
    // High-value single-source patterns
    const isHighValue = vendor.totalSpending > 1000000;
    const hasMultipleDepts = vendor.departments.size >= 3;
    const hasLargeAvg = vendor.avgTransactionSize > 100000;

    if (isHighValue && (hasMultipleDepts || hasLargeAvg)) {
      potentialNCB.push({
        vendor: vendor.name,
        amount: vendor.totalSpending,
        transactionCount: vendor.expenditureCount,
        departments: Array.from(vendor.departments),
      });
    }
  }

  return potentialNCB.sort((a, b) => b.amount - a.amount);
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
 * Print analysis report
 */
function printReport(report: ExpenditureReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('LA COUNTY EXPENDITURE ANALYSIS');
  console.log('='.repeat(80));

  console.log(`\nGenerated: ${report.generatedAt}`);
  console.log(`Data Sources: ${report.dataSources.join(', ')}`);
  console.log(`Total Expenditures: ${report.totalExpenditures.toLocaleString()}`);
  console.log(`Total Amount: ${formatCurrency(report.totalAmount)}`);

  console.log('\n' + '-'.repeat(40));
  console.log('BY FISCAL YEAR');
  console.log('-'.repeat(40));
  for (const [year, stats] of Object.entries(report.byFiscalYear).slice(0, 10)) {
    console.log(`  ${year}: ${stats.count.toLocaleString()} transactions, ${formatCurrency(stats.amount)}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOP DEPARTMENTS BY SPENDING');
  console.log('-'.repeat(40));
  const sortedDepts = Object.entries(report.byDepartment)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 15);
  for (const [dept, stats] of sortedDepts) {
    console.log(`  ${dept}`);
    console.log(`    ${stats.count.toLocaleString()} transactions, ${formatCurrency(stats.amount)}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOP 20 VENDORS BY TOTAL SPENDING');
  console.log('-'.repeat(40));
  for (const vendor of report.topVendors.slice(0, 20)) {
    console.log(`  ${vendor.name}`);
    console.log(`    ${vendor.expenditureCount} transactions, ${formatCurrency(vendor.totalSpending)}`);
    console.log(`    Avg: ${formatCurrency(vendor.avgTransactionSize)}, Depts: ${vendor.departments.size}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('POTENTIAL NON-COMPETITIVE SPENDING PATTERNS');
  console.log('='.repeat(80));

  for (const item of report.potentialNCBSpending.slice(0, 20)) {
    console.log(`\n  ${item.vendor}`);
    console.log(`    Total: ${formatCurrency(item.amount)} across ${item.transactionCount} transactions`);
    console.log(`    Departments: ${item.departments.slice(0, 5).join(', ')}`);
  }

  console.log('\n' + '-'.repeat(40));
  console.log('LARGEST INDIVIDUAL TRANSACTIONS');
  console.log('-'.repeat(40));
  for (const exp of report.largeTransactions.slice(0, 15)) {
    console.log(`\n  ${formatCurrency(exp.amount)}`);
    console.log(`    Vendor: ${exp.vendor}`);
    console.log(`    Department: ${exp.department}`);
    console.log(`    Description: ${exp.description.slice(0, 80)}...`);
  }
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  console.log('LA County Expenditure Analyzer');
  console.log('==============================\n');

  // Create output directory
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 1: Discover available datasets
  console.log('Step 1: Discovering available datasets...\n');
  const availableDatasets = await discoverExpenditureDatasets();

  if (availableDatasets.length === 0) {
    console.log('No datasets found via catalog search. Trying known dataset IDs...\n');
  } else {
    console.log(`Found ${availableDatasets.length} potentially relevant datasets:`);
    for (const ds of availableDatasets.slice(0, 10)) {
      console.log(`  - ${ds.name} (${ds.id})`);
      console.log(`    ${ds.description.slice(0, 100)}...`);
    }
  }

  // Step 2: Try to fetch data from known or discovered datasets
  console.log('\nStep 2: Fetching expenditure data...\n');

  const allExpenditures: Expenditure[] = [];
  const dataSources: string[] = [];

  // Try discovered datasets
  for (const dataset of availableDatasets.slice(0, 5)) {
    const data = await fetchSocrataDataset(dataset.id, undefined, 5000);
    if (data.length > 0) {
      console.log(`  Fetched ${data.length} records from ${dataset.name}`);
      dataSources.push(dataset.name);

      for (const row of data) {
        const exp = parseExpenditure(row);
        if (exp) allExpenditures.push(exp);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // If no data found, provide instructions
  if (allExpenditures.length === 0) {
    console.log('\n' + '='.repeat(60));
    console.log('NO EXPENDITURE DATA AVAILABLE VIA API');
    console.log('='.repeat(60));
    console.log('\nLA County Open Data access may require:');
    console.log('1. Manual dataset discovery at https://data.lacounty.gov/');
    console.log('2. Specific dataset IDs to be configured');
    console.log('3. API key for certain datasets\n');
    console.log('Alternative data sources to explore:');
    console.log('- LA County Bids Portal: https://camisvr.co.la.ca.us/lacobids');
    console.log('- LA County Annual Budget: https://ceo.lacounty.gov/budget/');
    console.log('- CA Controller Local Data: https://bythenumbers.sco.ca.gov/\n');
    console.log('To proceed, update this script with valid dataset IDs or');
    console.log('manually download CSVs from the sources above.\n');

    // Create placeholder report
    const placeholderReport: ExpenditureReport = {
      generatedAt: new Date().toISOString(),
      dataSources: ['No data available - manual configuration needed'],
      totalExpenditures: 0,
      totalAmount: 0,
      byDepartment: {},
      byCategory: {},
      byFiscalYear: {},
      topVendors: [],
      potentialNCBSpending: [],
      largeTransactions: [],
    };

    const jsonPath = path.join(outputDir, 'la-county-expenditure-analysis.json');
    fs.writeFileSync(jsonPath, JSON.stringify(placeholderReport, null, 2));
    console.log(`Placeholder report saved to: ${jsonPath}`);
    return;
  }

  console.log(`\nTotal expenditure records parsed: ${allExpenditures.length}`);

  // Step 3: Analyze the data
  console.log('\nStep 3: Analyzing expenditure patterns...\n');

  const totalAmount = allExpenditures.reduce((sum, e) => sum + e.amount, 0);

  // By department
  const byDepartment: Record<string, { count: number; amount: number }> = {};
  for (const exp of allExpenditures) {
    const dept = exp.department || 'Unknown';
    if (!byDepartment[dept]) byDepartment[dept] = { count: 0, amount: 0 };
    byDepartment[dept].count++;
    byDepartment[dept].amount += exp.amount;
  }

  // By category
  const byCategory: Record<string, { count: number; amount: number }> = {};
  for (const exp of allExpenditures) {
    const cat = exp.category || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, amount: 0 };
    byCategory[cat].count++;
    byCategory[cat].amount += exp.amount;
  }

  // By fiscal year
  const byFiscalYear: Record<string, { count: number; amount: number }> = {};
  for (const exp of allExpenditures) {
    const year = exp.fiscalYear || 'Unknown';
    if (!byFiscalYear[year]) byFiscalYear[year] = { count: 0, amount: 0 };
    byFiscalYear[year].count++;
    byFiscalYear[year].amount += exp.amount;
  }

  // Vendor analysis
  const vendorAnalysis = analyzeVendors(allExpenditures);

  // Potential NCB spending
  const potentialNCB = identifyPotentialNCBSpending(allExpenditures, vendorAnalysis);

  // Largest transactions
  const largeTransactions = [...allExpenditures]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 100);

  // Build report
  const report: ExpenditureReport = {
    generatedAt: new Date().toISOString(),
    dataSources,
    totalExpenditures: allExpenditures.length,
    totalAmount,
    byDepartment,
    byCategory,
    byFiscalYear,
    topVendors: vendorAnalysis.slice(0, 100).map(v => ({
      ...v,
      departments: v.departments,
      categories: v.categories,
    })),
    potentialNCBSpending: potentialNCB,
    largeTransactions,
  };

  // Print report
  printReport(report);

  // Save JSON report
  const jsonPath = path.join(outputDir, 'la-county-expenditure-analysis.json');
  const reportForSave = {
    ...report,
    topVendors: report.topVendors.map(v => ({
      ...v,
      departments: Array.from(v.departments),
      categories: Array.from(v.categories),
    })),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(reportForSave, null, 2));
  console.log(`\n\nFull report saved to: ${jsonPath}`);

  // Save CSV summary
  const csvPath = path.join(outputDir, 'la-county-expenditure-vendors.csv');
  const csvLines = [
    'Vendor,Transaction Count,Total Amount,Avg Transaction,Department Count',
    ...report.topVendors.map(v =>
      `"${v.name.replace(/"/g, '""')}",${v.expenditureCount},${v.totalSpending},${v.avgTransactionSize},${v.departments.size}`
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`Vendor summary saved to: ${csvPath}`);

  // Save potential NCB patterns
  const ncbPath = path.join(outputDir, 'la-county-potential-ncb.json');
  fs.writeFileSync(ncbPath, JSON.stringify(potentialNCB, null, 2));
  console.log(`Potential NCB patterns saved to: ${ncbPath}`);
}

main().catch(console.error);
