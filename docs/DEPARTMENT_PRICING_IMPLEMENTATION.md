# Department Pricing Implementation

This document provides an overview of the department/enterprise pricing implementation for Protocol Guide.

## Overview

Protocol Guide now supports three department subscription tiers:

1. **Starter** (1-10 users) - Flat rate pricing
2. **Professional** (11-100 users) - Per-seat pricing
3. **Enterprise** (100+ users) - Custom pricing (contact sales)

## Files Modified/Created

### Database Schema

- **`/Users/tanner-osterkamp/Protocol Guide Manus/drizzle/schema.ts`**
  - Added `seatCount: int` to agencies table (default: 1)
  - Added `annualBilling: boolean` to agencies table (default: false)
  - Existing `subscriptionTier` enum already supported: "starter", "professional", "enterprise"

### Pricing Logic

- **`/Users/tanner-osterkamp/Protocol Guide Manus/server/lib/pricing.ts`** (NEW)
  - `DEPARTMENT_PRICING` - Pricing constants for all tiers
  - `calculateDepartmentPrice()` - Calculate price for tier/seats/interval
  - `getTierForSeatCount()` - Determine appropriate tier
  - `validateSeatCount()` - Validate seat count for tier
  - `calculateAnnualSavings()` - Calculate annual vs monthly savings
  - `getPricingSummary()` - Get formatted pricing display
  - `formatPrice()` - Currency formatting helper

### Stripe Integration

- **`/Users/tanner-osterkamp/Protocol Guide Manus/server/stripe.ts`** (MODIFIED)
  - Added department price ID environment variables
  - Added `CreateDepartmentCheckoutParams` interface
  - Added `createDepartmentCheckoutSession()` function
  - Handles seat-based quantity for Professional tier
  - Validates tier/seat combinations

### API Router

- **`/Users/tanner-osterkamp/Protocol Guide Manus/server/routers.ts`** (MODIFIED)
  - Added `subscription.createDepartmentCheckout` mutation
  - Validates agency exists
  - Creates Stripe checkout session for department subscriptions
  - TODO: Add agency admin permission check

### Database Migration

- **`/Users/tanner-osterkamp/Protocol Guide Manus/drizzle/migrations/0013_add_agency_subscription_fields.sql`** (NEW)
  - Adds `seatCount` column to agencies table
  - Adds `annualBilling` column to agencies table
  - Creates index on `subscriptionTier` and `seatCount`
  - Sets default values for existing agencies

### Documentation

- **`/Users/tanner-osterkamp/Protocol Guide Manus/docs/stripe-department-setup.md`** (NEW)
  - Complete Stripe CLI commands for product/price creation
  - Environment variable configuration
  - Webhook handling documentation
  - Usage flow description

## Pricing Structure

### Starter Tier (1-10 seats)

Flat-rate pricing regardless of seat count:

- **Monthly**: $19.99/month
- **Annual**: $199/year ($16.58/month, 17% discount)

### Professional Tier (11-100 seats)

Per-seat pricing multiplied by seat count:

- **Monthly**: $7.99/seat/month
- **Annual**: $89/seat/year ($7.42/seat/month, 7% discount)

Examples:
- 11 seats: $87.89/month or $979/year
- 50 seats: $399.50/month or $4,450/year
- 100 seats: $799/month or $8,900/year

### Enterprise Tier (100+ seats)

Custom pricing - redirects to contact sales.

## API Usage

### Create Department Checkout Session

```typescript
import { trpc } from '@/lib/trpc';

// Frontend usage
const createCheckout = trpc.subscription.createDepartmentCheckout.useMutation();

const handleSubscribe = async () => {
  const result = await createCheckout.mutateAsync({
    agencyId: 123,
    tier: "professional",
    seatCount: 25,
    interval: "annual",
    successUrl: `${window.location.origin}/dashboard?success=true`,
    cancelUrl: `${window.location.origin}/pricing`,
  });

  if (result.success && result.url) {
    window.location.href = result.url; // Redirect to Stripe Checkout
  } else {
    console.error(result.error);
  }
};
```

### Calculate Pricing

```typescript
import {
  calculateDepartmentPrice,
  getPricingSummary,
  validateSeatCount
} from '@/server/lib/pricing';

// Calculate price
const monthlyPrice = calculateDepartmentPrice("professional", 25, "monthly");
// Returns: 199.75 (25 seats × $7.99)

const annualPrice = calculateDepartmentPrice("professional", 25, "annual");
// Returns: 2225 (25 seats × $89)

// Validate seat count
const validation = validateSeatCount("professional", 25);
// Returns: { valid: true }

// Get full pricing summary
const summary = getPricingSummary("professional", 25, "annual");
// Returns: {
//   tier: "professional",
//   seatCount: 25,
//   interval: "annual",
//   monthlyPrice: 199.75,
//   annualPrice: 2225,
//   annualSavings: 172,
//   displayPrice: "$2,225.00",
//   displayInterval: "/year"
// }
```

## Environment Variables Required

Add these to your `.env` file after creating Stripe products:

```bash
# Existing individual subscription prices
STRIPE_PRO_MONTHLY_PRICE_ID="price_xxx"
STRIPE_PRO_ANNUAL_PRICE_ID="price_xxx"

# Department subscription prices (NEW)
STRIPE_DEPT_STARTER_MONTHLY_PRICE_ID="price_xxx"
STRIPE_DEPT_STARTER_ANNUAL_PRICE_ID="price_xxx"
STRIPE_DEPT_PROFESSIONAL_MONTHLY_PRICE_ID="price_xxx"
STRIPE_DEPT_PROFESSIONAL_ANNUAL_PRICE_ID="price_xxx"
```

## Setup Steps

### 1. Run Database Migration

```bash
cd /Users/tanner-osterkamp/Protocol\ Guide\ Manus
npx drizzle-kit push:mysql
```

Or manually run the SQL migration:

```bash
mysql -u username -p database_name < drizzle/migrations/0013_add_agency_subscription_fields.sql
```

### 2. Create Stripe Products and Prices

Follow the commands in `docs/stripe-department-setup.md`:

1. Create Starter product
2. Create Professional product
3. Create prices for each tier (monthly + annual)
4. Note the Price IDs

### 3. Configure Environment Variables

Add the Stripe Price IDs to your `.env` file.

### 4. Test Checkout Flow

```bash
# Start the development server
npm run dev

# Test department checkout in your app
# Navigate to agency settings > billing
# Select tier, seat count, and interval
# Click "Subscribe" to test checkout
```

## Webhook Handling

The existing Stripe webhook at `/api/webhooks/stripe` will handle department subscriptions by checking the `metadata.subscriptionType` field:

```typescript
if (metadata.subscriptionType === "department") {
  // Update agency subscription
  await updateAgencySubscription({
    agencyId: metadata.agencyId,
    tier: metadata.tier,
    seatCount: metadata.seatCount,
    annualBilling: metadata.interval === "annual",
    stripeCustomerId: customer.id,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });
}
```

## Security Considerations

### Agency Admin Permissions

Currently, the `createDepartmentCheckout` mutation has a TODO for permission checking:

```typescript
// TODO: Verify user has permission to manage this agency
// This would check if ctx.user.id is an owner/admin of the agency
```

**Before production, implement:**

```typescript
// Check agency membership and role
const { agencyMembers } = await import("../drizzle/schema.js");
const [membership] = await dbInstance.select()
  .from(agencyMembers)
  .where(
    and(
      eq(agencyMembers.agencyId, input.agencyId),
      eq(agencyMembers.userId, ctx.user.id),
      inArray(agencyMembers.role, ["owner", "admin"]),
      eq(agencyMembers.status, "active")
    )
  )
  .limit(1);

if (!membership) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to manage this agency's subscription"
  });
}
```

### Seat Count Validation

All seat count inputs are validated:
- Client-side: Before showing pricing
- Server-side: In `validateSeatCount()` before checkout
- Stripe webhook: When processing completed checkout

## Next Steps

1. **Frontend Implementation**
   - Create agency billing settings page
   - Add tier selector with seat count input
   - Display pricing calculator using `getPricingSummary()`
   - Show upgrade/downgrade flows

2. **Seat Management**
   - Add UI for agency admins to invite members
   - Enforce seat limits when inviting users
   - Show "X of Y seats used" indicator
   - Prompt to upgrade when approaching limit

3. **Subscription Management**
   - Add "Manage Subscription" button linking to Stripe Portal
   - Display current plan, seat count, next billing date
   - Show usage metrics (seats used vs. available)

4. **Analytics**
   - Track department subscription conversions
   - Monitor seat utilization rates
   - Identify upgrade opportunities (agencies near seat limit)

5. **Admin Dashboard**
   - List all department subscriptions
   - View MRR by tier
   - Seat utilization reports
   - Churn analysis

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Stripe products and prices created
- [ ] Environment variables configured
- [ ] Pricing calculations accurate for all tiers
- [ ] Seat count validation works
- [ ] Annual savings calculation correct
- [ ] Checkout session creation works
- [ ] Stripe webhook updates agency correctly
- [ ] Agency admin permissions enforced
- [ ] Customer Portal access working
- [ ] Invoice generation includes correct seat count
- [ ] Subscription upgrades/downgrades handled

## Support

For questions or issues:
- Technical: File GitHub issue
- Business/Pricing: Contact sales team
- Stripe Integration: Check Stripe Dashboard logs
