/**
 * Save PDF from browser base64 chunks
 */
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'san-benito-protocols', 'SBC_EMS_Manual_2025.pdf');

async function main() {
  // Read base64 chunks from stdin
  const chunks: string[] = [];
  
  process.stdin.setEncoding('utf8');
  
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  const base64 = chunks.join('');
  const buffer = Buffer.from(base64, 'base64');
  
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Saved ${buffer.length} bytes to ${OUTPUT_PATH}`);
}

main().catch(console.error);
