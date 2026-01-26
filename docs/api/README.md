# Protocol Guide API Documentation

**Version**: 2.0  
**Last Updated**: 2026-01-25

## Quick Links

| Document | Description |
|----------|-------------|
| [API Architecture](./API_ARCHITECTURE.md) | System design, principles, tech stack |
| [Authentication Flow](./AUTHENTICATION_FLOW.md) | Auth patterns, tokens, CSRF |
| [Rate Limiting Tiers](./RATE_LIMITING_TIERS.md) | Rate limits by tier and endpoint |
| [Error Code Reference](./ERROR_CODE_REFERENCE.md) | All error codes and handling |
| [API Quick Reference](../API_QUICK_REFERENCE.md) | Endpoint cheat sheet |
| [Full Documentation](../API_DOCUMENTATION.md) | Complete procedure reference |

---

## API Overview

Protocol Guide uses **tRPC** for type-safe API communication.

### Base URL

```
Production: https://protocol-guide-production.up.railway.app/api/trpc
```

### Authentication

```
Authorization: Bearer <supabase_access_token>
```

### Content Type

```
Content-Type: application/json
```

---

## Quick Start

### 1. Initialize tRPC Client

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://api.protocolguide.app/trpc',
      headers: () => ({
        authorization: `Bearer ${getToken()}`,
        'x-csrf-token': getCsrfToken(),
      }),
    }),
  ],
  transformer: superjson,
});
```

### 2. Make Queries

```typescript
// Public query - no auth needed
const counties = await trpc.counties.list.query();

// Protected query - requires auth
const user = await trpc.auth.me.query();

// Protected mutation - requires auth + CSRF
const result = await trpc.query.submit.mutate({
  countyId: 1,
  queryText: "What is the pediatric epinephrine dose?",
});
```

---

## Router Quick Reference

| Router | Auth | Description |
|--------|------|-------------|
| `system` | Public | Health checks |
| `auth` | Mixed | Authentication |
| `counties` | Public | County data |
| `user` | Protected | User profile |
| `search` | Rate Limited | Protocol search |
| `query` | Protected | AI queries |
| `voice` | Paid | Transcription |
| `subscription` | Protected | Payments |
| `admin` | Admin | Admin ops |
| `agencyAdmin` | Agency Admin | B2B management |

---

## Common Patterns

### Error Handling

```typescript
try {
  const result = await trpc.query.submit.mutate({ ... });
} catch (error) {
  if (error.data?.code === 'TOO_MANY_REQUESTS') {
    // Wait for Retry-After header
  } else if (error.data?.code === 'UNAUTHORIZED') {
    // Redirect to login
  }
  console.error('Request ID:', error.data?.requestId);
}
```

### Rate Limit Handling

```typescript
// Check remaining requests
const remaining = response.headers['x-ratelimit-remaining'];
if (remaining < 5) {
  // Slow down requests
}
```

---

## Support

For API issues, include:
1. Request ID from error response
2. Timestamp of the error
3. Steps to reproduce

Contact: support@protocol-guide.com
