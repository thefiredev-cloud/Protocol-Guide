#!/usr/bin/env tsx
/**
 * Update Stripe Pricing Script
 *
 * This script:
 * 1. Checks current Stripe price configurations
 * 2. Creates new products and prices for $9.99/month and $89/year
 * 3. Outputs the new price IDs for .env configuration
 *
 * Usage: npx tsx scripts/update-stripe-pricing.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

async function main() {
  console.log('🔍 Stripe Pricing Update Script\n');
  console.log('═'.repeat(60));

  // Step 1: Check current price configurations
  console.log('\n📋 Step 1: Checking current price configurations...\n');

  const currentMonthlyId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const currentAnnualId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;

  if (currentMonthlyId) {
    try {
      const monthlyPrice = await stripe.prices.retrieve(currentMonthlyId);
      console.log('Current Monthly Price:');
      console.log(`  Price ID: ${monthlyPrice.id}`);
      console.log(`  Amount: $${(monthlyPrice.unit_amount || 0) / 100}`);
      console.log(`  Product: ${monthlyPrice.product}`);
      console.log(`  Active: ${monthlyPrice.active}\n`);
    } catch (error) {
      console.log(`❌ Could not retrieve monthly price: ${currentMonthlyId}\n`);
    }
  }

  if (currentAnnualId) {
    try {
      const annualPrice = await stripe.prices.retrieve(currentAnnualId);
      console.log('Current Annual Price:');
      console.log(`  Price ID: ${annualPrice.id}`);
      console.log(`  Amount: $${(annualPrice.unit_amount || 0) / 100}`);
      console.log(`  Product: ${annualPrice.product}`);
      console.log(`  Active: ${annualPrice.active}\n`);
    } catch (error) {
      console.log(`❌ Could not retrieve annual price: ${currentAnnualId}\n`);
    }
  }

  // Step 2: Create new products
  console.log('═'.repeat(60));
  console.log('\n🆕 Step 2: Creating new Stripe products...\n');

  // Create Monthly Product
  console.log('Creating "Protocol Guide Pro Monthly (v2)" product...');
  const monthlyProduct = await stripe.products.create({
    name: 'Protocol Guide Pro Monthly (v2)',
    description: 'Monthly subscription - Unlimited protocol access for EMS professionals',
    metadata: {
      version: 'v2',
      effective_date: '2026-01-22',
      pricing_tier: 'pro',
    },
  });
  console.log(`✅ Created product: ${monthlyProduct.id}\n`);

  // Create Annual Product
  console.log('Creating "Protocol Guide Pro Annual (v2)" product...');
  const annualProduct = await stripe.products.create({
    name: 'Protocol Guide Pro Annual (v2)',
    description: 'Annual subscription - Unlimited protocol access (25% savings)',
    metadata: {
      version: 'v2',
      effective_date: '2026-01-22',
      pricing_tier: 'pro',
      savings: '25%',
    },
  });
  console.log(`✅ Created product: ${annualProduct.id}\n`);

  // Step 3: Create new prices
  console.log('═'.repeat(60));
  console.log('\n💰 Step 3: Creating new price objects...\n');

  // Create $9.99/month price
  console.log('Creating $9.99/month price...');
  const monthlyPrice = await stripe.prices.create({
    product: monthlyProduct.id,
    unit_amount: 999, // $9.99 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    metadata: {
      tier: 'pro',
      version: 'v2',
    },
  });
  console.log(`✅ Created price: ${monthlyPrice.id} ($9.99/month)\n`);

  // Create $89/year price
  console.log('Creating $89/year price...');
  const annualPrice = await stripe.prices.create({
    product: annualProduct.id,
    unit_amount: 8900, // $89 in cents
    currency: 'usd',
    recurring: {
      interval: 'year',
      interval_count: 1,
    },
    metadata: {
      tier: 'pro',
      version: 'v2',
      savings: '25%',
    },
  });
  console.log(`✅ Created price: ${annualPrice.id} ($89/year)\n`);

  // Step 4: Display results
  console.log('═'.repeat(60));
  console.log('\n✅ SUCCESS! New prices created.\n');
  console.log('📝 Update your .env file with these new price IDs:\n');
  console.log('─'.repeat(60));
  console.log('# NEW PRICING (v2) - $9.99/month, $89/year');
  console.log(`STRIPE_PRO_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
  console.log(`STRIPE_PRO_ANNUAL_PRICE_ID=${annualPrice.id}`);
  console.log('─'.repeat(60));
  console.log('\n📌 Next Steps:');
  console.log('  1. Copy the price IDs above to your .env file');
  console.log('  2. Update Netlify environment variables with these IDs');
  console.log('  3. Redeploy your application');
  console.log('  4. Test the checkout flow with test card: 4242 4242 4242 4242');
  console.log('  5. Existing subscriptions will continue at old pricing (grandfathered)\n');

  // Step 5: Optional - Archive old prices
  console.log('═'.repeat(60));
  console.log('\n⚠️  Old Price IDs (for reference):\n');
  if (currentMonthlyId) {
    console.log(`Old Monthly: ${currentMonthlyId}`);
  }
  if (currentAnnualId) {
    console.log(`Old Annual: ${currentAnnualId}`);
  }
  console.log('\nThese old prices will remain active for existing subscriptions.');
  console.log('New signups will use the new price IDs once env vars are updated.\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  console.error('\nMake sure:');
  console.error('  1. STRIPE_SECRET_KEY is set in your .env file');
  console.error('  2. You are using a valid Stripe API key');
  console.error('  3. You have internet connectivity\n');
  process.exit(1);
});
