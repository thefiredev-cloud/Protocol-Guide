/**
 * Sierra-Sacramento Valley EMS Agency (SSVEMS) Protocol Import
 * 
 * Covers 10 counties: Butte, Colusa, Glenn, Nevada, Placer, Shasta, Siskiyou, Sutter, Tehama, Yuba
 * 
 * Run with: npx tsx scripts/import-ssvems-protocols.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AGENCY_NAME = 'Sierra-Sacramento Valley EMS Agency';
const STATE_CODE = 'CA';
const STATE_NAME = 'California';
const PROTOCOL_YEAR = 2026;
const SOURCE_URL = 'https://www.ssvems.com/section-viii/';

// SSVEMS covers these 10 counties
const COVERED_COUNTIES = [
  'Butte', 'Colusa', 'Glenn', 'Nevada', 'Placer', 
  'Shasta', 'Siskiyou', 'Sutter', 'Tehama', 'Yuba'
];

// Protocol PDFs from the SSVEMS website
const PROTOCOL_URLS = [
  // Adult Cardiovascular
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/C-1.pdf', number: 'C-1', title: 'Non-Traumatic Pulseless Arrest' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/C-2-Return-of-Spontaneous-Circulation.pdf', number: 'C-2', title: 'Return Of Spontaneous Circulation (ROSC)' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/C-3.pdf', number: 'C-3', title: 'Bradycardia With Pulses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/C-4.pdf', number: 'C-4', title: 'Tachycardia With Pulses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/C-5.pdf', number: 'C-5', title: 'Ventricular Assist Device (VAD)' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/C-6.pdf', number: 'C-6', title: 'Chest Discomfort/Suspected Acute Coronary Syndrome (ACS)' },
  
  // Adult Respiratory
  { url: 'https://www.ssvems.com/wp-content/uploads/2023/12/R-1.pdf', number: 'R-1', title: 'Airway Obstruction' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/R-2.pdf', number: 'R-2', title: 'Respiratory Arrest' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/R-3.pdf', number: 'R-3', title: 'Acute Respiratory Distress' },
  
  // Adult Medical
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/M-1-Allergic-Reaction_Anaphylaxis.pdf', number: 'M-1', title: 'Allergic Reaction/Anaphylaxis' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/M-3-Phenothiazine-Dystonic-Reaction.pdf', number: 'M-3', title: 'Phenothiazine/Dystonic Reaction' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/M-4-BLS-Naloxone-Administration-For-Suspected-Opioid-Overdose.pdf', number: 'M-4', title: 'BLS Naloxone Administration For Suspected Opioid Overdose' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/M-5.pdf', number: 'M-5', title: 'Ingestions & Overdoses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/M-6-General-Medical-Treatment.pdf', number: 'M-6', title: 'General Medical Treatment' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/M-8.pdf', number: 'M-8', title: 'Pain Management' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/M-9.pdf', number: 'M-9', title: 'CO Exposure/Poisoning' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/M-11-Behavioral-Emergencies.pdf', number: 'M-11', title: 'Behavioral Emergencies' },
  
  // Adult Neurological
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/N-1.pdf', number: 'N-1', title: 'Altered Level Of Consciousness' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/N-2.pdf', number: 'N-2', title: 'Seizure' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/N-3-Suspected-Stroke.pdf', number: 'N-3', title: 'Suspected Stroke' },
  
  // Adult OB/GYN
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/OB-G1-Childbirth.pdf', number: 'OB/G-1', title: 'Childbirth' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/OB-G2.pdf', number: 'OB/G-2', title: 'Obstetric Emergencies' },
  
  // Adult Environmental
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/E-1.pdf', number: 'E-1', title: 'Hyperthermia' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/E-2-Hypothermia-Avalanche_Snow-Immersion-Suffocation-Resuscitation.pdf', number: 'E-2', title: 'Hypothermia & Avalanche/Snow Immersion Suffocation Resuscitation' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/E-3-Frostbite.pdf', number: 'E-3', title: 'Frostbite' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/E-4-Bites_Envenomations.pdf', number: 'E-4', title: 'Bites/Envenomations' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/10/E-7.pdf', number: 'E-7', title: 'Hazardous Material Exposure' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/10/E-8.pdf', number: 'E-8', title: 'Nerve Agent Treatment' },
  
  // Adult Trauma
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/T-1.pdf', number: 'T-1', title: 'General Trauma Management' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/T-2.pdf', number: 'T-2', title: 'Crush Injury/Crush Syndrome' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/T-3.pdf', number: 'T-3', title: 'Suspected Moderate/Severe Traumatic Brain Injury (TBI)' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/T-4.pdf', number: 'T-4', title: 'Hemorrhage' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/T-5-Burns.pdf', number: 'T-5', title: 'Burns' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/02/T-6.pdf', number: 'T-6', title: 'Traumatic Pulseless Arrest' },
  
  // Pediatric
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/C-1P-Pediatric-Pulseless-Arrest.pdf', number: 'C-1P', title: 'Pediatric Pulseless Arrest' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/C-3P-Pediatric-Bradycardia-With-Pulses.pdf', number: 'C-3P', title: 'Pediatric Bradycardia With Pulses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/C-4P-Pediatric-Tachycardia-With-Pulses.pdf', number: 'C-4P', title: 'Pediatric Tachycardia With Pulses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/M-1P-Pediatric-Allergic-Reaction-Anaphylaxis.pdf', number: 'M-1P', title: 'Pediatric Allergic Reaction/Anaphylaxis' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/M-2P.pdf', number: 'M-2P', title: 'Newborn Care/Neonatal Resuscitation' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/M-5P-Pediatric-Ingestions-Overdoses.pdf', number: 'M-5P', title: 'Pediatric Ingestions & Overdoses' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/03/M-6P.pdf', number: 'M-6P', title: 'Pediatric General Medical Treatment' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/M-8P.pdf', number: 'M-8P', title: 'Pediatric Pain Management' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/M-11P-Pediatric-Behavioral-Emergencies.pdf', number: 'M-11P', title: 'Pediatric Behavioral Emergencies' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/N-1P-Pediatric-Altered-Level-Of-Consciousness.pdf', number: 'N-1P', title: 'Pediatric Altered Level Of Consciousness' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/02/N-2P.pdf', number: 'N-2P', title: 'Pediatric Seizure' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/R-1P-Pediatric-Foreign-Body-Airway-Obstructions-FBAO.pdf', number: 'R-1P', title: 'Pediatric Foreign Body Airway Obstruction' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/R-2P-Pediatric-Respiratory-Arrest.pdf', number: 'R-2P', title: 'Pediatric Respiratory Arrest' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/R-3P-Pediatric-Respiratory-Distress.pdf', number: 'R-3P', title: 'Pediatric Respiratory Distress' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/05/T-3P-Pediatric-Suspected-Moderate-Severe-Traumatic-Brain-Injury-TBI.pdf', number: 'T-3P', title: 'Pediatric Suspected Moderate/Severe Traumatic Brain Injury (TBI)' },
  
  // General Protocols
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/10/G-1-Multiple-Patient-Incidents.pdf', number: 'G-1', title: 'Multiple Patient Incidents' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/02/G-2.pdf', number: 'G-2', title: 'Determination Of Death' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/G-3-DNR-POLST-End-Of-Life-Option-Act.pdf', number: 'G-3', title: 'DNR, POLST & End Of Life Option Act' },
  
  // Procedure Protocols
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/PR-1.pdf', number: 'PR-1', title: '12-Lead EKG' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/PR-2.pdf', number: 'PR-2', title: 'Airway & Ventilation Management' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/04/PR-3.pdf', number: 'PR-3', title: 'Pleural Decompression' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2025/09/PR-3P.pdf', number: 'PR-3P', title: 'Pediatric Pleural Decompression' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/PR-4-Venous-Blood-Draws.pdf', number: 'PR-4', title: 'Venous Blood Draws' },
  { url: 'https://www.ssvems.com/wp-content/uploads/2024/11/PR-5-Vascular-Access.pdf', number: 'PR-5', title: 'Vascular Access' },
];

interface ProtocolChunk {
  agency_name: string;
  state_code: string;
  state_name: string;
  protocol_number: string;
  protocol_title: string;
  section: string | null;
  content: string;
  source_pdf_url: string;
  protocol_year: number;
}

async function downloadAndParsePdf(url: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  
  console.log(`  Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  const data = await pdfParse(buffer);
  return data.text;
}

function chunkText(text: string, maxChunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function importProtocol(protocol: { url: string; number: string; title: string }): Promise<number> {
  try {
    const text = await downloadAndParsePdf(protocol.url);
    const chunks = chunkText(text);
    
    const records: ProtocolChunk[] = chunks.map((content, idx) => ({
      agency_name: AGENCY_NAME,
      state_code: STATE_CODE,
      state_name: STATE_NAME,
      protocol_number: protocol.number,
      protocol_title: protocol.title,
      section: chunks.length > 1 ? `Part ${idx + 1}` : null,
      content,
      source_pdf_url: protocol.url,
      protocol_year: PROTOCOL_YEAR,
    }));
    
    const { error } = await supabase
      .from('manus_protocol_chunks')
      .insert(records);
    
    if (error) {
      console.error(`  Error inserting ${protocol.number}:`, error);
      return 0;
    }
    
    console.log(`  ✓ ${protocol.number}: ${chunks.length} chunks`);
    return chunks.length;
  } catch (err) {
    console.error(`  Error processing ${protocol.number}:`, err);
    return 0;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('SSVEMS Protocol Import');
  console.log(`Agency: ${AGENCY_NAME}`);
  console.log(`Counties: ${COVERED_COUNTIES.join(', ')}`);
  console.log('='.repeat(60));
  
  // Check if we already have SSVEMS protocols
  const { count: existingCount } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('agency_name', AGENCY_NAME);
  
  if (existingCount && existingCount > 0) {
    console.log(`\nFound ${existingCount} existing SSVEMS chunks. Clearing...`);
    const { error: deleteErr } = await supabase
      .from('manus_protocol_chunks')
      .delete()
      .eq('agency_name', AGENCY_NAME);
    
    if (deleteErr) {
      console.error('Error clearing existing data:', deleteErr);
      return;
    }
    console.log('Cleared existing data.');
  }
  
  console.log(`\nProcessing ${PROTOCOL_URLS.length} protocols...\n`);
  
  let totalChunks = 0;
  let successCount = 0;
  
  for (const protocol of PROTOCOL_URLS) {
    const chunks = await importProtocol(protocol);
    totalChunks += chunks;
    if (chunks > 0) successCount++;
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log(`Protocols processed: ${successCount}/${PROTOCOL_URLS.length}`);
  console.log(`Total chunks inserted: ${totalChunks}`);
  console.log('='.repeat(60));
  
  // Verify
  const { count: finalCount } = await supabase
    .from('manus_protocol_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('agency_name', AGENCY_NAME);
  
  console.log(`\nVerification: ${finalCount} chunks in database for ${AGENCY_NAME}`);
}

main().catch(console.error);
