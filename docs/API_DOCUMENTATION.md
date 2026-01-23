# Protocol Guide tRPC API Documentation

Version: 1.0
Last Updated: 2026-01-23

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Router Organization](#router-organization)
- [System Router](#system-router)
- [Auth Router](#auth-router)
- [Counties Router](#counties-router)
- [User Router](#user-router)
- [Search Router](#search-router)
- [Query Router](#query-router)
- [Voice Router](#voice-router)
- [Feedback Router](#feedback-router)
- [Contact Router](#contact-router)
- [Subscription Router](#subscription-router)
- [Admin Router](#admin-router)
- [Agency Admin Router](#agency-admin-router)
- [Integration Router](#integration-router)
- [Referral Router](#referral-router)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

Protocol Guide uses tRPC for type-safe API communication between the mobile app and backend server. All procedures are organized by domain and support end-to-end TypeScript type safety.

**Base URL**: `https://api.protocolguide.app/trpc`

**Features**:
- Type-safe API contracts
- SuperJSON serialization (supports Date objects, etc.)
- Automatic validation via Zod schemas
- Built-in error handling
- Context-aware authentication

---

## Authentication

### Authentication Methods

Protocol Guide uses **Supabase Auth** with Bearer token authentication.

**Header Format**:
```
Authorization: Bearer <supabase_access_token>
```

### Procedure Types

| Type | Authentication | Description |
|------|---------------|-------------|
| `publicProcedure` | None | No authentication required |
| `protectedProcedure` | User | Requires authenticated user |
| `paidProcedure` | Pro/Enterprise | Requires paid subscription tier |
| `rateLimitedProcedure` | User + Rate Limit | Enforces daily query limits |
| `adminProcedure` | Admin Role | Requires admin user role |
| `agencyAdminProcedure` | Agency Admin | Requires agency admin access |

### User Context

Authenticated procedures receive a `ctx.user` object:

```typescript
{
  id: number;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  tier: "free" | "pro" | "enterprise";
  selectedCountyId: number | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
}
```

---

## Router Organization

```
appRouter/
├── system          # Health checks, notifications
├── auth            # Authentication
├── counties        # County listings
├── user            # User profile and settings
├── search          # Semantic protocol search
├── query           # Protocol query submission
├── voice           # Voice transcription
├── feedback        # User feedback
├── contact         # Contact form
├── subscription    # Stripe payments
├── admin           # Admin operations
├── agencyAdmin     # B2B agency management
├── integration     # Partner tracking
└── referral        # Viral referral system
```

---

## System Router

### `system.health`

Health check endpoint for monitoring.

**Type**: `query`
**Auth**: Public

**Input**:
```typescript
{
  timestamp: number; // Must be >= 0
}
```

**Output**:
```typescript
{
  ok: boolean;
}
```

**Example**:
```typescript
const result = await trpc.system.health.query({ timestamp: Date.now() });
// { ok: true }
```

---

### `system.notifyOwner`

Send notification to system owner (admin only).

**Type**: `mutation`
**Auth**: Admin

**Input**:
```typescript
{
  title: string;    // Required, min 1 char
  content: string;  // Required, min 1 char
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Example**:
```typescript
const result = await trpc.system.notifyOwner.mutate({
  title: "Critical Alert",
  content: "Database backup completed successfully"
});
```

---

## Auth Router

### `auth.me`

Get current authenticated user information.

**Type**: `query`
**Auth**: Public (returns null if not authenticated)

**Input**: None

**Output**:
```typescript
User | null
```

**Example**:
```typescript
const user = await trpc.auth.me.query();
// { id: 123, email: "medic@example.com", name: "John Doe", tier: "pro", ... }
```

---

### `auth.logout`

Clear authentication session cookie.

**Type**: `mutation`
**Auth**: Public

**Input**: None

**Output**:
```typescript
{
  success: true;
}
```

**Example**:
```typescript
await trpc.auth.logout.mutate();
```

---

## Counties Router

### `counties.list`

List all available counties grouped by state.

**Type**: `query`
**Auth**: Public

**Input**: None

**Output**:
```typescript
{
  counties: Array<{
    id: number;
    name: string;
    state: string;
    // ... other county fields
  }>;
  grouped: Record<string, Array<County>>;
}
```

**Example**:
```typescript
const { counties, grouped } = await trpc.counties.list.query();
// grouped["CA"] = [{ id: 1, name: "Los Angeles County", ... }, ...]
```

---

### `counties.get`

Get a specific county by ID.

**Type**: `query`
**Auth**: Public

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

**Example**:
```typescript
const county = await trpc.counties.get.query({ id: 1 });
```

---

## User Router

### `user.usage`

Get user's query usage statistics.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  count: number;   // Queries used today
  limit: number;   // Daily query limit
  tier: "free" | "pro" | "enterprise";
}
```

**Example**:
```typescript
const usage = await trpc.user.usage.query();
// { count: 5, limit: 10, tier: "free" }
```

---

### `user.acknowledgeDisclaimer`

Record user's acknowledgment of medical disclaimer (P0 CRITICAL for legal compliance).

**Type**: `mutation`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  acknowledgedAt: Date;
}
```

**Example**:
```typescript
await trpc.user.acknowledgeDisclaimer.mutate();
```

---

### `user.hasAcknowledgedDisclaimer`

Check if user has acknowledged medical disclaimer.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  hasAcknowledged: boolean;
}
```

---

### `user.selectCounty`

Set user's selected county.

**Type**: `mutation`
**Auth**: Protected

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

---

### `user.queries`

Get user's query history.

**Type**: `query`
**Auth**: Protected

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

---

### `user.savedCounties`

Get user's saved counties (multi-county access).

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  counties: Array<County>;
  canAdd: boolean;
  currentCount: number;
  maxAllowed: number;
  tier: "free" | "pro" | "enterprise";
}
```

---

### `user.addCounty`

Add a county to user's saved counties.

**Type**: `mutation`
**Auth**: Protected

**Input**:
```typescript
{
  countyId: number;
  isPrimary?: boolean; // Default false
}
```

**Output**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Errors**:
- `BAD_REQUEST`: County limit reached or invalid county

---

### `user.removeCounty`

Remove a county from user's saved counties.

**Type**: `mutation`
**Auth**: Protected

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

---

### `user.setPrimaryCounty`

Set a saved county as the user's primary county.

**Type**: `mutation`
**Auth**: Protected

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

---

### `user.primaryCounty`

Get user's primary county.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
County | null
```

---

## Search Router

### `search.semantic`

Semantic search across protocols using Voyage AI embeddings and pgvector.

**Type**: `query`
**Auth**: Public

**Features**:
- Query normalization (EMS abbreviations, typos)
- Redis caching (1 hour TTL)
- Multi-query fusion for complex queries
- Advanced re-ranking
- Latency monitoring

**Input**:
```typescript
{
  query: string;          // 1-500 chars
  countyId?: number;      // Filter by county
  limit?: number;         // 1-50, default 10
  stateFilter?: string;   // Two-letter state code
}
```

**Output**:
```typescript
{
  results: Array<{
    id: number;
    protocolNumber: string;
    protocolTitle: string;
    section: string | null;
    content: string;              // Truncated to 500 chars
    fullContent: string;          // Complete content
    relevanceScore: number;       // 0-1 similarity score
    countyId: number;
    sourcePdfUrl: null;
    protocolEffectiveDate: null;
    lastVerifiedAt: null;
    protocolYear: null;
  }>;
  totalFound: number;
  query: string;                  // Original query
  normalizedQuery: string;        // Normalized query
  fromCache: boolean;
  latencyMs: number;
}
```

**Example**:
```typescript
const results = await trpc.search.semantic.query({
  query: "cardiac arrest epi dose",
  countyId: 1,
  limit: 10
});
```

**Cache Headers**:
- `X-Cache-Hit: true|false`
- `Cache-Control: public, max-age=3600`

---

### `search.getProtocol`

Get a specific protocol by ID.

**Type**: `query`
**Auth**: Public

**Input**:
```typescript
{
  id: number;
}
```

**Output**:
```typescript
ProtocolChunk | null
```

---

### `search.stats`

Get protocol statistics.

**Type**: `query`
**Auth**: Public

**Input**: None

**Output**:
```typescript
{
  totalProtocols: number;
  totalCounties: number;
  lastUpdated: Date;
}
```

---

### `search.coverageByState`

Get protocol coverage by state.

**Type**: `query`
**Auth**: Public

**Input**: None

**Output**:
```typescript
Array<{
  state: string;
  countyCount: number;
  protocolCount: number;
}>
```

---

### `search.totalStats`

Get total protocol statistics.

**Type**: `query`
**Auth**: Public

**Input**: None

**Output**:
```typescript
{
  totalProtocols: number;
  totalAgencies: number;
  totalStates: number;
}
```

---

### `search.agenciesByState`

Get agencies (counties) by state with protocol counts.

**Type**: `query`
**Auth**: Public

**Input**:
```typescript
{
  state: string; // Two-letter state code
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

---

### `search.agenciesWithProtocols`

Get all agencies with protocols, optionally filtered by state.

**Type**: `query`
**Auth**: Public

**Input**:
```typescript
{
  state?: string; // Optional state filter
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

---

### `search.searchByAgency`

Search protocols within a specific agency using Voyage AI and pgvector.

**Type**: `query`
**Auth**: Public

**Input**:
```typescript
{
  query: string;     // 1-500 chars
  agencyId: number;  // MySQL county ID (auto-mapped to Supabase)
  limit?: number;    // 1-50, default 10
}
```

**Output**: Same as `search.semantic`

---

## Query Router

### `query.submit`

Submit a protocol query with Claude RAG.

**Type**: `mutation`
**Auth**: Protected

**Features**:
- Query normalization
- Intelligent Claude model routing (Haiku/Sonnet based on complexity)
- Usage limit enforcement
- Optimized search with re-ranking

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

**Example**:
```typescript
const result = await trpc.query.submit.mutate({
  countyId: 1,
  queryText: "What's the epinephrine dose for cardiac arrest in adults?"
});
```

**Errors**:
- Daily query limit reached (free tier: 10/day)
- No matching protocols found

---

### `query.history`

Get user's query history.

**Type**: `query`
**Auth**: Protected

**Input**:
```typescript
{
  limit?: number; // 1-100, default 50
}
```

**Output**:
```typescript
Array<Query>
```

---

### `query.searchHistory`

Get user's search history for cloud sync (Pro feature).

**Type**: `query`
**Auth**: Protected

**Input**:
```typescript
{
  limit?: number; // 1-100, default 50
}
```

**Output**:
```typescript
Array<SearchHistoryEntry>
```

---

### `query.syncHistory`

Sync local search history to cloud (Pro feature).

**Type**: `mutation`
**Auth**: Protected (Pro/Enterprise only)

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
  merged: number;              // Number of entries merged
  serverHistory: Array<SearchHistoryEntry>;
}
```

**Errors**:
- `FORBIDDEN`: Requires Pro subscription

---

### `query.clearHistory`

Clear user's search history.

**Type**: `mutation`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  success: boolean;
}
```

---

### `query.deleteHistoryEntry`

Delete a single history entry.

**Type**: `mutation`
**Auth**: Protected

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

**Errors**:
- `NOT_FOUND`: Entry not found

---

## Voice Router

### `voice.transcribe`

Transcribe audio to text using OpenAI Whisper.

**Type**: `mutation`
**Auth**: Protected

**Input**:
```typescript
{
  audioUrl: string;     // Must be from authorized storage domain
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

**Allowed URLs**:
- `https://storage.protocol-guide.com/`
- `https://*.supabase.co/storage/`
- `https://*.r2.cloudflarestorage.com/`

**Example**:
```typescript
const result = await trpc.voice.transcribe.mutate({
  audioUrl: "https://storage.protocol-guide.com/voice/123/audio.webm",
  language: "en"
});
```

---

### `voice.uploadAudio`

Upload audio file for transcription.

**Type**: `mutation`
**Auth**: Protected

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
  url: string; // Storage URL for uploaded audio
}
```

**Example**:
```typescript
const { url } = await trpc.voice.uploadAudio.mutate({
  audioBase64: base64EncodedAudio,
  mimeType: "audio/webm"
});
```

---

## Feedback Router

### `feedback.submit`

Submit user feedback.

**Type**: `mutation`
**Auth**: Protected

**Input**:
```typescript
{
  category: "error" | "suggestion" | "general";
  subject: string;        // 1-255 chars
  message: string;        // Min 1 char
  protocolRef?: string;   // Max 255 chars
}
```

**Output**:
```typescript
{
  success: boolean;
  error: string | null;
}
```

**Example**:
```typescript
await trpc.feedback.submit.mutate({
  category: "suggestion",
  subject: "Add dark mode",
  message: "Would love a dark mode option for night shifts"
});
```

---

### `feedback.myFeedback`

Get user's submitted feedback.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
Array<{
  id: number;
  category: string;
  subject: string;
  message: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
  adminNotes?: string;
}>
```

---

## Contact Router

### `contact.submit`

Submit public contact form.

**Type**: `mutation`
**Auth**: Public

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

**Example**:
```typescript
await trpc.contact.submit.mutate({
  name: "John Doe",
  email: "john@example.com",
  message: "I'd like to request protocols for our county..."
});
```

---

## Subscription Router

### `subscription.createCheckout`

Create Stripe checkout session for individual subscription.

**Type**: `mutation`
**Auth**: Protected

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

**Example**:
```typescript
const { url } = await trpc.subscription.createCheckout.mutate({
  plan: "monthly",
  successUrl: "https://app.protocolguide.app/success",
  cancelUrl: "https://app.protocolguide.app/pricing"
});

// Redirect user to url
```

---

### `subscription.createPortal`

Create Stripe customer portal session for managing subscription.

**Type**: `mutation`
**Auth**: Protected

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

**Errors**:
- No subscription found (user has no Stripe customer ID)

---

### `subscription.status`

Get current subscription status.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  tier: "free" | "pro" | "enterprise";
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
}
```

---

### `subscription.createDepartmentCheckout`

Create Stripe checkout session for department/agency subscription (B2B).

**Type**: `mutation`
**Auth**: Protected (Agency Admin only)

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

**Errors**:
- Not authorized to manage this agency
- Agency not found

---

## Admin Router

All admin procedures require `adminProcedure` authentication (admin role).

### `admin.listFeedback`

List all feedback with optional filters.

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  status?: "pending" | "reviewed" | "resolved" | "dismissed";
  limit?: number;    // 1-100, default 50
  offset?: number;   // Default 0
}
```

**Output**:
```typescript
{
  feedback: Array<Feedback>;
  total: number;
}
```

---

### `admin.updateFeedback`

Update feedback status and add admin notes.

**Type**: `mutation`
**Auth**: Admin

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

**Side Effects**: Creates audit log entry

---

### `admin.listUsers`

List all users with optional filters.

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  tier?: "free" | "pro" | "enterprise";
  role?: "user" | "admin";
  limit?: number;    // 1-100, default 50
  offset?: number;   // Default 0
}
```

**Output**:
```typescript
{
  users: Array<User>;
  total: number;
}
```

---

### `admin.updateUserRole`

Update a user's role.

**Type**: `mutation`
**Auth**: Admin

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

**Errors**:
- `BAD_REQUEST`: Cannot change your own role
- `NOT_FOUND`: User not found

**Side Effects**: Creates audit log entry

---

### `admin.listContactSubmissions`

List contact form submissions.

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  status?: "pending" | "reviewed" | "resolved";
  limit?: number;    // 1-100, default 50
  offset?: number;   // Default 0
}
```

**Output**:
```typescript
{
  submissions: Array<ContactSubmission>;
  total: number;
}
```

---

### `admin.updateContactStatus`

Update contact submission status.

**Type**: `mutation`
**Auth**: Admin

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

**Side Effects**: Creates audit log entry

---

### `admin.getAuditLogs`

Get audit logs (admin actions).

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  limit?: number;    // 1-100, default 50
  offset?: number;   // Default 0
}
```

**Output**:
```typescript
{
  logs: Array<{
    id: number;
    userId: number;
    action: string;
    targetType: string;
    targetId: string;
    details: object;
    createdAt: Date;
  }>;
  total: number;
}
```

---

## Agency Admin Router

All agency admin procedures require `agencyAdminProcedure` authentication (agency admin access).

### Agency Management

#### `agencyAdmin.myAgencies`

Get current user's agencies.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
Array<{
  id: number;
  name: string;
  role: "owner" | "admin" | "protocol_author" | "member";
  // ... agency fields
}>
```

---

#### `agencyAdmin.getAgency`

Get agency details.

**Type**: `query`
**Auth**: Protected

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

**Errors**:
- `NOT_FOUND`: Agency not found

---

#### `agencyAdmin.updateAgency`

Update agency settings.

**Type**: `mutation`
**Auth**: Agency Admin

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

---

### Staff Management

#### `agencyAdmin.listMembers`

List agency members.

**Type**: `query`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
}
```

**Output**:
```typescript
Array<{
  id: number;
  userId: number;
  role: "owner" | "admin" | "protocol_author" | "member";
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  joinedAt: Date;
}>
```

---

#### `agencyAdmin.inviteMember`

Invite member to agency.

**Type**: `mutation`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  email: string;
  role?: "admin" | "protocol_author" | "member"; // Default "member"
}
```

**Output**:
```typescript
{
  success: boolean;
  token: string; // Invitation token
}
```

**Side Effects**: Creates invitation record (expires in 7 days)

---

#### `agencyAdmin.updateMemberRole`

Update member role.

**Type**: `mutation`
**Auth**: Agency Admin

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

**Errors**:
- `NOT_FOUND`: Member not found
- `FORBIDDEN`: Cannot change owner role or your own role

---

#### `agencyAdmin.removeMember`

Remove member from agency.

**Type**: `mutation`
**Auth**: Agency Admin

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

**Errors**:
- `NOT_FOUND`: Member not found
- `FORBIDDEN`: Cannot remove owner or yourself

---

### Protocol Management

#### `agencyAdmin.listProtocols`

List agency protocols.

**Type**: `query`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  status?: "draft" | "review" | "approved" | "published" | "archived";
  limit?: number;    // 1-100, default 50
  offset?: number;   // Default 0
}
```

**Output**:
```typescript
{
  protocols: Array<ProtocolVersion>;
  total: number;
}
```

---

#### `agencyAdmin.uploadProtocol`

Upload new protocol PDF.

**Type**: `mutation`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  fileName: string;           // Max 255 chars
  fileBase64: string;         // Max 20MB
  mimeType?: string;          // Default "application/pdf"
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

**Errors**:
- `BAD_REQUEST`: Only PDF files supported, file too large

---

#### `agencyAdmin.getUploadStatus`

Get protocol upload processing status.

**Type**: `query`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  uploadId: number;
}
```

**Output**:
```typescript
{
  id: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
  // ... upload fields
}
```

**Errors**:
- `NOT_FOUND`: Upload not found

---

#### `agencyAdmin.updateProtocolStatus`

Update protocol status (workflow).

**Type**: `mutation`
**Auth**: Agency Admin

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

**Valid Transitions**:
- draft → review, archived
- review → draft, approved, archived
- approved → published, draft
- published → archived
- archived → draft

**Errors**:
- `BAD_REQUEST`: Invalid status transition
- `NOT_FOUND`: Protocol version not found

---

#### `agencyAdmin.publishProtocol`

Publish protocol (makes it live in search).

**Type**: `mutation`
**Auth**: Agency Admin

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

**Errors**:
- `BAD_REQUEST`: Protocol must be approved before publishing
- `NOT_FOUND`: Protocol version not found

**Side Effects**: Creates audit log entry

---

#### `agencyAdmin.archiveProtocol`

Archive protocol.

**Type**: `mutation`
**Auth**: Agency Admin

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

**Side Effects**: Creates audit log entry

---

### Version Control

#### `agencyAdmin.listVersions`

List protocol versions.

**Type**: `query`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  protocolNumber: string;
}
```

**Output**:
```typescript
Array<ProtocolVersion>
```

---

#### `agencyAdmin.createVersion`

Create new version from existing protocol.

**Type**: `mutation`
**Auth**: Agency Admin

**Input**:
```typescript
{
  agencyId: number;
  fromVersionId: number;
  newVersion: string;    // Max 20 chars
  changes?: string;      // Change log description
}
```

**Output**:
```typescript
{
  success: boolean;
  versionId: number;
}
```

**Errors**:
- `NOT_FOUND`: Source version not found

---

## Integration Router

Handles integration partner tracking (ImageTrend, ESO, Zoll, etc.).

**HIPAA Compliance**: This router intentionally does NOT log or store any PHI (Protected Health Information).

### `integration.logAccess`

Log an integration access event.

**Type**: `mutation`
**Auth**: Public

**Input**:
```typescript
{
  partner: "imagetrend" | "esos" | "zoll" | "emscloud";
  agencyId?: string;          // Max 100 chars
  agencyName?: string;        // Max 255 chars
  searchTerm?: string;        // Max 500 chars
  userAge?: number;           // IGNORED - not stored (HIPAA)
  impression?: string;        // IGNORED - not stored (HIPAA)
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

**HIPAA Note**: `userAge` and `impression` parameters are accepted for API compatibility but are NOT persisted to the database.

---

### `integration.getStats`

Get integration statistics (admin only).

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  partner?: "imagetrend" | "esos" | "zoll" | "emscloud";
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

---

### `integration.getRecentLogs`

Get recent integration access logs (admin only).

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  partner?: "imagetrend" | "esos" | "zoll" | "emscloud";
  limit?: number;   // 1-100, default 50
  offset?: number;  // Default 0
}
```

**Output**:
```typescript
{
  logs: Array<IntegrationLog>;
  total: number;
}
```

---

### `integration.getDailyUsage`

Get daily integration usage for charts (admin only).

**Type**: `query`
**Auth**: Admin

**Input**:
```typescript
{
  partner?: "imagetrend" | "esos" | "zoll" | "emscloud";
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

## Referral Router

Viral referral system with gamification.

### User Procedures

#### `referral.getMyReferralCode`

Get or create user's referral code.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  code: string;
  usesCount: number;
  createdAt: Date;
}
```

---

#### `referral.getMyStats`

Get user's referral statistics.

**Type**: `query`
**Auth**: Protected

**Input**: None

**Output**:
```typescript
{
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  proDaysEarned: number;
  creditsEarned: number;
  currentTier: "bronze" | "silver" | "gold" | "platinum" | "ambassador";
  rank: number | null;
  nextTierProgress: number;        // 0-100
  nextTierName: string | null;
  referralsToNextTier: number;
}
```

---

#### `referral.getMyReferrals`

Get referral history (who I've referred).

**Type**: `query`
**Auth**: Protected

**Input**:
```typescript
{
  limit?: number;   // 1-50, default 20
  offset?: number;  // Default 0
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
      email: string; // Masked for privacy
    };
  }>;
  total: number;
}
```

---

### Code Procedures

#### `referral.validateCode`

Validate a referral code (public - for signup flow).

**Type**: `query`
**Auth**: Public

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

---

#### `referral.redeemCode`

Redeem a referral code (called during signup).

**Type**: `mutation`
**Auth**: Protected

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

**Errors**:
- `NOT_FOUND`: Invalid or expired referral code
- `BAD_REQUEST`: Cannot use your own code or already redeemed

---

#### `referral.getShareTemplates`

Get share message templates.

**Type**: `query`
**Auth**: Protected

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

---

### Analytics Procedures

#### `referral.getLeaderboard`

Get top referrers leaderboard.

**Type**: `query`
**Auth**: Protected

**Input**:
```typescript
{
  limit?: number;   // 1-100, default 25
  timeframe?: "all_time" | "this_month" | "this_week"; // Default "all_time"
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

---

#### `referral.trackViralEvent`

Track a viral event (share, view, etc.).

**Type**: `mutation`
**Auth**: Protected

**Input**:
```typescript
{
  eventType:
    | "referral_code_generated"
    | "referral_code_shared"
    | "referral_code_copied"
    | "share_button_tapped"
    | "shift_share_shown"
    | "shift_share_accepted"
    | "shift_share_dismissed"
    | "social_share_completed";
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

**Note**: Fails silently (returns `tracked: false`) to not break user experience.

---

## Error Handling

### Error Codes

tRPC uses standard HTTP-like error codes:

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid input or validation error |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Error Response Format

```typescript
{
  error: {
    code: string;           // Error code
    message: string;        // Human-readable message
    data?: {
      code: string;
      httpStatus: number;
      path: string;
      stack?: string;       // Only in development
    };
  };
}
```

### Example Error Handling

```typescript
try {
  const result = await trpc.query.submit.mutate({
    countyId: 1,
    queryText: "test"
  });
} catch (error) {
  if (error.data?.code === "TOO_MANY_REQUESTS") {
    // Show upgrade prompt
  } else if (error.data?.code === "UNAUTHORIZED") {
    // Redirect to login
  } else {
    // Show generic error
  }
}
```

---

## Rate Limiting

### Query Limits by Tier

| Tier | Daily Queries | Counties |
|------|--------------|----------|
| Free | 10 | 1 |
| Pro | Unlimited | 5 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

For procedures with rate limiting, the response includes:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1234567890
```

### Checking Usage

```typescript
const usage = await trpc.user.usage.query();
console.log(`${usage.count}/${usage.limit} queries used today`);

if (usage.count >= usage.limit) {
  // Show upgrade prompt
}
```

---

## Appendix

### Type Definitions

Full TypeScript type definitions are available in:
- `server/_core/trpc.ts` - Core tRPC setup
- `server/_core/context.ts` - Request context
- `drizzle/schema.ts` - Database schema types

### Client Usage

```typescript
import { trpc } from "./utils/trpc";

// Query
const counties = await trpc.counties.list.query();

// Mutation
const result = await trpc.query.submit.mutate({
  countyId: 1,
  queryText: "cardiac arrest protocol"
});
```

### Subscriptions

tRPC subscriptions are not currently implemented but can be added for real-time features.

---

## Support

For API support, contact: support@protocolguide.app

Documentation last updated: 2026-01-23
