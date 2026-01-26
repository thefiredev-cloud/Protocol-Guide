/**
 * Protocol Database Integration Tests
 *
 * Tests real database operations for protocol CRUD and search
 * Uses transaction rollback for isolation
 *
 * SETUP: Requires DATABASE_URL in .env
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { protocolChunks, agencies } from '../../drizzle/schema';
import {
  withTestTransaction,
  createTestAgency,
  createTestProtocol,
  verifyDatabaseConnection,
  closeTestPool,
} from './db-test-utils';

// Skip integration tests when database is not available
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Protocol Database Integration Tests', () => {
  beforeAll(async () => {
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed - check DATABASE_URL');
    }
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Protocol Creation', () => {
    it('should create a protocol chunk', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        const protocol = await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-001',
          protocolTitle: 'Cardiac Arrest',
          content: 'Begin CPR immediately. Check rhythm.',
        });

        expect(protocol).toBeDefined();
        expect(protocol.id).toBeGreaterThan(0);
        expect(protocol.protocolNumber).toBe('P-001');
        expect(protocol.protocolTitle).toBe('Cardiac Arrest');
        expect(protocol.agencyId).toBe(agency.id);
      });
    });

    it('should create multiple chunks for same protocol', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create 3 chunks for the same protocol
        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-002',
          protocolTitle: 'Respiratory Distress',
          content: 'Chunk 1: Assessment',
        });

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-002',
          protocolTitle: 'Respiratory Distress',
          content: 'Chunk 2: Treatment',
        });

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-002',
          protocolTitle: 'Respiratory Distress',
          content: 'Chunk 3: Transport',
        });

        // Query all chunks for this protocol
        const chunks = await db
          .select()
          .from(protocolChunks)
          .where(
            and(
              eq(protocolChunks.agencyId, agency.id),
              eq(protocolChunks.protocolNumber, 'P-002')
            )
          );

        expect(chunks).toHaveLength(3);
      });
    });

    it('should store protocol metadata', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        const protocol = await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-003',
          protocolTitle: 'Stroke Protocol',
          section: 'Neurological Emergencies',
          content: 'FAST assessment for stroke',
        });

        expect(protocol.section).toBe('Neurological Emergencies');
        expect(protocol.pageNumber).toBe(1);
        expect(protocol.chunkIndex).toBe(0);
      });
    });
  });

  describe('Protocol Queries', () => {
    it('should find protocols by agency', async () => {
      await withTestTransaction(async (db) => {
        const agency1 = await createTestAgency(db, { name: 'LA County' });
        const agency2 = await createTestAgency(db, { name: 'SF County' });

        // Create protocols for agency1
        await createTestProtocol(db, {
          agencyId: agency1.id,
          protocolNumber: 'P-001',
          protocolTitle: 'Protocol 1',
        });
        await createTestProtocol(db, {
          agencyId: agency1.id,
          protocolNumber: 'P-002',
          protocolTitle: 'Protocol 2',
        });

        // Create protocol for agency2
        await createTestProtocol(db, {
          agencyId: agency2.id,
          protocolNumber: 'P-001',
          protocolTitle: 'Protocol 1',
        });

        // Query agency1 protocols
        const agency1Protocols = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency1.id));

        expect(agency1Protocols).toHaveLength(2);
      });
    });

    it('should find protocol by number and agency', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-042',
          protocolTitle: 'Test Protocol',
        });

        const found = await db
          .select()
          .from(protocolChunks)
          .where(
            and(
              eq(protocolChunks.agencyId, agency.id),
              eq(protocolChunks.protocolNumber, 'P-042')
            )
          )
          .limit(1);

        expect(found).toHaveLength(1);
        expect(found[0].protocolNumber).toBe('P-042');
      });
    });

    it('should search protocols by content', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-001',
          protocolTitle: 'Cardiac Arrest',
          content: 'Epinephrine 1mg IV/IO every 3-5 minutes during cardiac arrest',
        });

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-002',
          protocolTitle: 'Anaphylaxis',
          content: 'Epinephrine 0.3mg IM for anaphylaxis',
        });

        // Search for "epinephrine" (case-insensitive)
        const results = await db
          .select()
          .from(protocolChunks)
          .where(
            sql`${protocolChunks.content} ILIKE ${'%epinephrine%'}`
          );

        expect(results.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Protocol Updates', () => {
    it('should update protocol content', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        const protocol = await createTestProtocol(db, {
          agencyId: agency.id,
          content: 'Old content',
        });

        // Update content
        await db
          .update(protocolChunks)
          .set({ content: 'Updated content' })
          .where(eq(protocolChunks.id, protocol.id));

        const updated = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.id, protocol.id))
          .limit(1);

        expect(updated[0].content).toBe('Updated content');
      });
    });
  });

  describe('Protocol Deletion', () => {
    it('should delete protocol chunks', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        const protocol = await createTestProtocol(db, {
          agencyId: agency.id,
        });

        // Delete protocol
        await db
          .delete(protocolChunks)
          .where(eq(protocolChunks.id, protocol.id));

        // Verify deletion
        const found = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.id, protocol.id))
          .limit(1);

        expect(found).toHaveLength(0);
      });
    });

    it('should delete all chunks for an agency', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create multiple protocols
        await createTestProtocol(db, { agencyId: agency.id });
        await createTestProtocol(db, { agencyId: agency.id });
        await createTestProtocol(db, { agencyId: agency.id });

        // Delete all agency protocols
        await db
          .delete(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));

        // Verify deletion
        const remaining = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));

        expect(remaining).toHaveLength(0);
      });
    });
  });

  describe('Protocol Stats', () => {
    it('should count protocols by agency', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create 5 protocol chunks
        for (let i = 0; i < 5; i++) {
          await createTestProtocol(db, {
            agencyId: agency.id,
            protocolNumber: `P-${i + 1}`,
          });
        }

        // Count protocols
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));

        expect(Number(result[0].count)).toBe(5);
      });
    });

    it('should get distinct protocol numbers', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create multiple chunks for same protocols
        await createTestProtocol(db, { agencyId: agency.id, protocolNumber: 'P-001' });
        await createTestProtocol(db, { agencyId: agency.id, protocolNumber: 'P-001' });
        await createTestProtocol(db, { agencyId: agency.id, protocolNumber: 'P-002' });
        await createTestProtocol(db, { agencyId: agency.id, protocolNumber: 'P-002' });

        // Get distinct protocol numbers
        const result = await db
          .selectDistinct({ protocolNumber: protocolChunks.protocolNumber })
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Agency-Protocol Relationship', () => {
    it('should maintain referential integrity', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        await createTestProtocol(db, { agencyId: agency.id });

        // Try to delete agency (should fail due to foreign key)
        await expect(
          db.delete(agencies).where(eq(agencies.id, agency.id))
        ).rejects.toThrow();
      });
    });

    it('should cascade delete when protocols deleted first', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);
        await createTestProtocol(db, { agencyId: agency.id });

        // Delete protocols first
        await db
          .delete(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));

        // Now delete agency (should succeed)
        await db.delete(agencies).where(eq(agencies.id, agency.id));

        const found = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, agency.id))
          .limit(1);

        expect(found).toHaveLength(0);
      });
    });
  });

  describe('Complex Queries', () => {
    it('should join protocols with agency data', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db, {
          name: 'Test Fire Department',
          stateCode: 'CA',
        });

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-001',
          protocolTitle: 'Test Protocol',
        });

        // Join query
        const result = await db
          .select({
            protocolNumber: protocolChunks.protocolNumber,
            protocolTitle: protocolChunks.protocolTitle,
            agencyName: agencies.name,
            stateCode: agencies.stateCode,
          })
          .from(protocolChunks)
          .innerJoin(agencies, eq(protocolChunks.agencyId, agencies.id))
          .where(eq(protocolChunks.protocolNumber, 'P-001'))
          .limit(1);

        expect(result).toHaveLength(1);
        expect(result[0].agencyName).toBe('Test Fire Department');
        expect(result[0].stateCode).toBe('CA');
      });
    });

    it('should group protocols by section', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          section: 'Cardiac',
        });
        await createTestProtocol(db, {
          agencyId: agency.id,
          section: 'Cardiac',
        });
        await createTestProtocol(db, {
          agencyId: agency.id,
          section: 'Respiratory',
        });

        // Group by section
        const result = await db
          .select({
            section: protocolChunks.section,
            count: sql<number>`count(*)`,
          })
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id))
          .groupBy(protocolChunks.section);

        expect(result.length).toBeGreaterThanOrEqual(2);
        const cardiacGroup = result.find(r => r.section === 'Cardiac');
        expect(Number(cardiacGroup?.count)).toBe(2);
      });
    });
  });
});
