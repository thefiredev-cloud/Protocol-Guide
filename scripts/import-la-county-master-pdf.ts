/**
 * LA County Master PDF Import
 *
 * Downloads and parses the complete LA County Prehospital Care Manual
 * to extract all protocols with proper numbering.
 *
 * Run with: npx tsx scripts/import-la-county-master-pdf.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { chunkProtocol } from '../server/_core/protocol-chunker';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

const LA_COUNTY_PDF_URL = 'https://file.lacounty.gov/SDSInter/dhs/1075386_LACountyTreatmentProtocols.pdf';
const AGENCY_NAME = 'Los Angeles County EMS Agency';
const STATE_CODE = 'CA';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface ParsedProtocol {
  protocolNumber: string;
  protocolTitle: string;
  section: string;
  content: string;
  pageStart: number;
  pageEnd: number;
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

// ============================================================================
// PDF DOWNLOAD
// ============================================================================

async function downloadPDF(url: string): Promise<Buffer> {
  console.log(`Downloading PDF from: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================================================
// PROTOCOL EXTRACTION PATTERNS
// ============================================================================

const PROTOCOL_PATTERNS = {
  // Treatment Protocol header: "TREATMENT PROTOCOL 1210" or "TP 1210"
  treatmentProtocol: /(?:TREATMENT\s*PROTOCOL|TP)\s*[:\s#]?\s*(\d{4}(?:\.\d+)?)/gi,

  // Reference header: "REFERENCE NO. 506" or "Ref 814"
  reference: /(?:REFERENCE\s*(?:NO\.?)?|Ref\.?)\s*[:\s#]?\s*(\d{3,4}(?:\.\d+)?)/gi,

  // Medical Control Guideline: "MCG 1301" or "Medical Control Guideline 1301"
  mcg: /(?:MCG|Medical\s*Control\s*Guideline)\s*[:\s#]?\s*(\d{4}(?:\.\d+)?)/gi,

  // Page header detection
  pageHeader: /DEPARTMENT\s+OF\s+HEALTH\s+SERVICES[\s\S]{0,200}COUNTY\s+OF\s+LOS\s+ANGELES/gi,

  // Protocol title extraction
  titleLine: /(?:REFERENCE|TREATMENT\s*PROTOCOL|MCG)[^\n]+/gi,
};

// Section categorization
function categorizeProtocol(num: string, content: string): string {
  const n = parseInt(num);
  const lower = content.toLowerCase();

  // By number range
  if (n >= 500 && n < 600) return 'Transport/Triage';
  if (n >= 800 && n < 900) return 'Administrative';
  if (n >= 1200 && n < 1210) return 'General';
  if (n >= 1210 && n < 1220) return 'Cardiac';
  if (n >= 1220 && n < 1230) return 'Respiratory';
  if (n >= 1230 && n < 1240) return 'Neurological';
  if (n >= 1240 && n < 1250) return 'Trauma';
  if (n >= 1250 && n < 1260) return 'Pediatric';
  if (n >= 1260 && n < 1270) return 'Toxicology';
  if (n >= 1270 && n < 1280) return 'Environmental';
  if (n >= 1300 && n < 1320) return 'Medical Control';
  if (num.startsWith('1317')) return 'Drug Reference';
  if (n >= 1320 && n < 1400) return 'Procedures';

  // By content keywords
  if (lower.includes('cardiac') || lower.includes('arrest')) return 'Cardiac';
  if (lower.includes('trauma')) return 'Trauma';
  if (lower.includes('pediatric')) return 'Pediatric';
  if (lower.includes('airway') || lower.includes('respiratory')) return 'Respiratory';

  return 'General';
}

// ============================================================================
// PDF PARSING
// ============================================================================

async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  console.log('Parsing PDF...');
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  console.log(`  Pages: ${data.numpages}`);
  console.log(`  Text length: ${data.text.length} characters`);
  return { text: data.text, numPages: data.numpages };
}

function extractProtocols(text: string): ParsedProtocol[] {
  const protocols: ParsedProtocol[] = [];
  const seenNumbers = new Set<string>();

  // Split by page headers to get protocol blocks
  const blocks = text.split(/(?=DEPARTMENT\s+OF\s+HEALTH\s+SERVICES)/i);

  console.log(`  Found ${blocks.length} page blocks`);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.trim().length < 200) continue;

    // Try to extract protocol number
    let protocolNumber: string | null = null;
    let protocolType = '';

    // Check for Reference number
    const refMatch = block.match(/REFERENCE\s*NO\.?\s*[:\s]?\s*(\d+\s*\d*\.?\d*)/i);
    if (refMatch) {
      protocolNumber = refMatch[1].replace(/\s+/g, '');
      protocolType = 'Ref';
    }

    // Check for Treatment Protocol
    if (!protocolNumber) {
      const tpMatch = block.match(/TREATMENT\s*PROTOCOL\s*[:\s]?\s*(\d+\.?\d*)/i);
      if (tpMatch) {
        protocolNumber = tpMatch[1];
        protocolType = 'TP';
      }
    }

    // Check for MCG
    if (!protocolNumber) {
      const mcgMatch = block.match(/Medical\s*Control\s*Guideline\s*[:\s]?[^\d]*(\d+\.?\d*)/i);
      if (mcgMatch) {
        protocolNumber = mcgMatch[1];
        protocolType = 'MCG';
      }
    }

    if (!protocolNumber) continue;

    // Skip if we've already seen this protocol
    if (seenNumbers.has(protocolNumber)) continue;
    seenNumbers.add(protocolNumber);

    // Extract title
    let title = `${protocolType} ${protocolNumber}`;
    const titleMatch = block.match(/(?:Medical\s*Control\s*Guideline|TREATMENT\s*PROTOCOL|REFERENCE\s*NO\.?\s*\d+)[:\s\-–]*([A-Z][A-Z\s\-–\/\(\)]+)/i);
    if (titleMatch && titleMatch[1]) {
      const cleanTitle = titleMatch[1]
        .replace(/\s+/g, ' ')
        .replace(/PAGE\s*\d+.*$/i, '')
        .trim()
        .substring(0, 80);
      if (cleanTitle.length > 3) {
        title = `${protocolType} ${protocolNumber} - ${cleanTitle}`;
      }
    }

    // Clean content
    const content = block
      .replace(/\f/g, '\n')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (content.length < 100) continue;

    protocols.push({
      protocolNumber,
      protocolTitle: title,
      section: categorizeProtocol(protocolNumber, content),
      content,
      pageStart: i,
      pageEnd: i,
    });
  }

  return protocols;
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
// DATABASE OPERATIONS
// ============================================================================

async function insertChunks(chunks: ChunkInsert[]): Promise<number> {
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const { error } = await supabase
      .from('manus_protocol_chunks')
      .insert(batch);

    if (error) {
      // Try individual inserts if batch fails
      for (const chunk of batch) {
        const { error: singleError } = await supabase
          .from('manus_protocol_chunks')
          .insert(chunk);

        if (!singleError) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('LA COUNTY MASTER PDF IMPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const skipEmbed = process.argv.includes('--skip-embed');
  const dryRun = process.argv.includes('--dry-run');

  try {
    // Step 1: Download PDF
    const pdfBuffer = await downloadPDF(LA_COUNTY_PDF_URL);
    console.log(`  Downloaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 2: Parse PDF
    const { text, numPages } = await parsePDF(pdfBuffer);

    // Step 3: Extract protocols
    console.log('\nExtracting protocols...');
    const protocols = extractProtocols(text);
    console.log(`  Found ${protocols.length} unique protocols\n`);

    // Show protocol breakdown
    const bySection = new Map<string, number>();
    for (const p of protocols) {
      bySection.set(p.section, (bySection.get(p.section) || 0) + 1);
    }

    console.log('Protocol breakdown by section:');
    for (const [section, count] of Array.from(bySection.entries()).sort()) {
      console.log(`  ${section}: ${count}`);
    }
    console.log();

    if (dryRun) {
      console.log('[DRY RUN] Would import these protocols:');
      for (const p of protocols.slice(0, 20)) {
        console.log(`  ${p.protocolNumber}: ${p.protocolTitle.substring(0, 50)}`);
      }
      if (protocols.length > 20) {
        console.log(`  ... and ${protocols.length - 20} more`);
      }
      return;
    }

    // Step 4: Generate chunks
    console.log('Generating chunks...');
    const allChunks: ChunkInsert[] = [];

    for (const protocol of protocols) {
      const chunks = chunkProtocol(
        protocol.content,
        protocol.protocolNumber,
        protocol.protocolTitle
      );

      for (const chunk of chunks) {
        allChunks.push({
          agency_name: AGENCY_NAME,
          state_code: STATE_CODE,
          protocol_number: protocol.protocolNumber,
          protocol_title: protocol.protocolTitle,
          section: protocol.section,
          content: chunk.content,
          source_pdf_url: LA_COUNTY_PDF_URL,
          protocol_year: 2024,
        });
      }
    }

    console.log(`  Generated ${allChunks.length} chunks\n`);

    // Step 5: Generate embeddings
    if (!skipEmbed && VOYAGE_API_KEY) {
      console.log('Generating embeddings...');
      const batchSize = 128;

      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        const texts = batch.map(c => `${c.protocol_title}\n\n${c.content}`);

        try {
          const embeddings = await generateEmbeddingsBatch(texts);
          for (let j = 0; j < batch.length; j++) {
            batch[j].embedding = embeddings[j];
          }

          const pct = Math.round(((i + batch.length) / allChunks.length) * 100);
          process.stdout.write(`\r  Progress: ${pct}%`);
        } catch (error: any) {
          console.error(`\n  Embedding error at batch ${i}: ${error.message}`);
        }

        await new Promise(r => setTimeout(r, 200));
      }
      console.log('\n');
    }

    // Step 6: Insert into database
    console.log('Inserting into database...');
    const inserted = await insertChunks(allChunks);
    console.log(`  Inserted: ${inserted} chunks\n`);

    // Summary
    console.log('='.repeat(70));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n  PDF pages: ${numPages}`);
    console.log(`  Protocols extracted: ${protocols.length}`);
    console.log(`  Chunks generated: ${allChunks.length}`);
    console.log(`  Chunks inserted: ${inserted}`);
    console.log(`  Embeddings: ${skipEmbed ? 'Skipped' : 'Generated'}`);

  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main();
