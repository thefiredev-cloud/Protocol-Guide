/**
 * Database module index
 * Re-exports all database operations for backward compatibility
 */

// Configuration
export { TIER_CONFIG, PRICING } from "./config";

// Connection
export { getDb } from "./connection";

// User operations
export {
  upsertUser,
  getUserByOpenId,
  getUserById,
  acknowledgeDisclaimer,
  hasAcknowledgedDisclaimer,
  findOrCreateUserBySupabaseId,
  updateUserRole,
  getUserByStripeCustomerId,
  updateUserStripeCustomerId,
} from "./users";

// User auth and OAuth
export {
  findOrCreateUserBySupabaseAuth,
  linkAuthProvider,
  unlinkAuthProvider,
  getUserAuthProviders,
} from "./users-auth";

// User usage and tiers
export {
  updateUserCounty,
  incrementUserQueryCount,
  getUserUsage,
  canUserQuery,
  getRemainingQueries,
  updateUserTier,
  canUserAccessOffline,
  getUserBookmarkLimit,
  canUserAddCounty,
  incrementAndCheckQueryLimit,
} from "./users-usage";

// County operations
export {
  getAllCounties,
  getCountyById,
  createCounty,
  getAllStates,
  getProtocolCoverageByState,
  getAgenciesByState,
  getAgenciesWithProtocols,
} from "./counties";

export type { StateCoverage, AgencyInfo } from "./counties";

// Protocol operations
export {
  getProtocolsByCounty,
  searchProtocols,
  createProtocolChunk,
  getProtocolStats,
  getTotalProtocolStats,
} from "./protocols";

// Protocol search
export {
  semanticSearchProtocols,
  semanticSearchByAgency,
} from "./protocols-search";

// Query operations
export {
  createQuery,
  getUserQueries,
} from "./queries";

// Feedback and contact submissions
export {
  createFeedback,
  getUserFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  getAllFeedbackPaginated,
  getFeedbackById,
  createContactSubmission,
  getAllContactSubmissionsPaginated,
  updateContactSubmissionStatus,
  getContactSubmissionById,
} from "./feedback";

// Admin operations
export {
  logAuditEvent,
  getAuditLogs,
  getAllUsersPaginated,
} from "./admin";

// Agency operations
export {
  getAgencyById,
  getAgencyBySlug,
  createAgency,
  updateAgency,
  getAgencyMembers,
  addAgencyMember,
  updateAgencyMemberRole,
  removeAgencyMember,
  getUserAgencies,
  isUserAgencyAdmin,
} from "./agencies";

// Protocol versions and uploads
export {
  getAgencyProtocolVersions,
  createProtocolVersion,
  updateProtocolVersionStatus,
  createProtocolUpload,
  getProtocolUpload,
  updateProtocolUploadStatus,
  getPendingProtocolUploads,
} from "./protocol-versions";
