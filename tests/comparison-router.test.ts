/**
 * Protocol Comparison Router Tests
 * 
 * Tests for the protocol comparison functionality including:
 * - Finding similar protocols
 * - Comparing by IDs
 * - Related conditions lookup
 * - Medication extraction
 * - Comparison summary generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { createMockTraceContext, createMockRequest, createMockResponse } from "./setup";

// Hoisted mock functions - MUST be before vi.mock
const { mockInFn, mockRpcFn, mockFromFn } = vi.hoisted(() => ({
  mockInFn: vi.fn(),
  mockRpcFn: vi.fn(),
  mockFromFn: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const client = {
      from: mockFromFn,
      rpc: mockRpcFn,
    };
    mockFromFn.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: mockInFn,
        eq: vi.fn().mockReturnThis(),
      }),
    });
    mockInFn.mockResolvedValue({ 
      data: [
        { 
          id: 1, 
          agency_id: 1, 
          protocol_number: 'P101', 
          protocol_title: 'Cardiac Arrest - Adult',
          section: 'Cardiac',
          content: 'Begin CPR immediately. Give epinephrine 1 mg IV every 3-5 minutes. Amiodarone 300 mg IV for VF/pVT. Contraindicated in asystole without reversible cause.',
          state_code: 'CA'
        },
        { 
          id: 2, 
          agency_id: 2, 
          protocol_number: 'CA-001', 
          protocol_title: 'Cardiac Arrest Management',
          section: 'Cardiac Emergencies',
          content: 'Start high-quality CPR. 1. Establish IV/IO access. 2. Epinephrine 1 mg every 3-5 min. 3. Amiodarone 300mg first dose. Do not give calcium routinely.',
          state_code: 'WA'
        },
      ], 
      error: null 
    });
    mockRpcFn.mockResolvedValue({ 
      data: [
        { id: 1, protocol_title: 'Cardiac Arrest - Adult', similarity: 0.95 },
        { id: 2, protocol_title: 'Cardiac Arrest Management', similarity: 0.88 },
      ], 
      error: null 
    });
    return client;
  },
}));

// Mock embeddings with full protocol data including content
vi.mock('../server/_core/embeddings', () => ({
  semanticSearchProtocols: vi.fn().mockResolvedValue([
    { 
      id: 1, 
      protocol_number: 'P101',
      protocol_title: 'Cardiac Arrest - Adult', 
      section: 'Cardiac',
      content: 'Begin CPR immediately. Give epinephrine 1 mg IV every 3-5 minutes. Amiodarone 300 mg IV.',
      similarity: 0.95, 
      agency_id: 1,
      agency_name: 'LA Fire', 
      state_code: 'CA' 
    },
    { 
      id: 2, 
      protocol_number: 'CA-001',
      protocol_title: 'Cardiac Arrest Management', 
      section: 'Cardiac Emergencies',
      content: 'Start high-quality CPR. 1. Establish IV/IO access. 2. Epinephrine 1 mg every 3-5 min.',
      similarity: 0.88, 
      agency_id: 2,
      agency_name: 'Seattle FD', 
      state_code: 'WA' 
    },
  ]),
}));

vi.mock('../server/_core/embeddings/generate', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

vi.mock('../server/_core/ems-query-normalizer', () => ({
  normalizeEmsQuery: vi.fn((query: string) => ({
    original: query,
    normalized: query.toLowerCase(),
    expandedAbbreviations: [],
    correctedTypos: [],
    intent: 'general_query',
    isComplex: false,
    extractedMedications: [],
    extractedConditions: query.includes('arrest') ? ['cardiac arrest'] : [],
    isEmergent: false,
  })),
}));

// Create test context
function createTestContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    req: createMockRequest(),
    res: createMockResponse(),
    trace: createMockTraceContext(),
    userId: null,
    userTier: 'free',
    csrfToken: 'test-csrf-token',
    ...overrides,
  };
}

describe('Protocol Comparison Router', () => {
  describe('findSimilar', () => {
    it('should normalize the query before searching', async () => {
      const { normalizeEmsQuery } = await import('../server/_core/ems-query-normalizer');
      
      // Simulate calling findSimilar
      const query = 'cardiac arrest';
      const normalized = normalizeEmsQuery(query);
      
      expect(normalized.normalized).toBe('cardiac arrest');
      expect(normalized.extractedConditions).toContain('cardiac arrest');
    });

    it('should deduplicate protocols by title', () => {
      const results = [
        { id: 1, protocol_title: 'Cardiac Arrest', similarity: 0.9 },
        { id: 2, protocol_title: 'cardiac arrest', similarity: 0.85 },
        { id: 3, protocol_title: 'Chest Pain', similarity: 0.7 },
      ];

      // Deduplicate logic
      const seenTitles = new Map<string, typeof results[0]>();
      for (const result of results) {
        const titleKey = result.protocol_title.toLowerCase().trim();
        if (!seenTitles.has(titleKey) || seenTitles.get(titleKey)!.similarity < result.similarity) {
          seenTitles.set(titleKey, result);
        }
      }

      const unique = Array.from(seenTitles.values());
      expect(unique.length).toBe(2);
      expect(unique.find(r => r.protocol_title.toLowerCase() === 'cardiac arrest')?.similarity).toBe(0.9);
    });
  });

  describe('Medication extraction', () => {
    it('should extract medication with dose and route', () => {
      const content = 'Give epinephrine 1 mg IV every 3-5 minutes';
      
      // Simple extraction pattern test
      const pattern = /\b(epinephrine|epi)\s*(?:1:10,?000|1:1,?000)?\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|mL|units?))\s*(?:via\s+)?(IV|IO|IM|SQ|IN|ET|PO|SL)?/gi;
      const match = pattern.exec(content);
      
      expect(match).not.toBeNull();
      expect(match![1].toLowerCase()).toBe('epinephrine');
      expect(match![2]).toBe('1 mg');
      expect(match![3]).toBe('IV');
    });

    it('should extract multiple medications', () => {
      const content = 'Amiodarone 300 mg IV, then epinephrine 1 mg IV';
      
      const medications: string[] = [];
      const patterns = [
        /\b(amiodarone)\s*(\d+(?:\.\d+)?\s*(?:mg))/gi,
        /\b(epinephrine|epi)\s*(\d+(?:\.\d+)?\s*(?:mg))/gi,
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          medications.push(match[1].toLowerCase());
        }
      }
      
      expect(medications).toContain('amiodarone');
      expect(medications).toContain('epinephrine');
    });
  });

  describe('Contraindication extraction', () => {
    it('should identify contraindication sentences', () => {
      const content = `
        Administer nitroglycerin 0.4 mg SL.
        Contraindicated in patients with SBP < 90 mmHg.
        Do not give if patient has taken PDE5 inhibitors.
      `;
      
      const keywords = ['contraindicated', 'do not give'];
      const sentences = content.split(/[.!?]+/).map(s => s.trim());
      
      const contraindications = sentences.filter(sentence => 
        keywords.some(kw => sentence.toLowerCase().includes(kw))
      );
      
      expect(contraindications.length).toBe(2);
      expect(contraindications[0]).toContain('Contraindicated');
      expect(contraindications[1]).toContain('Do not give');
    });
  });

  describe('Comparison summary generation', () => {
    it('should identify common medications across protocols', () => {
      const protocols = [
        { medications: [{ name: 'epinephrine' }, { name: 'amiodarone' }] },
        { medications: [{ name: 'epinephrine' }, { name: 'lidocaine' }] },
      ];

      // Find common medications
      const medCounts = new Map<string, number>();
      for (const protocol of protocols) {
        for (const med of protocol.medications) {
          medCounts.set(med.name, (medCounts.get(med.name) || 0) + 1);
        }
      }

      const common = Array.from(medCounts.entries())
        .filter(([_, count]) => count === protocols.length)
        .map(([name]) => name);

      expect(common).toContain('epinephrine');
      expect(common).not.toContain('amiodarone');
      expect(common).not.toContain('lidocaine');
    });

    it('should identify dose variations for the same medication', () => {
      const protocols = [
        { medications: [{ name: 'epinephrine', dose: '1 mg' }] },
        { medications: [{ name: 'epinephrine', dose: '0.5 mg' }] },
      ];

      const medsByName = new Map<string, Set<string>>();
      for (const protocol of protocols) {
        for (const med of protocol.medications) {
          if (!medsByName.has(med.name)) {
            medsByName.set(med.name, new Set());
          }
          if (med.dose) medsByName.get(med.name)!.add(med.dose);
        }
      }

      const variations = medsByName.get('epinephrine');
      expect(variations?.size).toBe(2);
      expect(variations?.has('1 mg')).toBe(true);
      expect(variations?.has('0.5 mg')).toBe(true);
    });
  });

  describe('Related conditions', () => {
    it('should return related conditions for cardiac arrest', () => {
      const relatedConditionsMap: Record<string, string[]> = {
        'cardiac arrest': ['ventricular fibrillation', 'asystole', 'pea', 'rosc'],
        'chest pain': ['stemi', 'nstemi', 'acs', 'angina'],
      };

      const condition = 'cardiac arrest';
      const related = relatedConditionsMap[condition] || [];

      expect(related).toContain('ventricular fibrillation');
      expect(related).toContain('asystole');
      expect(related).toContain('pea');
      expect(related).toContain('rosc');
    });

    it('should return empty array for unknown conditions', () => {
      const relatedConditionsMap: Record<string, string[]> = {
        'cardiac arrest': ['ventricular fibrillation'],
      };

      const condition = 'unknown condition';
      const conditionLower = condition.toLowerCase();
      
      let related: string[] = [];
      for (const [key, value] of Object.entries(relatedConditionsMap)) {
        if (conditionLower.includes(key) || key.includes(conditionLower)) {
          related = value;
          break;
        }
      }

      expect(related).toEqual([]);
    });
  });
});

describe('Key Points Extraction', () => {
  it('should extract numbered steps', () => {
    const content = `
      1. Establish IV access
      2. Give epinephrine 1 mg
      3. Continue CPR
    `;

    const pattern = /(?:^|\n)\s*\d+[.)]\s*([^.\n]{10,200})/g;
    const points: string[] = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      points.push(match[1].trim());
    }

    expect(points.length).toBeGreaterThanOrEqual(3);
    expect(points[0]).toContain('Establish IV access');
  });

  it('should extract bullet points', () => {
    const content = `
      • Check airway
      • Start compressions
      - Attach defibrillator
    `;

    const pattern = /(?:^|\n)\s*[•-]\s*([^.\n]{10,200})/g;
    const points: string[] = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      points.push(match[1].trim());
    }

    expect(points.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Router Procedure Tests
 * Tests that call the actual tRPC router procedures
 */
describe('Comparison Router Procedures', () => {
  const caller = appRouter.createCaller(createTestContext());

  describe('comparison.getRelatedConditions', () => {
    it('should return related conditions for cardiac arrest', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'cardiac arrest',
      });

      expect(result.condition).toBe('cardiac arrest');
      expect(result.relatedConditions).toContain('ventricular fibrillation');
      expect(result.relatedConditions).toContain('asystole');
      expect(result.relatedConditions).toContain('pea');
      expect(result.relatedConditions).toContain('rosc');
    });

    it('should return related conditions for chest pain', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'chest pain',
      });

      expect(result.condition).toBe('chest pain');
      expect(result.relatedConditions).toContain('stemi');
      expect(result.relatedConditions).toContain('nstemi');
      expect(result.relatedConditions).toContain('acs');
    });

    it('should return related conditions for stroke', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'stroke',
      });

      expect(result.relatedConditions).toContain('tia');
      expect(result.relatedConditions).toContain('hemorrhagic stroke');
      expect(result.relatedConditions).toContain('ischemic stroke');
    });

    it('should return related conditions for shortness of breath', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'shortness of breath',
      });

      expect(result.relatedConditions).toContain('asthma');
      expect(result.relatedConditions).toContain('copd');
      expect(result.relatedConditions).toContain('chf');
    });

    it('should return related conditions for seizure', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'seizure',
      });

      expect(result.relatedConditions).toContain('status epilepticus');
      expect(result.relatedConditions).toContain('hypoglycemia');
    });

    it('should return related conditions for anaphylaxis', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'anaphylaxis',
      });

      expect(result.relatedConditions).toContain('allergic reaction');
      expect(result.relatedConditions).toContain('angioedema');
    });

    it('should return related conditions for overdose', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'overdose',
      });

      expect(result.relatedConditions).toContain('opioid overdose');
      expect(result.relatedConditions).toContain('respiratory depression');
    });

    it('should return related conditions for trauma', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'trauma',
      });

      expect(result.relatedConditions).toContain('hemorrhage');
      expect(result.relatedConditions).toContain('shock');
      expect(result.relatedConditions).toContain('head injury');
    });

    it('should return related conditions for pediatric', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'pediatric',
      });

      expect(result.relatedConditions).toContain('pediatric cardiac arrest');
      expect(result.relatedConditions).toContain('pediatric seizure');
    });

    it('should return related conditions for syncope', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'syncope',
      });

      expect(result.relatedConditions).toContain('cardiac syncope');
      expect(result.relatedConditions).toContain('vasovagal');
    });

    it('should return related conditions for labor', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'labor',
      });

      expect(result.relatedConditions).toContain('childbirth');
      expect(result.relatedConditions).toContain('delivery');
    });

    it('should return related conditions for hypoglycemia', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'hypoglycemia',
      });

      expect(result.relatedConditions).toContain('hyperglycemia');
      expect(result.relatedConditions).toContain('dka');
    });

    it('should return related conditions for altered mental status', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'altered mental status',
      });

      expect(result.relatedConditions).toContain('hypoglycemia');
      expect(result.relatedConditions).toContain('stroke');
      expect(result.relatedConditions).toContain('overdose');
    });

    it('should return related conditions for respiratory distress', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'respiratory distress',
      });

      expect(result.relatedConditions).toContain('asthma');
      expect(result.relatedConditions).toContain('copd');
      expect(result.relatedConditions).toContain('croup');
    });

    it('should return related conditions for abdominal pain', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'abdominal pain',
      });

      expect(result.relatedConditions).toContain('appendicitis');
      expect(result.relatedConditions).toContain('gi bleed');
    });

    it('should return empty array for unknown conditions', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'very obscure condition xyz',
      });

      expect(result.condition).toBe('very obscure condition xyz');
      expect(result.relatedConditions).toEqual([]);
    });

    it('should handle partial matches', async () => {
      const result = await caller.comparison.getRelatedConditions({
        condition: 'possible cardiac arrest',
      });

      // Should match 'cardiac arrest' and return related conditions
      expect(result.relatedConditions.length).toBeGreaterThan(0);
    });
  });

  describe('comparison.findSimilar', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should find similar protocols for a query', async () => {
      const result = await caller.comparison.findSimilar({
        query: 'cardiac arrest',
        limit: 5,
      });

      expect(result.query).toBe('cardiac arrest');
      expect(result.protocols).toBeDefined();
      expect(Array.isArray(result.protocols)).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      const result = await caller.comparison.findSimilar({
        query: 'cardiac arrest',
        limit: 2,
      });

      expect(result.protocols.length).toBeLessThanOrEqual(2);
    });

    it('should filter by state when provided', async () => {
      const result = await caller.comparison.findSimilar({
        query: 'cardiac arrest',
        stateFilter: 'CA',
        limit: 5,
      });

      // Should have queried with state filter (mock doesn't filter, but procedure should work)
      expect(result.query).toBe('cardiac arrest');
    });
  });

  describe('comparison.compareByIds', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset mock to return proper data
      mockInFn.mockResolvedValue({
        data: [
          { 
            id: 1, 
            agency_id: 1, 
            protocol_number: 'P101', 
            protocol_title: 'Cardiac Arrest - Adult',
            section: 'Cardiac',
            content: 'Begin CPR immediately. Give epinephrine 1 mg IV every 3-5 minutes.',
            state_code: 'CA'
          },
          { 
            id: 2, 
            agency_id: 2, 
            protocol_number: 'CA-001', 
            protocol_title: 'Cardiac Arrest Management',
            section: 'Cardiac Emergencies',
            content: 'Start CPR. Epinephrine 1 mg IV. Amiodarone 300 mg IV for VF.',
            state_code: 'WA'
          },
        ],
        error: null,
      });
    });

    it('should compare protocols by IDs', async () => {
      const result = await caller.comparison.compareByIds({
        protocolIds: [1, 2],
      });

      expect(result.protocols).toBeDefined();
      expect(result.protocols.length).toBe(2);
      expect(result.comparisonSummary).toBeDefined();
    });

    it('should extract medications from compared protocols', async () => {
      const result = await caller.comparison.compareByIds({
        protocolIds: [1, 2],
      });

      // Check that medications were extracted
      const allMeds = result.protocols.flatMap(p => p.medications);
      expect(allMeds.length).toBeGreaterThan(0);
    });

    it('should generate comparison summary', async () => {
      const result = await caller.comparison.compareByIds({
        protocolIds: [1, 2],
      });

      expect(result.comparisonSummary).toBeDefined();
      expect(result.comparisonSummary.commonMedications).toBeDefined();
      expect(result.comparisonSummary.varyingMedications).toBeDefined();
    });

    it('should throw error when not enough protocols found', async () => {
      mockInFn.mockResolvedValueOnce({
        data: [{ id: 1, agency_id: 1, protocol_number: 'P101', protocol_title: 'Test', section: null, content: '', state_code: 'CA' }],
        error: null,
      });

      await expect(caller.comparison.compareByIds({
        protocolIds: [1, 999],
      })).rejects.toThrow();
    });

    it('should throw error on database error', async () => {
      mockInFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(caller.comparison.compareByIds({
        protocolIds: [1, 2],
      })).rejects.toThrow();
    });
  });
});
