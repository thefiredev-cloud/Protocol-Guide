# Protocol Guide API Quick Reference

Condensed reference for Protocol Guide tRPC API. For complete documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## Authentication

```typescript
// Add Bearer token to requests
headers: {
  Authorization: `Bearer ${supabaseAccessToken}`
}
```

## Common Patterns

### Making Queries
```typescript
const result = await trpc.router.procedure.query(input);
```

### Making Mutations
```typescript
const result = await trpc.router.procedure.mutate(input);
```

### Error Handling
```typescript
try {
  const result = await trpc.query.submit.mutate({ ... });
} catch (error) {
  if (error.data?.code === "TOO_MANY_REQUESTS") {
    // Handle rate limit
  }
}
```

---

## Router Summary

| Router | Procedures | Auth | Description |
|--------|------------|------|-------------|
| system | 2 | Public/Admin | Health checks, notifications |
| auth | 2 | Public | Login status, logout |
| counties | 2 | Public | County listings |
| user | 11 | Protected | Profile, usage, counties |
| search | 8 | Public | Semantic protocol search |
| query | 6 | Protected | Protocol queries with Claude |
| voice | 2 | Protected | Voice transcription |
| feedback | 2 | Protected | User feedback |
| contact | 1 | Public | Contact form |
| subscription | 4 | Protected | Stripe payments |
| admin | 6 | Admin | Admin operations |
| agencyAdmin | 11 | Agency Admin | B2B agency management |
| integration | 4 | Public/Admin | Partner tracking |
| referral | 9 | Protected/Public | Viral referral system |

---

## Most Common Procedures

### Search Protocols
```typescript
const results = await trpc.search.semantic.query({
  query: "cardiac arrest epi dose",
  countyId: 1,
  limit: 10
});
```

### Submit Query
```typescript
const response = await trpc.query.submit.mutate({
  countyId: 1,
  queryText: "What's the epinephrine dose for cardiac arrest?"
});
```

### Get User Info
```typescript
const user = await trpc.auth.me.query();
```

### Check Usage
```typescript
const usage = await trpc.user.usage.query();
// { count: 5, limit: 10, tier: "free" }
```

### List Counties
```typescript
const { counties, grouped } = await trpc.counties.list.query();
```

### Acknowledge Disclaimer
```typescript
await trpc.user.acknowledgeDisclaimer.mutate();
```

### Upload Audio
```typescript
const { url } = await trpc.voice.uploadAudio.mutate({
  audioBase64: base64Audio,
  mimeType: "audio/webm"
});

const transcript = await trpc.voice.transcribe.mutate({
  audioUrl: url
});
```

### Submit Feedback
```typescript
await trpc.feedback.submit.mutate({
  category: "suggestion",
  subject: "Feature Request",
  message: "Would love to see..."
});
```

### Create Subscription
```typescript
const { url } = await trpc.subscription.createCheckout.mutate({
  plan: "monthly",
  successUrl: "https://app.protocolguide.app/success",
  cancelUrl: "https://app.protocolguide.app/pricing"
});
// Redirect to url
```

### Get Referral Code
```typescript
const { code } = await trpc.referral.getMyReferralCode.query();
```

---

## Procedure Types & Auth Requirements

| Type | Requires | Description |
|------|----------|-------------|
| publicProcedure | None | Open to all |
| protectedProcedure | User auth | Logged in users |
| paidProcedure | Pro/Enterprise | Paid subscribers |
| rateLimitedProcedure | User + limits | Free tier query limits |
| adminProcedure | Admin role | Admin users only |
| agencyAdminProcedure | Agency admin | Agency administrators |

---

## Rate Limits

| Tier | Daily Queries | Counties | Features |
|------|--------------|----------|----------|
| Free | 10 | 1 | Basic search |
| Pro | Unlimited | 5 | History sync, priority support |
| Enterprise | Unlimited | Unlimited | Custom protocols, SSO |

---

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| UNAUTHORIZED | Not logged in | Redirect to login |
| FORBIDDEN | Insufficient permissions | Show upgrade prompt or error |
| NOT_FOUND | Resource not found | Show error message |
| BAD_REQUEST | Invalid input | Show validation error |
| TOO_MANY_REQUESTS | Rate limit hit | Show upgrade prompt |
| INTERNAL_SERVER_ERROR | Server error | Retry or contact support |

---

## Search Optimization

### Query Normalization
The search automatically normalizes EMS queries:
- Expands abbreviations (CP → chest pain, SOB → shortness of breath)
- Fixes common typos
- Detects query intent (medication dosing, contraindications, etc.)

### Model Selection
Queries are routed to appropriate Claude models:
- Simple queries → Haiku (fast, cost-effective)
- Complex/medication queries → Sonnet (higher accuracy)
- Pro users → Always get enhanced accuracy

### Caching
Search results are cached for 1 hour in Redis for faster responses.

---

## Voice Transcription

Supported audio formats:
- WebM (recommended for web)
- MP3
- WAV
- M4A

Max file size: 10MB (base64 encoded)

---

## Agency Admin Workflow

### Protocol Upload Process
1. Upload PDF → `agencyAdmin.uploadProtocol`
2. Check status → `agencyAdmin.getUploadStatus`
3. Update status → `agencyAdmin.updateProtocolStatus` (draft → review → approved)
4. Publish → `agencyAdmin.publishProtocol` (makes live in search)

### Valid Status Transitions
- draft → review, archived
- review → draft, approved, archived
- approved → published, draft
- published → archived
- archived → draft

---

## Referral System

### Referral Tiers
- Bronze: 0-2 referrals
- Silver: 3-9 referrals
- Gold: 10-24 referrals
- Platinum: 25-49 referrals
- Ambassador: 50+ referrals

### Rewards
- Referrer: 7 days Pro per successful referral
- Referee: 14 days Pro trial (vs standard 7 days)

---

## Integration Partners

Supported partners:
- imagetrend
- esos
- zoll
- emscloud

**HIPAA Compliance**: Integration logging does NOT store PHI (patient age, impression, etc.)

---

## TypeScript Types

Import types from the AppRouter:

```typescript
import type { AppRouter } from "../server/routers";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

// Example: Get input type for query.submit
type QuerySubmitInput = RouterInput["query"]["submit"];

// Example: Get output type for search.semantic
type SearchSemanticOutput = RouterOutput["search"]["semantic"];
```

---

## Development Tips

### Local Testing
```bash
# Start server
npm run dev

# tRPC endpoint
http://localhost:3000/trpc
```

### Debug Mode
Set environment variable:
```bash
DEBUG=trpc:* npm run dev
```

### Query Batching
tRPC automatically batches parallel queries:
```typescript
const [user, usage, counties] = await Promise.all([
  trpc.auth.me.query(),
  trpc.user.usage.query(),
  trpc.counties.list.query()
]);
// Sent as single HTTP request
```

---

## Support

- Email: support@protocolguide.app
- Full docs: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
