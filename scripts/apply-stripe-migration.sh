#!/bin/bash
# Apply Stripe webhook events migration
# This script applies the database migration for webhook idempotency

set -e

echo "======================================"
echo "Stripe Migration Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "drizzle.config.ts" ]; then
  echo "Error: Must run from project root directory"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL in your .env file"
  exit 1
fi

echo "Step 1: Checking current database schema..."
echo ""

# Try to check if table already exists
TABLE_EXISTS=$(mysql -u root -p -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'stripe_webhook_events';" 2>/dev/null || echo "0")

if [ "$TABLE_EXISTS" -eq "1" ]; then
  echo "Table 'stripe_webhook_events' already exists!"
  echo "Migration may have already been applied."
  echo ""
  read -p "Do you want to continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting migration."
    exit 0
  fi
fi

echo "Step 2: Applying migration..."
echo ""

# Apply migration using drizzle-kit
npx drizzle-kit push

echo ""
echo "======================================"
echo "Migration applied successfully!"
echo "======================================"
echo ""

echo "Step 3: Verifying migration..."
echo ""

# Verify table was created
mysql -u root -p -e "DESCRIBE stripe_webhook_events;" 2>/dev/null || echo "Warning: Could not verify table creation"

echo ""
echo "Step 4: Next steps"
echo "======================================"
echo "1. Verify Stripe configuration in .env file"
echo "2. Configure webhooks in Stripe Dashboard"
echo "3. Test webhook idempotency"
echo "4. Review STRIPE_FIXES.md for detailed info"
echo ""
echo "Done!"
