/**
 * Stripe Webhook Handler Tests
 *
 * Comprehensive tests for server/webhooks/stripe.ts
 * Tests webhook signature verification, idempotency, and all event handlers
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import type Stripe from "stripe";

// Import mocked modules and handler
import { constructWebhookEvent } from "../server/stripe";
import * as db from "../server/db";
import { handleStripeWebhook } from "../server/webhooks/stripe";

// Mock constructWebhookEvent from stripe module
vi.mock("../server/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));

// Mock database functions
vi.mock("../server/db", () => ({
  getDb: vi.fn(),
  getUserByStripeCustomerId: vi.fn(),
  updateUserStripeCustomerId: vi.fn(),
  updateUserTier: vi.fn(),
}));

// Helper to create mock Request/Response
function createMockRequest(body: unknown, signature?: string): Partial<Request> {
  return {
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  };
}

function createMockResponse(): Partial<Response> & {
  statusCode: number;
  jsonData: unknown;
} {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockImplementation((data) => {
      res.jsonData = data;
      return res;
    }),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  return res;
}

describe("Stripe Webhook Handler - Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when signature is missing", async () => {
    const req = createMockRequest({ type: "test.event" });
    const res = createMockResponse();

    await handleStripeWebhook(req as Request, res as Response);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Missing signature" });
  });

  it("returns 400 when signature is not a string", async () => {
    const req = createMockRequest({ type: "test.event" });
    req.headers = { "stripe-signature": ["invalid", "array"] as any };
    const res = createMockResponse();

    await handleStripeWebhook(req as Request, res as Response);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Missing signature" });
  });

  it("returns 400 when webhook event construction fails", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    vi.mocked(constructWebhookEvent).mockReturnValue({
      error: "Invalid signature",
    });

    await handleStripeWebhook(req as Request, res as Response);

    expect(constructWebhookEvent).toHaveBeenCalledWith("raw body", "sig_test_123");
    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid signature" });
  });

  it("successfully verifies valid webhook signature", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_test_123",
      type: "unknown.event",
      data: { object: {} },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getDb).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(constructWebhookEvent).toHaveBeenCalledWith("raw body", "sig_test_123");
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });
  });
});

describe("Stripe Webhook Handler - Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes new event successfully", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_new_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_123",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    const mockDb = {
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null), // No existing event
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 1,
      email: "test@example.com",
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(mockDb.query.stripeWebhookEvents.findFirst).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });
  });

  it("skips duplicate event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_duplicate_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_123",
          status: "active",
        },
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    const existingEvent = {
      id: 1,
      eventId: "evt_duplicate_123",
      eventType: "customer.subscription.created",
      processedAt: new Date(),
    };

    const mockDb = {
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(existingEvent),
        },
      },
      insert: vi.fn(),
    };

    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(mockDb.query.stripeWebhookEvents.findFirst).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({
      received: true,
      skipped: true,
      reason: "Already processed",
    });
  });

  it("handles event without ID", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      type: "test.event",
      data: { object: {} },
      // No id property
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getDb).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });
  });
});

describe("Stripe Webhook Handler - checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles checkout completion with client_reference_id", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_checkout_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: "42",
          customer: "cus_test_456",
          metadata: {},
        } as Stripe.Checkout.Session,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.updateUserStripeCustomerId).mockResolvedValue(undefined);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserStripeCustomerId).toHaveBeenCalledWith(42, "cus_test_456");
    expect(db.updateUserTier).toHaveBeenCalledWith(42, "pro");
    expect(res.statusCode).toBe(200);
  });

  it("handles checkout completion with metadata userId", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_checkout_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: null,
          customer: "cus_test_456",
          metadata: { userId: "99" },
        } as Stripe.Checkout.Session,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.updateUserStripeCustomerId).mockResolvedValue(undefined);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserStripeCustomerId).toHaveBeenCalledWith(99, "cus_test_456");
    expect(db.updateUserTier).toHaveBeenCalledWith(99, "pro");
    expect(res.statusCode).toBe(200);
  });

  it("handles checkout completion without userId", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_checkout_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: null,
          customer: "cus_test_456",
          metadata: {},
        } as Stripe.Checkout.Session,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] No userId in checkout session"
    );
    expect(db.updateUserStripeCustomerId).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    consoleErrorSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - customer.subscription.created", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles subscription created for active status", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        } as any,
      },
    };

    const mockUser = {
      id: 10,
      email: "test@example.com",
      tier: "free",
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(mockUser as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.getUserByStripeCustomerId).toHaveBeenCalledWith("cus_test_456");
    expect(db.updateUserTier).toHaveBeenCalledWith(10, "pro");
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription created for trialing status", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "trialing",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 10,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(10, "pro");
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - customer.subscription.updated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("upgrades user to pro when subscription becomes active", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_updated_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 20,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(20, "pro");
    expect(res.statusCode).toBe(200);
  });

  it("downgrades user to free when subscription becomes inactive", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_updated_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "past_due",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 20,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(20, "free");
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription updated when user not found", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_sub_updated_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_nonexistent",
          status: "active",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] No user found for customer cus_nonexistent"
    );
    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    consoleErrorSpy.mockRestore();
  });

  it("updates subscription details in database", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const mockEvent = {
      id: "evt_sub_updated_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
          current_period_end: periodEnd,
        } as any,
      },
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 20,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(mockDb.update).toHaveBeenCalled();
    const setCall = mockDb.update().set;
    expect(setCall).toHaveBeenCalledWith({
      subscriptionId: "sub_test_123",
      subscriptionStatus: "active",
      subscriptionEndDate: new Date(periodEnd * 1000),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - customer.subscription.deleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("downgrades user to free tier", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_deleted_123",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "canceled",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 30,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(30, "free");
    expect(res.statusCode).toBe(200);
  });

  it("clears subscription details in database", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_deleted_123",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "canceled",
        } as any,
      },
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 30,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(mockDb.update).toHaveBeenCalled();
    const setCall = mockDb.update().set;
    expect(setCall).toHaveBeenCalledWith({
      subscriptionId: null,
      subscriptionStatus: "canceled",
      subscriptionEndDate: null,
    });
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription deleted when user not found", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_sub_deleted_123",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_nonexistent",
          status: "canceled",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] No user found for customer cus_nonexistent"
    );
    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    consoleErrorSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - invoice.payment_succeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("ensures user is on pro tier", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_invoice_123",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_test_123",
          customer: "cus_test_456",
          status: "paid",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 40,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(40, "pro");
    expect(res.statusCode).toBe(200);
  });

  it("does not update tier if user already on pro", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_invoice_123",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_test_123",
          customer: "cus_test_456",
          status: "paid",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 40,
      tier: "pro",
    } as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("handles payment succeeded when user not found", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_invoice_123",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_test_123",
          customer: "cus_nonexistent",
          status: "paid",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - invoice.payment_failed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("logs payment failure but does not downgrade user", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_failed_123",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test_123",
          customer: "cus_test_456",
          status: "open",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 50,
      tier: "pro",
    } as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] Payment failed for user 50"
    );
    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles payment failed when user not found", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_invoice_failed_123",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test_123",
          customer: "cus_nonexistent",
          status: "open",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - Unhandled Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("logs unhandled event types", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_unknown_123",
      type: "payment_intent.created",
      data: { object: {} },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] Unhandled event type: payment_intent.created"
    );
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });

    consoleLogSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("returns 500 when handler throws error", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_error_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockRejectedValue(
      new Error("Database connection failed")
    );

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] Handler error:",
      expect.any(Error)
    );
    expect(res.statusCode).toBe(500);
    expect(res.jsonData).toEqual({ error: "Webhook handler failed" });

    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when database insert fails during idempotency check", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_insert_error_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
        } as any,
      },
    };

    const mockDb = {
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error("Insert failed")),
      }),
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] Handler error:",
      expect.any(Error)
    );
    expect(res.statusCode).toBe(500);
    expect(res.jsonData).toEqual({ error: "Webhook handler failed" });

    consoleErrorSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - Console Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("logs received event with ID", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_log_test_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_456",
          status: "active",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 1,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Stripe Webhook] Received event: customer.subscription.created (ID: evt_log_test_123)"
    );

    consoleLogSpy.mockRestore();
  });
});
