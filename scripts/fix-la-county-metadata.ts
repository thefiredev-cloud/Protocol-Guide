/**
 * Fix LA County Protocol Metadata
 *
 * Updates protocols with date-format protocol_numbers to proper LA County format
 * by extracting the actual reference number from the content.
 *
 * Run with: npx tsx scripts/fix-la-county-metadata.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ProtocolFix {
  id: number;
  oldNumber: string;
  newNumber: string;
  newTitle: string;
}

/**
 * Extract protocol number from content
 * Patterns:
 * - REFERENCE NO. 1301
 * - Ref. No. 1345
 * - REFERENCE NO. 13 17.39 (space between digits)
 * - Ref. No. 13 45 (space between digits)
 */
function extractProtocolNumber(content: string): string | null {
  // Pattern 1: REFERENCE NO. with potential spaces in number (capture all digit groups)
  const refMatch = content.match(/REFERENCE\s*NO\.?\s*:?\s*([\d\s\.]+)/i);
  if (refMatch) {
    // Remove all spaces and trim, keep only digits and dots
    const cleaned = refMatch[1].replace(/\s+/g, '').replace(/^\.+|\.+$/g, '').trim();
    if (cleaned && /^\d+\.?\d*$/.test(cleaned)) {
      return cleaned;
    }
  }

  // Pattern 2: Ref. No. format with potential spaces
  const refNoMatch = content.match(/Ref\.?\s*No\.?\s*:?\s*([\d\s\.]+)/i);
  if (refNoMatch) {
    const cleaned = refNoMatch[1].replace(/\s+/g, '').replace(/^\.+|\.+$/g, '').trim();
    if (cleaned && /^\d+\.?\d*$/.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extract protocol title from content
 */
function extractProtocolTitle(content: string, protocolNumber: string): string {
  // Look for "Medical Control Guideline:" pattern
  const mcgMatch = content.match(/Medical\s*Control\s*Guideline\s*:?\s*([A-Z][A-Z\s\-–—]+)/i);
  if (mcgMatch) {
    const title = mcgMatch[1].trim().replace(/\s+/g, ' ');
    // Clean up common suffixes
    const cleanTitle = title
      .replace(/Ref\.?\s*No\.?\s*\d+.*$/i, '')
      .replace(/\s+$/, '')
      .trim();
    if (cleanTitle.length > 5 && cleanTitle.length < 100) {
      return `MCG ${protocolNumber} - ${cleanTitle}`;
    }
  }

  // Look for "TREATMENT PROTOCOL" pattern
  const tpMatch = content.match(/TREATMENT\s*PROTOCOL\s*:?\s*([A-Z][A-Z\s\-–—]+)/i);
  if (tpMatch) {
    const title = tpMatch[1].trim().replace(/\s+/g, ' ');
    if (title.length > 5 && title.length < 100) {
      return `TP ${protocolNumber} - ${title}`;
    }
  }

  // Default: Just use Reference number
  return `Ref ${protocolNumber}`;
}

async function getProtocolsToFix(): Promise<ProtocolFix[]> {
  console.log('Fetching LA County protocols with date-format numbers...\n');

  const { data, error } = await supabase
    .from('manus_protocol_chunks')
    .select('id, protocol_number, protocol_title, content')
    .or('agency_name.ilike.%Los Angeles%,agency_name.ilike.%LA County%')
    .like('protocol_number', '__/__/____');

  if (error) throw error;

  const fixes: ProtocolFix[] = [];

  for (const row of data || []) {
    const extractedNumber = extractProtocolNumber(row.content);
    if (extractedNumber) {
      const newTitle = extractProtocolTitle(row.content, extractedNumber);
      fixes.push({
        id: row.id,
        oldNumber: row.protocol_number,
        newNumber: extractedNumber,
        newTitle: newTitle
      });
    }
  }

  return fixes;
}

async function applyFixes(fixes: ProtocolFix[], dryRun: boolean = true): Promise<void> {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Applying ${fixes.length} fixes...\n`);

  let success = 0;
  let errors = 0;

  for (const fix of fixes) {
    if (dryRun) {
      console.log(`  ID ${fix.id}: "${fix.oldNumber}" -> "${fix.newNumber}" (${fix.newTitle})`);
      success++;
    } else {
      const { error } = await supabase
        .from('manus_protocol_chunks')
        .update({
          protocol_number: fix.newNumber,
          protocol_title: fix.newTitle
        })
        .eq('id', fix.id);

      if (error) {
        console.error(`  ERROR ID ${fix.id}: ${error.message}`);
        errors++;
      } else {
        console.log(`  Updated ID ${fix.id}: ${fix.newNumber}`);
        success++;
      }
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Complete: ${success} success, ${errors} errors`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('LA COUNTY PROTOCOL METADATA FIX');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('Running in DRY RUN mode. Use --apply to make changes.\n');
  } else {
    console.log('Running in APPLY mode. Changes will be saved.\n');
  }

  try {
    const fixes = await getProtocolsToFix();

    if (fixes.length === 0) {
      console.log('No protocols need fixing!');
      return;
    }

    console.log(`Found ${fixes.length} protocols to fix:\n`);

    // Group by new protocol number to show summary
    const byNumber = new Map<string, number>();
    for (const fix of fixes) {
      byNumber.set(fix.newNumber, (byNumber.get(fix.newNumber) || 0) + 1);
    }

    console.log('Protocol number extraction summary:');
    const entries = Array.from(byNumber.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const entry of entries) {
      console.log(`  ${entry[0]}: ${entry[1]} chunk(s)`);
    }
    console.log();

    await applyFixes(fixes, dryRun);

    if (dryRun) {
      console.log('\nTo apply these changes, run:');
      console.log('  npx tsx scripts/fix-la-county-metadata.ts --apply');
    }

  } catch (error: any) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();
