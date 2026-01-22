#!/bin/bash
# Verify Stripe Integration Setup
# Checks all components are properly configured

set -e

echo "======================================"
echo "Stripe Integration Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track status
ALL_GOOD=true

# Function to check status
check_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
    ALL_GOOD=false
  fi
}

# Check 1: Environment Variables
echo "1. Checking environment variables..."
echo "-----------------------------------"

check_env_var() {
  if grep -q "^$1=" .env 2>/dev/null && [ -n "$(grep "^$1=" .env | cut -d= -f2-)" ]; then
    check_status 0 "$1 is set"
    return 0
  else
    check_status 1 "$1 is NOT set"
    return 1
  fi
}

check_env_var "STRIPE_SECRET_KEY"
check_env_var "STRIPE_PUBLISHABLE_KEY"
check_env_var "STRIPE_WEBHOOK_SECRET"
check_env_var "STRIPE_PRO_MONTHLY_PRICE_ID"
check_env_var "STRIPE_PRO_ANNUAL_PRICE_ID"

echo ""

# Check 2: Code Changes
echo "2. Checking code implementation..."
echo "-----------------------------------"

# Check API version
if grep -q '"2024-12-18.acacia"' server/stripe.ts; then
  check_status 0 "API version is stable (2024-12-18.acacia)"
else
  check_status 1 "API version not updated"
fi

# Check webhook idempotency
if grep -q "stripeWebhookEvents" server/webhooks/stripe.ts; then
  check_status 0 "Webhook idempotency implemented"
else
  check_status 1 "Webhook idempotency NOT implemented"
fi

# Check portal error handling
if grep -q "Portal session failed: Missing customer ID" server/stripe.ts; then
  check_status 0 "Enhanced portal error handling implemented"
else
  check_status 1 "Portal error handling NOT enhanced"
fi

echo ""

# Check 3: Database Schema
echo "3. Checking database schema..."
echo "-----------------------------------"

if grep -q "stripeWebhookEvents" drizzle/schema.ts; then
  check_status 0 "Webhook events table defined in schema"
else
  check_status 1 "Webhook events table NOT in schema"
fi

if [ -f "drizzle/0008_harsh_swordsman.sql" ]; then
  check_status 0 "Migration file exists"
else
  check_status 1 "Migration file NOT found"
fi

echo ""

# Check 4: Migration Applied (requires DB connection)
echo "4. Checking database migration status..."
echo "-----------------------------------"
echo -e "${YELLOW}Note: This check requires database access${NC}"

# Try to check if table exists (will fail gracefully if no DB access)
if command -v mysql &> /dev/null; then
  if [ -n "$DATABASE_URL" ]; then
    # Extract connection details from DATABASE_URL
    # This is optional - user may need to run manually
    echo -e "${YELLOW}Run this command to verify migration:${NC}"
    echo "mysql -u root -p -e \"SHOW TABLES LIKE 'stripe_webhook_events';\""
  else
    echo -e "${YELLOW}DATABASE_URL not set - cannot check migration status${NC}"
  fi
else
  echo -e "${YELLOW}mysql CLI not available - cannot check migration status${NC}"
fi

echo ""

# Check 5: Documentation
echo "5. Checking documentation..."
echo "-----------------------------------"

[ -f "STRIPE_FIXES.md" ] && check_status 0 "STRIPE_FIXES.md exists" || check_status 1 "STRIPE_FIXES.md missing"
[ -f "STRIPE_IMPLEMENTATION_SUMMARY.md" ] && check_status 0 "STRIPE_IMPLEMENTATION_SUMMARY.md exists" || check_status 1 "Summary missing"
[ -f "STRIPE_QUICK_REFERENCE.md" ] && check_status 0 "STRIPE_QUICK_REFERENCE.md exists" || check_status 1 "Quick reference missing"
[ -x "scripts/apply-stripe-migration.sh" ] && check_status 0 "Migration script is executable" || check_status 1 "Migration script not executable"

echo ""
echo "======================================"

if [ "$ALL_GOOD" = true ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Apply database migration: ./scripts/apply-stripe-migration.sh"
  echo "2. Configure Stripe Dashboard webhooks"
  echo "3. Test the integration"
  echo "4. Review STRIPE_FIXES.md for details"
else
  echo -e "${RED}✗ Some checks failed${NC}"
  echo ""
  echo "Please review the failed checks above and:"
  echo "1. Ensure all code changes are saved"
  echo "2. Set missing environment variables in .env"
  echo "3. Generate migration if missing: npx drizzle-kit generate"
  echo "4. Review STRIPE_FIXES.md for troubleshooting"
fi

echo "======================================"
