# Protocol Guide API Types Reference

Complete TypeScript type definitions for all tRPC procedures.

## Table of Contents

- [Core Types](#core-types)
- [System Types](#system-types)
- [Auth Types](#auth-types)
- [County Types](#county-types)
- [User Types](#user-types)
- [Search Types](#search-types)
- [Query Types](#query-types)
- [Voice Types](#voice-types)
- [Feedback Types](#feedback-types)
- [Contact Types](#contact-types)
- [Subscription Types](#subscription-types)
- [Admin Types](#admin-types)
- [Agency Admin Types](#agency-admin-types)
- [Integration Types](#integration-types)
- [Referral Types](#referral-types)

---

## Core Types

### User

```typescript
interface User {
  id: number;
  supabaseId: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  tier: "free" | "pro" | "enterprise";
  selectedCountyId: number | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  disclaimerAcknowledgedAt: Date | null;
}
```

### TrpcContext

```typescript
interface TrpcContext {
  req: Request;
  res: Response;
  user: User | null;
}
```

---

## System Types

### System.Health

**Input**:
```typescript
{
  timestamp: number; // >= 0
}
```

**Output**:
```typescript
{
  ok: boolean;
}
```

### System.NotifyOwner

**Input**:
```typescript
{
  title: string;    // min 1 char
  content: string;  // min 1 char
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

---

## Auth Types

### Auth.Me

**Input**: None

**Output**:
```typescript
User | null
```

### Auth.Logout

**Input**: None

**Output**:
```typescript
{
  success: true;
}
```

---

## County Types

### County

```typescript
interface County {
  id: number;
  name: string;
  state: string;
  stateCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Counties.List

**Input**: None

**Output**:
```typescript
{
  counties: County[];
  grouped: Record<string, County[]>; // Grouped by state
}
```

### Counties.Get

**Input**:
```typescript
{
  id: number;
}
```

**Output**:
```typescript
County | null
```

---

## User Types

### User.Usage

**Input**: None

**Output**:
```typescript
{
  count: number;   // Queries used today
  limit: number;   // Daily query limit
  tier: "free" | "pro" | "enterprise";
}
```

### User.AcknowledgeDisclaimer

**Input**: None

**Output**:
```typescript
{
  acknowledgedAt: Date;
}
```

### User.HasAcknowledgedDisclaimer

**Input**: None

**Output**:
```typescript
{
  hasAcknowledged: boolean;
}
```

### User.SelectCounty

**Input**:
```typescript
{
  countyId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### User.Queries

**Input**:
```typescript
{
  limit?: number; // 1-100, default 10
}
```

**Output**:
```typescript
Array<{
  id: number;
  queryText: string;
  responseText: string;
  protocolRefs: string[];
  createdAt: Date;
  countyId: number;
}>
```

### User.SavedCounties

**Input**: None

**Output**:
```typescript
{
  counties: County[];
  canAdd: boolean;
  currentCount: number;
  maxAllowed: number;
  tier: "free" | "pro" | "enterprise";
}
```

### User.AddCounty

**Input**:
```typescript
{
  countyId: number;
  isPrimary?: boolean; // default false
}
```

**Output**:
```typescript
{
  success: boolean;
  error?: string;
}
```

### User.RemoveCounty

**Input**:
```typescript
{
  countyId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### User.SetPrimaryCounty

**Input**:
```typescript
{
  countyId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### User.PrimaryCounty

**Input**: None

**Output**:
```typescript
County | null
```

---

## Search Types

### SearchResultItem

```typescript
interface SearchResultItem {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;              // Truncated to 500 chars
  fullContent: string;          // Complete content
  relevanceScore: number;       // 0-1 similarity
  countyId: number;
  sourcePdfUrl: null;
  protocolEffectiveDate: null;
  lastVerifiedAt: null;
  protocolYear: null;
}
```

### Search.Semantic

**Input**:
```typescript
{
  query: string;          // 1-500 chars
  countyId?: number;      // Optional county filter
  limit?: number;         // 1-50, default 10
  stateFilter?: string;   // Two-letter state code
}
```

**Output**:
```typescript
{
  results: SearchResultItem[];
  totalFound: number;
  query: string;                  // Original query
  normalizedQuery: string;        // Normalized query
  fromCache: boolean;
  latencyMs: number;
}
```

### Search.GetProtocol

**Input**:
```typescript
{
  id: number;
}
```

**Output**:
```typescript
{
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  embedding: number[] | null;
  agencyId: number;
  createdAt: Date;
  updatedAt: Date;
} | null
```

### Search.Stats

**Input**: None

**Output**:
```typescript
{
  totalProtocols: number;
  totalCounties: number;
  lastUpdated: Date;
}
```

### Search.CoverageByState

**Input**: None

**Output**:
```typescript
Array<{
  state: string;
  countyCount: number;
  protocolCount: number;
}>
```

### Search.TotalStats

**Input**: None

**Output**:
```typescript
{
  totalProtocols: number;
  totalAgencies: number;
  totalStates: number;
}
```

### Search.AgenciesByState

**Input**:
```typescript
{
  state: string; // Two-letter code
}
```

**Output**:
```typescript
Array<{
  id: number;
  name: string;
  state: string;
  protocolCount: number;
}>
```

### Search.AgenciesWithProtocols

**Input**:
```typescript
{
  state?: string; // Optional state filter
}
```

**Output**: Same as AgenciesByState

### Search.SearchByAgency

**Input**:
```typescript
{
  query: string;     // 1-500 chars
  agencyId: number;  // MySQL county ID
  limit?: number;    // 1-50, default 10
}
```

**Output**: Same as Search.Semantic

---

## Query Types

### Query.Submit

**Input**:
```typescript
{
  countyId: number;
  queryText: string; // 1-1000 chars
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
  response: {
    text: string;                    // Claude's response
    protocolRefs: string[];          // Referenced protocols
    model: string;                   // Claude model used
    tokens: {
      input: number;
      output: number;
    };
    responseTimeMs: number;
    normalizedQuery: string;         // Normalized query
    queryIntent: string;             // Detected intent
    isComplexQuery: boolean;
  } | null;
}
```

### Query.History

**Input**:
```typescript
{
  limit?: number; // 1-100, default 50
}
```

**Output**:
```typescript
Array<{
  id: number;
  userId: number;
  countyId: number;
  queryText: string;
  responseText: string;
  protocolRefs: string[];
  createdAt: Date;
}>
```

### SearchHistoryEntry

```typescript
interface SearchHistoryEntry {
  id: number;
  userId: number;
  queryText: string;
  countyId: number | null;
  timestamp: Date;
  deviceId: string | null;
  synced: boolean;
}
```

### Query.SearchHistory

**Input**:
```typescript
{
  limit?: number; // 1-100, default 50
}
```

**Output**:
```typescript
SearchHistoryEntry[]
```

### Query.SyncHistory

**Input**:
```typescript
{
  localQueries: Array<{
    queryText: string;          // 1-500 chars
    countyId?: number;
    timestamp: string | Date;
    deviceId?: string;          // Max 64 chars
  }>;
}
```

**Output**:
```typescript
{
  success: boolean;
  merged: number;
  serverHistory: SearchHistoryEntry[];
}
```

### Query.ClearHistory

**Input**: None

**Output**:
```typescript
{
  success: boolean;
}
```

### Query.DeleteHistoryEntry

**Input**:
```typescript
{
  entryId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

---

## Voice Types

### Voice.Transcribe

**Input**:
```typescript
{
  audioUrl: string;     // Must be from authorized domain
  language?: string;    // Optional language hint
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
  text: string | null;
}
```

### Voice.UploadAudio

**Input**:
```typescript
{
  audioBase64: string;  // Max 10MB
  mimeType: string;     // e.g., "audio/webm"
}
```

**Output**:
```typescript
{
  url: string; // Storage URL
}
```

---

## Feedback Types

### Feedback.Submit

**Input**:
```typescript
{
  category: "error" | "suggestion" | "general";
  subject: string;        // 1-255 chars
  message: string;        // min 1 char
  protocolRef?: string;   // max 255 chars
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
}
```

### Feedback.MyFeedback

**Input**: None

**Output**:
```typescript
Array<{
  id: number;
  category: "error" | "suggestion" | "general";
  subject: string;
  message: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
  adminNotes?: string;
}>
```

---

## Contact Types

### Contact.Submit

**Input**:
```typescript
{
  name: string;      // 1-255 chars
  email: string;     // Valid email, max 320 chars
  message: string;   // 10-5000 chars
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
}
```

---

## Subscription Types

### Subscription.CreateCheckout

**Input**:
```typescript
{
  plan: "monthly" | "annual";
  successUrl: string;  // Valid URL
  cancelUrl: string;   // Valid URL
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
  url: string | null;  // Stripe checkout URL
}
```

### Subscription.CreatePortal

**Input**:
```typescript
{
  returnUrl: string; // Valid URL
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
  url: string | null; // Customer portal URL
}
```

### Subscription.Status

**Input**: None

**Output**:
```typescript
{
  tier: "free" | "pro" | "enterprise";
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
}
```

### Subscription.CreateDepartmentCheckout

**Input**:
```typescript
{
  agencyId: number;
  tier: "starter" | "professional" | "enterprise";
  seatCount: number;      // 1-1000
  interval: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
  url: string | null;
}
```

---

## Admin Types

### Admin.ListFeedback

**Input**:
```typescript
{
  status?: "pending" | "reviewed" | "resolved" | "dismissed";
  limit?: number;    // 1-100, default 50
  offset?: number;   // default 0
}
```

**Output**:
```typescript
{
  feedback: Array<Feedback>;
  total: number;
}
```

### Admin.UpdateFeedback

**Input**:
```typescript
{
  feedbackId: number;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  adminNotes?: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### Admin.ListUsers

**Input**:
```typescript
{
  tier?: "free" | "pro" | "enterprise";
  role?: "user" | "admin";
  limit?: number;    // 1-100, default 50
  offset?: number;   // default 0
}
```

**Output**:
```typescript
{
  users: User[];
  total: number;
}
```

### Admin.UpdateUserRole

**Input**:
```typescript
{
  userId: number;
  role: "user" | "admin";
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### Admin.ListContactSubmissions

**Input**:
```typescript
{
  status?: "pending" | "reviewed" | "resolved";
  limit?: number;    // 1-100, default 50
  offset?: number;   // default 0
}
```

**Output**:
```typescript
{
  submissions: ContactSubmission[];
  total: number;
}
```

### Admin.UpdateContactStatus

**Input**:
```typescript
{
  submissionId: number;
  status: "pending" | "reviewed" | "resolved";
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AuditLog

```typescript
interface AuditLog {
  id: number;
  userId: number;
  action: string;
  targetType: string;
  targetId: string;
  details: object;
  createdAt: Date;
}
```

### Admin.GetAuditLogs

**Input**:
```typescript
{
  limit?: number;    // 1-100, default 50
  offset?: number;   // default 0
}
```

**Output**:
```typescript
{
  logs: AuditLog[];
  total: number;
}
```

---

## Agency Admin Types

### Agency

```typescript
interface Agency {
  id: number;
  name: string;
  state: string;
  stateCode: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  settings: object | null;
  tier: "starter" | "professional" | "enterprise" | null;
  seatCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### AgencyMember

```typescript
interface AgencyMember {
  id: number;
  agencyId: number;
  userId: number;
  role: "owner" | "admin" | "protocol_author" | "member";
  joinedAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}
```

### AgencyAdmin.MyAgencies

**Input**: None

**Output**:
```typescript
Array<{
  id: number;
  name: string;
  role: "owner" | "admin" | "protocol_author" | "member";
  // ...Agency fields
}>
```

### AgencyAdmin.GetAgency

**Input**:
```typescript
{
  agencyId: number;
}
```

**Output**:
```typescript
Agency
```

### AgencyAdmin.UpdateAgency

**Input**:
```typescript
{
  agencyId: number;
  name?: string;              // 1-255 chars
  contactEmail?: string;      // Valid email, max 320
  contactPhone?: string;      // Max 20 chars
  address?: string;           // Max 500 chars
  settings?: {
    brandColor?: string;
    allowSelfRegistration?: boolean;
    requireEmailVerification?: boolean;
    protocolApprovalRequired?: boolean;
  };
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AgencyAdmin.ListMembers

**Input**:
```typescript
{
  agencyId: number;
}
```

**Output**:
```typescript
AgencyMember[]
```

### AgencyAdmin.InviteMember

**Input**:
```typescript
{
  agencyId: number;
  email: string;
  role?: "admin" | "protocol_author" | "member"; // default "member"
}
```

**Output**:
```typescript
{
  success: boolean;
  token: string;
}
```

### AgencyAdmin.UpdateMemberRole

**Input**:
```typescript
{
  agencyId: number;
  memberId: number;
  role: "admin" | "protocol_author" | "member";
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AgencyAdmin.RemoveMember

**Input**:
```typescript
{
  agencyId: number;
  memberId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### ProtocolVersion

```typescript
interface ProtocolVersion {
  id: number;
  agencyId: number;
  protocolNumber: string;
  title: string;
  version: string;
  status: "draft" | "review" | "approved" | "published" | "archived";
  sourceFileUrl: string;
  effectiveDate: Date | null;
  metadata: object | null;
  createdBy: number;
  approvedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### AgencyAdmin.ListProtocols

**Input**:
```typescript
{
  agencyId: number;
  status?: "draft" | "review" | "approved" | "published" | "archived";
  limit?: number;    // 1-100, default 50
  offset?: number;   // default 0
}
```

**Output**:
```typescript
{
  protocols: ProtocolVersion[];
  total: number;
}
```

### AgencyAdmin.UploadProtocol

**Input**:
```typescript
{
  agencyId: number;
  fileName: string;           // Max 255 chars
  fileBase64: string;         // Max 20MB
  mimeType?: string;          // default "application/pdf"
  protocolNumber: string;     // Max 50 chars
  title: string;              // Max 255 chars
  version?: string;           // Max 20 chars, default "1.0"
  effectiveDate?: string;     // ISO date string
}
```

**Output**:
```typescript
{
  success: boolean;
  uploadId: number;
  versionId: number;
  fileUrl: string;
}
```

### ProtocolUpload

```typescript
interface ProtocolUpload {
  id: number;
  agencyId: number;
  userId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### AgencyAdmin.GetUploadStatus

**Input**:
```typescript
{
  agencyId: number;
  uploadId: number;
}
```

**Output**:
```typescript
ProtocolUpload
```

### AgencyAdmin.UpdateProtocolStatus

**Input**:
```typescript
{
  agencyId: number;
  versionId: number;
  status: "draft" | "review" | "approved" | "published" | "archived";
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AgencyAdmin.PublishProtocol

**Input**:
```typescript
{
  agencyId: number;
  versionId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AgencyAdmin.ArchiveProtocol

**Input**:
```typescript
{
  agencyId: number;
  versionId: number;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

### AgencyAdmin.ListVersions

**Input**:
```typescript
{
  agencyId: number;
  protocolNumber: string;
}
```

**Output**:
```typescript
ProtocolVersion[]
```

### AgencyAdmin.CreateVersion

**Input**:
```typescript
{
  agencyId: number;
  fromVersionId: number;
  newVersion: string;    // Max 20 chars
  changes?: string;      // Change log
}
```

**Output**:
```typescript
{
  success: boolean;
  versionId: number;
}
```

---

## Integration Types

### IntegrationPartner

```typescript
type IntegrationPartner = "imagetrend" | "esos" | "zoll" | "emscloud";
```

### Integration.LogAccess

**Input**:
```typescript
{
  partner: IntegrationPartner;
  agencyId?: string;          // Max 100 chars
  agencyName?: string;        // Max 255 chars
  searchTerm?: string;        // Max 500 chars
  userAge?: number;           // NOT STORED (HIPAA)
  impression?: string;        // NOT STORED (HIPAA)
  responseTimeMs?: number;
  resultCount?: number;
}
```

**Output**:
```typescript
{
  success: boolean;
  logged: boolean;
  requestId: string;
}
```

### Integration.GetStats

**Input**:
```typescript
{
  partner?: IntegrationPartner;
  days?: number;  // 1-365, default 30
}
```

**Output**:
```typescript
{
  stats: Array<{
    partner: string;
    accessCount: number;
    uniqueAgencies: number;
    avgResponseTimeMs: number | null;
  }>;
  total: number;
  periodDays: number;
}
```

### Integration.GetRecentLogs

**Input**:
```typescript
{
  partner?: IntegrationPartner;
  limit?: number;   // 1-100, default 50
  offset?: number;  // default 0
}
```

**Output**:
```typescript
{
  logs: IntegrationLog[];
  total: number;
}
```

### Integration.GetDailyUsage

**Input**:
```typescript
{
  partner?: IntegrationPartner;
  days?: number;  // 1-90, default 30
}
```

**Output**:
```typescript
{
  dailyUsage: Array<{
    date: string;
    partner: string;
    count: number;
  }>;
}
```

---

## Referral Types

### ReferralTier

```typescript
type ReferralTier = "bronze" | "silver" | "gold" | "platinum" | "ambassador";
```

### Referral.GetMyReferralCode

**Input**: None

**Output**:
```typescript
{
  code: string;
  usesCount: number;
  createdAt: Date;
}
```

### Referral.GetMyStats

**Input**: None

**Output**:
```typescript
{
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  proDaysEarned: number;
  creditsEarned: number;
  currentTier: ReferralTier;
  rank: number | null;
  nextTierProgress: number;        // 0-100
  nextTierName: string | null;
  referralsToNextTier: number;
}
```

### Referral.GetMyReferrals

**Input**:
```typescript
{
  limit?: number;   // 1-50, default 20
  offset?: number;  // default 0
}
```

**Output**:
```typescript
{
  referrals: Array<{
    id: number;
    redeemedAt: Date;
    convertedToPaid: boolean;
    conversionDate: Date | null;
    reward: object;
    referredUser: {
      name: string;
      email: string; // Masked
    };
  }>;
  total: number;
}
```

### Referral.ValidateCode

**Input**:
```typescript
{
  code: string; // 1-20 chars
}
```

**Output**:
```typescript
{
  valid: boolean;
  error?: string;
  referrerName?: string;
  benefits?: {
    trialDays: number;
    description: string;
  };
}
```

### Referral.RedeemCode

**Input**:
```typescript
{
  code: string; // 1-20 chars
}
```

**Output**:
```typescript
{
  success: boolean;
  benefit: string;
}
```

### Referral.GetShareTemplates

**Input**: None

**Output**:
```typescript
{
  sms: string;
  whatsapp: string;
  email: {
    subject: string;
    body: string;
  };
  generic: string;
  shareUrl: string;
  code: string;
}
```

### Referral.GetLeaderboard

**Input**:
```typescript
{
  limit?: number;   // 1-100, default 25
  timeframe?: "all_time" | "this_month" | "this_week"; // default "all_time"
}
```

**Output**:
```typescript
{
  leaderboard: Array<{
    rank: number;
    userId: number;
    userName: string;
    totalReferrals: number;
    successfulReferrals: number;
    tier: string;
  }>;
  timeframe: string;
}
```

### ViralEventType

```typescript
type ViralEventType =
  | "referral_code_generated"
  | "referral_code_shared"
  | "referral_code_copied"
  | "share_button_tapped"
  | "shift_share_shown"
  | "shift_share_accepted"
  | "shift_share_dismissed"
  | "social_share_completed";
```

### Referral.TrackViralEvent

**Input**:
```typescript
{
  eventType: ViralEventType;
  metadata?: {
    shareMethod?: "sms" | "whatsapp" | "email" | "copy" | "qr";
    referralCode?: string;
    platform?: string;
  };
}
```

**Output**:
```typescript
{
  tracked: boolean;
}
```

---

## Type Inference Utilities

### Infer Input Types

```typescript
import type { AppRouter } from "../server/routers";
import { inferRouterInputs } from "@trpc/server";

type RouterInput = inferRouterInputs<AppRouter>;

// Example: Get input type for any procedure
type QuerySubmitInput = RouterInput["query"]["submit"];
type SearchSemanticInput = RouterInput["search"]["semantic"];
```

### Infer Output Types

```typescript
import type { AppRouter } from "../server/routers";
import { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;

// Example: Get output type for any procedure
type QuerySubmitOutput = RouterOutput["query"]["submit"];
type SearchSemanticOutput = RouterOutput["search"]["semantic"];
```

### Infer Procedure Types

```typescript
import type { AppRouter } from "../server/routers";
import { inferProcedureOutput, inferProcedureInput } from "@trpc/server";

// For specific procedures
type UserUsageOutput = inferProcedureOutput<AppRouter["user"]["usage"]>;
type UserUsageInput = inferProcedureInput<AppRouter["user"]["usage"]>;
```

---

## Validation Schemas

All input validation is handled by Zod schemas. Here are common validation patterns:

### String Validation

```typescript
z.string()
  .min(1)                    // Required
  .max(255)                  // Max length
  .email()                   // Email format
  .url()                     // URL format
  .optional()                // Optional field
  .default("value")          // Default value
```

### Number Validation

```typescript
z.number()
  .int()                     // Integer only
  .min(0)                    // Minimum value
  .max(100)                  // Maximum value
  .default(10)               // Default value
```

### Enum Validation

```typescript
z.enum(["option1", "option2", "option3"])
```

### Object Validation

```typescript
z.object({
  field1: z.string(),
  field2: z.number().optional(),
})
```

### Array Validation

```typescript
z.array(z.object({
  item: z.string()
}))
```

---

## Support

For type-related questions or issues, contact: support@protocolguide.app
