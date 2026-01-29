/**
 * Router Index
 * Composes all domain routers into a single appRouter
 */

export { authRouter, type AuthRouter } from "./auth";
export { countiesRouter, type CountiesRouter } from "./counties";
export { userRouter, type UserRouter } from "./user";
export { searchRouter, type SearchRouter } from "./search";
export { queryRouter, type QueryRouter } from "./query";
export { adminRouter, type AdminRouter } from "./admin";
export { voiceRouter, type VoiceRouter } from "./voice";
export { feedbackRouter, type FeedbackRouter } from "./feedback";
export { contactRouter, type ContactRouter } from "./contact";
export { subscriptionRouter, type SubscriptionRouter } from "./subscription";
export { agencyAdminRouter } from "./agency-admin";
export { integrationRouter } from "./integration";
export { referralRouter, type ReferralRouter } from "./referral";
export { comparisonRouter, type ComparisonRouter } from "./comparison";
export { quickReferenceRouter, type QuickReferenceRouter } from "./quick-reference";
