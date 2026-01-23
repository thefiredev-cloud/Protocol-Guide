/**
 * Test script for environment validation
 * Run with: tsx test-env-validation.ts
 */

import 'dotenv/config';

// Test 1: Import and validate
console.log('🧪 Test 1: Importing environment validation...');
try {
  const { env, logEnvStatus } = await import('./server/_core/env.js');
  console.log('✅ Import successful');

  // Test 2: Log status
  console.log('\n🧪 Test 2: Environment status...');
  logEnvStatus();

  // Test 3: Type-safe access
  console.log('\n🧪 Test 3: Type-safe access...');
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  PORT: ${env.PORT} (type: ${typeof env.PORT})`);
  console.log(`  ANTHROPIC_API_KEY: ${env.ANTHROPIC_API_KEY.substring(0, 15)}...`);
  console.log(`  STRIPE_SECRET_KEY: ${env.STRIPE_SECRET_KEY.substring(0, 15)}... (mode: ${env.STRIPE_SECRET_KEY.includes('test') ? 'test' : 'live'})`);
  console.log(`  SUPABASE_URL: ${env.SUPABASE_URL}`);

  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}
