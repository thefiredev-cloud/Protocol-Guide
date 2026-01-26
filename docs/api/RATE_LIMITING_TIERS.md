# Rate Limiting Tiers

**Version**: 2.0  
**Last Updated**: 2026-01-25

## Overview

Protocol Guide implements a multi-tier rate limiting system that protects the API from abuse while providing appropriate access levels for different user tiers.

---

## Rate Limit Types

### 1. IP-Based Rate Limiting (Unauthenticated)

Applied to public endpoints without authentication.

| Tier | Requests | Window | Use Case |
|------|----------|--------|----------|
| **Standard** | 100 | 1 minute | General public endpoints |
| **Search** | 30 | 1 minute | Search endpoints |
| **AI** | 10 | 1 minute | Summarize/AI endpoints |
| **Auth** | 5 | 1 minute | Login/signup (brute force prevention) |

### 2. User-Based Rate Limiting (Authenticated)

Applied to authenticated users based on subscription tier.

#### Per-Minute Burst Limits

| Subscription Tier | Requests/Minute | Use Case |
|-------------------|-----------------|----------|
| **Free** | 5 | Burst protection |
| **Pro** | 20 | Standard usage |
| **Enterprise/Unlimited** | 60 | Heavy usage |

#### Daily Query Limits

| Subscription Tier | Queries/Day | Reset Time |
|-------------------|-------------|------------|
| **Free** | 10 | Midnight UTC |
| **Pro** | 100 | Midnight UTC |
| **Enterprise** | Unlimited | N/A |

---

## Endpoint-Specific Limits

### Public Endpoints (IP-Based)

| Endpoint Category | Max Requests | Window | Notes |
|-------------------|--------------|--------|-------|
| `search.*` | 10 | 15 min | Prevents scraping |
| `system.health` | 100 | 1 min | Monitoring |
| `auth.me` | 10 | 15 min | Enumeration prevention |
| `counties.list` | 30 | 1 min | Reference data |

### Protected Endpoints (User-Based)

| Endpoint Category | Limit Type | Notes |
|-------------------|------------|-------|
| `query.submit` | Daily limit | Core AI queries |
| `user.*` | Minute burst | Profile operations |
| `subscription.*` | Minute burst | Payment operations |

### Admin Endpoints

| Endpoint Category | Max Requests | Window | Notes |
|-------------------|--------------|--------|-------|
| `admin.*` | 50 | 1 min | Admin operations |
| `agencyAdmin.*` | 30 | 1 min | Agency management |

---

## Rate Limit Headers

All responses include standard rate limit headers:

### Standard Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Max requests in window | `100` |
| `X-RateLimit-Remaining` | Requests remaining | `85` |
| `X-RateLimit-Reset` | Unix timestamp of reset | `1706205600` |
| `Retry-After` | Seconds until retry (when limited) | `45` |

### Daily Limit Headers (Authenticated)

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Daily-Limit` | Daily query limit | `100` or `unlimited` |
| `X-RateLimit-Daily-Remaining` | Queries remaining today | `75` or `unlimited` |
| `X-RateLimit-Daily-Reset` | Unix timestamp of midnight UTC | `1706227200` |

---

## Rate Limit Response

When rate limited, the API returns:

```json
{
  "error": "RATE_LIMITED",
  "reason": "minute_limit" | "daily_limit",
  "message": "Too many requests. Please wait 45 seconds.",
  "retryAfter": 45,
  "tier": "free",
  "daily": {
    "limit": 10,
    "used": 10,
    "remaining": 0
  }
}
```

**HTTP Status**: `429 Too Many Requests`

---

## Implementation Details

### Redis-Based Limiting (Production)

In production, rate limits are stored in Redis for distributed coordination:

```
rate_limit:<user_id>:minute → { count, resetTime }
rate_limit:<user_id>:daily → { count, resetTime }
rate_limit:ip:<ip_address> → { count, resetTime }
```

### In-Memory Fallback (Development)

When Redis is unavailable, an in-memory Map is used:
- ⚠️ Not suitable for multi-instance deployments
- Automatic cleanup of expired entries every 60 seconds

### Tier-Aware Rate Limiting

The rate limiter reads user tier from the authenticated context:

```typescript
// From request context
const tier = ctx.user?.tier || 'free';
const limits = TIER_LIMITS[tier];

// Apply appropriate limits
if (usage.minute >= limits.minuteLimit) {
  throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
}
```

---

## Best Practices for Clients

### 1. Respect Rate Limit Headers

Always check `X-RateLimit-Remaining` before making requests:

```typescript
const remaining = parseInt(response.headers['x-ratelimit-remaining']);
if (remaining < 5) {
  // Slow down request rate
}
```

### 2. Implement Exponential Backoff

When receiving 429 responses:

```typescript
async function requestWithBackoff(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'TOO_MANY_REQUESTS') {
        const retryAfter = error.data?.retryAfter || Math.pow(2, attempt);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Cache Responses Client-Side

Reduce API calls by caching:
- County lists (1 hour)
- Search results (5 minutes)
- Protocol stats (1 hour)

### 4. Batch Operations

For bulk operations, use batch endpoints when available instead of multiple individual requests.

---

## Monitoring & Alerts

### Sentry Integration

Rate limit events are logged to Sentry with:
- User ID (if authenticated)
- IP address (hashed for privacy)
- Endpoint path
- Current usage vs. limit

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| `rate_limit.exceeded` | Count of rate limit violations |
| `rate_limit.near_limit` | Count of requests at >80% limit |
| `rate_limit.tier_distribution` | Breakdown by user tier |

---

## Upgrade Path

Users hitting rate limits can upgrade their tier:

| Upgrade From | Upgrade To | Benefit |
|--------------|------------|---------|
| Free | Pro | 100 queries/day, 20/min burst |
| Pro | Enterprise | Unlimited queries, 60/min burst |

Upgrade prompts are shown when:
- Daily limit reached
- Consistently hitting minute limits
- Accessing Pro-only features

---

## Related Documentation

- [API Architecture](./API_ARCHITECTURE.md)
- [Error Code Reference](./ERROR_CODE_REFERENCE.md)
- [Subscription Tiers](../PRICING_QUICK_REFERENCE.md)
