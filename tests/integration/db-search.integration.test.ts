/**
 * Search Database Integration Tests
 *
 * Tests real database search operations including semantic search with pgvector
 * Uses transaction rollback for isolation
 *
 * SETUP: Requires DATABASE_URL in .env and pgvector extension
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { protocolChunks, queries } from '../../drizzle/schema';
import {
  withTestTransaction,
  createTestUser,
  createTestAgency,
  createTestProtocol,
  verifyDatabaseConnection,
  closeTestPool,
} from './db-test-utils';

// Skip integration tests when database is not available
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Search Database Integration Tests', () => {
  beforeAll(async () => {
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed - check DATABASE_URL');
    }
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Text Search', () => {
    it('should perform case-insensitive text search', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-001',
          content: 'Epinephrine 1mg IV for cardiac arrest',
        });

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-002',
          content: 'Atropine for bradycardia',
        });

        // Search for "epinephrine" (case-insensitive)
        const results = await db
          .select()
          .from(protocolChunks)
          .where(sql`${protocolChunks.content} ILIKE ${'%epinephrine%'}`);

        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].content.toLowerCase()).toContain('epinephrine');
      });
    });

    it('should search by protocol title', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolTitle: 'Cardiac Arrest Management',
        });

        const results = await db
          .select()
          .from(protocolChunks)
          .where(sql`${protocolChunks.protocolTitle} ILIKE ${'%cardiac arrest%'}`);

        expect(results.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should search by section', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          section: 'Adult Cardiac Emergencies',
        });

        const results = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.section, 'Adult Cardiac Emergencies'));

        expect(results).toHaveLength(1);
      });
    });

    it('should search across multiple fields', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        await createTestProtocol(db, {
          agencyId: agency.id,
          protocolNumber: 'P-STROKE',
          protocolTitle: 'Stroke Assessment',
          content: 'FAST exam for stroke patients',
        });

        // Search across title and content
        const results = await db
          .select()
          .from(protocolChunks)
          .where(
            sql`${protocolChunks.protocolTitle} ILIKE ${'%stroke%'} OR ${protocolChunks.content} ILIKE ${'%stroke%'}`
          );

        expect(results.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Query History', () => {
    it('should log search query', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);
        const agency = await createTestAgency(db);

        // Log a query
        const [query] = await db
          .insert(queries)
          .values({
            userId: user.id,
            query: 'cardiac arrest protocol',
            agencyId: agency.id,
            resultCount: 5,
            responseTimeMs: 123,
          })
          .returning();

        expect(query).toBeDefined();
        expect(query.id).toBeGreaterThan(0);
        expect(query.query).toBe('cardiac arrest protocol');
        expect(query.userId).toBe(user.id);
      });
    });

    it('should retrieve user query history', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);
        const agency = await createTestAgency(db);

        // Create multiple queries
        await db.insert(queries).values({
          userId: user.id,
          query: 'epinephrine dosing',
          agencyId: agency.id,
          resultCount: 3,
        });

        await db.insert(queries).values({
          userId: user.id,
          query: 'stroke assessment',
          agencyId: agency.id,
          resultCount: 5,
        });

        // Get user's query history
        const userQueries = await db
          .select()
          .from(queries)
          .where(eq(queries.userId, user.id))
          .orderBy(sql`${queries.createdAt} DESC`);

        expect(userQueries).toHaveLength(2);
        expect(userQueries[0].query).toBe('stroke assessment'); // Most recent
      });
    });

    it('should track query performance metrics', async () => {
      await withTestTransaction(async (db) => {
        const user = await createTestUser(db);
        const agency = await createTestAgency(db);

        const [query] = await db
          .insert(queries)
          .values({
            userId: user.id,
            query: 'test query',
            agencyId: agency.id,
            resultCount: 10,
            responseTimeMs: 456,
          })
          .returning();

        expect(query.responseTimeMs).toBe(456);
        expect(query.resultCount).toBe(10);
      });
    });
  });

  describe('Search Filtering', () => {
    it('should filter by agency', async () => {
      await withTestTransaction(async (db) => {
        const agency1 = await createTestAgency(db, { name: 'Agency 1' });
        const agency2 = await createTestAgency(db, { name: 'Agency 2' });

        await createTestProtocol(db, {
          agencyId: agency1.id,
          content: 'Cardiac arrest protocol',
        });

        await createTestProtocol(db, {
          agencyId: agency2.id,
          content: 'Cardiac arrest protocol',
        });

        // Search within agency1 only
        const results = await db
          .select()
          .from(protocolChunks)
          .where(
            sql`${protocolChunks.agencyId} = ${agency1.id} AND ${protocolChunks.content} ILIKE ${'%cardiac%'}`
          );

        expect(results).toHaveLength(1);
        expect(results[0].agencyId).toBe(agency1.id);
      });
    });

    it('should limit search results', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create 10 protocols
        for (let i = 0; i < 10; i++) {
          await createTestProtocol(db, {
            agencyId: agency.id,
            content: 'test protocol content',
          });
        }

        // Limit to 5 results
        const results = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id))
          .limit(5);

        expect(results).toHaveLength(5);
      });
    });
  });

  describe('Embedding Search (pgvector)', () => {
    it('should store and retrieve embeddings', async () => {
      await withTestTransaction(async (db, client) => {
        const agency = await createTestAgency(db);

        // Check if pgvector is available
        const extensionCheck = await client.query(
          "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );

        if (extensionCheck.rows.length === 0) {
          console.log('[Test] pgvector extension not available, skipping embedding tests');
          return;
        }

        // Create a mock embedding (1536 dimensions for OpenAI embeddings)
        // Using smaller dimension for test
        const mockEmbedding = Array(128).fill(0).map(() => Math.random());

        // Insert protocol with embedding using raw SQL
        const result = await client.query(
          `INSERT INTO protocol_chunks (agency_id, protocol_number, protocol_title, section, content, page_number, chunk_index, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
           RETURNING id, embedding IS NOT NULL as has_embedding`,
          [
            agency.id,
            'P-EMBED',
            'Test Protocol',
            'Test',
            'Test content',
            1,
            0,
            `[${mockEmbedding.join(',')}]`
          ]
        );

        expect(result.rows[0].has_embedding).toBe(true);
      });
    });

    it('should perform cosine similarity search', async () => {
      await withTestTransaction(async (db, client) => {
        const agency = await createTestAgency(db);

        // Check if pgvector is available
        const extensionCheck = await client.query(
          "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );

        if (extensionCheck.rows.length === 0) {
          console.log('[Test] pgvector extension not available, skipping similarity search');
          return;
        }

        // Create two protocols with embeddings
        const embedding1 = Array(128).fill(0).map(() => Math.random());
        const embedding2 = Array(128).fill(0).map(() => Math.random());

        await client.query(
          `INSERT INTO protocol_chunks (agency_id, protocol_number, protocol_title, section, content, page_number, chunk_index, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
          [agency.id, 'P-001', 'Protocol 1', 'Test', 'Content 1', 1, 0, `[${embedding1.join(',')}]`]
        );

        await client.query(
          `INSERT INTO protocol_chunks (agency_id, protocol_number, protocol_title, section, content, page_number, chunk_index, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
          [agency.id, 'P-002', 'Protocol 2', 'Test', 'Content 2', 1, 0, `[${embedding2.join(',')}]`]
        );

        // Search with cosine similarity (using embedding1 as query)
        const searchResult = await client.query(
          `SELECT protocol_number, protocol_title, 1 - (embedding <=> $1::vector) as similarity
           FROM protocol_chunks
           WHERE agency_id = $2 AND embedding IS NOT NULL
           ORDER BY similarity DESC
           LIMIT 5`,
          [`[${embedding1.join(',')}]`, agency.id]
        );

        expect(searchResult.rows.length).toBeGreaterThan(0);
        expect(searchResult.rows[0].similarity).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Performance', () => {
    it('should handle large result sets efficiently', async () => {
      await withTestTransaction(async (db) => {
        const agency = await createTestAgency(db);

        // Create 100 protocols
        const startInsert = Date.now();
        const insertPromises = [];
        for (let i = 0; i < 100; i++) {
          insertPromises.push(
            createTestProtocol(db, {
              agencyId: agency.id,
              protocolNumber: `P-${i.toString().padStart(3, '0')}`,
              content: `Protocol content ${i}`,
            })
          );
        }
        await Promise.all(insertPromises);
        const insertTime = Date.now() - startInsert;

        // Query all protocols
        const startQuery = Date.now();
        const results = await db
          .select()
          .from(protocolChunks)
          .where(eq(protocolChunks.agencyId, agency.id));
        const queryTime = Date.now() - startQuery;

        expect(results).toHaveLength(100);

        // Performance assertions (should be fast)
        console.log(`[Performance] Insert 100 protocols: ${insertTime}ms`);
        console.log(`[Performance] Query 100 protocols: ${queryTime}ms`);

        // These are reasonable thresholds for local DB
        expect(insertTime).toBeLessThan(5000); // 5 seconds
        expect(queryTime).toBeLessThan(1000); // 1 second
      });
    });
  });
});
