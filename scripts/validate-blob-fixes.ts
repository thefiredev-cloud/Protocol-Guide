#!/usr/bin/env tsx
/**
 * Validation script for Blob handling fixes
 * Checks that all platform-specific files are correctly set up
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
const libDir = join(rootDir, 'lib');
const componentsDir = join(rootDir, 'components');
const appDir = join(rootDir, 'app');

interface ValidationResult {
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];

function check(condition: boolean, message: string): void {
  results.push({ passed: condition, message });
  console.log(condition ? '✅' : '❌', message);
}

console.log('🔍 Validating Blob Handling Fixes...\n');

// Check blob-utils files exist
console.log('📁 Checking blob-utils files:');
check(
  existsSync(join(libDir, 'blob-utils.ts')),
  'blob-utils.ts (platform resolver) exists'
);
check(
  existsSync(join(libDir, 'blob-utils.web.ts')),
  'blob-utils.web.ts (web implementation) exists'
);
check(
  existsSync(join(libDir, 'blob-utils.native.ts')),
  'blob-utils.native.ts (native implementation) exists'
);

// Check audio files exist
console.log('\n📁 Checking audio files:');
check(
  existsSync(join(libDir, 'audio.ts')),
  'audio.ts (platform resolver) exists'
);
check(
  existsSync(join(libDir, 'audio.web.ts')),
  'audio.web.ts (web implementation) exists'
);
check(
  existsSync(join(libDir, 'audio.native.ts')),
  'audio.native.ts (native implementation) exists'
);

// Check component imports
console.log('\n📝 Checking component imports:');

const componentsToCheck = [
  'components/voice-input.tsx',
  'components/VoiceSearchModal.tsx',
  'components/VoiceSearchButton.tsx',
];

componentsToCheck.forEach((componentPath) => {
  const fullPath = join(rootDir, componentPath);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf-8');

    check(
      content.includes('from "@/lib/blob-utils"') || content.includes("from '@/lib/blob-utils'"),
      `${componentPath} imports blob-utils`
    );

    check(
      !content.includes('new FileReader()') || content.includes("Platform.OS === 'web'"),
      `${componentPath} doesn't use FileReader without platform check`
    );
  } else {
    check(false, `${componentPath} exists`);
  }
});

// Check upload screen
console.log('\n📝 Checking upload screen:');
const uploadPath = join(appDir, 'admin/protocols/upload.tsx');
if (existsSync(uploadPath)) {
  const content = readFileSync(uploadPath, 'utf-8');

  check(
    content.includes('from "@/lib/blob-utils"') || content.includes("from '@/lib/blob-utils'"),
    'upload.tsx imports blob-utils'
  );

  check(
    content.includes('uriToBase64'),
    'upload.tsx uses uriToBase64 helper'
  );
} else {
  check(false, 'upload.tsx exists');
}

// Check platform-specific exports
console.log('\n🔧 Checking platform-specific exports:');

const blobUtilsWeb = join(libDir, 'blob-utils.web.ts');
if (existsSync(blobUtilsWeb)) {
  const content = readFileSync(blobUtilsWeb, 'utf-8');

  check(content.includes('export async function blobToBase64'), 'blob-utils.web exports blobToBase64');
  check(content.includes('export async function uriToBlob'), 'blob-utils.web exports uriToBlob');
  check(content.includes('export async function uriToBase64'), 'blob-utils.web exports uriToBase64');
  check(content.includes('FileReader'), 'blob-utils.web uses FileReader');
}

const blobUtilsNative = join(libDir, 'blob-utils.native.ts');
if (existsSync(blobUtilsNative)) {
  const content = readFileSync(blobUtilsNative, 'utf-8');

  check(content.includes('export async function uriToBase64'), 'blob-utils.native exports uriToBase64');
  check(content.includes('expo-file-system'), 'blob-utils.native uses expo-file-system');
  check(content.includes('createFormDataWithUri'), 'blob-utils.native exports createFormDataWithUri');
}

// Summary
console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const total = results.length;
const percentage = Math.round((passed / total) * 100);

console.log(`\n📊 Results: ${passed}/${total} checks passed (${percentage}%)`);

if (passed === total) {
  console.log('\n✨ All checks passed! Blob handling fixes are correctly implemented.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.');
  process.exit(1);
}
