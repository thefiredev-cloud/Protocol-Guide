/**
 * User Database Integration Tests
 *
 * Tests real database operations for user CRUD
 * Uses transaction rollback for isolation - no test pollution
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

describe.skipIf(!runIntegrationTests)('User Database Integration Tests', () => {
  beforeAll(async () => {
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed - check DATABASE_URL');
    }
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('User Creation', () => {
    it('should create a new user with default values', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, {
          email: 'paramedic@test.com',
          name: 'Test Paramedic',
        });

        expect(user).toBeDefined();
        expect(user.id).toBeGreaterThan(0);
        expect(user.email).toBe('paramedic@test.com');
        expect(user.name).toBe('Test Paramedic');
        expect(user.tier).toBe('free');
        expect(user.role).toBe('user');
        expect(user.queryCountToday).toBe(0);
      });
    });

    it('should create a pro user', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, {
          tier: 'pro',
          email: 'pro@test.com',
        });

        expect(user.tier).toBe('pro');
        expect(user.email).toBe('pro@test.com');
      });
    });

    it('should create an admin user', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, {
          role: 'admin',
          email: 'admin@test.com',
        });

        expect(user.role).toBe('admin');
        expect(user.email).toBe('admin@test.com');
      });
    });

    it('should enforce unique openId constraint', async () => {
      await withTestTransaction(async (db) => {
        const openId = 'duplicate-open-id';

        // Create first user
        await createTestUser(db, { openId });

        // Attempt to create duplicate
        await expect(createTestUser(db, { openId })).rejects.toThrow();
      });
    });

    it('should enforce unique supabaseId constraint', async () => {
      await withTestTransaction(async (db) => {
        const supabaseId = 'duplicate-supabase-id';

        // Create first user
        await createTestUser(db, { supabaseId });

        // Attempt to create duplicate
        await expect(createTestUser(db, { supabaseId })).rejects.toThrow();
      });
    });
  });

  describe('User Queries', () => {
    it('should find user by id', async () => {
      await withTestTransaction(async (db) => {
        const created = await createTestUser(db, { email: 'find@test.com' });

        const found = await db
          .select()
          .from(users)
          .where(eq(users.id, created.id))
          .limit(1);

        expect(found).toHaveLength(1);
        expect(found[0].id).toBe(created.id);
        expect(found[0].email).toBe('find@test.com');
      });
    });

    it('should find user by openId', async () => {
      await withTestTransaction(async (db) => {
        const openId = 'test-open-id-123';
        await createTestUser(db, { openId });

        const found = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);

        expect(found).toHaveLength(1);
        expect(found[0].openId).toBe(openId);
      });
    });

    it('should find user by supabaseId', async () => {
      await withTestTransaction(async (db) => {
        const supabaseId = 'test-supabase-123';
        await createTestUser(db, { supabaseId });

        const found = await db
          .select()
          .from(users)
          .where(eq(users.supabaseId, supabaseId))
          .limit(1);

        expect(found).toHaveLength(1);
        expect(found[0].supabaseId).toBe(supabaseId);
      });
    });

    it('should return empty array for non-existent user', async () => {
      await withTestTransaction(async (db) => {
        const found = await db
          .select()
          .from(users)
          .where(eq(users.id, 999999))
          .limit(1);

        expect(found).toHaveLength(0);
      });
    });
  });

  describe('User Updates', () => {
    it('should update user tier', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { tier: 'free' });

        await db
          .update(users)
          .set({ tier: 'pro' })
          .where(eq(users.id, user.id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(updated[0].tier).toBe('pro');
      });
    });

    it('should update user role', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db, { role: 'user' });

        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, user.id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(updated[0].role).toBe('admin');
      });
    });

    it('should increment query count', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        // Increment query count
        await db
          .update(users)
          .set({ queryCountToday: user.queryCountToday + 1 })
          .where(eq(users.id, user.id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(updated[0].queryCountToday).toBe(1);
      });
    });

    it('should update subscription fields', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        const subscriptionEndDate = new Date('2025-12-31');
        await db
          .update(users)
          .set({
            stripeCustomerId: 'cus_test_123',
            subscriptionId: 'sub_test_123',
            subscriptionStatus: 'active',
            subscriptionEndDate: subscriptionEndDate.toISOString(),
          })
          .where(eq(users.id, user.id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(updated[0].stripeCustomerId).toBe('cus_test_123');
        expect(updated[0].subscriptionId).toBe('sub_test_123');
        expect(updated[0].subscriptionStatus).toBe('active');
        expect(updated[0].subscriptionEndDate).toBeTruthy();
      });
    });

    it('should acknowledge disclaimer', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        expect(user.disclaimerAcknowledgedAt).toBeNull();

        const now = new Date();
        await db
          .update(users)
          .set({ disclaimerAcknowledgedAt: now.toISOString() })
          .where(eq(users.id, user.id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(updated[0].disclaimerAcknowledgedAt).toBeTruthy();
      });
    });
  });

  describe('User Deletion', () => {
    it('should delete user', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);

        // Delete user
        await db.delete(users).where(eq(users.id, user.id));

        // Verify deletion
        const found = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        expect(found).toHaveLength(0);
      });
    });
  });

  describe('Multiple Users', () => {
    it('should create and query multiple users', async () => {
      await withTestTransaction(async (db) => {
        // Create 3 users
        await createTestUser(db, { email: 'user1@test.com', tier: 'free' });
        await createTestUser(db, { email: 'user2@test.com', tier: 'pro' });
        await createTestUser(db, { email: 'user3@test.com', tier: 'enterprise' });

        // Query all free users
        const freeUsers = await db
          .select()
          .from(users)
          .where(eq(users.tier, 'free'));

        expect(freeUsers.length).toBeGreaterThanOrEqual(1);

        // Query all pro users
        const proUsers = await db
          .select()
          .from(users)
          .where(eq(users.tier, 'pro'));

        expect(proUsers.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Transaction Isolation', () => {
    it('should rollback changes after test', async () => {
      const uniqueEmail = `isolation-test-${Date.now()}@test.com`;

      // Create user in first transaction
      await withTestTransaction(async (db) => {
        await createTestUser(db, { email: uniqueEmail });
      });

      // Verify user doesn't exist in second transaction (rolled back)
      await withTestTransaction(async (db) => {
        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, uniqueEmail))
          .limit(1);

        expect(found).toHaveLength(0);
      });
    });

    it('should isolate concurrent transactions', async () => {
      // Run two transactions in parallel
      const [result1, result2] = await Promise.all([
        withTestTransaction(async (db) => {
          const user = await createTestUser(db, { email: 'concurrent1@test.com' });
          return user.id;
        }),
        withTestTransaction(async (db) => {
          const user = await createTestUser(db, { email: 'concurrent2@test.com' });
          return user.id;
        }),
      ]);

      // Both should succeed with different IDs
      expect(result1).toBeGreaterThan(0);
      expect(result2).toBeGreaterThan(0);
    });
  });
});
