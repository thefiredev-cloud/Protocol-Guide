/**
 * Referral System Constants
 * Shared configuration and helper functions
 */

import * as crypto from "crypto";

/**
 * Referral reward tiers
 */
export const REFERRAL_TIERS = {
  bronze: { minReferrals: 0, rewardDays: 7 },
  silver: { minReferrals: 3, rewardDays: 30, bonusDays: 30 },
  gold: { minReferrals: 5, rewardDays: 180, bonusDays: 180 },
  platinum: { minReferrals: 10, rewardDays: 365, bonusDays: 365 },
  ambassador: { minReferrals: 25, rewardDays: 365, bonusDays: 365 },
} as const;

export type ReferralTier = keyof typeof REFERRAL_TIERS;

/**
 * Generate a unique referral code
 * Format: CREW-XXXXXX (uppercase alphanumeric)
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0,O,1,I)
  const randomPart = Array.from(crypto.randomBytes(6))
    .map((byte: number) => chars[byte % chars.length])
    .join("");
  return `CREW-${randomPart}`;
}

/**
 * Calculate user's referral tier based on successful referrals
 */
export function calculateTier(referralCount: number): ReferralTier {
  if (referralCount >= 25) return "ambassador";
  if (referralCount >= 10) return "platinum";
  if (referralCount >= 5) return "gold";
  if (referralCount >= 3) return "silver";
  return "bronze";
}
