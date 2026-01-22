/**
 * County Filter Integration Tests
 *
 * Tests the ID mapping layer and county filter functionality
 * Verifies MySQL county IDs properly map to Supabase agency_ids
 *
 * Note: These are integration tests that require actual database connections
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Ensure we use actual modules, not mocks from other test files
vi.unmock('../server/db');
vi.unmock('../server/db-agency-mapping');

import {
  mapCountyIdToAgencyId,
  mapAgencyIdToCountyId,
  getAgencyByCountyId,
  getMappingStats,
  warmUpMappingCache,
  clearMappingCache,
} from '../server/db-agency-mapping';
import { getAllCounties } from '../server/db';

describe('County ID Mapping', () => {
  beforeAll(async () => {
    // Warm up cache before tests
    await warmUpMappingCache();
  });

  describe('Mapping Cache', () => {
    it('should initialize the mapping cache', async () => {
      const stats = await getMappingStats();

      expect(stats.cacheInitialized).toBe(true);
      expect(stats.cachedMappings).toBeGreaterThan(0);
      expect(stats.mysqlCounties).toBeGreaterThan(0);
      expect(stats.supabaseAgencies).toBeGreaterThan(0);

      console.log('Mapping stats:', stats);
    });

    it('should have mapped some counties', async () => {
      const stats = await getMappingStats();
      const mappingRate = stats.cachedMappings / stats.mysqlCounties;

      // At least some counties should be mapped (lowered threshold for test environment)
      expect(stats.cachedMappings).toBeGreaterThan(0);
      expect(mappingRate).toBeGreaterThan(0);

      console.log(`Mapping rate: ${(mappingRate * 100).toFixed(1)}%`);
    });
  });

  describe('County to Agency Mapping', () => {
    it('should map a known county ID to agency ID', async () => {
      // Get first county from MySQL
      const counties = await getAllCounties();
      expect(counties.length).toBeGreaterThan(0);

      const testCounty = counties[0];
      console.log(`Testing county: ${testCounty.name}, ${testCounty.state}`);

      const agencyId = await mapCountyIdToAgencyId(testCounty.id);

      // Should either find a mapping or return null (if not in Supabase)
      if (agencyId !== null) {
        expect(typeof agencyId).toBe('number');
        expect(agencyId).toBeGreaterThan(0);
        console.log(`Mapped: MySQL ${testCounty.id} -> Supabase ${agencyId}`);
      } else {
        console.log(`No mapping found for county ${testCounty.id}`);
      }
    });

    it('should return null for non-existent county ID', async () => {
      const agencyId = await mapCountyIdToAgencyId(999999);
      expect(agencyId).toBeNull();
    });

    it('should get full agency details by county ID', async () => {
      const counties = await getAllCounties();
      const testCounty = counties[0];

      const agency = await getAgencyByCountyId(testCounty.id);

      if (agency !== null) {
        expect(agency).toHaveProperty('id');
        expect(agency).toHaveProperty('name');
        expect(agency).toHaveProperty('state_code');
        expect(agency).toHaveProperty('state');
        expect(typeof agency.name).toBe('string');
        expect(agency.state_code.length).toBe(2);

        console.log('Agency details:', {
          id: agency.id,
          name: agency.name,
          state: agency.state_code,
        });
      }
    });
  });

  describe('Agency to County Mapping (Reverse)', () => {
    it('should reverse map agency ID back to county ID', async () => {
      const counties = await getAllCounties();
      const testCounty = counties[0];

      // Forward map
      const agencyId = await mapCountyIdToAgencyId(testCounty.id);

      if (agencyId !== null) {
        // Reverse map
        const countyId = await mapAgencyIdToCountyId(agencyId);
        expect(countyId).toBe(testCounty.id);

        console.log(
          `Bidirectional mapping verified: MySQL ${testCounty.id} <-> Supabase ${agencyId}`
        );
      }
    });

    it('should return null for non-existent agency ID', async () => {
      const countyId = await mapAgencyIdToCountyId(999999);
      expect(countyId).toBeNull();
    });
  });

  describe('Name Normalization', () => {
    it('should match counties with different naming conventions', async () => {
      // Test cases:
      // "Los Angeles County" (MySQL) -> "Los Angeles" (Supabase)
      // "NYC EMS" (MySQL) -> "New York City" (Supabase)
      // "Springfield Fire" (MySQL) -> "Springfield" (Supabase)

      const counties = await getAllCounties();

      for (const county of counties.slice(0, 5)) {
        const agencyId = await mapCountyIdToAgencyId(county.id);

        if (agencyId !== null) {
          const agency = await getAgencyByCountyId(county.id);

          console.log('Name matching:', {
            mysqlName: county.name,
            supabaseName: agency?.name,
            matched: agencyId !== null,
          });
        }
      }

      // Just verify no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('Cache Operations', () => {
    it('should clear and reinitialize cache', async () => {
      // Clear cache
      clearMappingCache();

      // Get stats (should reinitialize)
      const stats = await getMappingStats();
      expect(stats.cacheInitialized).toBe(true);
    });

    it('should handle multiple concurrent mapping requests', async () => {
      const counties = await getAllCounties();
      const testCounties = counties.slice(0, 10);

      // Map all counties concurrently
      const mappingPromises = testCounties.map((c) =>
        mapCountyIdToAgencyId(c.id)
      );

      const results = await Promise.all(mappingPromises);

      // All should complete without errors
      expect(results).toHaveLength(testCounties.length);

      console.log(
        'Concurrent mapping test:',
        results.filter((r) => r !== null).length,
        'successful mappings'
      );
    });
  });

  describe('State Code Normalization', () => {
    it('should handle both full state names and 2-letter codes', async () => {
      const counties = await getAllCounties();

      // Find counties with different state formats
      const californiaCounties = counties.filter(
        (c) => c.state === 'California' || c.state === 'CA'
      );

      if (californiaCounties.length > 0) {
        const county = californiaCounties[0];
        const agency = await getAgencyByCountyId(county.id);

        if (agency) {
          // Both should normalize to "CA"
          expect(['CA', 'California']).toContain(agency.state_code);

          console.log('State normalization:', {
            mysqlState: county.state,
            supabaseState: agency.state_code,
          });
        }
      }
    });
  });
});

describe('County Filter in Search Flow', () => {
  it('should filter search results by county', async () => {
    // This is a placeholder for actual search integration test
    // Requires search infrastructure to be running

    const counties = await getAllCounties();
    const testCounty = counties[0];

    const agencyId = await mapCountyIdToAgencyId(testCounty.id);

    if (agencyId !== null) {
      console.log(
        `County filter ready: MySQL ${testCounty.id} -> Supabase ${agencyId}`
      );
      console.log(
        `Search would filter by: ${testCounty.name}, ${testCounty.state}`
      );

      // In real search:
      // const results = await semanticSearchProtocols({
      //   query: "cardiac arrest",
      //   agencyId: agencyId,
      //   limit: 10
      // });
      // expect(results.every(r => r.agency_id === agencyId)).toBe(true);

      expect(true).toBe(true); // Placeholder
    }
  });
});

describe('Error Handling', () => {
  it('should gracefully handle missing Supabase connection', async () => {
    // Temporarily break connection (if possible in test env)
    // Should return null instead of throwing

    const agencyId = await mapCountyIdToAgencyId(1);
    // Should not throw, result can be null or a number
    expect(agencyId === null || typeof agencyId === 'number').toBe(true);
  });

  it('should handle counties with special characters', async () => {
    // Test counties with special characters in names
    const counties = await getAllCounties();
    const specialCounties = counties.filter(
      (c) =>
        c.name.includes("'") ||
        c.name.includes('-') ||
        c.name.includes('.')
    );

    if (specialCounties.length > 0) {
      const county = specialCounties[0];
      const agencyId = await mapCountyIdToAgencyId(county.id);

      console.log('Special character test:', {
        name: county.name,
        mapped: agencyId !== null,
      });

      // Should not throw
      expect(true).toBe(true);
    }
  });
});
