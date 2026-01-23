import { eq, and, like, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, User, users, counties, protocolChunks, queries, feedback,
  contactSubmissions, auditLogs, InsertCounty, InsertProtocolChunk,
  InsertQuery, InsertFeedback, InsertContactSubmission, InsertAuditLog, AuditAction,
  userAuthProviders, InsertUserAuthProvider, UserAuthProvider,
  userStates, userAgencies, agencies, agencyMembers, protocolVersions, protocolUploads,
  agencyInvitations,
  Agency, InsertAgency, AgencyMember, InsertAgencyMember,
  ProtocolVersion, InsertProtocolVersion, ProtocolUpload, InsertProtocolUpload,
  // Analytics tables
  analyticsEvents, searchAnalytics, protocolAccessLogs, sessionAnalytics,
  dailyMetrics, retentionCohorts, contentGaps, conversionEvents, featureUsageStats,
  type AnalyticsEvent, type InsertAnalyticsEvent,
  type SearchAnalytics, type InsertSearchAnalytics,
  type ProtocolAccessLog, type InsertProtocolAccessLog,
  type SessionAnalytics, type InsertSessionAnalytics,
  type DailyMetric, type InsertDailyMetric,
  type RetentionCohort, type InsertRetentionCohort,
  type ContentGap, type InsertContentGap,
  type ConversionEvent, type InsertConversionEvent,
  type FeatureUsageStat, type InsertFeatureUsageStat,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Tier configuration - centralized for easy updates
export const TIER_CONFIG = {
  free: {
    dailyQueryLimit: 5,
    maxCounties: 1,
    maxBookmarks: 5,
    offlineAccess: false,
    prioritySupport: false,
  },
  pro: {
    dailyQueryLimit: Infinity,
    maxCounties: Infinity,
    maxBookmarks: Infinity,
    offlineAccess: true,
    prioritySupport: true,
  },
  enterprise: {
    dailyQueryLimit: Infinity,
    maxCounties: Infinity,
    maxBookmarks: Infinity,
    offlineAccess: true,
    prioritySupport: true,
  },
} as const;

// Pricing configuration
export const PRICING = {
  pro: {
    monthly: {
      amount: 999, // in cents
      display: "$9.99",
      interval: "month" as const,
    },
    annual: {
      amount: 8900, // in cents
      display: "$89",
      interval: "year" as const,
      savings: "25%",
    },
  },
} as const;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findOrCreateUserBySupabaseId(
  supabaseId: string,
  metadata: { email?: string; name?: string }
): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find/create user: database not available");
    return null;
  }

  try {
    // First, try to find existing user by supabaseId
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new user with supabaseId as the openId (for backwards compatibility)
    const [newUser] = await db
      .insert(users)
      .values({
        openId: supabaseId, // Use supabaseId as openId for new users
        supabaseId,
        email: metadata.email,
        name: metadata.name,
        tier: "free",
        role: "user",
        queryCountToday: 0,
      })
      .$returningId();

    // Fetch and return the created user
    const created = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find/create user by supabaseId:", error);
    return null;
  }
}

// ============ County Functions ============

export async function getAllCounties() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(counties).orderBy(counties.state, counties.name);
}

export async function getCountyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(counties).where(eq(counties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCounty(data: InsertCounty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(counties).values(data);
  return result[0].insertId;
}

// ============ Protocol Functions ============

export async function getProtocolsByCounty(countyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(protocolChunks).where(eq(protocolChunks.countyId, countyId));
}

export async function searchProtocols(countyId: number, searchTerms: string[]) {
  const db = await getDb();
  if (!db) return [];
  
  // Basic keyword search - in production this would use vector similarity
  const results = await db.select().from(protocolChunks)
    .where(eq(protocolChunks.countyId, countyId));
  
  // Filter by search terms (case-insensitive)
  const lowerTerms = searchTerms.map(t => t.toLowerCase());
  return results.filter(chunk => {
    const content = (chunk.content + ' ' + chunk.protocolTitle + ' ' + (chunk.section || '')).toLowerCase();
    return lowerTerms.some(term => content.includes(term));
  });
}

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
  lastVerifiedAt: Date | null;
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

/**
 * Get all unique states from counties
 */
export async function getAllStates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.selectDistinct({ state: counties.state }).from(counties).orderBy(counties.state);
  return results.map(r => r.state);
}

/**
 * Get protocol statistics
 */
export async function getProtocolStats() {
  const db = await getDb();
  if (!db) return { totalProtocols: 0, totalCounties: 0, bySection: {} };
  
  const [protocolCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(protocolChunks);
  const [countyCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(counties);
  
  return {
    totalProtocols: protocolCount?.count || 0,
    totalCounties: countyCount?.count || 0,
  };
}

export async function createProtocolChunk(data: InsertProtocolChunk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(protocolChunks).values(data);
  return result[0].insertId;
}

// ============ Query Functions ============

export async function createQuery(data: InsertQuery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(queries).values(data);
  return result[0].insertId;
}

export async function getUserQueries(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(queries)
    .where(eq(queries.userId, userId))
    .orderBy(sql`${queries.createdAt} DESC`)
    .limit(limit);
}

// ============ User Tier/Usage Functions ============

export async function updateUserCounty(userId: number, countyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ selectedCountyId: countyId }).where(eq(users.id, userId));
}

export async function incrementUserQueryCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const today = new Date().toISOString().split('T')[0];
  
  // Get current user
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  
  // Reset count if it's a new day
  if (user.lastQueryDate !== today) {
    await db.update(users).set({
      queryCountToday: 1,
      lastQueryDate: today,
    }).where(eq(users.id, userId));
    return 1;
  }
  
  // Increment count
  const newCount = user.queryCountToday + 1;
  await db.update(users).set({ queryCountToday: newCount }).where(eq(users.id, userId));
  return newCount;
}

export async function getUserUsage(userId: number) {
  const db = await getDb();
  if (!db) return { 
    count: 0, 
    limit: TIER_CONFIG.free.dailyQueryLimit, 
    tier: 'free' as const,
    features: TIER_CONFIG.free,
  };
  
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { 
    count: 0, 
    limit: TIER_CONFIG.free.dailyQueryLimit, 
    tier: 'free' as const,
    features: TIER_CONFIG.free,
  };
  
  const today = new Date().toISOString().split('T')[0];
  const count = user.lastQueryDate === today ? user.queryCountToday : 0;
  const tierConfig = TIER_CONFIG[user.tier];
  
  return {
    count,
    limit: tierConfig.dailyQueryLimit,
    tier: user.tier,
    features: tierConfig,
  };
}

export async function canUserQuery(userId: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return usage.count < usage.limit;
}

export async function getRemainingQueries(userId: number): Promise<number> {
  const usage = await getUserUsage(userId);
  if (usage.limit === Infinity) return Infinity;
  return Math.max(0, usage.limit - usage.count);
}

// ============ Subscription Functions ============

export async function updateUserTier(userId: number, tier: 'free' | 'pro' | 'enterprise') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ tier }).where(eq(users.id, userId));
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Feature Access Functions ============

export async function canUserAccessOffline(userId: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return usage.features.offlineAccess;
}

export async function getUserBookmarkLimit(userId: number): Promise<number> {
  const usage = await getUserUsage(userId);
  return usage.features.maxBookmarks;
}

export async function canUserAddCounty(userId: number, currentCountyCount: number): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return currentCountyCount < usage.features.maxCounties;
}

// ============ Feedback Functions ============

export async function createFeedback(data: InsertFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(feedback).values(data);
  return result[0].insertId;
}

export async function getUserFeedback(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(sql`${feedback.createdAt} DESC`)
    .limit(limit);
}

// ============ Contact Submission Functions ============

export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contactSubmissions).values(data);
  return result[0].insertId;
}

export async function getAllFeedback(status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed') {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return db.select().from(feedback)
      .where(eq(feedback.status, status))
      .orderBy(sql`${feedback.createdAt} DESC`);
  }
  
  return db.select().from(feedback)
    .orderBy(sql`${feedback.createdAt} DESC`);
}

export async function updateFeedbackStatus(
  feedbackId: number, 
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  adminNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: { status: typeof status; adminNotes?: string } = { status };
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }
  
  await db.update(feedback).set(updateData).where(eq(feedback.id, feedbackId));
}


// ============ Protocol Coverage Functions ============

export interface StateCoverage {
  state: string;
  stateCode: string;
  chunks: number;
  counties: number;
}

/**
 * Get protocol coverage statistics by state
 */
export async function getProtocolCoverageByState(): Promise<StateCoverage[]> {
  const db = await getDb();
  if (!db) return [];
  
  // State name to code mapping
  const stateCodeMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    // Handle abbreviations that might be in data
    'CA': 'CA', 'TX': 'TX', 'FL': 'FL', 'NY': 'NY', 'PA': 'PA', 'IL': 'IL', 'OH': 'OH', 'GA': 'GA',
  };
  
  const results = await db.execute(sql`
    SELECT 
      c.state,
      COUNT(pc.id) as chunk_count,
      COUNT(DISTINCT c.id) as county_count
    FROM protocolChunks pc
    JOIN counties c ON pc.countyId = c.id
    GROUP BY c.state
    ORDER BY chunk_count DESC
  `);
  
  const rows = (results[0] as unknown as any[]) || [];
  
  // Merge duplicate states (e.g., "California" and "CA")
  const mergedMap = new Map<string, { chunks: number; counties: number; displayName: string }>();
  
  for (const row of rows) {
    const stateName = row.state;
    if (!stateName || stateName === 'Unknown') continue;
    
    const stateCode = stateCodeMap[stateName] || stateName;
    const existing = mergedMap.get(stateCode);
    
    if (existing) {
      existing.chunks += parseInt(row.chunk_count);
      existing.counties += parseInt(row.county_count);
    } else {
      // Find the full state name for display
      const displayName = Object.entries(stateCodeMap).find(([name, code]) => 
        code === stateCode && name.length > 2
      )?.[0] || stateName;
      
      mergedMap.set(stateCode, {
        chunks: parseInt(row.chunk_count),
        counties: parseInt(row.county_count),
        displayName,
      });
    }
  }
  
  // Convert to array and sort by chunks
  const coverage: StateCoverage[] = Array.from(mergedMap.entries())
    .map(([stateCode, data]) => ({
      state: data.displayName,
      stateCode,
      chunks: data.chunks,
      counties: data.counties,
    }))
    .sort((a, b) => b.chunks - a.chunks);
  
  return coverage;
}

/**
 * Get total protocol statistics
 */
export async function getTotalProtocolStats(): Promise<{
  totalChunks: number;
  totalCounties: number;
  statesWithCoverage: number;
  chunksWithYear: number;
}> {
  const db = await getDb();
  if (!db) return { totalChunks: 0, totalCounties: 0, statesWithCoverage: 0, chunksWithYear: 0 };
  
  const [totalResult] = await db.execute(sql`SELECT COUNT(*) as total FROM protocolChunks`);
  const [countiesResult] = await db.execute(sql`SELECT COUNT(DISTINCT id) as total FROM counties`);
  const [statesResult] = await db.execute(sql`SELECT COUNT(DISTINCT state) as total FROM counties`);
  const [yearResult] = await db.execute(sql`SELECT COUNT(*) as total FROM protocolChunks WHERE protocolYear IS NOT NULL`);
  
  return {
    totalChunks: parseInt((totalResult as any)[0]?.total || '0'),
    totalCounties: parseInt((countiesResult as any)[0]?.total || '0'),
    statesWithCoverage: parseInt((statesResult as any)[0]?.total || '0'),
    chunksWithYear: parseInt((yearResult as any)[0]?.total || '0'),
  };
}


// ============ Agency Filter Functions ============

export interface AgencyInfo {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
}

/**
 * Get all agencies (counties) for a specific state with protocol counts
 */
export async function getAgenciesByState(state: string): Promise<AgencyInfo[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.execute(sql`
    SELECT 
      c.id,
      c.name,
      c.state,
      COUNT(pc.id) as protocol_count
    FROM counties c
    LEFT JOIN protocolChunks pc ON pc.countyId = c.id
    WHERE c.state = ${state}
    GROUP BY c.id, c.name, c.state
    ORDER BY protocol_count DESC, c.name ASC
  `);
  
  const rows = (results[0] as unknown as any[]) || [];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
}

/**
 * Get all agencies with protocol data (agencies that have at least one protocol)
 */
export async function getAgenciesWithProtocols(state?: string): Promise<AgencyInfo[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query;
  if (state) {
    query = sql`
      SELECT 
        c.id,
        c.name,
        c.state,
        COUNT(pc.id) as protocol_count
      FROM counties c
      INNER JOIN protocolChunks pc ON pc.countyId = c.id
      WHERE c.state = ${state}
      GROUP BY c.id, c.name, c.state
      HAVING COUNT(pc.id) > 0
      ORDER BY protocol_count DESC, c.name ASC
    `;
  } else {
    query = sql`
      SELECT 
        c.id,
        c.name,
        c.state,
        COUNT(pc.id) as protocol_count
      FROM counties c
      INNER JOIN protocolChunks pc ON pc.countyId = c.id
      GROUP BY c.id, c.name, c.state
      HAVING COUNT(pc.id) > 0
      ORDER BY c.state ASC, protocol_count DESC, c.name ASC
    `;
  }
  
  const results = await db.execute(query);
  const rows = (results[0] as unknown as any[]) || [];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    state: row.state,
    protocolCount: parseInt(row.protocol_count) || 0,
  }));
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

// ============ Admin Functions ============

/**
 * Log an audit event for admin actions
 */
export async function logAuditEvent(data: {
  userId: number;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log audit event: database not available");
    return;
  }

  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details || null,
    });
  } catch (error) {
    console.error("[Database] Failed to log audit event:", error);
    // Don't throw - audit logging failures shouldn't break admin operations
  }
}

/**
 * Get all feedback with optional status filter and pagination
 */
export async function getAllFeedbackPaginated(options: {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options;

  // Get total count
  let countQuery;
  if (status) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(feedback)
      .where(eq(feedback.status, status));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(feedback);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (status) {
    itemsQuery = db.select().from(feedback)
      .where(eq(feedback.status, status))
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(feedback).where(eq(feedback.id, feedbackId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all users with optional tier filter and pagination
 */
export async function getAllUsersPaginated(options: {
  tier?: 'free' | 'pro' | 'enterprise';
  role?: 'user' | 'admin';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { tier, role, limit = 50, offset = 0 } = options;

  // Build conditions array
  const conditions = [];
  if (tier) conditions.push(eq(users.tier, tier));
  if (role) conditions.push(eq(users.role, role));

  // Get total count
  let countQuery;
  if (conditions.length > 0) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(...conditions));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(users);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (conditions.length > 0) {
    itemsQuery = db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      tier: users.tier,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      tier: users.tier,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

/**
 * Get all contact submissions with optional status filter and pagination
 */
export async function getAllContactSubmissionsPaginated(options: {
  status?: 'pending' | 'reviewed' | 'resolved';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options;

  // Get total count
  let countQuery;
  if (status) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, status));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(contactSubmissions);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (status) {
    itemsQuery = db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.status, status))
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

/**
 * Update contact submission status
 */
export async function updateContactSubmissionStatus(
  submissionId: number,
  status: 'pending' | 'reviewed' | 'resolved'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, submissionId));
}

/**
 * Get contact submission by ID
 */
export async function getContactSubmissionById(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, submissionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(options: {
  userId?: number;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { userId, action, limit = 50, offset = 0 } = options;

  // Build conditions
  const conditions = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(eq(auditLogs.action, action));

  // Get total count
  let countQuery;
  if (conditions.length > 0) {
    countQuery = db.select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(and(...conditions));
  } else {
    countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(auditLogs);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Get paginated items
  let itemsQuery;
  if (conditions.length > 0) {
    itemsQuery = db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    itemsQuery = db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
  const items = await itemsQuery;

  return { items, total };
}

// ============ OAuth Provider Functions ============

/**
 * Find or create user by Supabase auth with provider info
 * Supports account linking when user signs in with multiple providers
 */
export async function findOrCreateUserBySupabaseAuth(
  supabaseId: string,
  metadata: {
    email?: string;
    name?: string;
    provider?: string;
    providerUserId?: string;
  }
): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find/create user: database not available");
    return null;
  }

  try {
    // First, try to find existing user by supabaseId
    let existing = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    // If not found by supabaseId, try by email for account linking
    if (existing.length === 0 && metadata.email) {
      existing = await db
        .select()
        .from(users)
        .where(eq(users.email, metadata.email))
        .limit(1);

      // If found by email, link the Supabase ID
      if (existing.length > 0) {
        await db.update(users)
          .set({ supabaseId })
          .where(eq(users.id, existing[0].id));
      }
    }

    if (existing.length > 0) {
      const user = existing[0];

      // Link provider if provided and not already linked
      if (metadata.provider && metadata.providerUserId) {
        await linkAuthProvider(user.id, {
          provider: metadata.provider,
          providerUserId: metadata.providerUserId,
          email: metadata.email,
        });
      }

      return user;
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        openId: supabaseId,
        supabaseId,
        email: metadata.email,
        name: metadata.name,
        tier: "free",
        role: "user",
        queryCountToday: 0,
      })
      .$returningId();

    // Link provider for new user
    if (metadata.provider && metadata.providerUserId) {
      await linkAuthProvider(newUser.id, {
        provider: metadata.provider,
        providerUserId: metadata.providerUserId,
        email: metadata.email,
      });
    }

    // Fetch and return the created user
    const created = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find/create user by supabaseAuth:", error);
    return null;
  }
}

/**
 * Link an auth provider to a user account
 */
export async function linkAuthProvider(
  userId: number,
  provider: {
    provider: string;
    providerUserId: string;
    email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Check if this provider is already linked to this user
    const existing = await db
      .select()
      .from(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.userId, userId),
          eq(userAuthProviders.provider, provider.provider)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Already linked, update providerUserId if different
      if (existing[0].providerUserId !== provider.providerUserId) {
        await db
          .update(userAuthProviders)
          .set({ providerUserId: provider.providerUserId, email: provider.email })
          .where(eq(userAuthProviders.id, existing[0].id));
      }
      return { success: true };
    }

    // Check if this provider account is linked to another user
    const otherUser = await db
      .select()
      .from(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.provider, provider.provider),
          eq(userAuthProviders.providerUserId, provider.providerUserId)
        )
      )
      .limit(1);

    if (otherUser.length > 0) {
      return { success: false, error: "This account is already linked to another user" };
    }

    // Link the provider
    await db.insert(userAuthProviders).values({
      userId,
      provider: provider.provider,
      providerUserId: provider.providerUserId,
      email: provider.email,
    });

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to link auth provider:", error);
    return { success: false, error: "Failed to link provider" };
  }
}

/**
 * Unlink an auth provider from a user account
 */
export async function unlinkAuthProvider(
  userId: number,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Check how many providers the user has
    const providers = await db
      .select()
      .from(userAuthProviders)
      .where(eq(userAuthProviders.userId, userId));

    if (providers.length <= 1) {
      return { success: false, error: "Cannot unlink the only authentication method" };
    }

    // Remove the provider
    await db
      .delete(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.userId, userId),
          eq(userAuthProviders.provider, provider)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to unlink auth provider:", error);
    return { success: false, error: "Failed to unlink provider" };
  }
}

/**
 * Get all linked providers for a user
 */
export async function getUserAuthProviders(userId: number): Promise<UserAuthProvider[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userAuthProviders)
    .where(eq(userAuthProviders.userId, userId));
}

// ============ Agency Admin Functions ============

/**
 * Get agency by ID
 */
export async function getAgencyById(agencyId: number): Promise<Agency | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get agency by slug
 */
export async function getAgencyBySlug(slug: string): Promise<Agency | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agencies).where(eq(agencies.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new agency
 */
export async function createAgency(data: InsertAgency): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agencies).values(data);
  return result[0].insertId;
}

/**
 * Update agency
 */
export async function updateAgency(
  agencyId: number,
  data: Partial<InsertAgency>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agencies).set(data).where(eq(agencies.id, agencyId));
}

/**
 * Get agency members
 */
export async function getAgencyMembers(agencyId: number): Promise<AgencyMember[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(agencyMembers)
    .where(eq(agencyMembers.agencyId, agencyId))
    .orderBy(desc(agencyMembers.createdAt));
}

/**
 * Add member to agency
 */
export async function addAgencyMember(data: InsertAgencyMember): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agencyMembers).values(data);
  return result[0].insertId;
}

/**
 * Update agency member role
 */
export async function updateAgencyMemberRole(
  memberId: number,
  role: "owner" | "admin" | "protocol_author" | "member"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agencyMembers).set({ role }).where(eq(agencyMembers.id, memberId));
}

/**
 * Remove member from agency
 */
export async function removeAgencyMember(memberId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(agencyMembers).where(eq(agencyMembers.id, memberId));
}

/**
 * Get user's agencies (where they are a member)
 */
export async function getUserAgencies(userId: number): Promise<Agency[]> {
  const db = await getDb();
  if (!db) return [];

  const memberships = await db
    .select({ agencyId: agencyMembers.agencyId })
    .from(agencyMembers)
    .where(and(eq(agencyMembers.userId, userId), eq(agencyMembers.status, "active")));

  if (memberships.length === 0) return [];

  const agencyIds = memberships.map((m) => m.agencyId);
  const result = await db
    .select()
    .from(agencies)
    .where(sql`${agencies.id} IN (${sql.join(agencyIds.map(id => sql`${id}`), sql`, `)})`);

  return result;
}

/**
 * Check if user is agency admin
 */
export async function isUserAgencyAdmin(userId: number, agencyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(agencyMembers)
    .where(
      and(
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.agencyId, agencyId),
        eq(agencyMembers.status, "active"),
        sql`${agencyMembers.role} IN ('owner', 'admin')`
      )
    )
    .limit(1);

  return result.length > 0;
}

// ============ Protocol Version Functions ============

/**
 * Get protocol versions for agency
 */
export async function getAgencyProtocolVersions(
  agencyId: number,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<{ items: ProtocolVersion[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { status, limit = 50, offset = 0 } = options || {};

  const conditions = [eq(protocolVersions.agencyId, agencyId)];
  if (status) {
    conditions.push(eq(protocolVersions.status, status as any));
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(protocolVersions)
    .where(and(...conditions));

  const items = await db
    .select()
    .from(protocolVersions)
    .where(and(...conditions))
    .orderBy(desc(protocolVersions.createdAt))
    .limit(limit)
    .offset(offset);

  return { items, total: countResult?.count || 0 };
}

/**
 * Create protocol version
 */
export async function createProtocolVersion(data: InsertProtocolVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(protocolVersions).values(data);
  return result[0].insertId;
}

/**
 * Update protocol version status
 */
export async function updateProtocolVersionStatus(
  versionId: number,
  status: "draft" | "review" | "approved" | "published" | "archived",
  approvedBy?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertProtocolVersion> = { status };
  if (status === "approved" && approvedBy) {
    updateData.approvedBy = approvedBy;
    updateData.approvedAt = new Date();
  }
  if (status === "published") {
    updateData.publishedAt = new Date();
  }

  await db.update(protocolVersions).set(updateData).where(eq(protocolVersions.id, versionId));
}

// ============ Protocol Upload Functions ============

/**
 * Create protocol upload job
 */
export async function createProtocolUpload(data: InsertProtocolUpload): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(protocolUploads).values(data);
  return result[0].insertId;
}

/**
 * Get protocol upload by ID
 */
export async function getProtocolUpload(uploadId: number): Promise<ProtocolUpload | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(protocolUploads).where(eq(protocolUploads.id, uploadId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update protocol upload status
 */
export async function updateProtocolUploadStatus(
  uploadId: number,
  status: "pending" | "processing" | "chunking" | "embedding" | "completed" | "failed",
  details?: { progress?: number; chunksCreated?: number; errorMessage?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertProtocolUpload> = { status };
  if (details?.progress !== undefined) updateData.progress = details.progress;
  if (details?.chunksCreated !== undefined) updateData.chunksCreated = details.chunksCreated;
  if (details?.errorMessage) updateData.errorMessage = details.errorMessage;

  if (status === "processing") {
    updateData.processingStartedAt = new Date();
  }
  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date();
  }

  await db.update(protocolUploads).set(updateData).where(eq(protocolUploads.id, uploadId));
}

/**
 * Get pending protocol uploads for processing
 */
export async function getPendingProtocolUploads(limit = 10): Promise<ProtocolUpload[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(protocolUploads)
    .where(eq(protocolUploads.status, "pending"))
    .orderBy(protocolUploads.createdAt)
    .limit(limit);
}
