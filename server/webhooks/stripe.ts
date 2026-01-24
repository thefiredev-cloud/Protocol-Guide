import type { Request, Response } from "express";
import Stripe from "stripe";
import { constructWebhookEvent } from "../stripe";
import * as db from "../db";
import { users, stripeWebhookEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendTierUpgradeEmail, sendCancellationEmail } from "../_core/email";

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

  console.log(`[Stripe Webhook] Received event: ${event.type} (ID: ${(event as any).id})`);

  try {
    // Idempotency check: prevent processing duplicate events
    const eventId = (event as any).id;
    if (eventId) {
      const dbInstance = await db.getDb();
      if (dbInstance) {
        // Check if event already processed
        const existingEvent = await dbInstance.query.stripeWebhookEvents.findFirst({
          where: eq(stripeWebhookEvents.eventId, eventId),
        });

        if (existingEvent) {
          console.log(`[Stripe Webhook] Event ${eventId} already processed at ${existingEvent.processedAt}, skipping`);
          return res.status(200).json({ received: true, skipped: true, reason: "Already processed" });
        }

        // Mark event as processed BEFORE handling to prevent race conditions
        await dbInstance.insert(stripeWebhookEvents).values({
          eventId,
          eventType: event.type,
          payload: event.data.object,
        });
        console.log(`[Stripe Webhook] Marked event ${eventId} as processed`);
      }
    }

    // Process the event
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

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(dispute);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Handler error:", error);
    // Return 500 so Stripe retries the webhook
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;

  // Check if this is a department/agency subscription
  const subscriptionType = session.metadata?.subscriptionType;

  if (subscriptionType === "department") {
    await handleDepartmentCheckoutCompleted(session, customerId);
    return;
  }

  // Individual subscription
  const userId = session.client_reference_id || session.metadata?.userId;

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

async function handleDepartmentCheckoutCompleted(
  session: Stripe.Checkout.Session,
  customerId: string
) {
  const agencyId = session.metadata?.agencyId;
  const tier = session.metadata?.tier as "starter" | "professional" | "enterprise" | undefined;
  const seatCount = session.metadata?.seatCount;

  if (!agencyId) {
    console.error("[Stripe Webhook] No agencyId in department checkout session");
    return;
  }

  console.log(`[Stripe Webhook] Department checkout completed for agency ${agencyId}`);

  const dbInstance = await db.getDb();
  if (!dbInstance) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const { agencies } = await import("../../drizzle/schema.js");
  const { eq } = await import("drizzle-orm");

  // Update agency with Stripe customer ID and subscription tier
  await dbInstance.update(agencies).set({
    stripeCustomerId: customerId,
    subscriptionTier: tier || "starter",
    subscriptionStatus: "active",
  }).where(eq(agencies.id, parseInt(agencyId)));

  console.log(`[Stripe Webhook] Updated agency ${agencyId} with customer ${customerId}, tier: ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionType = subscription.metadata?.subscriptionType;

  // Check if this is a department/agency subscription
  if (subscriptionType === "department") {
    await handleDepartmentSubscriptionUpdated(subscription, customerId);
    return;
  }

  // Individual user subscription
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

async function handleDepartmentSubscriptionUpdated(
  subscription: Stripe.Subscription,
  customerId: string
) {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const { agencies } = await import("../../drizzle/schema.js");
  const { eq } = await import("drizzle-orm");

  // Find agency by Stripe customer ID
  const [agency] = await dbInstance.select().from(agencies)
    .where(eq(agencies.stripeCustomerId, customerId))
    .limit(1);

  if (!agency) {
    console.error(`[Stripe Webhook] No agency found for customer ${customerId}`);
    return;
  }

  console.log(`[Stripe Webhook] Department subscription updated for agency ${agency.id}: ${subscription.status}`);

  // Update agency subscription status
  await dbInstance.update(agencies).set({
    subscriptionStatus: subscription.status,
  }).where(eq(agencies.id, agency.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionType = subscription.metadata?.subscriptionType;

  // Check if this is a department/agency subscription
  if (subscriptionType === "department") {
    await handleDepartmentSubscriptionDeleted(subscription, customerId);
    return;
  }

  // Individual user subscription
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

async function handleDepartmentSubscriptionDeleted(
  subscription: Stripe.Subscription,
  customerId: string
) {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const { agencies } = await import("../../drizzle/schema.js");
  const { eq } = await import("drizzle-orm");

  // Find agency by Stripe customer ID
  const [agency] = await dbInstance.select().from(agencies)
    .where(eq(agencies.stripeCustomerId, customerId))
    .limit(1);

  if (!agency) {
    console.error(`[Stripe Webhook] No agency found for customer ${customerId}`);
    return;
  }

  console.log(`[Stripe Webhook] Department subscription deleted for agency ${agency.id}`);

  // Downgrade to starter tier and mark as canceled
  await dbInstance.update(agencies).set({
    subscriptionTier: "starter",
    subscriptionStatus: "canceled",
  }).where(eq(agencies.id, agency.id));
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

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = dispute.charge as string;

  // Safely extract customer ID - charge can be string or expanded object
  let customerId: string | null = null;
  if (dispute.charge && typeof dispute.charge === 'object') {
    customerId = dispute.charge.customer as string;
  } else if (typeof dispute.charge === 'string') {
    // Charge is not expanded - try to get customer from metadata or payment_intent
    if (dispute.payment_intent && typeof dispute.payment_intent === 'object') {
      customerId = (dispute.payment_intent as any).customer as string;
    } else {
      console.warn('[Stripe Webhook] Dispute charge not expanded, cannot get customer ID directly');
    }
  }

  console.log(`[Stripe Webhook] Dispute created: ${dispute.id} for charge ${chargeId}`);
  console.log(`[Stripe Webhook] Dispute reason: ${dispute.reason}, status: ${dispute.status}`);

  if (customerId) {
    const user = await db.getUserByStripeCustomerId(customerId);
    if (user) {
      console.log(`[Stripe Webhook] Dispute affects user ${user.id}`);

      // Optionally downgrade user immediately on dispute
      // This is configurable - some businesses may want to wait for dispute resolution
      const DOWNGRADE_ON_DISPUTE = process.env.STRIPE_DOWNGRADE_ON_DISPUTE === "true";

      if (DOWNGRADE_ON_DISPUTE) {
        console.log(`[Stripe Webhook] Downgrading user ${user.id} due to dispute`);
        const { downgradeToFree } = await import("../stripe.js");
        await downgradeToFree(user.id);
      }
    }
  }
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  console.log(`[Stripe Webhook] Dispute closed: ${dispute.id}, status: ${dispute.status}`);

  if (dispute.status === "lost") {
    console.log(`[Stripe Webhook] Dispute lost - funds returned to customer`);

    // Safely extract customer ID - charge can be string or expanded object
    let customerId: string | null = null;
    if (dispute.charge && typeof dispute.charge === 'object') {
      customerId = dispute.charge.customer as string;
    } else if (typeof dispute.charge === 'string') {
      // Charge is not expanded - try to get customer from metadata or payment_intent
      if (dispute.payment_intent && typeof dispute.payment_intent === 'object') {
        customerId = (dispute.payment_intent as any).customer as string;
      } else {
        console.warn('[Stripe Webhook] Dispute charge not expanded, cannot get customer ID directly');
      }
    }

    // Always downgrade user when dispute is lost, regardless of DOWNGRADE_ON_DISPUTE setting
    if (customerId) {
      const user = await db.getUserByStripeCustomerId(customerId);
      if (user) {
        console.log(`[Stripe Webhook] Downgrading user ${user.id} due to lost dispute`);
        const { downgradeToFree } = await import("../stripe.js");
        await downgradeToFree(user.id);
      }
    }
  } else if (dispute.status === "won") {
    console.log(`[Stripe Webhook] Dispute won - funds retained`);
  } else if (dispute.status === "warning_closed") {
    console.log(`[Stripe Webhook] Dispute warning closed`);
  }

  // Log outcome for record-keeping
  // Could also notify admins or update user records here
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  const customerId = customer.id;
  const user = await db.getUserByStripeCustomerId(customerId);

  if (!user) {
    console.log(`[Stripe Webhook] Customer deleted but no user found: ${customerId}`);
    return;
  }

  console.log(`[Stripe Webhook] Customer deleted for user ${user.id}, cleaning up`);

  // Clean up user's Stripe data
  const dbInstance = await db.getDb();
  if (dbInstance) {
    await dbInstance.update(users).set({
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      subscriptionEndDate: null,
      tier: "free",
    }).where(eq(users.id, user.id));
  }

  console.log(`[Stripe Webhook] Cleaned up Stripe data for user ${user.id}`);
}
