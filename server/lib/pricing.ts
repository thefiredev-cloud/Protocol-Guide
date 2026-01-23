/**
 * Department/Enterprise Pricing Configuration
 *
 * Pricing strategy:
 * - Individual: $9.99/month (single user)
 * - Small Department: 5-20 users, $7.99/user/month
 * - Large Department: 20+ users, $5.99/user/month
 * - Enterprise: 100+ users, custom pricing (contact sales)
 */

export const DEPARTMENT_PRICING = {
  small: {
    // 5-20 users - per-seat pricing
    perSeat: {
      monthly: 7.99,
      annual: 95.88, // $7.99 × 12 (no discount for simplicity)
    },
    minSeats: 5,
    maxSeats: 20,
  },
  large: {
    // 20+ users - volume pricing
    perSeat: {
      monthly: 5.99,
      annual: 71.88, // $5.99 × 12
    },
    minSeats: 20,
    maxSeats: 100,
  },
  enterprise: {
    // 100+ users - custom pricing
    contact: true,
    minSeats: 100,
  },
} as const;

export type SubscriptionTier = "small" | "large" | "enterprise";
export type BillingInterval = "monthly" | "annual";

/**
 * Calculate total cost for a department subscription
 */
export function calculateDepartmentPrice(
  tier: SubscriptionTier,
  seatCount: number,
  interval: BillingInterval
): number | null {
  // Validate tier and seat count match
  if (tier === "small") {
    if (seatCount < DEPARTMENT_PRICING.small.minSeats || seatCount > DEPARTMENT_PRICING.small.maxSeats) {
      return null;
    }
    const pricePerSeat = interval === "monthly"
      ? DEPARTMENT_PRICING.small.perSeat.monthly
      : DEPARTMENT_PRICING.small.perSeat.annual;
    return pricePerSeat * seatCount;
  }

  if (tier === "large") {
    if (seatCount < DEPARTMENT_PRICING.large.minSeats || seatCount > DEPARTMENT_PRICING.large.maxSeats) {
      return null;
    }
    const pricePerSeat = interval === "monthly"
      ? DEPARTMENT_PRICING.large.perSeat.monthly
      : DEPARTMENT_PRICING.large.perSeat.annual;
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
  if (seatCount < DEPARTMENT_PRICING.small.minSeats) {
    return "small"; // Default to small tier, but caller should handle this
  }
  if (seatCount <= DEPARTMENT_PRICING.small.maxSeats) {
    return "small";
  }
  if (seatCount <= DEPARTMENT_PRICING.large.maxSeats) {
    return "large";
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

  if (tier === "small") {
    if (seatCount < DEPARTMENT_PRICING.small.minSeats) {
      return {
        valid: false,
        error: `Small Department tier requires at least ${DEPARTMENT_PRICING.small.minSeats} seats.`
      };
    }
    if (seatCount > DEPARTMENT_PRICING.small.maxSeats) {
      return {
        valid: false,
        error: `Small Department tier supports up to ${DEPARTMENT_PRICING.small.maxSeats} seats. Please upgrade to Large Department.`
      };
    }
  }

  if (tier === "large") {
    if (seatCount < DEPARTMENT_PRICING.large.minSeats) {
      return {
        valid: false,
        error: `Large Department tier requires at least ${DEPARTMENT_PRICING.large.minSeats} seats. Use Small Department tier instead.`
      };
    }
    if (seatCount > DEPARTMENT_PRICING.large.maxSeats) {
      return {
        valid: false,
        error: `Large Department tier supports up to ${DEPARTMENT_PRICING.large.maxSeats} seats. Please contact sales for Enterprise pricing.`
      };
    }
  }

  if (tier === "enterprise") {
    if (seatCount < DEPARTMENT_PRICING.enterprise.minSeats) {
      return {
        valid: false,
        error: `Enterprise tier is for ${DEPARTMENT_PRICING.enterprise.minSeats}+ seats. Use Large Department tier instead.`
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
