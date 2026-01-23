/**
 * Lazy-loaded admin routes to reduce initial bundle size
 * Admin features are loaded on-demand when users navigate to admin pages
 */
import { lazy } from "react";

// Lazy load admin screens
export const AdminIndex = lazy(() => import("@/app/admin/index"));
export const AdminSettings = lazy(() => import("@/app/admin/settings/index"));
export const AdminBilling = lazy(() => import("@/app/admin/settings/billing"));
export const AdminAnalytics = lazy(() => import("@/app/admin/analytics/index"));
export const AdminTeam = lazy(() => import("@/app/admin/team/index"));
export const AdminTeamInvite = lazy(() => import("@/app/admin/team/invite"));
export const AdminProtocols = lazy(() => import("@/app/admin/protocols/index"));
export const AdminProtocolsUpload = lazy(() => import("@/app/admin/protocols/upload"));
export const AdminMonitoring = lazy(() => import("@/app/admin/monitoring"));
