import { describe, it, expect } from "vitest";

describe("Stripe Configuration", () => {
  it("should have STRIPE_PRO_MONTHLY_PRICE_ID configured", () => {
    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    expect(priceId).toBeDefined();
    expect(priceId).not.toBe("");
    expect(priceId).toMatch(/^price_/);
  });

  it("should have STRIPE_PRO_ANNUAL_PRICE_ID configured", () => {
    const priceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
    expect(priceId).toBeDefined();
    expect(priceId).not.toBe("");
    expect(priceId).toMatch(/^price_/);
  });

  it("should have valid monthly price ID format", () => {
    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    // Stripe price IDs start with "price_" and have additional characters
    expect(priceId).toMatch(/^price_.+/);
    // Should have at least some characters after the prefix
    expect(priceId?.length).toBeGreaterThan(6);
  });

  it("should have valid annual price ID format", () => {
    const priceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
    // Stripe price IDs start with "price_" and have additional characters
    expect(priceId).toMatch(/^price_.+/);
    // Should have at least some characters after the prefix
    expect(priceId?.length).toBeGreaterThan(6);
  });

  it("should have different price IDs for monthly and annual", () => {
    const monthlyId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const annualId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
    expect(monthlyId).not.toBe(annualId);
  });
});
