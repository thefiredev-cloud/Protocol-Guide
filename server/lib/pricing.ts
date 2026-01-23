/**
 * Department/Enterprise Pricing Configuration
 *
 * Pricing strategy:
 * - Starter: 1-10 users, flat rate
 * - Professional: 11-100 users, per-seat pricing
 * - Enterprise: 100+ users, custom pricing (contact sales)
 */

export const DEPARTMENT_PRICING = {
  starter: {
    // 1-10 users - flat rate
    monthly: 19.99,
    annual: 199, // $16.58/mo (17% discount)
    maxSeats: 10,
    minSeats: 1,
  },
  professional: {
    // 11-100 users - per-seat pricing
    perSeat: {
      monthly: 7.99,
      annual: 89, // $7.42/mo (7% discount)
    },
    maxSeats: 100,
    minSeats: 11,
  },
  enterprise: {
    // 100+ users - custom pricing
    contact: true,
    minSeats: 101,
  },
} as const;

export type SubscriptionTier = "starter" | "professional" | "enterprise";
export type BillingInterval = "monthly" | "annual";

/**
 * Calculate monthly cost for a department subscription
 */
export function calculateDepartmentPrice(
  tier: SubscriptionTier,
  seatCount: number,
  interval: BillingInterval
): number | null {
  // Validate tier and seat count match
  if (tier === "starter") {
    if (seatCount < DEPARTMENT_PRICING.starter.minSeats || seatCount > DEPARTMENT_PRICING.starter.maxSeats) {
      return null;
    }
    return interval === "monthly"
      ? DEPARTMENT_PRICING.starter.monthly
      : DEPARTMENT_PRICING.starter.annual;
  }

  if (tier === "professional") {
    if (seatCount < DEPARTMENT_PRICING.professional.minSeats || seatCount > DEPARTMENT_PRICING.professional.maxSeats) {
      return null;
    }
    const pricePerSeat = interval === "monthly"
      ? DEPARTMENT_PRICING.professional.perSeat.monthly
      : DEPARTMENT_PRICING.professional.perSeat.annual;
    return pricePerSeat * seatCount;
  }

  if (tier === "enterprise") {
    // Enterprise requires custom pricing
    return null;
  }

  return null;
}

/**
 * Determine the appropriate tier based on seat count
 */
export function getTierForSeatCount(seatCount: number): SubscriptionTier {
  if (seatCount <= DEPARTMENT_PRICING.starter.maxSeats) {
    return "starter";
  }
  if (seatCount <= DEPARTMENT_PRICING.professional.maxSeats) {
    return "professional";
  }
  return "enterprise";
}

/**
 * Calculate annual savings compared to monthly billing
 */
export function calculateAnnualSavings(
  tier: SubscriptionTier,
  seatCount: number
): number | null {
  if (tier === "enterprise") {
    return null; // Custom pricing
  }

  const monthlyTotal = calculateDepartmentPrice(tier, seatCount, "monthly");
  const annualTotal = calculateDepartmentPrice(tier, seatCount, "annual");

  if (monthlyTotal === null || annualTotal === null) {
    return null;
  }

  const monthlyAnnualized = monthlyTotal * 12;
  return monthlyAnnualized - annualTotal;
}

/**
 * Validate seat count for a given tier
 */
export function validateSeatCount(tier: SubscriptionTier, seatCount: number): {
  valid: boolean;
  error?: string;
} {
  if (seatCount < 1) {
    return { valid: false, error: "Seat count must be at least 1" };
  }

  if (tier === "starter") {
    if (seatCount > DEPARTMENT_PRICING.starter.maxSeats) {
      return {
        valid: false,
        error: `Starter tier supports up to ${DEPARTMENT_PRICING.starter.maxSeats} seats. Please upgrade to Professional.`
      };
    }
  }

  if (tier === "professional") {
    if (seatCount < DEPARTMENT_PRICING.professional.minSeats) {
      return {
        valid: false,
        error: `Professional tier requires at least ${DEPARTMENT_PRICING.professional.minSeats} seats. Use Starter tier instead.`
      };
    }
    if (seatCount > DEPARTMENT_PRICING.professional.maxSeats) {
      return {
        valid: false,
        error: `Professional tier supports up to ${DEPARTMENT_PRICING.professional.maxSeats} seats. Please contact sales for Enterprise pricing.`
      };
    }
  }

  if (tier === "enterprise") {
    if (seatCount < DEPARTMENT_PRICING.enterprise.minSeats) {
      return {
        valid: false,
        error: `Enterprise tier is for ${DEPARTMENT_PRICING.enterprise.minSeats}+ seats. Use Professional tier instead.`
      };
    }
  }

  return { valid: true };
}

/**
 * Format pricing display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get pricing summary for display
 */
export function getPricingSummary(
  tier: SubscriptionTier,
  seatCount: number,
  interval: BillingInterval
): {
  tier: SubscriptionTier;
  seatCount: number;
  interval: BillingInterval;
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualSavings: number | null;
  displayPrice: string;
  displayInterval: string;
} {
  const monthlyPrice = calculateDepartmentPrice(tier, seatCount, "monthly");
  const annualPrice = calculateDepartmentPrice(tier, seatCount, "annual");
  const annualSavings = calculateAnnualSavings(tier, seatCount);

  const activePrice = interval === "monthly" ? monthlyPrice : annualPrice;
  const displayPrice = activePrice !== null ? formatPrice(activePrice) : "Contact Sales";
  const displayInterval = interval === "monthly" ? "/month" : "/year";

  return {
    tier,
    seatCount,
    interval,
    monthlyPrice,
    annualPrice,
    annualSavings,
    displayPrice,
    displayInterval: activePrice !== null ? displayInterval : "",
  };
}
