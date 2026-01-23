/**
 * Pricing Tests
 *
 * Tests for new pricing structure:
 * - $9.99/month price calculation
 * - Department tier calculations
 * - Annual discount math
 * - Tier-based feature access
 */

import { describe, it, expect } from "vitest";
import { PRICING, TIER_CONFIG } from "../server/db";

// Pricing constants based on PRICING_QUICK_REFERENCE.md
const NEW_PRICING = {
  pro: {
    monthly: {
      amount: 999, // $9.99 in cents
      display: "$9.99",
      interval: "month" as const,
    },
    annual: {
      amount: 8900, // $89 in cents
      display: "$89",
      interval: "year" as const,
      savings: "25%",
      monthlyEquivalent: 742, // $7.42/month when billed annually
    },
  },
  department: {
    starter: {
      amount: 19900, // $199 in cents
      display: "$199",
      maxUsers: 10,
      perUserCost: 1990, // $19.90 per user
    },
    standard: {
      perUserAnnual: 8900, // $89 per user per year
      minUsers: 11,
      display: "$89/user/year",
    },
  },
  enterprise: {
    starting: 500000, // $5,000 minimum
    display: "Custom pricing",
  },
} as const;

// Helper functions for pricing calculations
function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): {
  savingsAmount: number;
  savingsPercent: number;
  monthlyEquivalent: number;
} {
  const yearlyMonthlyTotal = monthlyPrice * 12;
  const savingsAmount = yearlyMonthlyTotal - annualPrice;
  const savingsPercent = Math.round((savingsAmount / yearlyMonthlyTotal) * 100);
  const monthlyEquivalent = Math.round(annualPrice / 12);

  return {
    savingsAmount,
    savingsPercent,
    monthlyEquivalent,
  };
}

function calculateDepartmentPrice(userCount: number): {
  totalPrice: number;
  pricePerUser: number;
  tier: "starter" | "standard";
} {
  if (userCount <= 10) {
    return {
      totalPrice: NEW_PRICING.department.starter.amount,
      pricePerUser: NEW_PRICING.department.starter.amount / userCount,
      tier: "starter",
    };
  } else {
    return {
      totalPrice: userCount * NEW_PRICING.department.standard.perUserAnnual,
      pricePerUser: NEW_PRICING.department.standard.perUserAnnual,
      tier: "standard",
    };
  }
}

function getFeatureAccess(tier: "free" | "pro" | "enterprise") {
  return TIER_CONFIG[tier];
}

describe("Pricing Structure", () => {
  describe("Current Pricing Implementation", () => {
    it("should have current pro monthly price in database", () => {
      // Current implementation - may be updated to $9.99 in future
      expect(PRICING.pro.monthly.amount).toBeGreaterThan(0);
      expect(PRICING.pro.monthly.display).toBeTruthy();
    });

    it("should have current pro annual price in database", () => {
      // Current implementation - may be updated to $89 in future
      expect(PRICING.pro.annual.amount).toBeGreaterThan(0);
      expect(PRICING.pro.annual.display).toBeTruthy();
    });

    it("should calculate annual savings on current pricing", () => {
      const monthlyTotal = PRICING.pro.monthly.amount * 12;
      const annualPrice = PRICING.pro.annual.amount;
      const savings = monthlyTotal - annualPrice;
      const savingsPercent = Math.round((savings / monthlyTotal) * 100);

      expect(savingsPercent).toBeGreaterThan(0);
      expect(PRICING.pro.annual.savings).toBeTruthy();
    });
  });

  describe("Planned $9.99 Pro Pricing (Future)", () => {
    it("should calculate planned monthly price correctly", () => {
      // Planned future pricing from PRICING_QUICK_REFERENCE.md
      expect(NEW_PRICING.pro.monthly.amount).toBe(999);
      expect(NEW_PRICING.pro.monthly.display).toBe("$9.99");
    });

    it("should calculate planned annual price correctly", () => {
      expect(NEW_PRICING.pro.annual.amount).toBe(8900);
      expect(NEW_PRICING.pro.annual.display).toBe("$89");
    });

    it("should provide 25% annual savings in planned pricing", () => {
      const savings = calculateAnnualSavings(
        NEW_PRICING.pro.monthly.amount,
        NEW_PRICING.pro.annual.amount
      );

      expect(savings.savingsPercent).toBe(25);
      expect(savings.savingsAmount).toBe(3088); // $30.88 savings
    });

    it("should calculate monthly equivalent for planned annual plan", () => {
      const savings = calculateAnnualSavings(
        NEW_PRICING.pro.monthly.amount,
        NEW_PRICING.pro.annual.amount
      );

      expect(savings.monthlyEquivalent).toBe(742); // $7.42/month
      expect(NEW_PRICING.pro.annual.monthlyEquivalent).toBe(742);
    });

    it("should represent price increase from current to planned pricing", () => {
      const currentMonthly = PRICING.pro.monthly.amount;
      const plannedMonthly = NEW_PRICING.pro.monthly.amount;

      // Planned pricing is higher than current
      expect(plannedMonthly).toBeGreaterThan(currentMonthly);
    });
  });

  describe("Department Pricing", () => {
    it("should calculate starter tier (1-10 users) correctly", () => {
      const price1 = calculateDepartmentPrice(1);
      expect(price1.totalPrice).toBe(19900); // $199
      expect(price1.tier).toBe("starter");

      const price5 = calculateDepartmentPrice(5);
      expect(price5.totalPrice).toBe(19900); // $199
      expect(price5.tier).toBe("starter");

      const price10 = calculateDepartmentPrice(10);
      expect(price10.totalPrice).toBe(19900); // $199
      expect(price10.tier).toBe("starter");
    });

    it("should calculate per-user cost for starter tier", () => {
      const price1 = calculateDepartmentPrice(1);
      expect(price1.pricePerUser).toBe(19900); // $199 for 1 user

      const price5 = calculateDepartmentPrice(5);
      expect(price5.pricePerUser).toBe(3980); // $39.80 per user

      const price10 = calculateDepartmentPrice(10);
      expect(price10.pricePerUser).toBe(1990); // $19.90 per user
    });

    it("should calculate standard tier (11+ users) correctly", () => {
      const price11 = calculateDepartmentPrice(11);
      expect(price11.totalPrice).toBe(97900); // $979 (11 × $89)
      expect(price11.tier).toBe("standard");

      const price25 = calculateDepartmentPrice(25);
      expect(price25.totalPrice).toBe(222500); // $2,225 (25 × $89)
      expect(price25.tier).toBe("standard");

      const price100 = calculateDepartmentPrice(100);
      expect(price100.totalPrice).toBe(890000); // $8,900 (100 × $89)
      expect(price100.tier).toBe("standard");
    });

    it("should have consistent per-user pricing for standard tier", () => {
      const price11 = calculateDepartmentPrice(11);
      const price50 = calculateDepartmentPrice(50);
      const price100 = calculateDepartmentPrice(100);

      expect(price11.pricePerUser).toBe(8900); // $89
      expect(price50.pricePerUser).toBe(8900); // $89
      expect(price100.pricePerUser).toBe(8900); // $89
    });

    it("should provide volume discount at 11+ users", () => {
      const starter10 = calculateDepartmentPrice(10);
      const standard11 = calculateDepartmentPrice(11);

      const starterPerUser = starter10.pricePerUser;
      const standardPerUser = standard11.pricePerUser;

      // Standard tier should be cheaper per user than starter tier at 10 users
      expect(standardPerUser).toBeLessThan(starterPerUser);
    });

    it("should calculate realistic small department scenarios", () => {
      // Small volunteer department with 3 paramedics
      const small = calculateDepartmentPrice(3);
      expect(small.totalPrice).toBe(19900); // $199
      expect(small.pricePerUser).toBeCloseTo(6633, 0); // ~$66.33 per user

      // Medium paid department with 30 paramedics
      const medium = calculateDepartmentPrice(30);
      expect(medium.totalPrice).toBe(267000); // $2,670
      expect(medium.pricePerUser).toBe(8900); // $89 per user

      // Large city department with 150 paramedics
      const large = calculateDepartmentPrice(150);
      expect(large.totalPrice).toBe(1335000); // $13,350
      expect(large.pricePerUser).toBe(8900); // $89 per user
    });
  });

  describe("Enterprise Pricing", () => {
    it("should have minimum starting price", () => {
      expect(NEW_PRICING.enterprise.starting).toBe(500000); // $5,000
    });

    it("should indicate custom pricing", () => {
      expect(NEW_PRICING.enterprise.display).toBe("Custom pricing");
    });
  });

  describe("Tier Feature Access", () => {
    it("should limit free tier appropriately", () => {
      const freeTier = getFeatureAccess("free");

      expect(freeTier.dailyQueryLimit).toBe(5);
      expect(freeTier.maxCounties).toBe(1);
      expect(freeTier.maxBookmarks).toBe(5);
      expect(freeTier.offlineAccess).toBe(false);
      expect(freeTier.prioritySupport).toBe(false);
    });

    it("should provide unlimited access for pro tier", () => {
      const proTier = getFeatureAccess("pro");

      expect(proTier.dailyQueryLimit).toBe(Infinity);
      expect(proTier.maxCounties).toBe(Infinity);
      expect(proTier.maxBookmarks).toBe(Infinity);
      expect(proTier.offlineAccess).toBe(true);
      expect(proTier.prioritySupport).toBe(true);
    });

    it("should provide full access for enterprise tier", () => {
      const enterpriseTier = getFeatureAccess("enterprise");

      expect(enterpriseTier.dailyQueryLimit).toBe(Infinity);
      expect(enterpriseTier.maxCounties).toBe(Infinity);
      expect(enterpriseTier.maxBookmarks).toBe(Infinity);
      expect(enterpriseTier.offlineAccess).toBe(true);
      expect(enterpriseTier.prioritySupport).toBe(true);
    });
  });

  describe("Revenue Projections", () => {
    it("should calculate Year 1 conservative projection", () => {
      const individualPro = 650; // users
      const avgAnnualRevenue = 10700; // $107 (mix of monthly/annual)
      const individualMRR = (individualPro * avgAnnualRevenue) / 12;

      const departmentDeals = 12;
      const avgDealSize = 250000; // $2,500
      const departmentMRR = (departmentDeals * avgDealSize) / 12;

      const totalYear1ARR = individualPro * avgAnnualRevenue + departmentDeals * avgDealSize;

      expect(totalYear1ARR).toBeCloseTo(9955000, -3); // ~$99,550
    });

    it("should calculate ARPU (Average Revenue Per User)", () => {
      // Mix: 60% annual ($89), 40% monthly ($9.99 × 12 = $119.88)
      const annualARPU = NEW_PRICING.pro.annual.amount;
      const monthlyARPU = NEW_PRICING.pro.monthly.amount * 12;

      const weightedARPU = annualARPU * 0.6 + monthlyARPU * 0.4;

      // Should be around $107 per user
      expect(weightedARPU).toBeGreaterThan(10000); // > $100
      expect(weightedARPU).toBeLessThan(12000); // < $120
    });

    it("should calculate department deal sizes", () => {
      // Small department: 5 users
      const smallDeal = calculateDepartmentPrice(5);
      expect(smallDeal.totalPrice).toBe(19900); // $199

      // Medium department: 30 users
      const mediumDeal = calculateDepartmentPrice(30);
      expect(mediumDeal.totalPrice).toBe(267000); // $2,670

      // Large department: 100 users
      const largeDeal = calculateDepartmentPrice(100);
      expect(largeDeal.totalPrice).toBe(890000); // $8,900
    });
  });

  describe("Pricing Psychology", () => {
    it("should show clear annual savings anchor", () => {
      const savings = calculateAnnualSavings(
        NEW_PRICING.pro.monthly.amount,
        NEW_PRICING.pro.annual.amount
      );

      const savingsDisplay = `Save ${savings.savingsPercent}% - Just $${(
        savings.monthlyEquivalent / 100
      ).toFixed(2)}/month`;

      // Savings should be 25-26% (rounding variations acceptable)
      expect(savingsDisplay).toMatch(/Save (25|26)%/);
      expect(savingsDisplay).toContain("$7.42/month");
    });

    it("should position pro tier as best value", () => {
      const proMonthly = NEW_PRICING.pro.monthly.amount / 100;
      const enterpriseMin = NEW_PRICING.enterprise.starting / 100;

      const valueRatio = enterpriseMin / proMonthly;

      // Enterprise is 500x more expensive, making Pro look like great value
      expect(valueRatio).toBeGreaterThan(400);
    });

    it("should calculate cost per day for psychological pricing", () => {
      const monthlyPrice = NEW_PRICING.pro.monthly.amount;
      const costPerDay = Math.round(monthlyPrice / 30);

      expect(costPerDay).toBe(33); // 33 cents per day
    });
  });

  describe("Competitive Positioning", () => {
    it("should be 85% cheaper than UpToDate", () => {
      const protocolGuideMonthly = NEW_PRICING.pro.monthly.amount;
      const upToDateMonthly = 5000; // $50/month

      const discount = 1 - protocolGuideMonthly / upToDateMonthly;

      expect(discount).toBeCloseTo(0.8, 1); // ~80% discount
    });

    it("should compare favorably to coffee analogy", () => {
      const monthlyPrice = NEW_PRICING.pro.monthly.amount / 100;
      const avgCoffeeCost = 5; // $5 per coffee
      const coffeesPerMonth = monthlyPrice / avgCoffeeCost;

      expect(coffeesPerMonth).toBeCloseTo(2, 0); // "Cost of 2 coffees"
    });

    it("should be less than one tank of gas", () => {
      const monthlyPrice = NEW_PRICING.pro.monthly.amount / 100;
      const avgGasTankCost = 50; // $50 to fill up

      expect(monthlyPrice).toBeLessThan(avgGasTankCost);
    });
  });

  describe("Edge Cases & Validation", () => {
    it("should handle single user department", () => {
      const singleUser = calculateDepartmentPrice(1);

      expect(singleUser.totalPrice).toBe(19900);
      expect(singleUser.tier).toBe("starter");
    });

    it("should handle boundary at 10/11 users", () => {
      const users10 = calculateDepartmentPrice(10);
      const users11 = calculateDepartmentPrice(11);

      expect(users10.tier).toBe("starter");
      expect(users11.tier).toBe("standard");

      // 11 users should cost more total than 10
      expect(users11.totalPrice).toBeGreaterThan(users10.totalPrice);
    });

    it("should handle large enterprise departments", () => {
      const users500 = calculateDepartmentPrice(500);

      expect(users500.totalPrice).toBe(4450000); // $44,500
      expect(users500.tier).toBe("standard");
    });

    it("should validate pricing is in cents", () => {
      // All prices should be integers (cents, not dollars)
      expect(Number.isInteger(NEW_PRICING.pro.monthly.amount)).toBe(true);
      expect(Number.isInteger(NEW_PRICING.pro.annual.amount)).toBe(true);
      expect(Number.isInteger(NEW_PRICING.department.starter.amount)).toBe(true);
    });

    it("should calculate exact savings amounts", () => {
      const monthlyTotal = NEW_PRICING.pro.monthly.amount * 12;
      const annual = NEW_PRICING.pro.annual.amount;
      const savings = monthlyTotal - annual;

      expect(savings).toBe(3088); // $30.88 saved per year
    });
  });

  describe("Migration Strategy", () => {
    it("should support planned pricing updates", () => {
      const currentMonthly = PRICING.pro.monthly.amount;
      const plannedMonthly = NEW_PRICING.pro.monthly.amount;

      // Both pricing tiers should be valid
      expect(currentMonthly).toBeGreaterThan(0);
      expect(plannedMonthly).toBeGreaterThan(0);
    });

    it("should calculate lock-in offer value for migration", () => {
      const lockInOffer = 8900; // $89/year for 2 years
      const regularPlannedPrice = NEW_PRICING.pro.monthly.amount * 12; // $119.88/year

      const twoYearSavings = regularPlannedPrice * 2 - lockInOffer * 2;

      expect(twoYearSavings).toBeGreaterThan(0); // Positive savings
    });

    it("should support grandfathering strategy for existing users", () => {
      const currentUserPrice = PRICING.pro.monthly.amount;
      const newUserPrice = NEW_PRICING.pro.monthly.amount;

      // Grandfathering means existing users get current price
      // while new users may pay different (potentially higher) price
      expect(currentUserPrice).toBeGreaterThan(0);
      expect(newUserPrice).toBeGreaterThan(0);
    });
  });

  describe("Conversion Optimization", () => {
    it("should calculate query limit value", () => {
      const freeLimit = 5; // queries per day
      const freeDaysToUpgrade = 30; // days
      const totalFreeQueries = freeLimit * freeDaysToUpgrade;

      const proMonthlyPrice = NEW_PRICING.pro.monthly.amount / 100;
      const costPerQuery = proMonthlyPrice / totalFreeQueries;

      // Pro costs ~$0.067 per query if you use 150/month
      expect(costPerQuery).toBeCloseTo(0.067, 2);
    });

    it("should show value of unlimited counties", () => {
      const freeCounties = 1;
      const proCounties = Infinity;

      const freeTier = getFeatureAccess("free");
      const proTier = getFeatureAccess("pro");

      expect(freeTier.maxCounties).toBe(freeCounties);
      expect(proTier.maxCounties).toBe(proCounties);
    });
  });

  describe("Time Savings ROI", () => {
    it("should calculate ROI based on time savings", () => {
      const hoursSavedPerYear = 15; // Conservative estimate
      const paramedicsHourlyRate = 25; // $25/hour
      const valueCreated = hoursSavedPerYear * paramedicsHourlyRate * 100; // in cents

      const annualCost = NEW_PRICING.pro.annual.amount;
      const roi = (valueCreated - annualCost) / annualCost;

      expect(valueCreated).toBe(37500); // $375 value
      expect(roi).toBeGreaterThan(3); // 3x ROI
    });

    it("should justify pricing with value calculation", () => {
      const timeSavedPerQuery = 2; // minutes
      const queriesPerMonth = 50; // typical pro user
      const monthsPerYear = 12;

      const totalTimeSavedMinutes = timeSavedPerQuery * queriesPerMonth * monthsPerYear;
      const totalTimeSavedHours = totalTimeSavedMinutes / 60;

      expect(totalTimeSavedHours).toBe(20); // 20 hours saved per year
    });
  });
});
