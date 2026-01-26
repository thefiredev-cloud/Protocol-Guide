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

// Mock database functions with all required exports
vi.mock("../server/db", () => ({
  getDb: vi.fn(),
  getUserByStripeCustomerId: vi.fn().mockImplementation((customerId: string) => {
    // Return a mock user based on customer ID
    if (customerId === "cus_test_456") {
      return Promise.resolve({
        id: 10,
        email: "test@example.com",
        tier: "free",
        stripeCustomerId: customerId,
      });
    }
    return Promise.resolve(null);
  }),
  updateUserStripeCustomerId: vi.fn().mockResolvedValue(undefined),
  updateUserTier: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockImplementation((id: number) => {
    // Return a mock user that matches the requested ID
    return Promise.resolve({
      id: id,
      email: `user${id}@example.com`,
      tier: "free",
      stripeCustomerId: null,
    });
  }),
  getUserUsage: vi.fn().mockResolvedValue({ tier: "free", count: 0, limit: 10 }),
  canUserQuery: vi.fn().mockResolvedValue(true),
  TIER_CONFIG: {
    free: { queriesPerDay: 10, bookmarkLimit: 10, offlineAccess: false },
    pro: { queriesPerDay: 100, bookmarkLimit: 100, offlineAccess: true },
    enterprise: { queriesPerDay: -1, bookmarkLimit: -1, offlineAccess: true },
  },
  PRICING: { monthly: 9.99, annual: 99.99 },
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
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null),
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
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null),
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
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null),
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

describe("Stripe Webhook Handler - Dispute Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles charge.dispute.created event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_dispute_123",
      type: "charge.dispute.created",
      data: {
        object: {
          id: "dp_test_123",
          charge: "ch_test_123",
          reason: "fraudulent",
          status: "needs_response",
          payment_intent: null,
        } as Stripe.Dispute,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Dispute created")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dispute reason: fraudulent")
    );
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });

    consoleLogSpy.mockRestore();
  });

  it("handles charge.dispute.created with customer info", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_dispute_456",
      type: "charge.dispute.created",
      data: {
        object: {
          id: "dp_test_456",
          charge: "ch_test_456",
          reason: "fraudulent",
          status: "needs_response",
          payment_intent: {
            customer: "cus_test_123",
          },
        } as Stripe.Dispute,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 1,
      tier: "pro",
      subscriptionId: "sub_test_123",
    } as any);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await handleStripeWebhook(req as Request, res as Response);

    // Verify webhook was handled successfully
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });

    // Verify logging occurred
    expect(consoleLogSpy).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it("handles charge.dispute.closed - won", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_dispute_789",
      type: "charge.dispute.closed",
      data: {
        object: {
          id: "dp_test_789",
          charge: "ch_test_789",
          reason: "fraudulent",
          status: "won",
        } as Stripe.Dispute,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Dispute closed")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dispute won - funds retained")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles charge.dispute.closed - lost", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_dispute_lost",
      type: "charge.dispute.closed",
      data: {
        object: {
          id: "dp_test_lost",
          charge: "ch_test_lost",
          reason: "fraudulent",
          status: "lost",
        } as Stripe.Dispute,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dispute lost - funds returned to customer")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles charge.dispute.closed - warning_closed", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_dispute_warning",
      type: "charge.dispute.closed",
      data: {
        object: {
          id: "dp_test_warning",
          charge: "ch_test_warning",
          reason: "general",
          status: "warning_closed",
        } as Stripe.Dispute,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dispute warning closed")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - Customer Deleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles customer.deleted event when user not found", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_customer_not_found",
      type: "customer.deleted",
      data: {
        object: {
          id: "cus_unknown_123",
          email: "unknown@example.com",
        } as Stripe.Customer,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(undefined);
    vi.mocked(db.getDb).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    // Verify webhook was handled successfully even when user not found
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ received: true });

    consoleLogSpy.mockRestore();
  });

  it("recognizes customer.deleted event type", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_customer_deleted_2",
      type: "customer.deleted",
      data: {
        object: {
          id: "cus_test_456",
          email: "test@example.com",
        } as Stripe.Customer,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    // Should not log as unhandled event type
    const unhandledLogs = consoleLogSpy.mock.calls.filter(call =>
      call[0]?.includes?.("Unhandled event type")
    );
    expect(unhandledLogs.length).toBe(0);

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("cleans up all stripe data when customer is deleted", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_customer_deleted_cleanup",
      type: "customer.deleted",
      data: {
        object: {
          id: "cus_test_cleanup",
          email: "cleanup@example.com",
        } as Stripe.Customer,
      },
    };

    const mockDb = {
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockResolvedValue(null),
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

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 999,
      tier: "pro",
      stripeCustomerId: "cus_test_cleanup",
      subscriptionId: "sub_to_clean",
    } as any);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(mockDb.update).toHaveBeenCalled();
    const setCall = mockDb.update().set;
    expect(setCall).toHaveBeenCalledWith({
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null,
      subscriptionEndDate: null,
      tier: "free",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - Additional Invoice Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles invoice.created event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_created",
      type: "invoice.created",
      data: {
        object: {
          id: "in_test_new",
          customer: "cus_test_456",
          status: "draft",
          amount_due: 2999,
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    // Should be handled as unhandled event (no specific handler)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: invoice.created")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles invoice.finalized event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_finalized",
      type: "invoice.finalized",
      data: {
        object: {
          id: "in_test_final",
          customer: "cus_test_456",
          status: "open",
          amount_due: 2999,
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: invoice.finalized")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles invoice.voided event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_voided",
      type: "invoice.voided",
      data: {
        object: {
          id: "in_test_void",
          customer: "cus_test_456",
          status: "void",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: invoice.voided")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles invoice.updated event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_updated",
      type: "invoice.updated",
      data: {
        object: {
          id: "in_test_update",
          customer: "cus_test_456",
          status: "open",
          amount_due: 3499,
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: invoice.updated")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles invoice.payment_action_required event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_invoice_action_required",
      type: "invoice.payment_action_required",
      data: {
        object: {
          id: "in_test_action",
          customer: "cus_test_456",
          status: "open",
          payment_intent: "pi_test_123",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: invoice.payment_action_required")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });
});

describe("Stripe Webhook Handler - Subscription Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles subscription with incomplete status", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_incomplete",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_incomplete",
          customer: "cus_test_456",
          status: "incomplete",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 100,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    // Incomplete should downgrade to free
    expect(db.updateUserTier).toHaveBeenCalledWith(100, "free");
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription with incomplete_expired status", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_incomplete_expired",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_incomplete_expired",
          customer: "cus_test_456",
          status: "incomplete_expired",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 101,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(101, "free");
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription with unpaid status", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_unpaid",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_unpaid",
          customer: "cus_test_456",
          status: "unpaid",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 102,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(102, "free");
    expect(res.statusCode).toBe(200);
  });

  it("handles subscription with canceled status via update event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_canceled_update",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_canceled",
          customer: "cus_test_456",
          status: "canceled",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 103,
      tier: "pro",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(103, "free");
    expect(res.statusCode).toBe(200);
  });

  it("maintains pro tier for trialing subscription", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sub_trialing",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_trial",
          customer: "cus_test_456",
          status: "trialing",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 104,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(db.updateUserTier).toHaveBeenCalledWith(104, "pro");
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - Signature Verification Mocking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies webhook signature with correct secret", async () => {
    const req = createMockRequest("raw body", "whsec_valid_signature");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_sig_valid",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_sig",
          customer: "cus_test_sig",
          status: "active",
        } as any,
      },
    };

    // Mock successful signature verification
    vi.mocked(constructWebhookEvent).mockImplementation((payload, signature) => {
      // Simulate Stripe signature verification logic
      if (signature.startsWith("whsec_valid")) {
        return mockEvent as any;
      }
      return { error: "Invalid signature" };
    });

    vi.mocked(db.getDb).mockResolvedValue(null);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 1,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    await handleStripeWebhook(req as Request, res as Response);

    expect(constructWebhookEvent).toHaveBeenCalledWith("raw body", "whsec_valid_signature");
    expect(res.statusCode).toBe(200);
  });

  it("rejects webhook with invalid signature format", async () => {
    const req = createMockRequest("raw body", "invalid_signature_format");
    const res = createMockResponse();

    vi.mocked(constructWebhookEvent).mockImplementation((payload, signature) => {
      if (!signature.startsWith("whsec_")) {
        return { error: "Invalid signature format" };
      }
      return {} as any;
    });

    await handleStripeWebhook(req as Request, res as Response);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Invalid signature format" });
  });

  it("rejects webhook with expired timestamp", async () => {
    const req = createMockRequest("raw body", "whsec_expired_timestamp");
    const res = createMockResponse();

    vi.mocked(constructWebhookEvent).mockImplementation((payload, signature) => {
      if (signature.includes("expired")) {
        return { error: "Timestamp outside the tolerance zone" };
      }
      return {} as any;
    });

    await handleStripeWebhook(req as Request, res as Response);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData).toEqual({ error: "Timestamp outside the tolerance zone" });
  });

  it("handles webhook signature verification with different payload types", async () => {
    const bufferPayload = Buffer.from("raw body");
    const req = createMockRequest(bufferPayload, "whsec_valid");
    const res = createMockResponse();

    const mockEvent = {
      id: "evt_buffer",
      type: "test.event",
      data: { object: {} },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getDb).mockResolvedValue(null);

    await handleStripeWebhook(req as Request, res as Response);

    expect(constructWebhookEvent).toHaveBeenCalledWith(bufferPayload, "whsec_valid");
    expect(res.statusCode).toBe(200);
  });
});

describe("Stripe Webhook Handler - Race Condition & Concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents duplicate processing with concurrent requests", async () => {
    const req1 = createMockRequest("raw body", "sig_concurrent_1");
    const req2 = createMockRequest("raw body", "sig_concurrent_2");
    const res1 = createMockResponse();
    const res2 = createMockResponse();

    const mockEvent = {
      id: "evt_concurrent_123",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_concurrent",
          customer: "cus_concurrent",
          status: "active",
        } as any,
      },
    };

    let insertCallCount = 0;
    const mockDb = {
      query: {
        stripeWebhookEvents: {
          findFirst: vi.fn().mockImplementation(async () => {
            // First request finds nothing
            if (insertCallCount === 0) {
              return null;
            }
            // Second request finds the event inserted by first request
            return {
              id: 1,
              eventId: "evt_concurrent_123",
              eventType: "customer.subscription.created",
              processedAt: new Date(),
            };
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation(async () => {
          insertCallCount++;
          return undefined;
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getUserByStripeCustomerId).mockResolvedValue({
      id: 1,
      tier: "free",
    } as any);
    vi.mocked(db.updateUserTier).mockResolvedValue(undefined);

    // Process both requests
    await handleStripeWebhook(req1 as Request, res1 as Response);
    await handleStripeWebhook(req2 as Request, res2 as Response);

    // First should succeed
    expect(res1.statusCode).toBe(200);
    expect(res1.jsonData).toEqual({ received: true });

    // Second should be skipped
    expect(res2.statusCode).toBe(200);
    expect(res2.jsonData).toEqual({
      received: true,
      skipped: true,
      reason: "Already processed",
    });

    // Insert should only be called once
    expect(insertCallCount).toBe(1);
  });
});

describe("Stripe Webhook Handler - Payment Method Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(null);
  });

  it("handles payment_method.attached event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_pm_attached",
      type: "payment_method.attached",
      data: {
        object: {
          id: "pm_test_123",
          customer: "cus_test_456",
          type: "card",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: payment_method.attached")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });

  it("handles payment_method.detached event", async () => {
    const req = createMockRequest("raw body", "sig_test_123");
    const res = createMockResponse();

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockEvent = {
      id: "evt_pm_detached",
      type: "payment_method.detached",
      data: {
        object: {
          id: "pm_test_456",
          customer: null,
          type: "card",
        } as any,
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    await handleStripeWebhook(req as Request, res as Response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe Webhook] Unhandled event type: payment_method.detached")
    );
    expect(res.statusCode).toBe(200);

    consoleLogSpy.mockRestore();
  });
});
