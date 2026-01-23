# Department Pricing Implementation Summary

## Overview
Department/team pricing tiers have been implemented for Protocol Guide with the following structure:

### Pricing Tiers

| Tier | User Range | Price Per User | Example (10 users) |
|------|-----------|----------------|-------------------|
| **Individual** | 1 user | $9.99/month | $9.99/month |
| **Small Department** | 5-20 users | $7.99/user/month | $79.90/month |
| **Large Department** | 20-100 users | $5.99/user/month | N/A (min 20 users) |
| **Enterprise** | 100+ users | Custom pricing | Contact sales |

## Files Updated

### 1. `/server/lib/pricing.ts`
**Changes:**
- Updated `DEPARTMENT_PRICING` configuration from `starter`/`professional` to `small`/`large`
- Small Department: 5-20 users at $7.99/user/month ($95.88/user/year)
- Large Department: 20-100 users at $5.99/user/month ($71.88/user/year)
- Updated all pricing calculation functions to use new tier names
- Updated validation logic for new seat count requirements

**Key Functions:**
- `calculateDepartmentPrice()` - Calculates total cost for department subscriptions
- `validateSeatCount()` - Validates seat count matches tier requirements
- `getTierForSeatCount()` - Auto-determines tier based on seat count
- `getPricingSummary()` - Generates pricing display information

### 2. `/server/stripe.ts`
**Changes:**
- Updated `PRICE_IDS` object with new environment variable names:
  - `departmentSmallMonthly` / `departmentSmallAnnual`
  - `departmentLargeMonthly` / `departmentLargeAnnual`
- Updated `createDepartmentCheckoutSession()` to use new tier logic
- Changed quantity logic: Both tiers now use per-seat pricing (quantity = seatCount)

### 3. `/.env.example`
**Added:**
```bash
# Small Department (5-20 users, $7.99/user/month)
STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID=price_...
STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID=price_...

# Large Department (20+ users, $5.99/user/month)
STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID=price_...
STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID=price_...
```

## Stripe Products to Create

### Small Department Product
```bash
# Create Product
stripe products create \
  --name "Protocol Guide - Small Department" \
  --description "Department subscription for 5-20 users with per-seat pricing" \
  --metadata tier=small_department \
  --metadata min_seats=5 \
  --metadata max_seats=20

# Save the product ID: prod_XXXXX

# Create Monthly Price ($7.99/seat/month)
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 799 \
  --currency usd \
  --recurring interval=month \
  --recurring usage_type=licensed \
  --nickname "Small Department Monthly (Per Seat)" \
  --metadata tier=small_department \
  --metadata interval=monthly \
  --metadata per_seat=true

# Create Annual Price ($95.88/seat/year)
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 9588 \
  --currency usd \
  --recurring interval=year \
  --recurring usage_type=licensed \
  --nickname "Small Department Annual (Per Seat)" \
  --metadata tier=small_department \
  --metadata interval=annual \
  --metadata per_seat=true
```

### Large Department Product
```bash
# Create Product
stripe products create \
  --name "Protocol Guide - Large Department" \
  --description "Department subscription for 20+ users with volume pricing" \
  --metadata tier=large_department \
  --metadata min_seats=20

# Save the product ID: prod_YYYYY

# Create Monthly Price ($5.99/seat/month)
stripe prices create \
  --product prod_YYYYY \
  --unit-amount 599 \
  --currency usd \
  --recurring interval=month \
  --recurring usage_type=licensed \
  --nickname "Large Department Monthly (Per Seat)" \
  --metadata tier=large_department \
  --metadata interval=monthly \
  --metadata per_seat=true

# Create Annual Price ($71.88/seat/year)
stripe prices create \
  --product prod_YYYYY \
  --unit-amount 7188 \
  --currency usd \
  --recurring interval=year \
  --recurring usage_type=licensed \
  --nickname "Large Department Annual (Per Seat)" \
  --metadata tier=large_department \
  --metadata interval=annual \
  --metadata per_seat=true
```

## Next Steps

### 1. Create Stripe Products (REQUIRED)
You need to create the Stripe products and prices. You have two options:

**Option A: Use Stripe Dashboard** (Recommended)
1. Go to https://dashboard.stripe.com/products
2. Click "Add product" and create Small Department product
3. Add monthly ($7.99) and annual ($95.88) prices
4. Repeat for Large Department product with $5.99 monthly and $71.88 annual
5. Copy the 4 price IDs

**Option B: Use Stripe CLI**
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Run the commands above to create products and prices
4. Copy the price IDs from the output

### 2. Update Environment Variables
Add the 4 new price IDs to your `.env` file:

```bash
# Small Department (5-20 users)
STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID="price_xxxxxxxxxxxxx"
STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID="price_xxxxxxxxxxxxx"

# Large Department (20+ users)
STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID="price_xxxxxxxxxxxxx"
STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID="price_xxxxxxxxxxxxx"
```

### 3. Update Frontend (If Applicable)
If you have pricing display components, update them to show:
- Small Department tier (5-20 users) at $7.99/user/month
- Large Department tier (20+ users) at $5.99/user/month

Example pricing display:
```
Small Department: 10 users = $79.90/month or $958.80/year
Large Department: 50 users = $299.50/month or $3,594/year
```

### 4. Test Department Checkout Flow
1. Create a test agency in your database
2. Call `subscription.createDepartmentCheckout` mutation with:
   - `tier: "small"` or `tier: "large"`
   - `seatCount: 10` (or appropriate count for tier)
   - `interval: "monthly"` or `"annual"`
3. Complete the Stripe checkout in test mode
4. Verify webhook updates agency subscription correctly

### 5. Update Documentation
Update any user-facing documentation or help pages to reflect:
- New pricing structure
- Seat count requirements for each tier
- Volume discount benefits (40% off individual pricing for large departments)

## Pricing Comparison

### Cost Savings for Departments

| Users | Individual Rate | Small Dept Rate | Large Dept Rate | Savings |
|-------|----------------|-----------------|-----------------|---------|
| 5 | $49.95/mo | $39.95/mo | N/A | 20% off |
| 10 | $99.90/mo | $79.90/mo | N/A | 20% off |
| 20 | $199.80/mo | $159.80/mo | $119.80/mo | 40% off |
| 50 | $499.50/mo | N/A | $299.50/mo | 40% off |
| 100 | $999/mo | N/A | $599/mo | 40% off |

## Technical Details

### How Per-Seat Pricing Works in Stripe
1. When creating a checkout session, we pass `quantity: seatCount`
2. Stripe multiplies the price by the quantity
3. Example: $7.99 × 10 seats = $79.90/month
4. The subscription in Stripe will have quantity = 10

### Seat Count Validation
The code validates seat counts at checkout:
- Small Department: Requires 5-20 seats
- Large Department: Requires 20-100 seats
- Enterprise: 100+ seats (contact sales)

If a customer tries to purchase outside these ranges, they get an error message suggesting the correct tier.

### Webhook Handling
The existing webhook handler at `/server/webhooks/stripe.ts` will automatically handle department subscriptions by checking `metadata.subscriptionType === "department"`.

## Files Reference

**Code Files:**
- `/server/lib/pricing.ts` - Pricing configuration and calculations
- `/server/stripe.ts` - Stripe integration and checkout
- `/server/routers/subscription.ts` - tRPC subscription mutations
- `/server/webhooks/stripe.ts` - Webhook event handling

**Documentation:**
- `/scripts/department-pricing-plan.md` - Detailed setup plan
- `/docs/stripe-department-setup.md` - Original department pricing docs
- `/.env.example` - Environment variable examples

**Scripts:**
- `/scripts/setup-department-pricing.ts` - Automated setup script (needs valid Stripe key)

## Support

If you encounter issues:
1. Check that all 4 price IDs are correctly set in `.env`
2. Verify products exist in Stripe Dashboard
3. Test with Stripe test mode first before going live
4. Check server logs for detailed error messages

## Migration from Old Tier Names

The code has been updated from:
- `starter` → `small`
- `professional` → `large`

If you have existing test data or database records using the old tier names, you may need to run a migration to update them.
