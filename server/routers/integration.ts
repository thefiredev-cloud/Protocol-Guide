/**
 * Integration Router
 * Handles integration partner tracking and analytics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { sql, desc, eq, and, gte } from "drizzle-orm";
import { getDb } from "../db";
import {
  integrationLogs,
  InsertIntegrationLog,
  IntegrationPartner,
} from "../../drizzle/schema";

// Valid integration partners
const integrationPartners = ["imagetrend", "esos", "zoll", "emscloud"] as const;

export const integrationRouter = router({
  /**
   * Log an integration access event
   * Called when a partner (e.g., ImageTrend) accesses Protocol Guide
   */
  logAccess: publicProcedure
    .input(
      z.object({
        partner: z.enum(integrationPartners),
        agencyId: z.string().max(100).optional(),
        agencyName: z.string().max(255).optional(),
        searchTerm: z.string().max(500).optional(),
        userAge: z.number().int().min(0).max(150).optional(),
        impression: z.string().max(255).optional(),
        responseTimeMs: z.number().int().optional(),
        resultCount: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        console.warn("[Integration] Database not available for logging");
        return { success: true, logged: false };
      }

      try {
        // Extract IP and user agent from request context
        const ipAddress =
          ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
          ctx.req.socket.remoteAddress ||
          null;
        const userAgent = ctx.req.headers["user-agent"] || null;

        await db.insert(integrationLogs).values({
          partner: input.partner,
          agencyId: input.agencyId || null,
          agencyName: input.agencyName || null,
          searchTerm: input.searchTerm || null,
          userAge: input.userAge || null,
          impression: input.impression || null,
          responseTimeMs: input.responseTimeMs || null,
          resultCount: input.resultCount || null,
          ipAddress,
          userAgent,
        });

        return { success: true, logged: true };
      } catch (error) {
        console.error("[Integration] Failed to log access:", error);
        // Don't fail the request if logging fails
        return { success: true, logged: false };
      }
    }),

  /**
   * Get integration statistics (admin only)
   * Returns usage metrics for each integration partner
   */
  getStats: adminProcedure
    .input(
      z
        .object({
          partner: z.enum(integrationPartners).optional(),
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { stats: [], total: 0 };

      const { partner, days } = input || { days: 30 };
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      try {
        // Build conditions
        const conditions = [gte(integrationLogs.createdAt, cutoffDate)];
        if (partner) {
          conditions.push(eq(integrationLogs.partner, partner));
        }

        // Get counts by partner
        const results = await db
          .select({
            partner: integrationLogs.partner,
            count: sql<number>`COUNT(*)`,
            uniqueAgencies: sql<number>`COUNT(DISTINCT ${integrationLogs.agencyId})`,
            avgResponseTime: sql<number>`AVG(${integrationLogs.responseTimeMs})`,
          })
          .from(integrationLogs)
          .where(and(...conditions))
          .groupBy(integrationLogs.partner);

        // Get total
        const [totalResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(integrationLogs)
          .where(and(...conditions));

        return {
          stats: results.map((r) => ({
            partner: r.partner,
            accessCount: Number(r.count),
            uniqueAgencies: Number(r.uniqueAgencies),
            avgResponseTimeMs: r.avgResponseTime
              ? Math.round(Number(r.avgResponseTime))
              : null,
          })),
          total: Number(totalResult?.count || 0),
          periodDays: days,
        };
      } catch (error) {
        console.error("[Integration] Failed to get stats:", error);
        return { stats: [], total: 0, periodDays: days };
      }
    }),

  /**
   * Get recent integration access logs (admin only)
   */
  getRecentLogs: adminProcedure
    .input(
      z
        .object({
          partner: z.enum(integrationPartners).optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const { partner, limit, offset } = input || { limit: 50, offset: 0 };

      try {
        const conditions = partner
          ? [eq(integrationLogs.partner, partner)]
          : [];

        // Get logs
        let logsQuery;
        if (conditions.length > 0) {
          logsQuery = db
            .select()
            .from(integrationLogs)
            .where(and(...conditions))
            .orderBy(desc(integrationLogs.createdAt))
            .limit(limit || 50)
            .offset(offset || 0);
        } else {
          logsQuery = db
            .select()
            .from(integrationLogs)
            .orderBy(desc(integrationLogs.createdAt))
            .limit(limit || 50)
            .offset(offset || 0);
        }

        const logs = await logsQuery;

        // Get total count
        let countQuery;
        if (conditions.length > 0) {
          countQuery = db
            .select({ count: sql<number>`COUNT(*)` })
            .from(integrationLogs)
            .where(and(...conditions));
        } else {
          countQuery = db
            .select({ count: sql<number>`COUNT(*)` })
            .from(integrationLogs);
        }

        const [countResult] = await countQuery;

        return {
          logs,
          total: Number(countResult?.count || 0),
        };
      } catch (error) {
        console.error("[Integration] Failed to get logs:", error);
        return { logs: [], total: 0 };
      }
    }),

  /**
   * Get daily integration usage for charts (admin only)
   */
  getDailyUsage: adminProcedure
    .input(
      z
        .object({
          partner: z.enum(integrationPartners).optional(),
          days: z.number().int().min(1).max(90).default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { dailyUsage: [] };

      const { partner, days } = input || { days: 30 };
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      try {
        const conditions = [gte(integrationLogs.createdAt, cutoffDate)];
        if (partner) {
          conditions.push(eq(integrationLogs.partner, partner));
        }

        const results = await db
          .select({
            date: sql<string>`DATE(${integrationLogs.createdAt})`,
            partner: integrationLogs.partner,
            count: sql<number>`COUNT(*)`,
          })
          .from(integrationLogs)
          .where(and(...conditions))
          .groupBy(
            sql`DATE(${integrationLogs.createdAt})`,
            integrationLogs.partner
          )
          .orderBy(sql`DATE(${integrationLogs.createdAt})`);

        return {
          dailyUsage: results.map((r) => ({
            date: r.date,
            partner: r.partner,
            count: Number(r.count),
          })),
        };
      } catch (error) {
        console.error("[Integration] Failed to get daily usage:", error);
        return { dailyUsage: [] };
      }
    }),
});
