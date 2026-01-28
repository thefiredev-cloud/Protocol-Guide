/**
 * LA-DROP Prehospital Blood Transfusion Protocol Import
 * 
 * Parses the LA-DROP protocol PDF and inserts it into Supabase manus_protocol_chunks.
 * 
 * Run with: npx tsx scripts/import-la-drop-protocol.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

const PDF_PATH = path.join(__dirname, '../data/la-drop-protocol.pdf');

// Protocol metadata
const AGENCY_NAME = 'Los Angeles County EMS Agency';
const STATE_CODE = 'CA';
const STATE_NAME = 'California';
const PROTOCOL_TITLE = 'LA-DROP Prehospital Blood Transfusion Protocol';
const PROTOCOL_NUMBER = 'LA-DROP';
const SOURCE_PDF_URL = 'https://file.lacounty.gov/SDSInter/dhs/1179365_LA-DROPPHBTProtocolChecklistConsent.pdf';
const PROTOCOL_YEAR = 2024;

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
  state_name: string;
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

/**
 * Detect section from content for better organization
 */
function detectSection(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('indication') || lower.includes('criteria')) return 'Indications';
  if (lower.includes('contraindication')) return 'Contraindications';
  if (lower.includes('procedure') || lower.includes('steps')) return 'Procedure';
  if (lower.includes('consent') || lower.includes('authorization')) return 'Consent';
  if (lower.includes('checklist')) return 'Checklist';
  if (lower.includes('complication') || lower.includes('adverse')) return 'Complications';
  if (lower.includes('equipment') || lower.includes('supply') || lower.includes('supplies')) return 'Equipment';
  if (lower.includes('documentation') || lower.includes('record')) return 'Documentation';
  if (lower.includes('training') || lower.includes('education')) return 'Training';
  if (lower.includes('blood product') || lower.includes('transfusion')) return 'Blood Products';
  if (lower.includes('transport') || lower.includes('destination')) return 'Transport';
  if (lower.includes('vital') || lower.includes('monitor')) return 'Monitoring';
  
  return 'General';
}

/**
 * Smart text chunking that preserves context
 */
function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const chunks: string[] = [];
  
  // Split by double newlines (paragraphs) first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;
    
    // If adding this paragraph would exceed max size, save current and start new
    if (currentChunk.length + trimmedPara.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedPara;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out chunks that are too short to be useful
  return chunks.filter(c => c.length > 50);
}

/**
 * Clean extracted PDF text
 */
function cleanText(text: string): string {
  return text
    .replace(/\f/g, '\n')           // Form feeds to newlines
    .replace(/\r\n/g, '\n')         // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')     // Collapse multiple newlines
    .replace(/[ \t]+/g, ' ')        // Collapse multiple spaces/tabs
    .replace(/^\s+$/gm, '')         // Remove whitespace-only lines
    .trim();
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    console.warn('⚠️  No VOYAGE_API_KEY - skipping embeddings');
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
      input: texts.map(t => t.substring(0, 8000)), // Truncate for token limit
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
// DATABASE OPERATIONS
// ============================================================================

async function clearExistingProtocol(): Promise<number> {
  const { data, error } = await supabase
    .from('manus_protocol_chunks')
    .delete()
    .eq('protocol_number', PROTOCOL_NUMBER)
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
      // Try individual inserts on failure
      for (const chunk of batch) {
        const { error: singleError } = await supabase
          .from('manus_protocol_chunks')
          .insert(chunk);

        if (!singleError) {
          inserted++;
        } else {
          errors.push(`Individual insert failed: ${singleError.message}`);
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
// PDF PROCESSING
// ============================================================================

async function processPDF(): Promise<ChunkInsert[]> {
  console.log(`📄 Reading PDF: ${PDF_PATH}`);
  
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF file not found: ${PDF_PATH}`);
  }
  
  const dataBuffer = fs.readFileSync(PDF_PATH);
  console.log(`   File size: ${(dataBuffer.length / 1024).toFixed(1)} KB`);
  
  const pdfData = await pdfParse(dataBuffer);
  console.log(`   Pages: ${pdfData.numpages}`);
  
  const text = cleanText(pdfData.text);
  console.log(`   Extracted text: ${text.length} characters`);
  
  if (text.length < 100) {
    throw new Error('PDF appears to be empty or unreadable');
  }
  
  // Chunk the text
  const textChunks = chunkText(text);
  console.log(`   Created ${textChunks.length} chunks`);
  
  // Create chunk records
  const chunks: ChunkInsert[] = textChunks.map((content, index) => ({
    agency_name: AGENCY_NAME,
    state_code: STATE_CODE,
    state_name: STATE_NAME,
    protocol_number: PROTOCOL_NUMBER,
    protocol_title: PROTOCOL_TITLE,
    section: detectSection(content),
    content,
    source_pdf_url: SOURCE_PDF_URL,
    protocol_year: PROTOCOL_YEAR
  }));
  
  return chunks;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('LA-DROP PREHOSPITAL BLOOD TRANSFUSION PROTOCOL IMPORT');
  console.log('═'.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Protocol: ${PROTOCOL_TITLE}`);
  console.log(`Agency: ${AGENCY_NAME}`);
  console.log(`Source: ${SOURCE_PDF_URL}\n`);

  const skipEmbed = process.argv.includes('--skip-embed');
  const dryRun = process.argv.includes('--dry-run');
  const noClear = process.argv.includes('--no-clear');

  // Clear existing data for this protocol
  if (!noClear && !dryRun) {
    console.log('🗑️  Clearing existing LA-DROP data...');
    const deleted = await clearExistingProtocol();
    console.log(`   Deleted ${deleted} existing chunks\n`);
  }

  // Process the PDF
  console.log('📋 Processing PDF...');
  const allChunks = await processPDF();
  console.log();

  // Show section breakdown
  const sectionCounts = new Map<string, number>();
  allChunks.forEach(c => {
    sectionCounts.set(c.section || 'General', (sectionCounts.get(c.section || 'General') || 0) + 1);
  });
  
  console.log('📊 Chunks by section:');
  for (const [section, count] of Array.from(sectionCounts.entries()).sort()) {
    console.log(`   ${section}: ${count}`);
  }
  console.log();

  if (dryRun) {
    console.log('[DRY RUN] Would insert these chunks - exiting');
    return;
  }

  // Generate embeddings
  if (!skipEmbed && VOYAGE_API_KEY) {
    console.log('🧠 Generating embeddings...');
    const batchSize = 48; // Conservative batch size
    
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => `${c.protocol_title}\n\n${c.content}`);
      
      try {
        const embeddings = await generateEmbeddingsBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
        
        const pct = Math.round(((i + batch.length) / allChunks.length) * 100);
        process.stdout.write(`\r   Embeddings: ${pct}%`);
      } catch (error: any) {
        console.error(`\n   ⚠️  Embedding error at batch ${i}: ${error.message}`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('\n');
  } else {
    console.log('⏭️  Skipping embeddings\n');
  }

  // Insert into database
  console.log('💾 Inserting into database...');
  const { inserted, errors } = await insertChunks(allChunks);

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('IMPORT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n  ✓ Protocol: ${PROTOCOL_NUMBER} - ${PROTOCOL_TITLE}`);
  console.log(`  ✓ Agency: ${AGENCY_NAME}`);
  console.log(`  ✓ State: ${STATE_NAME} (${STATE_CODE})`);
  console.log(`  ✓ Chunks created: ${allChunks.length}`);
  console.log(`  ✓ Chunks inserted: ${inserted}`);
  console.log(`  ✓ Embeddings: ${skipEmbed ? 'Skipped' : 'Generated'}`);
  
  if (errors.length > 0) {
    console.log(`\n  ⚠️  Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
  }
  
  console.log('\n✅ Import complete!');
  console.log(`   Total chunks: ${inserted}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
