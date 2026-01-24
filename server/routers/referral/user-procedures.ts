/**
 * User Referral Procedures
 * User-facing referral operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";
import { generateReferralCode, calculateTier, REFERRAL_TIERS } from "./constants";

export const userProcedures = router({
  /**
   * Get or create the user's referral code
   */
  getMyReferralCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const userId = ctx.user.id;

    // Check for existing code
    const existing = await db
      .select()
      .from(sql`referral_codes`)
      .where(sql`userId = ${userId} AND isActive = true`)
      .limit(1);

    if (existing.length > 0) {
      return {
        code: existing[0].code as string,
        usesCount: existing[0].usesCount as number,
        createdAt: existing[0].createdAt as Date,
      };
    }

    // Generate new code
    let code = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const existingCode = await db
        .select()
        .from(sql`referral_codes`)
        .where(sql`code = ${code}`)
        .limit(1);

      if (existingCode.length === 0) break;
      code = generateReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate unique referral code",
      });
    }

    // Insert new code
    await db.execute(sql`
      INSERT INTO referral_codes (userId, code, rewardType, rewardAmount, isActive, createdAt)
      VALUES (${userId}, ${code}, 'pro_days', 7, true, NOW())
    `);

    return {
      code,
      usesCount: 0,
      createdAt: new Date(),
    };
  }),

  /**
   * Get user's referral statistics
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const userId = ctx.user.id;

    // Get or create stats record
    const statsResult = await db.execute(sql`
      SELECT * FROM user_referral_stats WHERE userId = ${userId} LIMIT 1
    `);

    const stats = statsResult.rows[0];

    if (!stats) {
      // Initialize stats for new user
      await db.execute(sql`
        INSERT INTO user_referral_stats (userId, totalReferrals, successfulReferrals, pendingReferrals, proDaysEarned, creditsEarned, currentTier, updatedAt)
        VALUES (${userId}, 0, 0, 0, 0, 0, 'bronze', NOW())
      `);

      return {
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        proDaysEarned: 0,
        creditsEarned: 0,
        currentTier: "bronze" as const,
        rank: null,
        nextTierProgress: 0,
        nextTierName: "silver",
        referralsToNextTier: 3,
      };
    }

    const tier = calculateTier(stats.successfulReferrals);
    const nextTier = tier === "ambassador" ? null : Object.entries(REFERRAL_TIERS).find(
      ([, config]) => config.minReferrals > stats.successfulReferrals
    );

    return {
      totalReferrals: stats.totalReferrals,
      successfulReferrals: stats.successfulReferrals,
      pendingReferrals: stats.pendingReferrals,
      proDaysEarned: stats.proDaysEarned,
      creditsEarned: stats.creditsEarned,
      currentTier: tier,
      rank: stats.rank,
      nextTierProgress: nextTier
        ? Math.floor((stats.successfulReferrals / nextTier[1].minReferrals) * 100)
        : 100,
      nextTierName: nextTier?.[0] || null,
      referralsToNextTier: nextTier
        ? nextTier[1].minReferrals - stats.successfulReferrals
        : 0,
    };
  }),

  /**
   * Get referral history (who I've referred)
   */
  getMyReferrals: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const userId = ctx.user.id;

      // Get referrals with user info
      const referrals = await db.execute(sql`
        SELECT
          rr.id,
          rr.redeemedAt,
          rr.convertedToPaid,
          rr.conversionDate,
          rr.referrerReward,
          u.name as referredUserName,
          u.email as referredUserEmail
        FROM referral_redemptions rr
        JOIN users u ON u.id = rr.referredUserId
        WHERE rr.referrerUserId = ${userId}
        ORDER BY rr.redeemedAt DESC
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM referral_redemptions WHERE referrerUserId = ${userId}
      `);

      return {
        referrals: (referrals.rows || []).map((r: any) => ({
          id: r.id,
          redeemedAt: r.redeemedAt,
          convertedToPaid: Boolean(r.convertedToPaid),
          conversionDate: r.conversionDate,
          reward: r.referrerReward,
          referredUser: {
            name: r.referredUserName || "Anonymous",
            // Mask email for privacy
            email: r.referredUserEmail
              ? `${r.referredUserEmail.slice(0, 3)}***@${r.referredUserEmail.split("@")[1]}`
              : null,
          },
        })),
        total: countResult.rows[0]?.total || 0,
      };
    }),
});
