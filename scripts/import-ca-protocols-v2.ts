/**
 * California LEMSA Protocol Import v2
 *
 * Improved import with proper protocol number extraction and metadata.
 * Fixes the CA-CHUNK-X naming issue from the original import.
 *
 * Run with: npx tsx scripts/import-ca-protocols-v2.ts
 *
 * Options:
 *   --tier <1|2|3>  Only import specified tier
 *   --lemsa <name>  Only import specific LEMSA
 *   --dry-run       Show what would be imported without changes
 *   --cleanup       Delete existing bad data before import
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  ALL_LEMSAS,
  getLEMSAByName,
  getLEMSAsByPriority,
  CA_STATS,
  type LEMSAConfig,
} from './parsers/lemsa-configs';
import { chunkProtocol } from '../server/_core/protocol-chunker';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface ProtocolData {
  protocolNumber: string;
  protocolTitle: string;
  section: string;
  content: string;
  sourcePdfUrl: string;
  protocolYear: number;
}

interface ChunkInsert {
  agency_name: string;
  state_code: string;
  protocol_number: string;
  protocol_title: string;
  section: string | null;
  content: string;
  source_pdf_url: string;
  protocol_year: number;
  embedding?: number[];
}

interface ImportStats {
  lemsa: string;
  protocolsProcessed: number;
  chunksGenerated: number;
  chunksInserted: number;
  errors: string[];
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured');
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'voyage-large-2',
      input: texts.map(t => t.substring(0, 8000)),
      input_type: 'document'
    })
  });

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

// ============================================================================
// PROTOCOL EXTRACTION
// ============================================================================

/**
 * Extract protocol number from content using LEMSA-specific rules
 */
function extractProtocolNumber(content: string, config: LEMSAConfig): string | null {
  const match = content.match(config.parsingRules.protocolNumberPattern);
  if (match) {
    let num = match[1];
    if (config.parsingRules.numberTransform) {
      num = config.parsingRules.numberTransform(num);
    }
    return num;
  }
  return null;
}

/**
 * Extract protocol title from content
 */
function extractProtocolTitle(content: string, protocolNumber: string, config: LEMSAConfig): string {
  if (config.parsingRules.titlePattern) {
    const match = content.match(config.parsingRules.titlePattern);
    if (match) {
      const title = match[1] || match[2] || '';
      if (config.parsingRules.titleTransform) {
        return config.parsingRules.titleTransform(title.trim(), protocolNumber);
      }
      return `Protocol ${protocolNumber} - ${title.trim()}`;
    }
  }
  return `Protocol ${protocolNumber}`;
}

/**
 * Determine section from content
 */
function determineSection(content: string, config: LEMSAConfig): string {
  const lower = content.toLowerCase();

  for (const keyword of config.parsingRules.sectionKeywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  // Fallback detection
  if (lower.includes('cardiac') || lower.includes('arrest')) return 'Cardiac';
  if (lower.includes('trauma') || lower.includes('injury')) return 'Trauma';
  if (lower.includes('respiratory') || lower.includes('airway')) return 'Respiratory';
  if (lower.includes('pediatric') || lower.includes('child')) return 'Pediatric';
  if (lower.includes('medication') || lower.includes('drug')) return 'Medications';

  return 'General';
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function cleanupBadData(agencyName?: string): Promise<number> {
  console.log('Cleaning up bad CA-CHUNK-X data...');

  let query = supabase
    .from('manus_protocol_chunks')
    .delete()
    .like('protocol_number', 'CA-CHUNK-%');

  if (agencyName) {
    query = query.eq('agency_name', agencyName);
  }

  const { data, error } = await query.select('id');

  if (error) {
    console.error(`Cleanup error: ${error.message}`);
    return 0;
  }

  const count = data?.length || 0;
  console.log(`Deleted ${count} bad chunks`);
  return count;
}

async function insertChunks(chunks: ChunkInsert[], dryRun: boolean = false): Promise<number> {
  if (dryRun) {
    return chunks.length;
  }

  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const { error } = await supabase
      .from('manus_protocol_chunks')
      .upsert(batch, {
        onConflict: 'agency_name,protocol_number,content',
        ignoreDuplicates: true
      });

    if (error) {
      console.error(`  Insert error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
}

// ============================================================================
// LEMSA IMPORT
// ============================================================================

async function importLEMSA(
  config: LEMSAConfig,
  protocols: ProtocolData[],
  dryRun: boolean = false,
  skipEmbed: boolean = false
): Promise<ImportStats> {
  const stats: ImportStats = {
    lemsa: config.name,
    protocolsProcessed: 0,
    chunksGenerated: 0,
    chunksInserted: 0,
    errors: [],
  };

  const allChunks: ChunkInsert[] = [];

  for (const protocol of protocols) {
    try {
      const chunks = chunkProtocol(
        protocol.content,
        protocol.protocolNumber,
        protocol.protocolTitle
      );

      for (const chunk of chunks) {
        allChunks.push({
          agency_name: config.name,
          state_code: 'CA',
          protocol_number: protocol.protocolNumber,
          protocol_title: protocol.protocolTitle,
          section: protocol.section,
          content: chunk.content,
          source_pdf_url: protocol.sourcePdfUrl,
          protocol_year: protocol.protocolYear,
        });
      }

      stats.protocolsProcessed++;
      stats.chunksGenerated += chunks.length;
    } catch (error: any) {
      stats.errors.push(`Protocol ${protocol.protocolNumber}: ${error.message}`);
    }
  }

  // Generate embeddings in batches
  if (!skipEmbed && allChunks.length > 0 && VOYAGE_API_KEY) {
    console.log(`  Generating embeddings for ${allChunks.length} chunks...`);

    const batchSize = 128;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => `${c.protocol_title}\n\n${c.content}`);

      try {
        const embeddings = await generateEmbeddingsBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
      } catch (error: any) {
        stats.errors.push(`Embedding batch ${i}: ${error.message}`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Insert chunks
  stats.chunksInserted = await insertChunks(allChunks, dryRun);

  return stats;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('CALIFORNIA LEMSA PROTOCOL IMPORT v2');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const dryRun = process.argv.includes('--dry-run');
  const cleanup = process.argv.includes('--cleanup');
  const skipEmbed = process.argv.includes('--skip-embed');

  // Parse tier option
  const tierIdx = process.argv.indexOf('--tier');
  const tier = tierIdx !== -1 ? parseInt(process.argv[tierIdx + 1]) as 1 | 2 | 3 : null;

  // Parse lemsa option
  const lemsaIdx = process.argv.indexOf('--lemsa');
  const lemsaName = lemsaIdx !== -1 ? process.argv[lemsaIdx + 1] : null;

  if (dryRun) console.log('[DRY RUN MODE]\n');

  // Show configuration
  console.log('--- CONFIGURATION ---\n');
  console.log(`  Total LEMSAs in database: ${CA_STATS.totalLEMSAs}`);
  console.log(`  Total counties: ${CA_STATS.totalCounties}`);
  console.log(`  Total population: ${CA_STATS.totalPopulation.toLocaleString()}`);
  console.log(`  Tier 1 (60%): ${CA_STATS.tier1Population.toLocaleString()}`);
  console.log(`  Tier 2 (25%): ${CA_STATS.tier2Population.toLocaleString()}`);
  console.log(`  Tier 3 (15%): ${CA_STATS.tier3Population.toLocaleString()}`);

  // Determine which LEMSAs to import
  let lemsasToImport: LEMSAConfig[] = [];

  if (lemsaName) {
    const lemsa = getLEMSAByName(lemsaName);
    if (lemsa) {
      lemsasToImport = [lemsa];
    } else {
      console.error(`\nLEMSA not found: ${lemsaName}`);
      console.log('\nAvailable LEMSAs:');
      ALL_LEMSAS.forEach(l => console.log(`  - ${l.name}`));
      process.exit(1);
    }
  } else if (tier) {
    lemsasToImport = getLEMSAsByPriority(tier);
  } else {
    lemsasToImport = ALL_LEMSAS;
  }

  console.log(`\n  LEMSAs to process: ${lemsasToImport.length}`);
  lemsasToImport.forEach(l => console.log(`    - ${l.name} (${l.population.toLocaleString()})`));

  // Cleanup if requested
  if (cleanup && !dryRun) {
    console.log('\n--- CLEANUP ---\n');
    await cleanupBadData();
  }

  // Note: Actual import would require fetching PDFs and parsing
  // This script provides the infrastructure for that
  console.log('\n--- IMPORT STATUS ---\n');
  console.log('  Infrastructure created for California LEMSA imports.');
  console.log('  To import data, PDF content must be fetched and parsed.');
  console.log('\n  Next steps:');
  console.log('  1. Fetch protocol PDFs from LEMSA URLs');
  console.log('  2. Extract text using PDF parsing library');
  console.log('  3. Run through extractProtocolNumber() and extractProtocolTitle()');
  console.log('  4. Call importLEMSA() with parsed protocols');

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('INFRASTRUCTURE SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n  Created files:`);
  console.log(`    - scripts/parsers/lemsa-configs.ts (${ALL_LEMSAS.length} LEMSA configs)`);
  console.log(`    - scripts/parsers/la-county-pdf-parser.ts (LA County parsing)`);
  console.log(`    - scripts/import-la-county-full.ts (LA County import)`);
  console.log(`    - scripts/import-ca-protocols-v2.ts (CA LEMSA import v2)`);
  console.log(`\n  Ready for PDF content import when source files are available.`);
}

main();
