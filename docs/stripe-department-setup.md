# Stripe Department Pricing Setup

This document provides the Stripe CLI commands to create products and prices for department/enterprise subscriptions.

## Pricing Strategy

- **Starter Tier** (1-10 users): Flat rate pricing
  - Monthly: $19.99/month
  - Annual: $199/year ($16.58/month, 17% discount)

- **Professional Tier** (11-100 users): Per-seat pricing
  - Monthly: $7.99/seat/month
  - Annual: $89/seat/year ($7.42/seat/month, 7% discount)

- **Enterprise Tier** (100+ users): Custom pricing (contact sales)

## Setup Commands

### 1. Create Products

```bash
# Starter Tier Product
stripe products create \
  --name "Protocol Guide - Department Starter" \
  --description "Department subscription for 1-10 users with flat-rate pricing" \
  --metadata[tier]=starter \
  --metadata[max_seats]=10 \
  --metadata[min_seats]=1

# Professional Tier Product
stripe products create \
  --name "Protocol Guide - Department Professional" \
  --description "Department subscription for 11-100 users with per-seat pricing" \
  --metadata[tier]=professional \
  --metadata[max_seats]=100 \
  --metadata[min_seats]=11
```

### 2. Create Prices for Starter Tier

After creating the Starter product, note the product ID (e.g., `prod_xxx`) and create prices:

```bash
# Starter Monthly Price - Flat rate $19.99/month
stripe prices create \
  --product prod_STARTER_ID_HERE \
  --unit-amount 1999 \
  --currency usd \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname "Department Starter Monthly" \
  --metadata[tier]=starter \
  --metadata[interval]=monthly

# Starter Annual Price - Flat rate $199/year
stripe prices create \
  --product prod_STARTER_ID_HERE \
  --unit-amount 19900 \
  --currency usd \
  --recurring[interval]=year \
  --recurring[usage_type]=licensed \
  --nickname "Department Starter Annual" \
  --metadata[tier]=starter \
  --metadata[interval]=annual
```

### 3. Create Prices for Professional Tier

After creating the Professional product, note the product ID and create prices:

```bash
# Professional Monthly Price - $7.99/seat/month
stripe prices create \
  --product prod_PROFESSIONAL_ID_HERE \
  --unit-amount 799 \
  --currency usd \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname "Department Professional Monthly (Per Seat)" \
  --metadata[tier]=professional \
  --metadata[interval]=monthly \
  --metadata[per_seat]=true

# Professional Annual Price - $89/seat/year
stripe prices create \
  --product prod_PROFESSIONAL_ID_HERE \
  --unit-amount 8900 \
  --currency usd \
  --recurring[interval]=year \
  --recurring[usage_type]=licensed \
  --nickname "Department Professional Annual (Per Seat)" \
  --metadata[tier]=professional \
  --metadata[interval]=annual \
  --metadata[per_seat]=true
```

## Environment Variables

After creating the prices, add the Price IDs to your `.env` file:

```bash
# Department Subscription Price IDs
STRIPE_DEPT_STARTER_MONTHLY_PRICE_ID="price_xxx"
STRIPE_DEPT_STARTER_ANNUAL_PRICE_ID="price_xxx"
STRIPE_DEPT_PROFESSIONAL_MONTHLY_PRICE_ID="price_xxx"
STRIPE_DEPT_PROFESSIONAL_ANNUAL_PRICE_ID="price_xxx"
```

## Testing Prices

You can list all prices to verify they were created correctly:

```bash
# List all prices for a product
stripe prices list --product prod_STARTER_ID_HERE
stripe prices list --product prod_PROFESSIONAL_ID_HERE

# Test retrieve a specific price
stripe prices retrieve price_xxx
```

## Webhook Configuration

Department subscriptions will be handled by the existing Stripe webhook at `/api/webhooks/stripe`. The webhook processes:

- `checkout.session.completed` - Creates/activates department subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels department subscription
- `invoice.payment_failed` - Handles payment failures

The webhook identifies department subscriptions by checking `metadata.subscriptionType === "department"`.

## Database Migration

Before using department subscriptions, run the migration to add the new columns:

```sql
ALTER TABLE agencies
ADD COLUMN seatCount INT DEFAULT 1 NOT NULL COMMENT 'Number of licensed seats for the agency',
ADD COLUMN annualBilling BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Whether agency is on annual billing';
```

## Usage Flow

1. **Agency Admin selects tier and seat count**
   - Frontend calculates pricing using `lib/pricing.ts` functions
   - Displays pricing summary with monthly/annual options

2. **Admin initiates checkout**
   - Frontend calls `subscription.createDepartmentCheckout` mutation
   - Backend validates agency exists and user has permission
   - Creates Stripe Checkout session with correct price and quantity

3. **User completes payment**
   - Stripe redirects to success URL
   - Webhook updates agency subscription status
   - Agency members gain access based on seat count

4. **Manage subscription**
   - Agency admins can access Stripe Customer Portal
   - Update payment method, view invoices
   - Cancel or upgrade subscription

## Professional Tier Seat Calculation

For Professional tier, the quantity in Stripe represents the number of seats:

- 11 seats = $7.99 × 11 = $87.89/month
- 50 seats = $7.99 × 50 = $399.50/month
- 100 seats = $7.99 × 100 = $799.00/month

Annual pricing includes a 7% discount:

- 11 seats = $89 × 11 = $979/year ($81.58/month)
- 50 seats = $89 × 50 = $4,450/year ($370.83/month)
- 100 seats = $89 × 100 = $8,900/year ($741.67/month)

## Enterprise Custom Pricing

For agencies requiring 100+ seats, the checkout flow returns an error directing them to contact sales. Handle enterprise pricing manually through Stripe Dashboard or custom quotes.

## Support Contact

For agencies needing custom pricing or volume discounts, direct them to:
- Email: sales@protocolguide.com
- Form: /contact?subject=enterprise-pricing
