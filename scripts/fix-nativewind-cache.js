/**
 * Fix NativeWind cache for Netlify builds
 *
 * Problem: pnpm may create nested node_modules despite hoisting config.
 * The nested react-native-css-interop under nativewind might be missing
 * the .cache directory that Metro/Expo needs for web builds.
 *
 * Solution: Copy .cache from top-level react-native-css-interop if needed.
 */

const fs = require('fs');
const path = require('path');

const TOP_LEVEL_CACHE = path.join(__dirname, '../node_modules/react-native-css-interop/.cache');
const NESTED_PKG = path.join(__dirname, '../node_modules/nativewind/node_modules/react-native-css-interop');
const NESTED_CACHE = path.join(NESTED_PKG, '.cache');

console.log('[fix-nativewind-cache] Checking NativeWind cache directories...');

// Check if top-level cache exists
if (!fs.existsSync(TOP_LEVEL_CACHE)) {
  console.log('[fix-nativewind-cache] Top-level .cache not found, skipping (this is unusual)');
  process.exit(0);
}

// Check if nested package exists
if (!fs.existsSync(NESTED_PKG)) {
  console.log('[fix-nativewind-cache] No nested react-native-css-interop, hoisting worked correctly');
  process.exit(0);
}

// Check if nested cache already exists
if (fs.existsSync(NESTED_CACHE)) {
  const files = fs.readdirSync(NESTED_CACHE);
  if (files.length > 0) {
    console.log('[fix-nativewind-cache] Nested .cache exists with files, no fix needed');
    process.exit(0);
  }
}

// Copy .cache from top-level to nested
console.log('[fix-nativewind-cache] Copying .cache from top-level to nested package...');
fs.mkdirSync(NESTED_CACHE, { recursive: true });

const files = fs.readdirSync(TOP_LEVEL_CACHE);
for (const file of files) {
  const src = path.join(TOP_LEVEL_CACHE, file);
  const dest = path.join(NESTED_CACHE, file);
  fs.copyFileSync(src, dest);
  console.log(`  Copied: ${file}`);
}

console.log('[fix-nativewind-cache] Cache fix complete');
