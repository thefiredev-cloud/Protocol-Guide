#!/bin/bash

# Create Department Pricing Products in Stripe
# Run this script after installing Stripe CLI: brew install stripe/stripe-cli/stripe
# Login first: stripe login

set -e

echo "🏗️  Creating Protocol Guide Department Pricing Products in Stripe..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create Small Department Product
echo -e "${BLUE}Creating Small Department product...${NC}"
SMALL_PRODUCT=$(stripe products create \
  --name "Protocol Guide - Small Department" \
  --description "Department subscription for 5-20 users with per-seat pricing" \
  --metadata tier=small_department \
  --metadata min_seats=5 \
  --metadata max_seats=20 \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created product: ${SMALL_PRODUCT}${NC}"
echo ""

# Create Small Department Monthly Price
echo -e "${BLUE}Creating Small Department monthly price (\$7.99/seat/month)...${NC}"
SMALL_MONTHLY=$(stripe prices create \
  --product "$SMALL_PRODUCT" \
  --unit-amount 799 \
  --currency usd \
  --recurring interval=month \
  --recurring usage_type=licensed \
  --nickname "Small Department Monthly (Per Seat)" \
  --metadata tier=small_department \
  --metadata interval=monthly \
  --metadata per_seat=true \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created price: ${SMALL_MONTHLY}${NC}"
echo ""

# Create Small Department Annual Price
echo -e "${BLUE}Creating Small Department annual price (\$95.88/seat/year)...${NC}"
SMALL_ANNUAL=$(stripe prices create \
  --product "$SMALL_PRODUCT" \
  --unit-amount 9588 \
  --currency usd \
  --recurring interval=year \
  --recurring usage_type=licensed \
  --nickname "Small Department Annual (Per Seat)" \
  --metadata tier=small_department \
  --metadata interval=annual \
  --metadata per_seat=true \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created price: ${SMALL_ANNUAL}${NC}"
echo ""

# Create Large Department Product
echo -e "${BLUE}Creating Large Department product...${NC}"
LARGE_PRODUCT=$(stripe products create \
  --name "Protocol Guide - Large Department" \
  --description "Department subscription for 20+ users with volume pricing" \
  --metadata tier=large_department \
  --metadata min_seats=20 \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created product: ${LARGE_PRODUCT}${NC}"
echo ""

# Create Large Department Monthly Price
echo -e "${BLUE}Creating Large Department monthly price (\$5.99/seat/month)...${NC}"
LARGE_MONTHLY=$(stripe prices create \
  --product "$LARGE_PRODUCT" \
  --unit-amount 599 \
  --currency usd \
  --recurring interval=month \
  --recurring usage_type=licensed \
  --nickname "Large Department Monthly (Per Seat)" \
  --metadata tier=large_department \
  --metadata interval=monthly \
  --metadata per_seat=true \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created price: ${LARGE_MONTHLY}${NC}"
echo ""

# Create Large Department Annual Price
echo -e "${BLUE}Creating Large Department annual price (\$71.88/seat/year)...${NC}"
LARGE_ANNUAL=$(stripe prices create \
  --product "$LARGE_PRODUCT" \
  --unit-amount 7188 \
  --currency usd \
  --recurring interval=year \
  --recurring usage_type=licensed \
  --nickname "Large Department Annual (Per Seat)" \
  --metadata tier=large_department \
  --metadata interval=annual \
  --metadata per_seat=true \
  --format json | jq -r '.id')

echo -e "${GREEN}✓ Created price: ${LARGE_ANNUAL}${NC}"
echo ""

# Print summary
echo -e "${GREEN}✅ All products and prices created successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Add these to your .env file:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Small Department (5-20 users)"
echo "STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID=\"${SMALL_MONTHLY}\""
echo "STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID=\"${SMALL_ANNUAL}\""
echo ""
echo "# Large Department (20+ users)"
echo "STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID=\"${LARGE_MONTHLY}\""
echo "STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID=\"${LARGE_ANNUAL}\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
