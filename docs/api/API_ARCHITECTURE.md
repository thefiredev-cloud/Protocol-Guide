# Protocol Guide API Architecture

**Version**: 2.0  
**Last Updated**: 2026-01-25  
**Status**: Production

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Technology Stack](#technology-stack)
- [Router Organization](#router-organization)
- [Security Model](#security-model)
- [Versioning Strategy](#versioning-strategy)
- [Performance Optimizations](#performance-optimizations)

---

## Overview

Protocol Guide's API is built on **tRPC**, providing end-to-end type safety between the React Native mobile app and the Express.js backend. The API follows domain-driven design principles with 15 specialized routers organized by business capability.

### Key Features

- **Type-Safe**: Full TypeScript type inference from server to client
- **Secure**: Multi-layer authentication with CSRF protection
- **Scalable**: Redis-backed rate limiting with tiered access
- **Observable**: Distributed tracing with request ID propagation
- **Resilient**: Circuit breakers and graceful degradation

---

## Architecture Principles

### 1. Domain-Driven Router Organization

Each router owns a specific domain and encapsulates related procedures:

```
┌─────────────────────────────────────────────────────────────┐
│                       App Router                             │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  System  │   Auth   │  Search  │  Query   │  Subscription  │
│  Router  │  Router  │  Router  │  Router  │     Router     │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│ Counties │   User   │  Voice   │ Feedback │    Contact     │
│  Router  │  Router  │  Router  │  Router  │     Router     │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  Admin   │ Agency   │ Integr-  │ Referral │     Jobs       │
│  Router  │  Admin   │  ation   │  Router  │    Router      │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

### 2. Procedure Type Hierarchy

```
publicProcedure
    │
    ├── publicRateLimitedProcedure (IP-based rate limiting)
    │       └── strictPublicRateLimitedProcedure (5 req/15min)
    │
    └── csrfProtectedProcedure (CSRF token validation)
            │
            ├── protectedProcedure (requires authentication)
            │       │
            │       ├── paidProcedure (Pro/Enterprise tier)
            │       │
            │       └── rateLimitedProcedure (daily query limits)
            │
            └── adminProcedure (requires admin role)
```

### 3. Request Flow

```
Request → Rate Limiter → CORS → Body Parser → Cookie Middleware
    ↓
tRPC Middleware Chain:
    1. Tracing (request ID, timing)
    2. CSRF Validation (mutations only)
    3. Authentication (if protected)
    4. Tier Validation (if paid)
    5. Rate Limit Check (if rate limited)
    ↓
Procedure Handler → Response with Rate Limit Headers
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Framework** | tRPC v10 | Type-safe RPC |
| **HTTP Server** | Express.js | Routing, middleware |
| **Serialization** | SuperJSON | Date/BigInt support |
| **Validation** | Zod | Runtime schema validation |
| **Authentication** | Supabase Auth | JWT-based auth |
| **Rate Limiting** | Redis + In-Memory | Distributed limiting |
| **Caching** | Redis | Search result caching |
| **Database** | MySQL + Supabase | Relational + Vector storage |
| **Error Tracking** | Sentry | Error monitoring |
| **Logging** | Pino | Structured logging |

---

## Router Organization

### Core Business Routers

| Router | Procedures | Purpose |
|--------|-----------|---------|
| `system` | 2 | Health checks, notifications |
| `auth` | 6 | Login, logout, password, session |
| `counties` | 2 | County listing and lookup |
| `user` | 10 | Profile, counties, push tokens |
| `search` | 7 | Semantic protocol search |
| `query` | 6 | AI-powered protocol queries |
| `voice` | 1 | Voice transcription |
| `feedback` | 1 | User feedback submission |
| `contact` | 1 | Public contact form |
| `subscription` | 4 | Stripe payments |

### Admin & B2B Routers

| Router | Procedures | Purpose |
|--------|-----------|---------|
| `admin` | 5 | User/feedback management |
| `agencyAdmin` | 18 | B2B agency management |
| `integration` | 2 | Partner tracking |
| `referral` | 6 | Viral referral system |
| `jobs` | 2 | Background job management |

---

## Security Model

### Authentication Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  Client │────►│ Supabase Auth│────►│   Backend   │
└─────────┘     └──────────────┘     └─────────────┘
     │                 │                    │
     │  1. OAuth/      │                    │
     │     Email Login │                    │
     │────────────────►│                    │
     │                 │                    │
     │  2. JWT Token   │                    │
     │◄────────────────│                    │
     │                 │                    │
     │  3. API Request + Bearer Token       │
     │─────────────────────────────────────►│
     │                 │                    │
     │                 │  4. Verify JWT     │
     │                 │◄───────────────────│
     │                 │                    │
     │  5. Response    │                    │
     │◄─────────────────────────────────────│
```

### CSRF Protection

All mutations require a CSRF token:

1. Server sets `csrf_token` cookie on first request
2. Client reads cookie and includes in `x-csrf-token` header
3. Server validates header matches cookie (timing-safe compare)

### Security Headers (Helmet)

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict with nonces | XSS prevention |
| `Strict-Transport-Security` | 1 year, preload | Force HTTPS |
| `X-Frame-Options` | DENY | Clickjacking prevention |
| `X-Content-Type-Options` | nosniff | MIME sniffing prevention |
| `Referrer-Policy` | strict-origin-when-cross-origin | Privacy |
| `Permissions-Policy` | Restrictive | Feature control |

---

## Versioning Strategy

### Current Approach: Implicit Versioning

Protocol Guide uses **implicit versioning** via the tRPC type system:

1. **Breaking Changes**: Communicated via TypeScript compilation errors
2. **Additive Changes**: New fields are optional, old clients unaffected
3. **Deprecation**: Marked in JSDoc, removed after migration period

### Future: Explicit Versioning (When Needed)

When public API access is added, we'll implement URL-based versioning:

```
/api/v1/trpc/...   # Stable, long-term support
/api/v2/trpc/...   # New features, breaking changes
```

### Backward Compatibility Rules

1. **Never remove** required input fields without deprecation
2. **Never change** existing output types incompatibly  
3. **Always add** new fields as optional
4. **Mark deprecated** procedures with `@deprecated` JSDoc

---

## Performance Optimizations

### 1. Query Normalization

EMS queries are normalized before embedding generation:
- Abbreviation expansion (VF → Ventricular Fibrillation)
- Typo correction (carddiac → cardiac)
- Intent detection for model routing

### 2. Search Caching

Redis-based caching for search results:
- TTL: 1 hour
- Key: hash of normalized query + filters
- Cache headers: `X-Cache: HIT|MISS`

### 3. Connection Pooling

- MySQL: Pool size 10, idle timeout 30s
- Redis: Connection pool with retry logic
- Supabase: HTTP/2 connection reuse

### 4. Batch Query Prevention (N+1)

Optimized database functions that batch related queries:
- `getAgencyByCountyIdOptimized()` - single query mapping
- Eager loading for agency admin listings

---

## Related Documentation

- [Rate Limiting Tiers](./RATE_LIMITING_TIERS.md)
- [Error Code Reference](./ERROR_CODE_REFERENCE.md)
- [Authentication Flow](./AUTHENTICATION_FLOW.md)
- [API Quick Reference](./API_QUICK_REFERENCE.md)
