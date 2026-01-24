/**
 * Referral Code Procedures
 * Code validation and redemption operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicRateLimitedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";

export const codeProcedures = router({
  /**
   * Validate a referral code (public - for signup flow)
   */
  validateCode: publicRateLimitedProcedure
    .input(z.object({ code: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { valid: false, error: "Service unavailable" };
      }

      const code = input.code.toUpperCase().trim();

      const result = await db.execute(sql`
        SELECT rc.id, rc.userId, rc.maxUses, rc.usesCount, rc.expiresAt, rc.isActive, u.name as referrerName
        FROM referral_codes rc
        JOIN users u ON u.id = rc.userId
        WHERE rc.code = ${code}
        LIMIT 1
      `);

      const referralCode = result.rows[0];

      if (!referralCode) {
        return { valid: false, error: "Invalid referral code" };
      }

      if (!referralCode.isActive) {
        return { valid: false, error: "This code is no longer active" };
      }

      if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
        return { valid: false, error: "This code has expired" };
      }

      if (referralCode.maxUses && referralCode.usesCount >= referralCode.maxUses) {
        return { valid: false, error: "This code has reached its usage limit" };
      }

      return {
        valid: true,
        referrerName: referralCode.referrerName || "A Protocol Guide user",
        benefits: {
          trialDays: 14, // Extended trial for referred users
          description: "14-day Pro trial (instead of 7)",
        },
      };
    }),

  /**
   * Redeem a referral code (called during signup)
   */
  redeemCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const code = input.code.toUpperCase().trim();
      const newUserId = ctx.user.id;

      // Get and validate code
      const codeResult = await db.execute(sql`
        SELECT * FROM referral_codes WHERE code = ${code} AND isActive = true LIMIT 1
      `);

      const referralCode = (codeResult[0] as any[])?.[0];

      if (!referralCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired referral code",
        });
      }

      // Prevent self-referral
      if (referralCode.userId === newUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot use your own referral code",
        });
      }

      // Check if user already redeemed a code
      const existingRedemption = await db.execute(sql`
        SELECT id FROM referral_redemptions WHERE referredUserId = ${newUserId} LIMIT 1
      `);

      if ((existingRedemption[0] as any[])?.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already used a referral code",
        });
      }

      // Create redemption record
      const referrerReward = { type: "pro_days", amount: 7, applied: false };
      const refereeReward = { type: "extended_trial", amount: 14, applied: true };

      await db.execute(sql`
        INSERT INTO referral_redemptions (referralCodeId, referredUserId, referrerUserId, referrerReward, refereeReward, redeemedAt)
        VALUES (${referralCode.id}, ${newUserId}, ${referralCode.userId}, ${JSON.stringify(referrerReward)}, ${JSON.stringify(refereeReward)}, NOW())
      `);

      // Update code usage count
      await db.execute(sql`
        UPDATE referral_codes SET usesCount = usesCount + 1 WHERE id = ${referralCode.id}
      `);

      // Update referrer stats
      await db.execute(sql`
        INSERT INTO user_referral_stats (userId, totalReferrals, pendingReferrals, currentTier, updatedAt)
        VALUES (${referralCode.userId}, 1, 1, 'bronze', NOW())
        ON DUPLICATE KEY UPDATE
          totalReferrals = totalReferrals + 1,
          pendingReferrals = pendingReferrals + 1,
          lastReferralAt = NOW(),
          updatedAt = NOW()
      `);

      return {
        success: true,
        benefit: "14-day Pro trial activated",
      };
    }),

  /**
   * Get share message templates
   */
  getShareTemplates: protectedProcedure.query(async ({ ctx }) => {
    // Get user's referral code
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const codeResult = await db.execute(sql`
      SELECT code FROM referral_codes WHERE userId = ${ctx.user.id} AND isActive = true LIMIT 1
    `);

    const code = (codeResult[0] as any[])?.[0]?.code || "CREW-XXXXX";
    const shareUrl = `https://protocolguide.app/join?ref=${code}`;

    return {
      sms: `Hey, I've been using Protocol Guide on shift - found the cardiac arrest protocol in 2 seconds instead of flipping through the book. Use my code ${code} for 2 weeks Pro free: ${shareUrl}`,
      whatsapp: `Check this out - Protocol Guide saved me during a call yesterday. 2.3 seconds to find what I needed. Try it free with my code: ${code}\n${shareUrl}`,
      email: {
        subject: "Check out Protocol Guide - 2 weeks free",
        body: `Hey,\n\nI wanted to share an app I've been using on shift called Protocol Guide. It lets you search EMS protocols instantly - found the cardiac arrest protocol in 2 seconds instead of flipping through the book.\n\nUse my referral code ${code} to get 2 weeks of Pro features free (normally just 1 week trial).\n\nDownload here: ${shareUrl}\n\nLet me know what you think!`,
      },
      generic: `Protocol Guide - find any EMS protocol in 2.3 seconds. Use code ${code} for 2 weeks free: ${shareUrl}`,
      shareUrl,
      code,
    };
  }),
});
