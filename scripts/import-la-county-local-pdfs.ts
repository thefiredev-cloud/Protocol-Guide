/**
 * LA County Local PDF Import
 * 
 * Parses locally downloaded LA County protocol PDFs and inserts them into Supabase.
 * Processes 128 PDFs from data/la-county-protocols/
 * 
 * Run with: npx tsx scripts/import-la-county-local-pdfs.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
// pdf-parse imported dynamically

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

const PDF_DIR = path.join(__dirname, '../data/la-county-protocols');
const AGENCY_NAME = 'Los Angeles County EMS Agency';
const STATE_CODE = 'CA';
const BASE_PDF_URL = 'https://file.lacounty.gov/SDSInter/dhs/';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// HELPERS
// ============================================================================

function extractProtocolNumber(filename: string): string {
  // Extract protocol number from filename like "1200.3-ProviderImpressions.pdf"
  const match = filename.match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : filename.replace('.pdf', '');
}

function extractProtocolTitle(filename: string): string {
  // Extract title from filename like "1200.3-ProviderImpressions.pdf"
  const match = filename.match(/^\d+(?:\.\d+)?-([^.]+)/);
  if (match) {
    // Convert camelCase or PascalCase to spaces
    return match[1]
      .replace(/([A-Z])/g, ' $1')
      .replace(/-P$/, ' (Pediatric)')
      .trim();
  }
  return filename.replace('.pdf', '');
}

function categorizeProtocol(num: string, filename: string): string {
  const n = parseFloat(num);
  const lower = filename.toLowerCase();
  
  // By filename/content hints
  if (lower.includes('-p-') || lower.includes('-p.')) return 'Pediatric';
  if (lower.includes('trauma')) return 'Trauma';
  if (lower.includes('cardiac') || lower.includes('arrest') || lower.includes('stemi')) return 'Cardiac';
  if (lower.includes('respiratory') || lower.includes('asthma')) return 'Respiratory';
  if (lower.includes('stroke') || lower.includes('seizure')) return 'Neurological';
  if (lower.includes('diabetic') || lower.includes('hypo') || lower.includes('hyper')) return 'Medical';
  if (lower.includes('overdose') || lower.includes('poison') || lower.includes('toxic')) return 'Toxicology';
  if (lower.includes('burn') || lower.includes('electric') || lower.includes('drown')) return 'Environmental';
  if (lower.includes('obstetric') || lower.includes('child') || lower.includes('newborn')) return 'OB/Pediatric';
  if (lower.includes('behavioral') || lower.includes('psych')) return 'Behavioral';
  
  // By number range
  if (n >= 500 && n < 600) return 'Reference';
  if (n >= 800 && n < 900) return 'Administrative';
  if (n >= 1200 && n < 1210) return 'General';
  if (n >= 1210 && n < 1220) return 'Cardiac';
  if (n >= 1220 && n < 1230) return 'Respiratory';
  if (n >= 1230 && n < 1240) return 'Neurological';
  if (n >= 1240 && n < 1250) return 'Trauma';
  if (n >= 1250 && n < 1260) return 'Pediatric';
  if (n >= 1260 && n < 1270) return 'OB/Pediatric';
  if (n >= 1270 && n < 1280) return 'Toxicology';
  if (n >= 1280 && n < 1290) return 'Environmental';
  if (n >= 1300 && n < 1320) return 'Medical Control';
  if (n >= 1320 && n < 1400) return 'Procedures';
  
  return 'General';
}

function chunkText(text: string, maxChunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 50);
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    console.warn('No VOYAGE_API_KEY - skipping embeddings');
    return texts.map(() => []);
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
    const text = await response.text();
    throw new Error(`Voyage API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

async function processPDF(filePath: string): Promise<ChunkInsert[]> {
  const filename = path.basename(filePath);
  const protocolNumber = extractProtocolNumber(filename);
  const protocolTitle = extractProtocolTitle(filename);
  const section = categorizeProtocol(protocolNumber, filename);
  
  const dataBuffer = fs.readFileSync(filePath);
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(dataBuffer);
  
  const text = data.text
    .replace(/\f/g, '\n')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  if (text.length < 50) {
    return [];
  }
  
  const chunks = chunkText(text);
  
  return chunks.map(content => ({
    agency_name: AGENCY_NAME,
    state_code: STATE_CODE,
    protocol_number: protocolNumber,
    protocol_title: `${protocolNumber} - ${protocolTitle}`,
    section,
    content,
    source_pdf_url: `${BASE_PDF_URL}${filename}`,
    protocol_year: 2024
  }));
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function clearExistingLACounty(): Promise<number> {
  const { data, error } = await supabase
    .from('manus_protocol_chunks')
    .delete()
    .eq('agency_name', AGENCY_NAME)
    .select('id');
  
  if (error) {
    console.error('Error clearing existing data:', error.message);
    return 0;
  }
  return data?.length || 0;
}

async function insertChunks(chunks: ChunkInsert[]): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0;
  const errors: string[] = [];
  const batchSize = 25;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const { error } = await supabase
      .from('manus_protocol_chunks')
      .insert(batch);

    if (error) {
      errors.push(`Batch ${Math.floor(i/batchSize)}: ${error.message}`);
      // Try individual inserts
      for (const chunk of batch) {
        const { error: singleError } = await supabase
          .from('manus_protocol_chunks')
          .insert(chunk);

        if (!singleError) {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
    
    // Progress
    const pct = Math.round(((i + batch.length) / chunks.length) * 100);
    process.stdout.write(`\r  Inserting: ${pct}% (${inserted} rows)`);
  }
  
  console.log();
  return { inserted, errors };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('LA COUNTY LOCAL PDF IMPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`PDF Directory: ${PDF_DIR}\n`);

  const skipEmbed = process.argv.includes('--skip-embed');
  const dryRun = process.argv.includes('--dry-run');
  const noClear = process.argv.includes('--no-clear');

  // Get all PDF files
  const pdfFiles = fs.readdirSync(PDF_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(PDF_DIR, f));

  console.log(`Found ${pdfFiles.length} PDF files\n`);

  if (pdfFiles.length === 0) {
    console.error('No PDF files found!');
    process.exit(1);
  }

  // Clear existing data
  if (!noClear && !dryRun) {
    console.log('Clearing existing LA County data...');
    const deleted = await clearExistingLACounty();
    console.log(`  Deleted ${deleted} existing chunks\n`);
  }

  // Process all PDFs
  console.log('Processing PDFs...');
  const allChunks: ChunkInsert[] = [];
  const failedFiles: string[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const filePath = pdfFiles[i];
    const filename = path.basename(filePath);
    
    try {
      const chunks = await processPDF(filePath);
      allChunks.push(...chunks);
      
      const pct = Math.round(((i + 1) / pdfFiles.length) * 100);
      process.stdout.write(`\r  Parsing: ${pct}% - ${filename.padEnd(40).substring(0,40)}`);
    } catch (error: any) {
      failedFiles.push(`${filename}: ${error.message}`);
    }
  }
  console.log('\n');

  console.log(`Parsed ${pdfFiles.length - failedFiles.length} PDFs successfully`);
  console.log(`Generated ${allChunks.length} chunks\n`);

  if (failedFiles.length > 0) {
    console.log('Failed files:');
    failedFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
    if (failedFiles.length > 10) {
      console.log(`  ... and ${failedFiles.length - 10} more`);
    }
    console.log();
  }

  if (dryRun) {
    console.log('[DRY RUN] Would insert these chunks:');
    const bySection = new Map<string, number>();
    allChunks.forEach(c => {
      bySection.set(c.section || 'Unknown', (bySection.get(c.section || 'Unknown') || 0) + 1);
    });
    
    console.log('\nBy section:');
    for (const [section, count] of Array.from(bySection.entries()).sort()) {
      console.log(`  ${section}: ${count} chunks`);
    }
    return;
  }

  // Generate embeddings
  if (!skipEmbed && VOYAGE_API_KEY) {
    console.log('Generating embeddings...');
    const batchSize = 96;
    
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => `${c.protocol_title}\n\n${c.content}`);
      
      try {
        const embeddings = await generateEmbeddingsBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
        
        const pct = Math.round(((i + batch.length) / allChunks.length) * 100);
        process.stdout.write(`\r  Embeddings: ${pct}%`);
      } catch (error: any) {
        console.error(`\n  Embedding error at batch ${i}: ${error.message}`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('\n');
  } else {
    console.log('Skipping embeddings\n');
  }

  // Insert into database
  console.log('Inserting into database...');
  const { inserted, errors } = await insertChunks(allChunks);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n  Agency: ${AGENCY_NAME}`);
  console.log(`  State: ${STATE_CODE}`);
  console.log(`  PDFs processed: ${pdfFiles.length - failedFiles.length}/${pdfFiles.length}`);
  console.log(`  Chunks generated: ${allChunks.length}`);
  console.log(`  Chunks inserted: ${inserted}`);
  console.log(`  Embeddings: ${skipEmbed ? 'Skipped' : 'Generated'}`);
  
  if (errors.length > 0) {
    console.log(`\n  Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
  }
  
  console.log('\n✓ Import complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
