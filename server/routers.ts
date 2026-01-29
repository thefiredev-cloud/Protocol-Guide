/**
 * App Router
 * Composes all domain routers into the main tRPC router
 *
 * 17 router modules organized by domain for maintainability:
 * - system: Health checks and system status
 * - auth: Authentication procedures
 * - counties: County listing and retrieval
 * - user: User profile, counties, and settings
 * - search: Semantic search with Voyage AI + pgvector
 * - query: Protocol queries with Claude RAG
 * - voice: Voice transcription
 * - feedback: User feedback submissions
 * - contact: Public contact form
 * - subscription: Stripe payments
 * - admin: Admin-only procedures
 * - agencyAdmin: B2B agency management
 * - integration: Partner tracking
 * - referral: Viral growth referral system
 * - jobs: Background job management
 * - comparison: Protocol comparison for differential diagnosis
 * - quickReference: Quick reference cards for high-frequency protocols
 */

import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

// Import domain routers
import { authRouter } from "./routers/auth";
import { countiesRouter } from "./routers/counties";
import { userRouter } from "./routers/user";
import { searchRouter } from "./routers/search";
import { queryRouter } from "./routers/query";
import { voiceRouter } from "./routers/voice";
import { feedbackRouter } from "./routers/feedback";
import { contactRouter } from "./routers/contact";
import { subscriptionRouter } from "./routers/subscription";
import { adminRouter } from "./routers/admin";
import { agencyAdminRouter } from "./routers/agency-admin/index";
import { integrationRouter } from "./routers/integration";
import { referralRouter } from "./routers/referral/index";
import { jobsRouter } from "./routers/jobs";
import { comparisonRouter } from "./routers/comparison";
import { quickReferenceRouter } from "./routers/quick-reference";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  counties: countiesRouter,
  user: userRouter,
  search: searchRouter,
  query: queryRouter,
  voice: voiceRouter,
  feedback: feedbackRouter,
  contact: contactRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  agencyAdmin: agencyAdminRouter,
  integration: integrationRouter,
  referral: referralRouter,
  jobs: jobsRouter,
  comparison: comparisonRouter,
  quickReference: quickReferenceRouter,
});

export type AppRouter = typeof appRouter;
