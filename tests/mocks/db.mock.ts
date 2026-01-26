/**
 * Shared database mock factory
 * Provides all db exports with sensible defaults for testing
 */
import { vi } from "vitest";

/**
 * Create a complete db mock with all exports
 * Can be customized by spreading overrides
 */
export function createDbMock(overrides: Record<string, unknown> = {}) {
  const defaultUser = {
    id: 1,
    openId: "test-open-id",
    supabaseId: "test-supabase-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    tier: "free",
    queryCountToday: 0,
    lastQueryDate: null,
    selectedCountyId: null,
    stripeCustomerId: null,
    subscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    // Configuration exports
    TIER_CONFIG: {
      free: { queriesPerDay: 10, bookmarkLimit: 10, offlineAccess: false },
      pro: { queriesPerDay: 100, bookmarkLimit: 100, offlineAccess: true },
      enterprise: { queriesPerDay: -1, bookmarkLimit: -1, offlineAccess: true },
    },
    PRICING: {
      pro: { monthly: 9.99, annual: 99.99 },
      enterprise: { monthly: 29.99, annual: 299.99 },
    },

    // Connection
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),

    // User operations
    upsertUser: vi.fn().mockResolvedValue(defaultUser),
    getUserByOpenId: vi.fn().mockResolvedValue(defaultUser),
    getUserById: vi.fn().mockResolvedValue(defaultUser),
    acknowledgeDisclaimer: vi.fn().mockResolvedValue(undefined),
    hasAcknowledgedDisclaimer: vi.fn().mockResolvedValue(true),
    findOrCreateUserBySupabaseId: vi.fn().mockResolvedValue(defaultUser),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    getUserByStripeCustomerId: vi.fn().mockResolvedValue(defaultUser),
    updateUserStripeCustomerId: vi.fn().mockResolvedValue(undefined),

    // User auth and OAuth
    findOrCreateUserBySupabaseAuth: vi.fn().mockResolvedValue(defaultUser),
    linkAuthProvider: vi.fn().mockResolvedValue(undefined),
    unlinkAuthProvider: vi.fn().mockResolvedValue(undefined),
    getUserAuthProviders: vi.fn().mockResolvedValue([]),

    // User usage and tiers
    updateUserCounty: vi.fn().mockResolvedValue(undefined),
    incrementUserQueryCount: vi.fn().mockResolvedValue(undefined),
    getUserUsage: vi.fn().mockResolvedValue({
      tier: "free",
      count: 5,
      limit: 10,
    }),
    canUserQuery: vi.fn().mockResolvedValue(true),
    getRemainingQueries: vi.fn().mockResolvedValue(5),
    updateUserTier: vi.fn().mockResolvedValue(undefined),
    canUserAccessOffline: vi.fn().mockResolvedValue(false),
    getUserBookmarkLimit: vi.fn().mockResolvedValue(10),
    canUserAddCounty: vi.fn().mockResolvedValue(true),
    incrementAndCheckQueryLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),

    // County operations
    getAllCounties: vi.fn().mockResolvedValue([
      { id: 1, name: "King County", state: "WA" },
      { id: 2, name: "Los Angeles County", state: "CA" },
    ]),
    getCountyById: vi.fn().mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve({ id: 1, name: "King County", state: "WA" });
      if (id === 2) return Promise.resolve({ id: 2, name: "Los Angeles County", state: "CA" });
      return Promise.resolve(null);
    }),
    createCounty: vi.fn().mockResolvedValue({ id: 3, name: "New County", state: "CA" }),
    getAllStates: vi.fn().mockResolvedValue(["CA", "WA", "OR"]),
    getProtocolCoverageByState: vi.fn().mockResolvedValue([
      { state: "CA", count: 100 },
      { state: "WA", count: 50 },
    ]),
    getAgenciesByState: vi.fn().mockResolvedValue([
      { id: 1, name: "Agency 1", protocolCount: 10 },
    ]),
    getAgenciesWithProtocols: vi.fn().mockResolvedValue([
      { id: 1, name: "Agency 1", state: "CA", protocolCount: 10 },
    ]),

    // Protocol operations
    getProtocolsByCounty: vi.fn().mockResolvedValue([]),
    searchProtocols: vi.fn().mockResolvedValue([]),
    createProtocolChunk: vi.fn().mockResolvedValue({ id: 1 }),
    getProtocolStats: vi.fn().mockResolvedValue({ totalProtocols: 500, totalCounties: 50 }),
    getTotalProtocolStats: vi.fn().mockResolvedValue({
      totalProtocols: 500,
      totalAgencies: 50,
      totalStates: 25,
    }),

    // Protocol search
    semanticSearchProtocols: vi.fn().mockResolvedValue([]),
    semanticSearchByAgency: vi.fn().mockResolvedValue([]),

    // Query operations
    createQuery: vi.fn().mockResolvedValue({ id: 1 }),
    getUserQueries: vi.fn().mockResolvedValue([]),

    // Feedback and contact submissions
    createFeedback: vi.fn().mockResolvedValue({ id: 1 }),
    getUserFeedback: vi.fn().mockResolvedValue([]),
    getAllFeedback: vi.fn().mockResolvedValue([]),
    updateFeedbackStatus: vi.fn().mockResolvedValue(undefined),
    getAllFeedbackPaginated: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getFeedbackById: vi.fn().mockResolvedValue(null),
    createContactSubmission: vi.fn().mockResolvedValue({ id: 1 }),
    getAllContactSubmissionsPaginated: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    updateContactSubmissionStatus: vi.fn().mockResolvedValue(undefined),
    getContactSubmissionById: vi.fn().mockResolvedValue(null),
    createWaitlistSignup: vi.fn().mockResolvedValue({ id: 1 }),
    getWaitlistSignupByEmail: vi.fn().mockResolvedValue(null),

    // Admin operations
    logAuditEvent: vi.fn().mockResolvedValue(undefined),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAllUsersPaginated: vi.fn().mockResolvedValue({ items: [], total: 0 }),

    // Agency operations
    getAgencyById: vi.fn().mockResolvedValue(null),
    getAgencyBySlug: vi.fn().mockResolvedValue(null),
    createAgency: vi.fn().mockResolvedValue({ id: 1 }),
    updateAgency: vi.fn().mockResolvedValue(undefined),
    getAgencyMembers: vi.fn().mockResolvedValue([]),
    addAgencyMember: vi.fn().mockResolvedValue(undefined),
    updateAgencyMemberRole: vi.fn().mockResolvedValue(undefined),
    removeAgencyMember: vi.fn().mockResolvedValue(undefined),
    getUserAgencies: vi.fn().mockResolvedValue([]),
    isUserAgencyAdmin: vi.fn().mockResolvedValue(false),

    // Protocol versions and uploads
    getAgencyProtocolVersions: vi.fn().mockResolvedValue([]),
    createProtocolVersion: vi.fn().mockResolvedValue({ id: 1 }),
    updateProtocolVersionStatus: vi.fn().mockResolvedValue(undefined),
    createProtocolUpload: vi.fn().mockResolvedValue({ id: 1 }),
    getProtocolUpload: vi.fn().mockResolvedValue(null),
    updateProtocolUploadStatus: vi.fn().mockResolvedValue(undefined),
    getPendingProtocolUploads: vi.fn().mockResolvedValue([]),

    // Apply overrides
    ...overrides,
  };
}

/**
 * Default db mock for vi.mock
 */
export const defaultDbMock = createDbMock();
