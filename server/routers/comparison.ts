/**
 * Protocol Comparison Router
 * 
 * Provides tools for comparing similar protocols side-by-side.
 * Helps with differential diagnosis by showing treatment variations
 * for similar conditions across different agencies/regions.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, publicRateLimitedProcedure, router } from "../_core/trpc";
import { semanticSearchProtocols } from "../_core/embeddings";
import { generateEmbedding } from "../_core/embeddings/generate";
import { normalizeEmsQuery } from "../_core/ems-query-normalizer";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for direct queries
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Comparison result item with enhanced metadata
 */
type ComparisonProtocol = {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  fullContent: string;
  agencyId: number;
  agencyName: string;
  stateCode: string | null;
  similarity: number;
  // Structured content for comparison
  keyPoints: string[];
  medications: MedicationInfo[];
  contraindications: string[];
};

/**
 * Medication information extracted from protocol
 */
type MedicationInfo = {
  name: string;
  dose: string | null;
  route: string | null;
  indication: string | null;
};

/**
 * Comparison result containing multiple protocols
 */
type ComparisonResult = {
  query: string;
  primaryCondition: string;
  protocols: ComparisonProtocol[];
  comparisonSummary: ComparisonSummary;
};

/**
 * Summary of key differences between protocols
 */
type ComparisonSummary = {
  commonMedications: string[];
  varyingMedications: string[];
  doseVariations: { medication: string; variations: string[] }[];
  keyDifferences: string[];
};

// Common medication patterns for extraction
const MEDICATION_PATTERNS = [
  // Name with dose and route
  /\b(epinephrine|epi)\s*(?:1:10,?000|1:1,?000)?\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|mL|units?))\s*(?:via\s+)?(IV|IO|IM|SQ|IN|ET|PO|SL)?/gi,
  /\b(atropine)\s*(\d+(?:\.\d+)?\s*(?:mg|mcg))\s*(?:via\s+)?(IV|IO|IM)?/gi,
  /\b(amiodarone)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IO)?/gi,
  /\b(lidocaine)\s*(\d+(?:\.\d+)?\s*(?:mg(?:\/kg)?))\s*(?:via\s+)?(IV|IO)?/gi,
  /\b(adenosine)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV)?/gi,
  /\b(nitroglycerin|nitro|ntg)\s*(\d+(?:\.\d+)?\s*(?:mg|mcg))\s*(?:via\s+)?(SL|IV)?/gi,
  /\b(aspirin|asa)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(PO)?/gi,
  /\b(morphine)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM)?/gi,
  /\b(fentanyl)\s*(\d+(?:\.\d+)?\s*(?:mcg))\s*(?:via\s+)?(IV|IM|IN)?/gi,
  /\b(naloxone|narcan)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IO|IM|IN)?/gi,
  /\b(midazolam|versed)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM|IN)?/gi,
  /\b(lorazepam|ativan)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM)?/gi,
  /\b(diazepam|valium)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM|PR)?/gi,
  /\b(diphenhydramine|benadryl)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM|PO)?/gi,
  /\b(dextrose|d50|d10|d25)\s*(\d+(?:\.\d+)?\s*(?:g|mL|%))\s*(?:via\s+)?(IV|IO)?/gi,
  /\b(albuterol)\s*(\d+(?:\.\d+)?\s*(?:mg|mL))\s*(?:via\s+)?(NEB|MDI)?/gi,
  /\b(magnesium(?:\s+sulfate)?)\s*(\d+(?:\.\d+)?\s*(?:g|mg))\s*(?:via\s+)?(IV|IO)?/gi,
  /\b(ketamine)\s*(\d+(?:\.\d+)?\s*(?:mg(?:\/kg)?))\s*(?:via\s+)?(IV|IM|IN)?/gi,
  /\b(etomidate)\s*(\d+(?:\.\d+)?\s*(?:mg(?:\/kg)?))\s*(?:via\s+)?(IV)?/gi,
  /\b(rocuronium|roc)\s*(\d+(?:\.\d+)?\s*(?:mg(?:\/kg)?))\s*(?:via\s+)?(IV)?/gi,
  /\b(succinylcholine|succ)\s*(\d+(?:\.\d+)?\s*(?:mg(?:\/kg)?))\s*(?:via\s+)?(IV)?/gi,
  /\b(ondansetron|zofran)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IV|IM|PO|ODT)?/gi,
  /\b(glucagon)\s*(\d+(?:\.\d+)?\s*(?:mg))\s*(?:via\s+)?(IM|SQ|IV)?/gi,
  /\b(calcium(?:\s+chloride)?)\s*(\d+(?:\.\d+)?\s*(?:g|mg|mL))\s*(?:via\s+)?(IV)?/gi,
  /\b(sodium\s+bicarbonate|bicarb)\s*(\d+(?:\.\d+)?\s*(?:mEq|mL))\s*(?:via\s+)?(IV)?/gi,
];

// Contraindication keywords
const CONTRAINDICATION_KEYWORDS = [
  'contraindicated',
  'do not give',
  'do not administer',
  'avoid',
  'caution',
  'not recommended',
  'hold if',
  'discontinue if',
  'allergy',
  'hypersensitivity',
];

/**
 * Extract medications from protocol content
 */
function extractMedications(content: string): MedicationInfo[] {
  const medications: MedicationInfo[] = [];
  const seen = new Set<string>();

  for (const pattern of MEDICATION_PATTERNS) {
    let match;
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const [, name, dose, route] = match;
      const normalizedName = name.toLowerCase().trim();
      
      // Avoid duplicates
      const key = `${normalizedName}-${dose}-${route || 'unknown'}`;
      if (!seen.has(key)) {
        seen.add(key);
        medications.push({
          name: normalizedName,
          dose: dose?.trim() || null,
          route: route?.toUpperCase() || null,
          indication: null, // Could be enhanced with NLP
        });
      }
    }
  }

  return medications;
}

/**
 * Extract contraindications from protocol content
 */
function extractContraindications(content: string): string[] {
  const contraindications: string[] = [];
  const contentLower = content.toLowerCase();
  const sentences = content.split(/[.!?]+/);

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    if (CONTRAINDICATION_KEYWORDS.some(keyword => sentenceLower.includes(keyword))) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length < 300) {
        contraindications.push(trimmed);
      }
    }
  }

  return contraindications.slice(0, 5); // Limit to 5 most relevant
}

/**
 * Extract key points from protocol content
 */
function extractKeyPoints(content: string, protocolTitle: string): string[] {
  const keyPoints: string[] = [];
  const contentLower = content.toLowerCase();
  
  // Look for numbered steps or bullet points
  const stepPatterns = [
    /(?:^|\n)\s*\d+[.)]\s*([^.\n]{20,200})/g,
    /(?:^|\n)\s*[•-]\s*([^.\n]{20,200})/g,
    /(?:^|\n)\s*(?:first|then|next|finally)[,:]?\s*([^.\n]{20,150})/gi,
  ];

  for (const pattern of stepPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      const point = match[1].trim();
      if (point.length > 15 && !keyPoints.includes(point)) {
        keyPoints.push(point);
      }
    }
  }

  // If no structured points found, extract important sentences
  if (keyPoints.length < 3) {
    const importantKeywords = ['administer', 'give', 'perform', 'assess', 'monitor', 'if', 'when'];
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      if (importantKeywords.some(kw => sentenceLower.includes(kw)) && !keyPoints.includes(sentence)) {
        keyPoints.push(sentence.substring(0, 200));
        if (keyPoints.length >= 5) break;
      }
    }
  }

  return keyPoints.slice(0, 5);
}

/**
 * Generate comparison summary between protocols
 */
function generateComparisonSummary(protocols: ComparisonProtocol[]): ComparisonSummary {
  if (protocols.length < 2) {
    return {
      commonMedications: [],
      varyingMedications: [],
      doseVariations: [],
      keyDifferences: [],
    };
  }

  // Collect all medications by name
  const medsByName: Map<string, { doses: Set<string>; protocols: Set<string> }> = new Map();

  for (const protocol of protocols) {
    for (const med of protocol.medications) {
      if (!medsByName.has(med.name)) {
        medsByName.set(med.name, { doses: new Set(), protocols: new Set() });
      }
      const entry = medsByName.get(med.name)!;
      if (med.dose) entry.doses.add(med.dose);
      entry.protocols.add(protocol.agencyName);
    }
  }

  // Find common vs varying medications
  const commonMedications: string[] = [];
  const varyingMedications: string[] = [];
  const doseVariations: { medication: string; variations: string[] }[] = [];

  for (const [medName, data] of medsByName) {
    if (data.protocols.size === protocols.length) {
      commonMedications.push(medName);
      if (data.doses.size > 1) {
        doseVariations.push({
          medication: medName,
          variations: Array.from(data.doses),
        });
      }
    } else if (data.protocols.size < protocols.length) {
      varyingMedications.push(medName);
    }
  }

  // Generate key differences
  const keyDifferences: string[] = [];

  if (doseVariations.length > 0) {
    for (const variation of doseVariations.slice(0, 3)) {
      keyDifferences.push(
        `${variation.medication} doses vary: ${variation.variations.join(' vs ')}`
      );
    }
  }

  if (varyingMedications.length > 0) {
    keyDifferences.push(
      `Medications not in all protocols: ${varyingMedications.slice(0, 3).join(', ')}`
    );
  }

  // Check for contraindication differences
  const allContraindications = protocols.flatMap(p => p.contraindications);
  const uniqueContraindications = [...new Set(allContraindications)];
  if (uniqueContraindications.length > protocols.length) {
    keyDifferences.push('Contraindication lists vary between protocols');
  }

  return {
    commonMedications,
    varyingMedications,
    doseVariations,
    keyDifferences: keyDifferences.slice(0, 5),
  };
}

export const comparisonRouter = router({
  /**
   * Find similar protocols for comparison
   * Searches across agencies to find protocols for the same condition
   */
  findSimilar: publicRateLimitedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      stateCode: z.string().optional(),
      limit: z.number().min(2).max(10).default(5),
    }))
    .query(async ({ input }) => {
      try {
        // Normalize the query
        const normalized = normalizeEmsQuery(input.query);
        const primaryCondition = normalized.extractedConditions[0] || input.query;

        console.log(`[Comparison] Finding similar protocols for: "${input.query}"`);

        // Search for similar protocols across different agencies
        const searchResults = await semanticSearchProtocols({
          query: normalized.normalized,
          stateCode: input.stateCode || null,
          limit: input.limit * 3, // Get more results to filter
          threshold: 0.4, // Lower threshold for broader comparison
        });

        // Deduplicate by protocol title (keep best match per unique title)
        const seenTitles = new Map<string, typeof searchResults[0]>();
        
        for (const result of searchResults) {
          const titleKey = result.protocol_title.toLowerCase().trim();
          if (!seenTitles.has(titleKey) || seenTitles.get(titleKey)!.similarity < result.similarity) {
            seenTitles.set(titleKey, result);
          }
        }

        // Get unique protocols
        const uniqueResults = Array.from(seenTitles.values())
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, input.limit);

        // Fetch agency information for each result
        const agencyIds = [...new Set(uniqueResults.map(r => r.agency_id))];
        
        let agencies: { id: number; name: string; state_code: string }[] = [];
        if (agencyIds.length > 0) {
          const { data } = await supabase
            .from('agencies')
            .select('id, name, state_code')
            .in('id', agencyIds);
          agencies = data || [];
        }

        const agencyMap = new Map(agencies.map(a => [a.id, a]));

        // Build comparison protocols with extracted info
        const protocols: ComparisonProtocol[] = uniqueResults.map(result => {
          const agency = agencyMap.get(result.agency_id);
          const content = result.content;
          
          return {
            id: result.id,
            protocolNumber: result.protocol_number,
            protocolTitle: result.protocol_title,
            section: result.section,
            content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
            fullContent: content,
            agencyId: result.agency_id,
            agencyName: agency?.name || `Agency ${result.agency_id}`,
            stateCode: result.state_code || agency?.state_code || null,
            similarity: result.similarity,
            keyPoints: extractKeyPoints(content, result.protocol_title),
            medications: extractMedications(content),
            contraindications: extractContraindications(content),
          };
        });

        // Generate comparison summary
        const comparisonSummary = generateComparisonSummary(protocols);

        const response: ComparisonResult = {
          query: input.query,
          primaryCondition,
          protocols,
          comparisonSummary,
        };

        console.log(`[Comparison] Found ${protocols.length} protocols to compare`);

        return response;
      } catch (error) {
        console.error('[Comparison] findSimilar error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find similar protocols',
          cause: error,
        });
      }
    }),

  /**
   * Compare specific protocols by ID
   * For side-by-side comparison of selected protocols
   */
  compareByIds: publicRateLimitedProcedure
    .input(z.object({
      protocolIds: z.array(z.number()).min(2).max(5),
    }))
    .query(async ({ input }) => {
      try {
        console.log(`[Comparison] Comparing protocols: ${input.protocolIds.join(', ')}`);

        // Fetch protocols directly from database
        const { data: chunks, error } = await supabase
          .from('manus_protocol_chunks')
          .select('id, agency_id, protocol_number, protocol_title, section, content, state_code')
          .in('id', input.protocolIds);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        if (!chunks || chunks.length < 2) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Could not find enough protocols to compare',
          });
        }

        // Fetch agency information
        const agencyIds = [...new Set(chunks.map(c => c.agency_id))];
        const { data: agencies } = await supabase
          .from('agencies')
          .select('id, name, state_code')
          .in('id', agencyIds);

        const agencyMap = new Map((agencies || []).map(a => [a.id, a]));

        // Build comparison protocols
        const protocols: ComparisonProtocol[] = chunks.map(chunk => {
          const agency = agencyMap.get(chunk.agency_id);
          const content = chunk.content || '';
          
          return {
            id: chunk.id,
            protocolNumber: chunk.protocol_number,
            protocolTitle: chunk.protocol_title,
            section: chunk.section,
            content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
            fullContent: content,
            agencyId: chunk.agency_id,
            agencyName: agency?.name || `Agency ${chunk.agency_id}`,
            stateCode: chunk.state_code || agency?.state_code || null,
            similarity: 1.0, // Direct selection
            keyPoints: extractKeyPoints(content, chunk.protocol_title),
            medications: extractMedications(content),
            contraindications: extractContraindications(content),
          };
        });

        // Generate comparison summary
        const comparisonSummary = generateComparisonSummary(protocols);

        const response: ComparisonResult = {
          query: protocols[0]?.protocolTitle || 'Selected protocols',
          primaryCondition: protocols[0]?.protocolTitle || 'Multiple conditions',
          protocols,
          comparisonSummary,
        };

        return response;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Comparison] compareByIds error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to compare protocols',
          cause: error,
        });
      }
    }),

  /**
   * Get related protocols for a condition
   * Returns protocols that are commonly searched together
   */
  getRelatedConditions: publicRateLimitedProcedure
    .input(z.object({
      condition: z.string().min(1).max(200),
    }))
    .query(async ({ input }) => {
      // Map of conditions to related conditions for differential diagnosis
      const relatedConditionsMap: Record<string, string[]> = {
        'cardiac arrest': ['ventricular fibrillation', 'asystole', 'pea', 'rosc', 'post cardiac arrest'],
        'chest pain': ['stemi', 'nstemi', 'acs', 'angina', 'pulmonary embolism', 'aortic dissection'],
        'shortness of breath': ['asthma', 'copd', 'chf', 'pneumothorax', 'pulmonary embolism', 'anaphylaxis'],
        'stroke': ['tia', 'hemorrhagic stroke', 'ischemic stroke', 'hypoglycemia', 'seizure'],
        'seizure': ['status epilepticus', 'hypoglycemia', 'stroke', 'overdose', 'febrile seizure'],
        'altered mental status': ['hypoglycemia', 'stroke', 'overdose', 'head injury', 'sepsis', 'seizure'],
        'anaphylaxis': ['allergic reaction', 'angioedema', 'asthma', 'shock'],
        'hypoglycemia': ['hyperglycemia', 'dka', 'altered mental status', 'seizure'],
        'trauma': ['hemorrhage', 'shock', 'head injury', 'spinal injury', 'chest trauma'],
        'overdose': ['opioid overdose', 'altered mental status', 'respiratory depression', 'cardiac arrest'],
        'pediatric': ['pediatric cardiac arrest', 'pediatric seizure', 'pediatric respiratory', 'pediatric trauma'],
        'respiratory distress': ['asthma', 'copd', 'croup', 'anaphylaxis', 'pulmonary edema'],
        'abdominal pain': ['appendicitis', 'gi bleed', 'aaa', 'ectopic pregnancy', 'pancreatitis'],
        'syncope': ['cardiac syncope', 'vasovagal', 'hypoglycemia', 'arrhythmia', 'stroke'],
        'labor': ['childbirth', 'delivery', 'postpartum hemorrhage', 'eclampsia', 'prolapsed cord'],
      };

      const conditionLower = input.condition.toLowerCase();
      
      // Find matching related conditions
      for (const [key, related] of Object.entries(relatedConditionsMap)) {
        if (conditionLower.includes(key) || key.includes(conditionLower)) {
          return {
            condition: input.condition,
            relatedConditions: related,
          };
        }
      }

      // Default fallback
      return {
        condition: input.condition,
        relatedConditions: [],
      };
    }),
});

export type ComparisonRouter = typeof comparisonRouter;
