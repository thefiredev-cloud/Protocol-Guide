import Stripe from "stripe";
import { PRICING } from "./db";
import type { SubscriptionTier, BillingInterval } from "./lib/pricing";
import { calculateDepartmentPrice, validateSeatCount } from "./lib/pricing";

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

// Price IDs from Stripe Dashboard - set via environment variables
const PRICE_IDS = {
  // Individual/Pro subscriptions
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
  proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",

  // Department subscriptions - Starter tier (5-20 users)
  departmentStarterMonthly: process.env.STRIPE_DEPT_STARTER_MONTHLY_PRICE_ID || "",
  departmentStarterAnnual: process.env.STRIPE_DEPT_STARTER_ANNUAL_PRICE_ID || "",

  // Department subscriptions - Professional tier (20+ users)
  departmentProfessionalMonthly: process.env.STRIPE_DEPT_PROFESSIONAL_MONTHLY_PRICE_ID || "",
  departmentProfessionalAnnual: process.env.STRIPE_DEPT_PROFESSIONAL_ANNUAL_PRICE_ID || "",
};

// Trial period configuration - default 7 days, can be overridden via env var
export const TRIAL_PERIOD_DAYS = parseInt(process.env.STRIPE_TRIAL_PERIOD_DAYS || "7", 10);

export interface CreateCheckoutSessionParams {
  userId: number;
  userEmail: string;
  plan: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  userId,
  userEmail,
  plan,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." };
  }

  const priceId = plan === "monthly" ? PRICE_IDS.proMonthly : PRICE_IDS.proAnnual;
  
  if (!priceId) {
    return { error: `Price ID for ${plan} plan is not configured.` };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        plan,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          plan,
        },
        trial_period_days: TRIAL_PERIOD_DAYS,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { error: "Failed to create checkout session URL" };
    }

    return { url: session.url };
  } catch (error) {
    console.error("[Stripe] Checkout session error:", error);
    return { error: (error as Error).message || "Failed to create checkout session" };
  }
}

export interface CreateDepartmentCheckoutParams {
  agencyId: number;
  agencyEmail: string;
  tier: SubscriptionTier;
  seatCount: number;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create Stripe checkout session for department/agency subscription
 */
export async function createDepartmentCheckoutSession({
  agencyId,
  agencyEmail,
  tier,
  seatCount,
  interval,
  successUrl,
  cancelUrl,
}: CreateDepartmentCheckoutParams): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." };
  }

  // Validate seat count for tier
  const validation = validateSeatCount(tier, seatCount);
  if (!validation.valid) {
    return { error: validation.error || "Invalid seat count for tier" };
  }

  // Enterprise requires custom pricing - redirect to contact sales
  if (tier === "enterprise") {
    return { error: "Enterprise tier requires custom pricing. Please contact sales." };
  }

  // Get the appropriate price ID
  let priceId: string;
  if (tier === "starter") {
    priceId = interval === "monthly"
      ? PRICE_IDS.departmentStarterMonthly
      : PRICE_IDS.departmentStarterAnnual;
  } else if (tier === "professional") {
    priceId = interval === "monthly"
      ? PRICE_IDS.departmentProfessionalMonthly
      : PRICE_IDS.departmentProfessionalAnnual;
  } else {
    return { error: "Invalid subscription tier" };
  }

  if (!priceId) {
    return { error: `Price ID for ${tier} ${interval} plan is not configured.` };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: seatCount, // Both starter and professional tiers are per-seat
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: agencyEmail,
      client_reference_id: agencyId.toString(),
      metadata: {
        agencyId: agencyId.toString(),
        tier,
        seatCount: seatCount.toString(),
        interval,
        subscriptionType: "department",
      },
      subscription_data: {
        metadata: {
          agencyId: agencyId.toString(),
          tier,
          seatCount: seatCount.toString(),
          interval,
          subscriptionType: "department",
        },
        trial_period_days: TRIAL_PERIOD_DAYS,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { error: "Failed to create checkout session URL" };
    }

    return { url: session.url };
  } catch (error) {
    console.error("[Stripe] Department checkout session error:", error);
    return { error: (error as Error).message || "Failed to create checkout session" };
  }
}

export interface CreateCustomerPortalParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export async function createCustomerPortalSession({
  stripeCustomerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    console.error("[Stripe] Portal session failed: Stripe not configured");
    return { error: "Stripe is not configured." };
  }

  if (!stripeCustomerId) {
    console.error("[Stripe] Portal session failed: Missing customer ID");
    return { error: "Customer ID is required to create portal session" };
  }

  try {
    console.log(`[Stripe] Creating portal session for customer: ${stripeCustomerId}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      console.error("[Stripe] Portal session created but no URL returned", { sessionId: session.id });
      return { error: "Failed to create portal session URL" };
    }

    console.log(`[Stripe] Portal session created successfully: ${session.id}`);
    return { url: session.url };
  } catch (error) {
    const errorMessage = (error as Error).message || "Failed to create portal session";
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : error;

    console.error("[Stripe] Portal session error:", errorDetails);

    // Provide user-friendly error messages
    if (errorMessage.includes("No such customer")) {
      return { error: "Customer not found in Stripe. Please contact support." };
    }

    return { error: errorMessage };
  }
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice;
  };
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): WebhookEvent | { error: string } {
  if (!stripe) {
    return { error: "Stripe is not configured." };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { error: "Webhook secret is not configured." };
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event as WebhookEvent;
  } catch (error) {
    console.error("[Stripe] Webhook verification error:", error);
    return { error: (error as Error).message || "Webhook verification failed" };
  }
}

export async function getSubscription(subscriptionId: string) {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error("[Stripe] Get subscription error:", error);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) {
    return { error: "Stripe is not configured." };
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return { subscription };
  } catch (error) {
    console.error("[Stripe] Cancel subscription error:", error);
    return { error: (error as Error).message || "Failed to cancel subscription" };
  }
}

/**
 * Downgrade a user to free tier
 * - Cancels their Stripe subscription immediately
 * - Updates user record to free tier
 * - Clears subscription details
 * Can be called from webhooks (disputes) or admin actions
 */
export async function downgradeToFree(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Import db functions to avoid circular dependency
    const db = await import("./db.js");

    // Get user
    const user = await db.getUserById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Cancel Stripe subscription if exists
    if (user.subscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(user.subscriptionId);
        console.log(`[Stripe] Cancelled subscription ${user.subscriptionId} for user ${userId}`);
      } catch (error) {
        console.error(`[Stripe] Failed to cancel subscription for user ${userId}:`, error);
        // Continue with downgrade even if Stripe call fails
      }
    }

    // Update user to free tier and clear subscription details in a single atomic operation
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { users } = await import("../drizzle/schema.js");
      const { eq } = await import("drizzle-orm");

      await dbInstance.update(users).set({
        tier: "free",
        subscriptionId: null,
        subscriptionStatus: "canceled",
        subscriptionEndDate: null,
      }).where(eq(users.id, userId));
    }

    console.log(`[Stripe] User ${userId} downgraded to free tier`);
    return { success: true };
  } catch (error) {
    console.error(`[Stripe] Downgrade to free failed for user ${userId}:`, error);
    return { success: false, error: (error as Error).message || "Failed to downgrade user" };
  }
}

export { stripe };
