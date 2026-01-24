/**
 * Subscription Router
 * Handles Stripe subscription and payment operations
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserTierInfo } from "../_core/tier-validation";
import * as db from "../db";
import * as stripe from "../stripe";

export const subscriptionRouter = router({
  // Create checkout session for subscription
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(["monthly", "annual"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await stripe.createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        plan: input.plan,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      if ('error' in result) {
        return { success: false, error: result.error, url: null };
      }

      return { success: true, error: null, url: result.url };
    }),

  // Create customer portal session for managing subscription
  createPortal: protectedProcedure
    .input(z.object({
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.stripeCustomerId) {
        return { success: false, error: "No subscription found", url: null };
      }

      const result = await stripe.createCustomerPortalSession({
        stripeCustomerId: ctx.user.stripeCustomerId,
        returnUrl: input.returnUrl,
      });

      if ('error' in result) {
        return { success: false, error: result.error, url: null };
      }

      return { success: true, error: null, url: result.url };
    }),

  // Get current subscription status with tier features
  status: protectedProcedure.query(async ({ ctx }) => {
    const tierInfo = await getUserTierInfo(ctx.user.id);
    return tierInfo;
  }),

  // Create department/agency checkout session
  createDepartmentCheckout: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      tier: z.enum(["starter", "professional", "enterprise"]),
      seatCount: z.number().min(1).max(1000),
      interval: z.enum(["monthly", "annual"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has permission to manage this agency
      const isAdmin = await db.isUserAgencyAdmin(ctx.user.id, input.agencyId);
      if (!isAdmin) {
        return { success: false, error: "Not authorized to manage this agency", url: null };
      }

      // Get agency details
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        return { success: false, error: "Database connection failed", url: null };
      }

      const { agencies } = await import("../../drizzle/schema.js");
      const { eq } = await import("drizzle-orm");

      const [agency] = await dbInstance.select().from(agencies)
        .where(eq(agencies.id, input.agencyId))
        .limit(1);

      if (!agency) {
        return { success: false, error: "Agency not found", url: null };
      }

      const result = await stripe.createDepartmentCheckoutSession({
        agencyId: input.agencyId,
        agencyEmail: agency.contactEmail || ctx.user.email || "",
        tier: input.tier,
        seatCount: input.seatCount,
        interval: input.interval,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      if ('error' in result) {
        return { success: false, error: result.error, url: null };
      }

      return { success: true, error: null, url: result.url };
    }),
});

export type SubscriptionRouter = typeof subscriptionRouter;
