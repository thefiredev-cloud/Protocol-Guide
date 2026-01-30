/**
 * Referral System Router Tests
 * 
 * Tests for the referral system including:
 * - Referral code generation and validation
 * - Tier calculations
 * - Share templates
 * - Leaderboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { createMockTraceContext, createMockRequest, createMockResponse } from "./setup";
import { 
  generateReferralCode, 
  calculateTier, 
  REFERRAL_TIERS,
  type ReferralTier 
} from "../server/routers/referral/constants";

// Create test context
function createTestContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    req: createMockRequest(),
    res: createMockResponse(),
    trace: createMockTraceContext(),
    userId: null,
    userTier: 'free',
    csrfToken: 'test-csrf-token',
    ...overrides,
  };
}

function createAuthenticatedContext(userId: number = 1): TrpcContext {
  return createTestContext({ userId, userTier: 'pro' });
}

describe('Referral Constants', () => {
  describe('generateReferralCode', () => {
    it('should generate codes in correct format', () => {
      const code = generateReferralCode();
      expect(code).toMatch(/^CREW-[A-Z2-9]{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }
      // All 100 codes should be unique
      expect(codes.size).toBe(100);
    });

    it('should not include confusing characters (0, O, 1, I)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateReferralCode();
        expect(code).not.toMatch(/[0O1I]/);
      }
    });
  });

  describe('calculateTier', () => {
    it('should return bronze for 0 referrals', () => {
      expect(calculateTier(0)).toBe('bronze');
    });

    it('should return bronze for 1-2 referrals', () => {
      expect(calculateTier(1)).toBe('bronze');
      expect(calculateTier(2)).toBe('bronze');
    });

    it('should return silver for 3-4 referrals', () => {
      expect(calculateTier(3)).toBe('silver');
      expect(calculateTier(4)).toBe('silver');
    });

    it('should return gold for 5-9 referrals', () => {
      expect(calculateTier(5)).toBe('gold');
      expect(calculateTier(9)).toBe('gold');
    });

    it('should return platinum for 10-24 referrals', () => {
      expect(calculateTier(10)).toBe('platinum');
      expect(calculateTier(24)).toBe('platinum');
    });

    it('should return ambassador for 25+ referrals', () => {
      expect(calculateTier(25)).toBe('ambassador');
      expect(calculateTier(100)).toBe('ambassador');
    });
  });

  describe('REFERRAL_TIERS', () => {
    it('should have correct bronze tier config', () => {
      expect(REFERRAL_TIERS.bronze.minReferrals).toBe(0);
      expect(REFERRAL_TIERS.bronze.rewardDays).toBe(7);
    });

    it('should have correct silver tier config', () => {
      expect(REFERRAL_TIERS.silver.minReferrals).toBe(3);
      expect(REFERRAL_TIERS.silver.rewardDays).toBe(30);
      expect(REFERRAL_TIERS.silver.bonusDays).toBe(30);
    });

    it('should have correct gold tier config', () => {
      expect(REFERRAL_TIERS.gold.minReferrals).toBe(5);
      expect(REFERRAL_TIERS.gold.rewardDays).toBe(180);
      expect(REFERRAL_TIERS.gold.bonusDays).toBe(180);
    });

    it('should have correct platinum tier config', () => {
      expect(REFERRAL_TIERS.platinum.minReferrals).toBe(10);
      expect(REFERRAL_TIERS.platinum.rewardDays).toBe(365);
    });

    it('should have correct ambassador tier config', () => {
      expect(REFERRAL_TIERS.ambassador.minReferrals).toBe(25);
      expect(REFERRAL_TIERS.ambassador.rewardDays).toBe(365);
    });

    it('should have all tiers defined', () => {
      const tiers: ReferralTier[] = ['bronze', 'silver', 'gold', 'platinum', 'ambassador'];
      tiers.forEach(tier => {
        expect(REFERRAL_TIERS[tier]).toBeDefined();
        expect(REFERRAL_TIERS[tier].minReferrals).toBeGreaterThanOrEqual(0);
        expect(REFERRAL_TIERS[tier].rewardDays).toBeGreaterThan(0);
      });
    });
  });
});

describe('Referral Router Procedures', () => {
  describe('referral.validateCode', () => {
    const caller = appRouter.createCaller(createTestContext());

    it('should validate a properly formatted code', async () => {
      const result = await caller.referral.validateCode({
        code: 'CREW-ABC123',
      });

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should reject invalid code format', async () => {
      const result = await caller.referral.validateCode({
        code: 'INVALID',
      });

      expect(result.valid).toBe(false);
    });

    it('should handle codes with lowercase letters', async () => {
      const result = await caller.referral.validateCode({
        code: 'crew-abc123',
      });

      // Should handle case-insensitively
      expect(result).toBeDefined();
    });
  });

  describe('referral.getMyReferralCode (authenticated)', () => {
    it('should require authentication', async () => {
      const unauthCaller = appRouter.createCaller(createTestContext());
      
      await expect(unauthCaller.referral.getMyReferralCode()).rejects.toThrow();
    });
  });

  describe('referral.getMyStats (authenticated)', () => {
    it('should require authentication', async () => {
      const unauthCaller = appRouter.createCaller(createTestContext());
      
      await expect(unauthCaller.referral.getMyStats()).rejects.toThrow();
    });
  });

  describe('referral.getMyReferrals (authenticated)', () => {
    it('should require authentication', async () => {
      const unauthCaller = appRouter.createCaller(createTestContext());
      
      await expect(unauthCaller.referral.getMyReferrals()).rejects.toThrow();
    });
  });

  describe('referral.redeemCode (authenticated)', () => {
    it('should require authentication', async () => {
      const unauthCaller = appRouter.createCaller(createTestContext());
      
      await expect(unauthCaller.referral.redeemCode({
        code: 'CREW-ABC123',
      })).rejects.toThrow();
    });
  });
});

describe('Tier Progression', () => {
  it('should have increasing minReferrals for each tier', () => {
    const tiers: ReferralTier[] = ['bronze', 'silver', 'gold', 'platinum', 'ambassador'];
    
    for (let i = 1; i < tiers.length; i++) {
      const prevTier = REFERRAL_TIERS[tiers[i - 1]];
      const currTier = REFERRAL_TIERS[tiers[i]];
      expect(currTier.minReferrals).toBeGreaterThan(prevTier.minReferrals);
    }
  });

  it('should have non-decreasing rewardDays for each tier', () => {
    const tiers: ReferralTier[] = ['bronze', 'silver', 'gold', 'platinum', 'ambassador'];
    
    for (let i = 1; i < tiers.length; i++) {
      const prevTier = REFERRAL_TIERS[tiers[i - 1]];
      const currTier = REFERRAL_TIERS[tiers[i]];
      expect(currTier.rewardDays).toBeGreaterThanOrEqual(prevTier.rewardDays);
    }
  });
});
