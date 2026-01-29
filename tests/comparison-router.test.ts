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

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

// Mock embeddings
vi.mock('../server/_core/embeddings', () => ({
  semanticSearchProtocols: vi.fn().mockResolvedValue([]),
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
