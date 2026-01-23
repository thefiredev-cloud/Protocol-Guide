/**
 * Referral Analytics Procedures
 * Leaderboard and tracking operations
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";

export const analyticsProcedures = router({
  /**
   * Get top referrers leaderboard
   */
  getLeaderboard: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(25),
        timeframe: z.enum(["all_time", "this_month", "this_week"]).default("all_time"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // For now, use all-time stats
      // In production, would filter by timeframe
      const result = await db.execute(sql`
        SELECT
          urs.userId,
          urs.totalReferrals,
          urs.successfulReferrals,
          urs.currentTier,
          u.name as userName
        FROM user_referral_stats urs
        JOIN users u ON u.id = urs.userId
        WHERE urs.totalReferrals > 0
        ORDER BY urs.successfulReferrals DESC, urs.totalReferrals DESC
        LIMIT ${input.limit}
      `);

      const leaderboard = ((result[0] as any[]) || []).map((row, index) => ({
        rank: index + 1,
        userId: row.userId,
        userName: row.userName || "Anonymous",
        totalReferrals: row.totalReferrals,
        successfulReferrals: row.successfulReferrals,
        tier: row.currentTier,
      }));

      return { leaderboard, timeframe: input.timeframe };
    }),

  /**
   * Track a viral event (share, view, etc.)
   */
  trackViralEvent: protectedProcedure
    .input(
      z.object({
        eventType: z.enum([
          "referral_code_generated",
          "referral_code_shared",
          "referral_code_copied",
          "share_button_tapped",
          "shift_share_shown",
          "shift_share_accepted",
          "shift_share_dismissed",
          "social_share_completed",
        ]),
        metadata: z
          .object({
            shareMethod: z.enum(["sms", "whatsapp", "email", "copy", "qr"]).optional(),
            referralCode: z.string().optional(),
            platform: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        // Silently fail - tracking should not break user experience
        return { tracked: false };
      }

      try {
        await db.execute(sql`
          INSERT INTO viral_events (userId, eventType, metadata, createdAt)
          VALUES (${ctx.user.id}, ${input.eventType}, ${JSON.stringify(input.metadata || {})}, NOW())
        `);
        return { tracked: true };
      } catch {
        return { tracked: false };
      }
    }),
});
