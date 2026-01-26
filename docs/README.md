# Protocol Guide API Documentation

Welcome to the Protocol Guide API documentation. This directory contains comprehensive documentation for all tRPC procedures.

## 📚 Documentation Index

### Architecture & Design (NEW!)

| Document | Description |
|----------|-------------|
| **[API Architecture](./api/API_ARCHITECTURE.md)** | System design, principles, technology stack |
| **[Authentication Flow](./api/AUTHENTICATION_FLOW.md)** | Auth patterns, tokens, CSRF protection |
| **[Rate Limiting Tiers](./api/RATE_LIMITING_TIERS.md)** | Rate limits by tier and endpoint |
| **[Error Code Reference](./api/ERROR_CODE_REFERENCE.md)** | All error codes and handling strategies |
| **[API Versioning Strategy](./api/API_VERSIONING_STRATEGY.md)** | Versioning approach and migration patterns |

### Procedure Reference

| Document | Description |
|----------|-------------|
| **[API Documentation](./API_DOCUMENTATION.md)** | Complete procedure reference |
| **[API Quick Reference](./API_QUICK_REFERENCE.md)** | Condensed cheat sheet |
| **[API Types Reference](./API_TYPES_REFERENCE.md)** | TypeScript type definitions |

---

## Documentation Files

### [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
Complete API reference with detailed descriptions of all procedures, including:
- Input/output specifications
- Authentication requirements
- Usage examples
- Error handling
- Rate limiting details

**Best for**: Comprehensive understanding of the API

---

### [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
Condensed quick reference guide with:
- Common patterns and procedures
- Router summary table
- Code examples for frequent operations
- Error codes and rate limits
- Development tips

**Best for**: Quick lookups during development

---

### [API_TYPES_REFERENCE.md](./API_TYPES_REFERENCE.md)
TypeScript type definitions for all procedures, including:
- Complete interface definitions
- Input/output types
- Type inference utilities
- Validation schema patterns

**Best for**: TypeScript integration and type safety

---

## Getting Started

### 1. Authentication

Protocol Guide uses Supabase Auth with Bearer token authentication:

```typescript
headers: {
  Authorization: `Bearer ${supabaseAccessToken}`
}
```

### 2. Base URL

```
https://api.protocolguide.app/trpc
```

### 3. Initialize tRPC Client

```typescript
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./server/routers";
import superjson from "superjson";

const trpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "https://api.protocolguide.app/trpc",
      headers() {
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});
```

### 4. Make Your First Request

```typescript
// Get current user
const user = await trpc.auth.me.query();

// Search protocols
const results = await trpc.search.semantic.query({
  query: "cardiac arrest protocol",
  limit: 10
});

// Submit query
const response = await trpc.query.submit.mutate({
  countyId: 1,
  queryText: "What is the epinephrine dose for cardiac arrest?"
});
```

---

## API Overview

### Routers

| Router | Procedures | Description |
|--------|------------|-------------|
| system | 2 | Health checks, system notifications |
| auth | 2 | Authentication and session management |
| counties | 2 | County listings and details |
| user | 11 | User profile, usage, multi-county access |
| search | 8 | Semantic protocol search with AI |
| query | 6 | Protocol queries with Claude RAG |
| voice | 2 | Voice transcription with Whisper |
| feedback | 2 | User feedback submissions |
| contact | 1 | Public contact form |
| subscription | 4 | Stripe payment and subscription management |
| admin | 6 | Admin operations (feedback, users, audit logs) |
| agencyAdmin | 11 | B2B agency management |
| integration | 4 | Partner integration tracking |
| referral | 9 | Viral referral system with gamification |

### Authentication Types

| Type | Requirements | Description |
|------|--------------|-------------|
| Public | None | Open to all requests |
| Protected | User auth | Requires authenticated user |
| Paid | Pro/Enterprise tier | Requires paid subscription |
| Admin | Admin role | Admin users only |
| Agency Admin | Agency admin role | Agency administrators only |

---

## Key Features

### Semantic Search
- Powered by Voyage AI embeddings and pgvector
- Query normalization (EMS abbreviations, typos)
- Redis caching for fast responses
- Multi-query fusion for complex queries
- Advanced re-ranking for accuracy

### Claude RAG
- Intelligent model routing (Haiku vs Sonnet)
- Context-aware responses
- Protocol reference citations
- Query intent detection
- Usage tracking

### Voice Transcription
- OpenAI Whisper integration
- Multiple audio format support
- Secure file upload to storage
- Real-time transcription

### Referral System
- Gamified tier system (Bronze → Ambassador)
- Viral growth mechanics
- Social sharing templates
- Leaderboard tracking
- Reward management

---

## Rate Limits

| Tier | Daily Queries | Counties | Features |
|------|--------------|----------|----------|
| Free | 10 | 1 | Basic search |
| Pro | Unlimited | 5 | History sync, priority |
| Enterprise | Unlimited | Unlimited | Custom protocols, SSO |

---

## Error Handling

All procedures return consistent error responses:

```typescript
{
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "TOO_MANY_REQUESTS" | "INTERNAL_SERVER_ERROR";
    message: string;
    data?: {
      code: string;
      httpStatus: number;
      path: string;
    };
  };
}
```

---

## Examples

### Search for Protocols
```typescript
const results = await trpc.search.semantic.query({
  query: "pediatric seizure management",
  countyId: 42,
  limit: 5
});

console.log(`Found ${results.totalFound} protocols`);
results.results.forEach(protocol => {
  console.log(`${protocol.protocolNumber}: ${protocol.protocolTitle}`);
  console.log(`Relevance: ${protocol.relevanceScore}`);
});
```

### Submit Protocol Query
```typescript
const response = await trpc.query.submit.mutate({
  countyId: 42,
  queryText: "What is the correct dose of epinephrine for anaphylaxis in adults?"
});

if (response.success) {
  console.log("Claude Response:", response.response.text);
  console.log("Referenced Protocols:", response.response.protocolRefs);
  console.log("Model Used:", response.response.model);
}
```

### Check Usage
```typescript
const usage = await trpc.user.usage.query();
console.log(`Queries used: ${usage.count}/${usage.limit}`);

if (usage.count >= usage.limit) {
  console.log("Upgrade to Pro for unlimited queries!");
}
```

### Voice Transcription
```typescript
// Upload audio
const { url } = await trpc.voice.uploadAudio.mutate({
  audioBase64: base64EncodedAudio,
  mimeType: "audio/webm"
});

// Transcribe
const result = await trpc.voice.transcribe.mutate({
  audioUrl: url,
  language: "en"
});

if (result.success) {
  console.log("Transcription:", result.text);
}
```

### Get Referral Code
```typescript
const { code, usesCount } = await trpc.referral.getMyReferralCode.query();
console.log(`Your referral code: ${code}`);
console.log(`Used ${usesCount} times`);

// Get share templates
const templates = await trpc.referral.getShareTemplates.query();
console.log("SMS Template:", templates.sms);
console.log("Share URL:", templates.shareUrl);
```

---

## Testing

### Local Development

```bash
# Start server
npm run dev

# Server runs on
http://localhost:3000

# tRPC endpoint
http://localhost:3000/trpc
```

### Test Authentication

```typescript
// Check if authenticated
const user = await trpc.auth.me.query();

if (user) {
  console.log("Authenticated as:", user.email);
  console.log("Tier:", user.tier);
  console.log("Role:", user.role);
} else {
  console.log("Not authenticated");
}
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=trpc:* npm run dev
```

---

## Best Practices

### 1. Handle Errors Gracefully
```typescript
try {
  const result = await trpc.query.submit.mutate({ ... });
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

### 2. Batch Parallel Queries
```typescript
// tRPC automatically batches these into a single HTTP request
const [user, usage, counties] = await Promise.all([
  trpc.auth.me.query(),
  trpc.user.usage.query(),
  trpc.counties.list.query()
]);
```

### 3. Use Type Inference
```typescript
import type { AppRouter } from "./server/routers";
import { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;
type SearchResults = RouterOutput["search"]["semantic"];

// Now SearchResults is fully typed
```

### 4. Cache Responses
```typescript
// Check if search results are from cache
const results = await trpc.search.semantic.query({ ... });
if (results.fromCache) {
  console.log("Results served from cache");
}
```

---

## Changelog

### Version 1.0 (2026-01-23)
- Initial API documentation
- All 14 routers documented
- Complete type definitions
- Examples and best practices

---

## Support

### Documentation Issues
If you find errors or have suggestions for documentation improvements:
- Email: support@protocolguide.app
- File an issue in the project repository

### API Questions
For API-related questions:
- Email: support@protocolguide.app
- Check the documentation files in this directory

### Feature Requests
To request new API features:
- Use the feedback form: `trpc.feedback.submit.mutate()`
- Email: support@protocolguide.app

---

## Additional Resources

- **Production API**: https://api.protocolguide.app/trpc
- **App**: https://protocolguide.app
- **tRPC Documentation**: https://trpc.io/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

## License

Protocol Guide API © 2026 Protocol Guide. All rights reserved.

This API documentation is provided for authorized developers integrating with Protocol Guide services.
