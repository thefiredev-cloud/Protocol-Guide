import Stripe from "stripe";
import { PRICING } from "./db";

// Initialize Stripe with secret key from environment
// Using stable API version 2024-12-18 (latest stable as of Jan 2025)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

// Price IDs from Stripe Dashboard - set via environment variables
const PRICE_IDS = {
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
  proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
};

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

export interface CreateCustomerPortalParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export async function createCustomerPortalSession({
  stripeCustomerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<{ url: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe is not configured." };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error("[Stripe] Portal session error:", error);
    return { error: (error as Error).message || "Failed to create portal session" };
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

export { stripe };
