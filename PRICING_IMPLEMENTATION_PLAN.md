# Pricing Strategy Implementation Plan

**Reference:** PRICING_STRATEGY.md
**Timeline:** 90 days
**Owner:** Tanner (CEO/CTO)

---

## Phase 1: Stripe Product Setup (Week 1)

### 1.1 Create New Stripe Products

**Individual Pro Tier:**

```bash
# Monthly Price
stripe prices create \
  --product="prod_XXX" \
  --currency=usd \
  --unit-amount=999 \
  --recurring[interval]=month \
  --nickname="Pro Monthly - New Pricing"

# Annual Price
stripe prices create \
  --product="prod_XXX" \
  --currency=usd \
  --unit-amount=8900 \
  --recurring[interval]=year \
  --nickname="Pro Annual - New Pricing"
```

**Department Starter (Flat Rate):**

```bash
# Create Department product
stripe products create \
  --name="Department Starter" \
  --description="For agencies with 1-10 paramedics"

# Flat annual price
stripe prices create \
  --product="prod_YYY" \
  --currency=usd \
  --unit-amount=19900 \
  --recurring[interval]=year \
  --nickname="Department Starter Annual"
```

**Department Professional (Per-User):**

```bash
# Create Department Pro product
stripe products create \
  --name="Department Professional" \
  --description="For agencies with 11-100 paramedics"

# Per-user annual price
stripe prices create \
  --product="prod_ZZZ" \
  --currency=usd \
  --unit-amount=8900 \
  --recurring[interval]=year \
  --nickname="Department Professional (per user/year)"
```

### 1.2 Update Environment Variables

Add to `.env`:

```bash
# New Individual Pricing
STRIPE_PRO_MONTHLY_PRICE_ID_V2=price_XXX
STRIPE_PRO_ANNUAL_PRICE_ID_V2=price_YYY

# Department Pricing
STRIPE_DEPT_STARTER_PRICE_ID=price_ZZZ
STRIPE_DEPT_PRO_PRICE_ID=price_AAA

# Feature Flag (gradual rollout)
PRICING_V2_ENABLED=false
PRICING_V2_ROLLOUT_PERCENTAGE=0
```

### 1.3 Update server/db.ts Pricing Config

```typescript
// server/db.ts
export const PRICING = {
  v1: {
    pro: {
      monthly: { amount: 499, display: "$4.99", interval: "month" as const },
      annual: { amount: 3900, display: "$39", interval: "year" as const, savings: "35%" },
    },
  },
  v2: {
    pro: {
      monthly: { amount: 999, display: "$9.99", interval: "month" as const },
      annual: { amount: 8900, display: "$89", interval: "year" as const, savings: "25%" },
    },
    department: {
      starter: { amount: 19900, display: "$199", interval: "year" as const, maxUsers: 10 },
      professional: { amountPerUser: 8900, display: "$89/user", interval: "year" as const, minUsers: 11 },
    },
  },
} as const;

// Helper to get active pricing version
export function getActivePricingVersion(userId?: number): 'v1' | 'v2' {
  if (process.env.PRICING_V2_ENABLED === 'true') return 'v2';

  // Gradual rollout by user ID hash
  if (userId && process.env.PRICING_V2_ROLLOUT_PERCENTAGE) {
    const rolloutPct = parseInt(process.env.PRICING_V2_ROLLOUT_PERCENTAGE);
    const userHash = userId % 100;
    if (userHash < rolloutPct) return 'v2';
  }

  return 'v1';
}
```

---

## Phase 2: Database Schema Updates (Week 1)

### 2.1 Add Department Subscription Fields

Create migration: `drizzle/0009_department_subscriptions.sql`

```sql
-- Add department subscription fields to users table
ALTER TABLE users
ADD COLUMN departmentId INT DEFAULT NULL,
ADD COLUMN departmentRole ENUM('owner', 'admin', 'member') DEFAULT NULL,
ADD COLUMN seatNumber INT DEFAULT NULL,
ADD INDEX idx_department (departmentId);

-- Create departments table
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  stripeCustomerId VARCHAR(255),
  subscriptionTier ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
  subscriptionStatus VARCHAR(50),
  maxSeats INT DEFAULT 10,
  usedSeats INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Create department_members table (many-to-many)
CREATE TABLE department_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departmentId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('owner', 'admin', 'member') DEFAULT 'member',
  joinedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_member (departmentId, userId),
  INDEX idx_department (departmentId),
  INDEX idx_user (userId)
);

-- Create department_invitations table
CREATE TABLE department_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departmentId INT NOT NULL,
  email VARCHAR(320) NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  invitedBy INT NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  acceptedAt TIMESTAMP DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Update Drizzle Schema

```typescript
// drizzle/schema.ts

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["starter", "professional", "enterprise"]).default("starter"),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }),
  maxSeats: int("maxSeats").default(10),
  usedSeats: int("usedSeats").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const departmentMembers = mysqlTable("department_members", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member"),
  joinedAt: timestamp("joinedAt").defaultNow(),
});

export const departmentInvitations = mysqlTable("department_invitations", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member"),
  invitedBy: int("invitedBy").notNull(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

---

## Phase 3: Update Free Tier Limits (Week 2)

### 3.1 Update TIER_CONFIG in server/db.ts

```typescript
export const TIER_CONFIG = {
  free: {
    dailyQueryLimit: 3, // CHANGED from 5
    maxCounties: 1,
    maxBookmarks: 3, // NEW LIMIT (was Infinity)
    maxHistoryDays: 7, // NEW LIMIT (was Infinity)
    offlineAccess: false,
    prioritySupport: false,
  },
  pro: {
    dailyQueryLimit: Infinity,
    maxCounties: Infinity,
    maxBookmarks: Infinity,
    maxHistoryDays: Infinity,
    offlineAccess: true,
    prioritySupport: true,
  },
  enterprise: {
    dailyQueryLimit: Infinity,
    maxCounties: Infinity,
    maxBookmarks: Infinity,
    maxHistoryDays: Infinity,
    offlineAccess: true,
    prioritySupport: true,
  },
} as const;
```

### 3.2 Add Bookmark Limit Enforcement

Create `server/bookmarks.ts`:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { getDb, TIER_CONFIG } from "./db";
import { bookmarks, users } from "../drizzle/schema";

export async function canAddBookmark(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: "Database unavailable" };

  // Get user tier
  const [user] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { allowed: false, reason: "User not found" };

  const tierConfig = TIER_CONFIG[user.tier];

  if (tierConfig.maxBookmarks === Infinity) {
    return { allowed: true };
  }

  // Count existing bookmarks
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  const count = result?.count || 0;

  if (count >= tierConfig.maxBookmarks) {
    return {
      allowed: false,
      reason: `Free tier limited to ${tierConfig.maxBookmarks} bookmarks. Upgrade to Pro for unlimited.`,
    };
  }

  return { allowed: true };
}
```

### 3.3 Add History Cleanup Job

Create `server/jobs/cleanup-history.ts`:

```typescript
import { sql, and, lt } from "drizzle-orm";
import { getDb } from "../db";
import { searchHistory, users } from "../../drizzle/schema";

export async function cleanupFreeUserHistory() {
  const db = await getDb();
  if (!db) return;

  // Delete search history older than 7 days for free users
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await db
    .delete(searchHistory)
    .where(
      and(
        lt(searchHistory.timestamp, sevenDaysAgo),
        sql`${searchHistory.userId} IN (SELECT id FROM users WHERE tier = 'free')`
      )
    );

  console.log(`[Cleanup] Removed old search history for free users`);
}

// Run daily via cron or serverless function
```

---

## Phase 4: Pricing Page Updates (Week 2)

### 4.1 Create New Pricing Page Component

File: `app/pricing.tsx`

```typescript
import { View, Text, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { PRICING } from "../server/db";

type BillingInterval = "monthly" | "annual";

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const { colors } = useTheme();

  const pricing = PRICING.v2; // Use new pricing

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero Section */}
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.foreground, textAlign: "center" }}>
          Find the right protocol in 2 seconds
        </Text>
        <Text style={{ fontSize: 18, color: colors.mutedForeground, marginTop: 12, textAlign: "center" }}>
          Join 2,500+ paramedics saving 15+ hours per year
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 32 }}>
        <Pressable
          onPress={() => setInterval("monthly")}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: interval === "monthly" ? colors.primary : "transparent",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: interval === "monthly" ? "white" : colors.foreground }}>Monthly</Text>
        </Pressable>
        <Pressable
          onPress={() => setInterval("annual")}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: interval === "annual" ? colors.primary : "transparent",
            borderRadius: 8,
            marginLeft: 8,
          }}
        >
          <Text style={{ color: interval === "annual" ? "white" : colors.foreground }}>
            Annual <Text style={{ fontSize: 12 }}>(Save 25%)</Text>
          </Text>
        </Pressable>
      </View>

      {/* Pricing Tiers */}
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 16, paddingHorizontal: 16 }}>
        {/* Free Tier */}
        <PricingCard
          name="Free"
          price="$0"
          interval="forever"
          features={[
            "3 queries per day",
            "1 saved county",
            "Basic AI (Haiku 4.5)",
            "3 bookmarks",
            "7-day history",
          ]}
          cta="Start Free"
          colors={colors}
        />

        {/* Pro Tier */}
        <PricingCard
          name="Pro"
          price={interval === "monthly" ? "$9.99" : "$7.42"}
          interval={interval === "monthly" ? "per month" : "per month, billed annually"}
          recommended
          features={[
            "Unlimited queries",
            "Unlimited counties",
            "Smart AI routing",
            "Unlimited bookmarks",
            "Full history",
            "Offline access",
            "Voice input",
            "Priority support",
          ]}
          cta="Start Pro"
          colors={colors}
        />

        {/* Department Tier */}
        <PricingCard
          name="Department"
          price="$199+"
          interval="per year"
          features={[
            "Everything in Pro",
            "Bulk user management",
            "Admin dashboard",
            "Usage analytics",
            "Custom protocols",
            "Dedicated onboarding",
          ]}
          cta="Contact Sales"
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function PricingCard({ name, price, interval, features, cta, recommended, colors }: any) {
  return (
    <View
      style={{
        width: 300,
        padding: 24,
        borderWidth: recommended ? 2 : 1,
        borderColor: recommended ? colors.primary : colors.border,
        borderRadius: 12,
        backgroundColor: colors.card,
      }}
    >
      {recommended && (
        <View style={{ position: "absolute", top: -12, left: "50%", transform: [{ translateX: -50 }] }}>
          <Text style={{ backgroundColor: colors.primary, color: "white", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: "bold" }}>
            RECOMMENDED
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground }}>{name}</Text>
      <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.foreground, marginTop: 8 }}>{price}</Text>
      <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{interval}</Text>

      <View style={{ marginTop: 24 }}>
        {features.map((feature: string, i: number) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.success, marginRight: 8 }}>✓</Text>
            <Text style={{ color: colors.foreground }}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={{
          marginTop: 24,
          backgroundColor: recommended ? colors.primary : colors.secondary,
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: recommended ? "white" : colors.foreground, fontWeight: "600" }}>{cta}</Text>
      </Pressable>
    </View>
  );
}
```

---

## Phase 5: A/B Testing Setup (Week 3)

### 5.1 Install PostHog (or similar)

```bash
pnpm add posthog-js posthog-react-native
```

### 5.2 Track Pricing Page Events

```typescript
// lib/analytics.ts
import posthog from 'posthog-js';

export function trackPricingPageView(version: 'v1' | 'v2') {
  posthog.capture('pricing_page_viewed', {
    pricing_version: version,
  });
}

export function trackUpgradeClicked(plan: string, interval: string, version: 'v1' | 'v2') {
  posthog.capture('upgrade_button_clicked', {
    plan,
    interval,
    pricing_version: version,
  });
}

export function trackCheckoutCompleted(plan: string, amount: number, version: 'v1' | 'v2') {
  posthog.capture('checkout_completed', {
    plan,
    amount,
    pricing_version: version,
  });
}
```

### 5.3 Set Up A/B Test

```typescript
// app/pricing.tsx
import { useEffect, useState } from "react";
import { getActivePricingVersion } from "../server/db";
import { trackPricingPageView } from "../lib/analytics";

export default function PricingPage() {
  const [pricingVersion, setPricingVersion] = useState<'v1' | 'v2'>('v1');

  useEffect(() => {
    const version = getActivePricingVersion();
    setPricingVersion(version);
    trackPricingPageView(version);
  }, []);

  const pricing = pricingVersion === 'v2' ? PRICING.v2 : PRICING.v1;

  // Rest of component...
}
```

---

## Phase 6: Department Admin Dashboard (Week 4-6)

### 6.1 Create Department Dashboard Route

File: `app/dashboard/department.tsx`

```typescript
import { View, Text, ScrollView } from "react-native";
import { trpc } from "../lib/trpc";

export default function DepartmentDashboard() {
  const { data: department } = trpc.getDepartmentDetails.useQuery();
  const { data: members } = trpc.getDepartmentMembers.useQuery();
  const { data: usage } = trpc.getDepartmentUsage.useQuery();

  if (!department) return <Text>Loading...</Text>;

  return (
    <ScrollView style={{ padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: "bold" }}>{department.name}</Text>

      {/* Subscription Status */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Subscription</Text>
        <Text>Tier: {department.subscriptionTier}</Text>
        <Text>Seats: {department.usedSeats} / {department.maxSeats}</Text>
      </View>

      {/* Members List */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Team Members</Text>
        {members?.map((member) => (
          <View key={member.id} style={{ padding: 12, borderWidth: 1, marginTop: 8 }}>
            <Text>{member.name} ({member.role})</Text>
            <Text>{member.email}</Text>
          </View>
        ))}
      </View>

      {/* Usage Stats */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Usage This Month</Text>
        <Text>Total Queries: {usage?.totalQueries}</Text>
        <Text>Active Users: {usage?.activeUsers}</Text>
        <Text>Most Used Protocol: {usage?.topProtocol}</Text>
      </View>
    </ScrollView>
  );
}
```

### 6.2 Add tRPC Routers for Departments

File: `server/routers/departments.ts`

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { departments, departmentMembers } from "../../drizzle/schema";
import { getDb } from "../db";

export const departmentsRouter = router({
  getDepartmentDetails: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get user's department
    const [member] = await db
      .select()
      .from(departmentMembers)
      .where(eq(departmentMembers.userId, ctx.user.id))
      .limit(1);

    if (!member) return null;

    const [dept] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, member.departmentId))
      .limit(1);

    return dept;
  }),

  inviteMember: protectedProcedure
    .input(z.object({ email: z.string().email(), role: z.enum(["admin", "member"]) }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check user is admin
      // 2. Generate invitation token
      // 3. Send invitation email
      // 4. Create invitation record
    }),
});
```

---

## Phase 7: Monitoring & Metrics (Ongoing)

### 7.1 Key Metrics Dashboard

Create Supabase view or analytics dashboard:

```sql
-- Conversion Metrics
CREATE VIEW pricing_metrics AS
SELECT
  DATE(createdAt) as date,
  COUNT(*) FILTER (WHERE tier = 'free') as free_users,
  COUNT(*) FILTER (WHERE tier = 'pro') as pro_users,
  COUNT(*) FILTER (WHERE tier = 'free' AND createdAt < NOW() - INTERVAL '30 days') as free_30d,
  COUNT(*) FILTER (WHERE tier = 'pro' AND createdAt > NOW() - INTERVAL '30 days') as new_pro_30d,
  (COUNT(*) FILTER (WHERE tier = 'pro' AND createdAt > NOW() - INTERVAL '30 days')::FLOAT /
   NULLIF(COUNT(*) FILTER (WHERE tier = 'free' AND createdAt < NOW() - INTERVAL '30 days'), 0)) * 100 as conversion_rate
FROM users
WHERE createdAt > NOW() - INTERVAL '90 days'
GROUP BY DATE(createdAt)
ORDER BY date DESC;
```

### 7.2 Alerts to Set Up

**Conversion Rate Drop:**
- Alert if conversion rate drops >20% week-over-week

**Churn Spike:**
- Alert if cancellations exceed 10% in a week

**Free Tier Abuse:**
- Alert if any user hits query limit every day for 30 days (potential bot)

---

## Rollback Plan

If new pricing causes >30% drop in conversions:

1. **Immediate:** Revert to v1 pricing for all new users
2. **Adjust:** Test $7.99 or $8.99 instead of $9.99
3. **Research:** Survey non-converts to understand objections
4. **Iterate:** Adjust messaging, features, or price points

---

## Success Criteria

**Week 1:**
- [ ] New Stripe prices created
- [ ] Environment variables updated
- [ ] Database migrations applied

**Week 2:**
- [ ] Pricing page deployed
- [ ] A/B test tracking enabled
- [ ] Free tier limits enforced

**Week 4:**
- [ ] First department customer
- [ ] Conversion rate stabilized (within 20% of baseline)
- [ ] MRR increased by at least 50%

**Month 3:**
- [ ] 3+ department customers
- [ ] Conversion rate optimized (10-20%)
- [ ] Revenue doubled from Month 1

---

**Next Action:** Review this plan with stakeholders, then begin Phase 1.
