/**
 * Subscription State Database Integration Tests
 *
 * Tests subscription lifecycle and state transitions
 * Uses transaction rollback for isolation
 *
 * SETUP: Requires DATABASE_URL in .env
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '../../drizzle/schema';
import {
  withTestTransaction,
  createTestUser,
  verifyDatabaseConnection,
  closeTestPool,
} from './db-test-utils';

// Skip integration tests when database is not available
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Subscription State Integration Tests', () => {
  beforeAll(async () => {
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed - check DATABASE_URL');
    }
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Free to Pro Upgrade', () => {
    it('should upgrade user from free to pro tier', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        expect(user.tier).toBe('free');
        expect(user.stripeCustomerId).toBeNull();

        // Simulate subscription creation
        await db
          .update(users)
          .set({
            tier: 'pro',
            stripeCustomerId: 'cus_test_123',
            subscriptionId: 'sub_test_123',
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date('2025-12-31').toISOString(),
          })
          .where(eq(users.id, user.id));

        // Verify upgrade
        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.tier).toBe('pro');
        expect(updated.stripeCustomerId).toBe('cus_test_123');
        expect(updated.subscriptionId).toBe('sub_test_123');
        expect(updated.subscriptionStatus).toBe('active');
        expect(updated.subscriptionEndDate).toBeTruthy();
      });
    });

    it('should upgrade user to enterprise tier', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        await db
          .update(users)
          .set({
            tier: 'enterprise',
            stripeCustomerId: 'cus_enterprise_123',
            subscriptionId: 'sub_enterprise_123',
            subscriptionStatus: 'active',
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.tier).toBe('enterprise');
      });
    });
  });

  describe('Subscription Status Changes', () => {
    it('should transition from active to past_due', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'pro' });

        // Set as active
        await db
          .update(users)
          .set({
            subscriptionStatus: 'active',
            stripeCustomerId: 'cus_test_123',
          })
          .where(eq(users.id, user.id));

        // Simulate payment failure
        await db
          .update(users)
          .set({ subscriptionStatus: 'past_due' })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.subscriptionStatus).toBe('past_due');
        expect(updated.tier).toBe('pro'); // Tier unchanged until cancellation
      });
    });

    it('should cancel subscription and downgrade to free', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'pro' });

        // Set initial subscription
        await db
          .update(users)
          .set({
            subscriptionStatus: 'active',
            stripeCustomerId: 'cus_test_123',
            subscriptionId: 'sub_test_123',
          })
          .where(eq(users.id, user.id));

        // Cancel subscription
        await db
          .update(users)
          .set({
            subscriptionStatus: 'canceled',
            tier: 'free',
            subscriptionId: null,
            subscriptionEndDate: null,
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.subscriptionStatus).toBe('canceled');
        expect(updated.tier).toBe('free');
        expect(updated.subscriptionId).toBeNull();
        expect(updated.stripeCustomerId).toBe('cus_test_123'); // Keep customer ID
      });
    });

    it('should handle trialing status', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        // Start trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

        await db
          .update(users)
          .set({
            tier: 'pro',
            subscriptionStatus: 'trialing',
            stripeCustomerId: 'cus_trial_123',
            subscriptionId: 'sub_trial_123',
            subscriptionEndDate: trialEnd.toISOString(),
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.subscriptionStatus).toBe('trialing');
        expect(updated.tier).toBe('pro');
      });
    });

    it('should transition from trialing to active', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'pro' });

        // Set as trialing
        await db
          .update(users)
          .set({
            subscriptionStatus: 'trialing',
            stripeCustomerId: 'cus_test_123',
          })
          .where(eq(users.id, user.id));

        // Trial ends, payment succeeds
        await db
          .update(users)
          .set({ subscriptionStatus: 'active' })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.subscriptionStatus).toBe('active');
      });
    });
  });

  describe('Subscription Renewal', () => {
    it('should update subscription end date on renewal', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'pro' });

        const currentEnd = new Date('2025-01-31');
        await db
          .update(users)
          .set({
            subscriptionStatus: 'active',
            subscriptionEndDate: currentEnd.toISOString(),
          })
          .where(eq(users.id, user.id));

        // Renew for another month
        const newEnd = new Date('2025-02-28');
        await db
          .update(users)
          .set({ subscriptionEndDate: newEnd.toISOString() })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        const updatedDate = new Date(updated.subscriptionEndDate!);
        expect(updatedDate.getMonth()).toBe(1); // February (0-indexed)
      });
    });
  });

  describe('Stripe Customer Management', () => {
    it('should link Stripe customer ID to user', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        await db
          .update(users)
          .set({ stripeCustomerId: 'cus_new_customer' })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.stripeCustomerId).toBe('cus_new_customer');
      });
    });

    it('should find user by Stripe customer ID', async () => {
      await withTestTransaction(async (db) => {
        const customerId = 'cus_lookup_test';
        await createTestUser(db, { tier: 'pro' });

        const user = await createTestUser(db, { tier: 'pro' });
        await db
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, user.id));

        // Find user by customer ID
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));

        expect(found).toBeDefined();
        expect(found.id).toBe(user.id);
      });
    });
  });

  describe('Tier-based Query Limits', () => {
    it('should track query count for free user', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        // Simulate queries
        for (let i = 0; i < 5; i++) {
          await db
            .update(users)
            .set({ queryCountToday: i + 1 })
            .where(eq(users.id, user.id));
        }

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.queryCountToday).toBe(5);
      });
    });

    it('should reset query count for new day', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        // Set query count
        await db
          .update(users)
          .set({
            queryCountToday: 10,
            lastQueryDate: new Date('2025-01-01').toISOString(),
          })
          .where(eq(users.id, user.id));

        // Simulate new day - reset count
        await db
          .update(users)
          .set({
            queryCountToday: 0,
            lastQueryDate: new Date('2025-01-02').toISOString(),
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.queryCountToday).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription without end date', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'pro' });

        await db
          .update(users)
          .set({
            subscriptionStatus: 'active',
            stripeCustomerId: 'cus_test',
            subscriptionEndDate: null, // Lifetime or no end date
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.subscriptionStatus).toBe('active');
        expect(updated.subscriptionEndDate).toBeNull();
      });
    });

    it('should handle resubscription after cancellation', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        // First subscription
        await db
          .update(users)
          .set({
            tier: 'pro',
            subscriptionStatus: 'active',
            stripeCustomerId: 'cus_test',
            subscriptionId: 'sub_test_1',
          })
          .where(eq(users.id, user.id));

        // Cancel
        await db
          .update(users)
          .set({
            tier: 'free',
            subscriptionStatus: 'canceled',
            subscriptionId: null,
          })
          .where(eq(users.id, user.id));

        // Resubscribe
        await db
          .update(users)
          .set({
            tier: 'pro',
            subscriptionStatus: 'active',
            subscriptionId: 'sub_test_2', // New subscription ID
          })
          .where(eq(users.id, user.id));

        const [updated] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id));

        expect(updated.tier).toBe('pro');
        expect(updated.subscriptionStatus).toBe('active');
        expect(updated.subscriptionId).toBe('sub_test_2');
        expect(updated.stripeCustomerId).toBe('cus_test'); // Same customer
      });
    });
  });
});
