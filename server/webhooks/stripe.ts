import type { Request, Response } from "express";
import Stripe from "stripe";
import { constructWebhookEvent } from "../stripe";
import * as db from "../db";
import { users, stripeWebhookEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Stripe webhook handler for subscription events
 * 
 * This handler processes the following events:
 * - checkout.session.completed: When a user completes checkout
 * - customer.subscription.created: When a subscription is created
 * - customer.subscription.updated: When a subscription is updated (upgrade/downgrade)
 * - customer.subscription.deleted: When a subscription is cancelled
 * - invoice.payment_succeeded: When a payment succeeds
 * - invoice.payment_failed: When a payment fails
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  
  if (!signature || typeof signature !== "string") {
    console.error("[Stripe Webhook] Missing signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  // Get raw body for signature verification
  const rawBody = req.body;
  
  const event = constructWebhookEvent(rawBody, signature);
  
  if ("error" in event) {
    console.error("[Stripe Webhook] Verification failed:", event.error);
    return res.status(400).json({ error: event.error });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Handler error:", error);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error("[Stripe Webhook] No userId in checkout session");
    return;
  }

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}`);

  // Update user with Stripe customer ID
  await db.updateUserStripeCustomerId(parseInt(userId), customerId);
  
  // Update user tier to pro
  await db.updateUserTier(parseInt(userId), "pro");
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await db.getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(`[Stripe Webhook] No user found for customer ${customerId}`);
    return;
  }

  console.log(`[Stripe Webhook] Subscription updated for user ${user.id}: ${subscription.status}`);

  // Determine tier based on subscription status
  const isActive = ["active", "trialing"].includes(subscription.status);
  const tier = isActive ? "pro" : "free";

  await db.updateUserTier(user.id, tier);
  
  // Update subscription details in database
  const dbInstance = await db.getDb();
  if (dbInstance) {
    // Get period end from subscription items
    const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
    
    await dbInstance.update(users).set({
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionEndDate: periodEnd 
        ? new Date(periodEnd * 1000)
        : null,
    }).where(eq(users.id, user.id));
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await db.getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(`[Stripe Webhook] No user found for customer ${customerId}`);
    return;
  }

  console.log(`[Stripe Webhook] Subscription deleted for user ${user.id}`);

  // Downgrade to free tier
  await db.updateUserTier(user.id, "free");
  
  // Clear subscription details
  const dbInstance = await db.getDb();
  if (dbInstance) {
    await dbInstance.update(users).set({
      subscriptionId: null,
      subscriptionStatus: "canceled",
      subscriptionEndDate: null,
    }).where(eq(users.id, user.id));
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await db.getUserByStripeCustomerId(customerId);

  if (!user) {
    return; // Might be a new customer, handled by checkout.session.completed
  }

  console.log(`[Stripe Webhook] Payment succeeded for user ${user.id}`);
  
  // Ensure user is on pro tier
  if (user.tier !== "pro") {
    await db.updateUserTier(user.id, "pro");
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await db.getUserByStripeCustomerId(customerId);

  if (!user) {
    return;
  }

  console.log(`[Stripe Webhook] Payment failed for user ${user.id}`);
  
  // Note: We don't immediately downgrade on payment failure
  // Stripe will retry and eventually cancel the subscription if payments continue to fail
  // The subscription.deleted event will handle the downgrade
}
