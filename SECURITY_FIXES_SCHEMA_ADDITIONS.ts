/**
 * Security Fix: Add Referral Tables to Drizzle Schema
 *
 * Add these table definitions to drizzle/schema.ts
 * After adding, run: npm run db:generate && npm run db:push
 */

import { mysqlTable, int, varchar, timestamp, tinyint, json, index } from "drizzle-orm/mysql-core";

// ============================================
// REFERRAL SYSTEM TABLES
// ============================================

/**
 * Referral Codes - User-generated codes for inviting others
 */
export const referralCodes = mysqlTable("referral_codes", {
  id: int().autoincrement().notNull(),
  userId: int().notNull(),
  code: varchar({ length: 20 }).notNull(),
  rewardType: varchar({ length: 50 }).default('pro_days'),
  rewardAmount: int().default(7),
  maxUses: int(),
  usesCount: int().notNull().default(0),
  expiresAt: timestamp({ mode: 'date' }),
  isActive: tinyint().notNull().default(1),
  createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("idx_referral_code").on(table.code),
  userIdx: index("idx_referral_user").on(table.userId),
  activeIdx: index("idx_referral_active").on(table.isActive),
}));

/**
 * Referral Redemptions - Tracks when codes are used
 */
export const referralRedemptions = mysqlTable("referral_redemptions", {
  id: int().autoincrement().notNull(),
  referralCodeId: int().notNull(),
  referredUserId: int().notNull(),
  referrerUserId: int().notNull(),
  referrerReward: json().$type<{ type: string; amount: number; applied: boolean }>(),
  refereeReward: json().$type<{ type: string; amount: number; applied: boolean }>(),
  redeemedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
  convertedToPaid: tinyint().notNull().default(0),
  conversionDate: timestamp({ mode: 'date' }),
}, (table) => ({
  referredIdx: index("idx_referred_user").on(table.referredUserId),
  referrerIdx: index("idx_referrer_user").on(table.referrerUserId),
  codeIdx: index("idx_referral_code").on(table.referralCodeId),
  convertedIdx: index("idx_converted").on(table.convertedToPaid),
}));

/**
 * User Referral Stats - Aggregate statistics per user
 */
export const userReferralStats = mysqlTable("user_referral_stats", {
  id: int().autoincrement().notNull(),
  userId: int().notNull(),
  totalReferrals: int().notNull().default(0),
  successfulReferrals: int().notNull().default(0),
  pendingReferrals: int().notNull().default(0),
  proDaysEarned: int().notNull().default(0),
  creditsEarned: int().notNull().default(0),
  currentTier: varchar({ length: 20 }).notNull().default('bronze'),
  rank: int(),
  lastReferralAt: timestamp({ mode: 'date' }),
  updatedAt: timestamp({ mode: 'date' }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("idx_stats_user").on(table.userId),
  tierIdx: index("idx_stats_tier").on(table.currentTier),
  rankIdx: index("idx_stats_rank").on(table.rank),
  successfulIdx: index("idx_successful_referrals").on(table.successfulReferrals),
}));

/**
 * Viral Events - Tracking sharing behavior
 */
export const viralEvents = mysqlTable("viral_events", {
  id: int().autoincrement().notNull(),
  userId: int().notNull(),
  eventType: varchar({ length: 100 }).notNull(),
  metadata: json().$type<{
    shareMethod?: 'sms' | 'whatsapp' | 'email' | 'copy' | 'qr';
    referralCode?: string;
    platform?: string;
  }>(),
  createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_viral_user").on(table.userId),
  eventIdx: index("idx_viral_event").on(table.eventType),
  createdIdx: index("idx_viral_created").on(table.createdAt),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

export type ReferralRedemption = typeof referralRedemptions.$inferSelect;
export type InsertReferralRedemption = typeof referralRedemptions.$inferInsert;

export type UserReferralStats = typeof userReferralStats.$inferSelect;
export type InsertUserReferralStats = typeof userReferralStats.$inferInsert;

export type ViralEvent = typeof viralEvents.$inferSelect;
export type InsertViralEvent = typeof viralEvents.$inferInsert;
