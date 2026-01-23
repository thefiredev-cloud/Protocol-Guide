/**
 * Referral System Router
 * Composes all referral sub-routers
 *
 * Sub-modules:
 * - user-procedures: User's codes, stats, and referral history
 * - code-procedures: Code validation, redemption, and share templates
 * - analytics-procedures: Leaderboard and event tracking
 */

import { router } from "../../_core/trpc";
import { userProcedures } from "./user-procedures";
import { codeProcedures } from "./code-procedures";
import { analyticsProcedures } from "./analytics-procedures";

export const referralRouter = createTRPCRouter({
  // User referral operations
  getMyReferralCode: userProcedures.getMyReferralCode,
  getMyStats: userProcedures.getMyStats,
  getMyReferrals: userProcedures.getMyReferrals,

  // Code management
  validateCode: codeProcedures.validateCode,
  redeemCode: codeProcedures.redeemCode,
  getShareTemplates: codeProcedures.getShareTemplates,

  // Analytics and tracking
  getLeaderboard: analyticsProcedures.getLeaderboard,
  trackViralEvent: analyticsProcedures.trackViralEvent,
});

export type ReferralRouter = typeof referralRouter;
