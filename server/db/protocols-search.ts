/**
 * Protocol semantic search functionality
 * Advanced search with relevance scoring and medical term boosting
 */

import { eq, sql } from "drizzle-orm";
import { protocolChunks, counties } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Semantic search across all protocols using natural language query
 * Uses keyword matching with relevance scoring, then LLM for re-ranking
 */
export async function semanticSearchProtocols(
  query: string,
  countyId?: number,
  limit: number = 10,
  stateFilter?: string
): Promise<{
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  sourcePdfUrl: string | null;
  relevanceScore: number;
  countyId: number;
  protocolEffectiveDate: string | null;
  lastVerifiedAt: string | null;
  protocolYear: number | null;
}[]> {
  const db = await getDb();
  if (!db) return [];

  // Extract key terms from query for initial filtering
  const queryLower = query.toLowerCase();
  const keyTerms = extractKeyTerms(queryLower);

  // Get all protocols (filter by county and/or state if specified)
  let allProtocols;
  if (countyId) {
    allProtocols = await db.select().from(protocolChunks)
      .where(eq(protocolChunks.countyId, countyId));
  } else if (stateFilter) {
    // Filter by state - join with counties table
    const stateProtocols = await db.select({
      id: protocolChunks.id,
      protocolNumber: protocolChunks.protocolNumber,
      protocolTitle: protocolChunks.protocolTitle,
      section: protocolChunks.section,
      content: protocolChunks.content,
      sourcePdfUrl: protocolChunks.sourcePdfUrl,
      countyId: protocolChunks.countyId,
      protocolEffectiveDate: protocolChunks.protocolEffectiveDate,
      lastVerifiedAt: protocolChunks.lastVerifiedAt,
      protocolYear: protocolChunks.protocolYear,
    }).from(protocolChunks)
      .innerJoin(counties, eq(protocolChunks.countyId, counties.id))
      .where(eq(counties.state, stateFilter))
      .limit(10000);
    allProtocols = stateProtocols;
  } else {
    // For global search, limit initial fetch
    allProtocols = await db.select().from(protocolChunks).limit(10000);
  }

  // Score each protocol based on term matching
  const scored = allProtocols.map(chunk => {
    const content = (chunk.content + ' ' + chunk.protocolTitle + ' ' + (chunk.section || '')).toLowerCase();
    let score = 0;

    // Exact phrase match (highest weight)
    if (content.includes(queryLower)) {
      score += 100;
    }

    // Title match (high weight)
    if (chunk.protocolTitle.toLowerCase().includes(queryLower)) {
      score += 50;
    }

    // Section match
    if (chunk.section?.toLowerCase().includes(queryLower)) {
      score += 30;
    }

    // Individual term matches
    for (const term of keyTerms) {
      if (chunk.protocolTitle.toLowerCase().includes(term)) {
        score += 20;
      }
      if (chunk.section?.toLowerCase().includes(term)) {
        score += 10;
      }
      // Count occurrences in content
      const regex = new RegExp(term, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += Math.min(matches.length * 2, 20); // Cap at 20 per term
      }
    }

    // Medical term boosting
    const medicalTerms = getMedicalTerms(queryLower);
    for (const term of medicalTerms) {
      if (content.includes(term)) {
        score += 15;
      }
    }

    return {
      ...chunk,
      relevanceScore: score,
    };
  });

  // Filter out zero-score results and sort by relevance
  const filtered = scored
    .filter(p => p.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return filtered;
}

/**
 * Semantic search with agency (county) filter
 */
export async function semanticSearchByAgency(
  query: string,
  agencyId: number,
  limit = 20
): Promise<{
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  sourcePdfUrl: string | null;
  relevanceScore: number;
  countyId: number;
  protocolEffectiveDate: string | null;
  lastVerifiedAt: Date | null;
  protocolYear: number | null;
}[]> {
  // Use the existing semanticSearchProtocols with countyId filter
  return semanticSearchProtocols(query, agencyId, limit);
}

/**
 * Extract key terms from a query, removing stop words
 */
function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
    'those', 'am', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
    'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
    'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they',
    'them', 'their', 'theirs', 'themselves', 'patient', 'protocol', 'treatment',
  ]);

  return query
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length > 2 && !stopWords.has(t));
}

/**
 * Get related medical terms for a query to improve search
 */
function getMedicalTerms(query: string): string[] {
  const termMap: Record<string, string[]> = {
    'cardiac arrest': ['vf', 'vtach', 'asystole', 'pea', 'cpr', 'defibrillation', 'rosc'],
    'heart attack': ['stemi', 'nstemi', 'mi', 'myocardial', 'chest pain', 'acs'],
    'stroke': ['cva', 'tpa', 'thrombolytic', 'neurological', 'fast', 'nihss'],
    'breathing': ['respiratory', 'airway', 'ventilation', 'oxygen', 'dyspnea'],
    'asthma': ['bronchospasm', 'wheezing', 'albuterol', 'nebulizer', 'respiratory'],
    'overdose': ['narcan', 'naloxone', 'opioid', 'toxicology', 'poisoning'],
    'diabetic': ['glucose', 'hypoglycemia', 'hyperglycemia', 'dextrose', 'insulin'],
    'seizure': ['convulsion', 'epilepsy', 'status epilepticus', 'postictal', 'benzodiazepine'],
    'trauma': ['injury', 'bleeding', 'hemorrhage', 'shock', 'tbi', 'fracture'],
    'pediatric': ['child', 'infant', 'neonate', 'newborn', 'pals'],
    'allergic': ['anaphylaxis', 'epinephrine', 'epi', 'histamine', 'hives'],
    'pain': ['analgesic', 'morphine', 'fentanyl', 'ketamine', 'sedation'],
    'chest pain': ['acs', 'angina', 'stemi', 'cardiac', 'nitro', 'aspirin'],
    'shortness of breath': ['dyspnea', 'sob', 'respiratory', 'chf', 'copd', 'asthma'],
    'altered mental status': ['ams', 'loc', 'consciousness', 'confusion', 'unresponsive'],
    'hypotension': ['shock', 'low blood pressure', 'fluid', 'vasopressor'],
    'hypertension': ['high blood pressure', 'htn', 'hypertensive'],
    'arrhythmia': ['dysrhythmia', 'bradycardia', 'tachycardia', 'afib', 'svt'],
  };

  const terms: string[] = [];
  for (const [key, values] of Object.entries(termMap)) {
    if (query.includes(key)) {
      terms.push(...values);
    }
    // Also check if query contains any of the related terms
    for (const value of values) {
      if (query.includes(value)) {
        terms.push(key);
        terms.push(...values.filter(v => v !== value));
      }
    }
  }

  return [...new Set(terms)];
}
