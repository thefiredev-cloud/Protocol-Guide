# Stripe Pricing Update Guide: $4.99 → $9.99

**Date:** January 23, 2026
**Status:** Ready to Execute
**Code Changes:** ✅ Complete
**Stripe Configuration:** 🔴 Pending

---

## Current Status

### Code Updates (✅ Complete)
- `server/db.ts`: Updated PRICING constants to $9.99/month, $89/year
- `components/upgrade-screen.tsx`: UI updated with new prices
- `components/county-limit-modal.tsx`: Pricing hints updated
- `app/(tabs)/profile.tsx`: Upgrade card updated
- `app/terms.tsx`: Terms of Service updated

### Current Stripe Price IDs (Old Pricing)
```bash
STRIPE_PRO_MONTHLY_PRICE_ID=price_1SoFuuDjdtNeDMqXTW64ePxn
STRIPE_PRO_ANNUAL_PRICE_ID=price_1SoG8qDjdtNeDMqX7XPFdCoE
```

These need to be replaced with new price IDs for $9.99 and $89.

---

## Option 1: Stripe CLI (Recommended)

### Step 1: Install Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### Step 2: Login to Stripe
```bash
stripe login
```

### Step 3: Create New Products

#### Monthly Product
```bash
stripe products create \
  --name="Protocol Guide Pro Monthly (v2)" \
  --description="Monthly subscription - Unlimited protocol access for EMS professionals" \
  --metadata[version]="v2" \
  --metadata[effective_date]="2026-01-23" \
  --metadata[pricing_tier]="pro"
```
**Save the product ID (prod_XXXXX)**

#### Annual Product
```bash
stripe products create \
  --name="Protocol Guide Pro Annual (v2)" \
  --description="Annual subscription - Unlimited protocol access (25% savings)" \
  --metadata[version]="v2" \
  --metadata[effective_date]="2026-01-23" \
  --metadata[pricing_tier]="pro" \
  --metadata[savings]="25%"
```
**Save the product ID (prod_YYYYY)**

### Step 4: Create New Prices

#### Monthly Price - $9.99/month
```bash
stripe prices create \
  --product="prod_XXXXX" \
  --unit-amount=999 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[interval_count]=1 \
  --metadata[tier]="pro" \
  --metadata[version]="v2"
```
**Save the price ID (price_AAAAAA)**

#### Annual Price - $89/year
```bash
stripe prices create \
  --product="prod_YYYYY" \
  --unit-amount=8900 \
  --currency=usd \
  --recurring[interval]=year \
  --recurring[interval_count]=1 \
  --metadata[tier]="pro" \
  --metadata[version]="v2" \
  --metadata[savings]="25%"
```
**Save the price ID (price_BBBBBB)**

### Step 5: Verify Prices
```bash
# List recent prices to verify
stripe prices list --limit 5

# Retrieve specific price to verify amount
stripe prices retrieve price_AAAAAA
stripe prices retrieve price_BBBBBB
```

---

## Option 2: Stripe Dashboard (Alternative)

If you prefer using the Stripe Dashboard:

### Step 1: Create Monthly Product
1. Go to: https://dashboard.stripe.com/products
2. Click "Add product"
3. Fill in:
   - **Name:** Protocol Guide Pro Monthly (v2)
   - **Description:** Monthly subscription - Unlimited protocol access for EMS professionals
   - **Pricing Model:** Standard pricing
   - **Price:** $9.99
   - **Billing Period:** Monthly
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)

### Step 2: Create Annual Product
1. Click "Add product"
2. Fill in:
   - **Name:** Protocol Guide Pro Annual (v2)
   - **Description:** Annual subscription - Unlimited protocol access (25% savings)
   - **Pricing Model:** Standard pricing
   - **Price:** $89.00
   - **Billing Period:** Yearly
3. Click "Save product"
4. Copy the **Price ID** (starts with `price_`)

---

## Update Environment Variables

### Local (.env file)
Update `/Users/tanner-osterkamp/Protocol Guide Manus/.env`:

```bash
# OLD PRICING (v1) - Keep for reference, existing subs use these
# STRIPE_PRO_MONTHLY_PRICE_ID=price_1SoFuuDjdtNeDMqXTW64ePxn
# STRIPE_PRO_ANNUAL_PRICE_ID=price_1SoG8qDjdtNeDMqX7XPFdCoE

# NEW PRICING (v2) - $9.99/month, $89/year
STRIPE_PRO_MONTHLY_PRICE_ID=price_AAAAAA
STRIPE_PRO_ANNUAL_PRICE_ID=price_BBBBBB
```

### Netlify Environment Variables
1. Go to: https://app.netlify.com/ (your Protocol Guide site)
2. Navigate to: Site settings → Environment variables
3. Update these variables:
   - `STRIPE_PRO_MONTHLY_PRICE_ID` = `price_AAAAAA`
   - `STRIPE_PRO_ANNUAL_PRICE_ID` = `price_BBBBBB`
4. Click "Save"
5. Redeploy the site for changes to take effect

---

## Testing Checklist

### Test Mode (Before Production)
- [ ] Create test products and prices using Stripe test keys
- [ ] Test checkout flow with test card: `4242 4242 4242 4242`
- [ ] Verify prices display as $9.99 and $89
- [ ] Confirm subscription created at correct price in Stripe dashboard
- [ ] Test customer portal access
- [ ] Test webhook receipt (subscription.created, customer.subscription.created)

### Production (After Deployment)
- [ ] Create new test account and verify new pricing shows correctly
- [ ] Complete test purchase with real card (then cancel immediately)
- [ ] Check existing Pro users still see old prices in billing portal
- [ ] Monitor Stripe dashboard for first 24 hours
- [ ] Verify webhook events are processing correctly

---

## Important Notes

### Grandfathering Existing Users ✅
- **Existing subscriptions will NOT change automatically**
- Users subscribed at $4.99 or $39 will keep their pricing forever
- Only NEW signups after env var update will use new pricing
- This is Stripe's default behavior - no code changes needed

### Rollback Plan
If issues occur:
1. Restore old price IDs in Netlify env vars:
   - `STRIPE_PRO_MONTHLY_PRICE_ID=price_1SoFuuDjdtNeDMqXTW64ePxn`
   - `STRIPE_PRO_ANNUAL_PRICE_ID=price_1SoG8qDjdtNeDMqX7XPFdCoE`
2. Redeploy site
3. Any subscriptions created at new prices will stay at new prices

### What Happens to Old Price IDs?
- They remain active in Stripe
- Existing subscriptions continue to use them
- You can archive them later (but keep them active for renewals)
- Don't delete them - existing subs need them for renewals

---

## Verification Commands

### Check Price Configuration
```bash
# After updating env vars, verify they're set
echo "Monthly: $STRIPE_PRO_MONTHLY_PRICE_ID"
echo "Annual: $STRIPE_PRO_ANNUAL_PRICE_ID"

# Or check in Node.js
node -e "require('dotenv').config(); console.log('Monthly:', process.env.STRIPE_PRO_MONTHLY_PRICE_ID); console.log('Annual:', process.env.STRIPE_PRO_ANNUAL_PRICE_ID);"
```

### Check Price Details in Stripe
```bash
# Retrieve and verify price amounts
stripe prices retrieve price_AAAAAA
stripe prices retrieve price_BBBBBB

# Should show:
# - unit_amount: 999 (for monthly)
# - unit_amount: 8900 (for annual)
# - currency: "usd"
# - recurring.interval: "month" or "year"
```

---

## Timeline

1. **Now:** Create Stripe products and prices (5 minutes)
2. **Next:** Update local .env file (1 minute)
3. **Next:** Update Netlify env vars (2 minutes)
4. **Next:** Redeploy site (5 minutes)
5. **Next:** Test checkout flow (10 minutes)
6. **Monitor:** Watch analytics for 24-48 hours

---

## Questions?

**Q: Will existing users be charged the new price?**
A: No. Stripe subscriptions lock in the price at creation time. Existing users keep their $4.99 or $39 pricing forever.

**Q: What if someone cancels and re-subscribes?**
A: They'll get the new pricing ($9.99 or $89) when they create a new subscription.

**Q: Can we still offer the old pricing as a promo?**
A: Yes, you can create Stripe coupon codes or use the old price IDs for special promotions.

**Q: Do we need to update the App Store?**
A: Yes, if you have separate App Store pricing, that needs to be updated manually in App Store Connect.

---

## Next Steps

1. [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. [ ] Login: `stripe login`
3. [ ] Create products and prices (see commands above)
4. [ ] Save new price IDs
5. [ ] Update .env file
6. [ ] Update Netlify env vars
7. [ ] Redeploy site
8. [ ] Test checkout flow
9. [ ] Monitor for 24 hours

---

**Last Updated:** 2026-01-23
**Updated By:** Stripe Payment Integration Expert
