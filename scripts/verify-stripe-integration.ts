#!/usr/bin/env tsx
/**
 * Verify Stripe Integration Status
 * Checks account connectivity, products, and prices
 */

import Stripe from "stripe";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables - override any existing env vars
dotenv.config({ path: path.join(process.cwd(), ".env"), override: true });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in environment");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

// Expected price IDs from environment
const EXPECTED_PRICES = {
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  deptStarterMonthly: process.env.STRIPE_DEPT_STARTER_MONTHLY_PRICE_ID || process.env.STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID,
  deptStarterAnnual: process.env.STRIPE_DEPT_STARTER_ANNUAL_PRICE_ID || process.env.STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID,
  deptProfessionalMonthly: process.env.STRIPE_DEPT_PROFESSIONAL_MONTHLY_PRICE_ID || process.env.STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID,
  deptProfessionalAnnual: process.env.STRIPE_DEPT_PROFESSIONAL_ANNUAL_PRICE_ID || process.env.STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID,
};

async function verifyStripeIntegration() {
  console.log("🔍 Verifying Protocol Guide Stripe Integration\n");
  console.log("=".repeat(60));

  try {
    // 1. Verify account connectivity
    console.log("\n1️⃣  STRIPE ACCOUNT STATUS");
    console.log("-".repeat(60));
    const balance = await stripe.balance.retrieve();
    console.log("✅ Stripe account connected successfully");
    console.log(`   Account ID: ${STRIPE_SECRET_KEY.substring(0, 20)}...`);
    console.log(`   Mode: ${STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST'}`);
    console.log(`   Available Balance: ${balance.available.map(b => `${b.amount / 100} ${b.currency.toUpperCase()}`).join(', ') || 'N/A'}`);

    // 2. List products
    console.log("\n2️⃣  STRIPE PRODUCTS");
    console.log("-".repeat(60));
    const products = await stripe.products.list({ limit: 10, active: true });
    console.log(`Found ${products.data.length} active product(s):\n`);

    if (products.data.length === 0) {
      console.log("⚠️  No products found in Stripe");
    } else {
      products.data.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Description: ${product.description || 'N/A'}`);
        console.log(`      Active: ${product.active}`);
        console.log();
      });
    }

    // 3. List prices
    console.log("\n3️⃣  STRIPE PRICES");
    console.log("-".repeat(60));
    const prices = await stripe.prices.list({ limit: 20, active: true });
    console.log(`Found ${prices.data.length} active price(s):\n`);

    if (prices.data.length === 0) {
      console.log("⚠️  No prices found in Stripe");
    } else {
      prices.data.forEach((price, index) => {
        const amount = price.unit_amount ? `${price.unit_amount / 100} ${price.currency.toUpperCase()}` : 'N/A';
        const interval = price.recurring ? `/${price.recurring.interval}` : '';
        console.log(`   ${index + 1}. Price ID: ${price.id}`);
        console.log(`      Product: ${price.product}`);
        console.log(`      Amount: ${amount}${interval}`);
        console.log(`      Type: ${price.type}`);
        console.log();
      });
    }

    // 4. Verify expected price IDs
    console.log("\n4️⃣  EXPECTED PRICE IDS VERIFICATION");
    console.log("-".repeat(60));

    const priceChecks = [
      { name: "Pro Monthly", id: EXPECTED_PRICES.proMonthly },
      { name: "Pro Annual", id: EXPECTED_PRICES.proAnnual },
      { name: "Dept Starter Monthly", id: EXPECTED_PRICES.deptStarterMonthly },
      { name: "Dept Starter Annual", id: EXPECTED_PRICES.deptStarterAnnual },
      { name: "Dept Professional Monthly", id: EXPECTED_PRICES.deptProfessionalMonthly },
      { name: "Dept Professional Annual", id: EXPECTED_PRICES.deptProfessionalAnnual },
    ];

    let missingCount = 0;
    let validCount = 0;

    for (const check of priceChecks) {
      if (!check.id) {
        console.log(`❌ ${check.name}: MISSING (not set in .env)`);
        missingCount++;
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(check.id);
        const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'N/A';
        const interval = price.recurring ? `/${price.recurring.interval}` : '';
        console.log(`✅ ${check.name}: ${amount}${interval} (${check.id})`);
        validCount++;
      } catch (error) {
        console.log(`❌ ${check.name}: INVALID (${check.id} not found in Stripe)`);
        missingCount++;
      }
    }

    // 5. Check webhook configuration
    console.log("\n5️⃣  WEBHOOK CONFIGURATION");
    console.log("-".repeat(60));
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      console.log(`✅ Webhook secret configured: ${webhookSecret.substring(0, 15)}...`);
    } else {
      console.log("⚠️  Webhook secret not configured in .env");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Products: ${products.data.length} active`);
    console.log(`Prices: ${prices.data.length} active`);
    console.log(`Valid Price IDs: ${validCount}/6`);
    console.log(`Missing Price IDs: ${missingCount}/6`);
    console.log(`Webhook: ${webhookSecret ? 'Configured' : 'Not configured'}`);

    if (missingCount > 0) {
      console.log("\n⚠️  WARNING: Some price IDs are missing or invalid.");
      console.log("   Run the setup script to create missing products/prices:");
      console.log("   npm run stripe:setup");
    } else {
      console.log("\n✅ All Stripe integration checks passed!");
    }

    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error verifying Stripe integration:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

verifyStripeIntegration();
