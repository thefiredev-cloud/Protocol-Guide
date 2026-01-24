# Rate Limiting Security Implementation

## Overview
Comprehensive rate limiting has been implemented across all public API endpoints to prevent abuse, DoS attacks, scraping, and brute force attempts.

## Rate Limiting Strategy

### Three-Tier Protection System

1. **IP-Based Rate Limiting (Public Endpoints)**
   - Applied to all unauthenticated endpoints
   - Uses in-memory store with automatic cleanup
   - Limits: 10 requests per 15 minutes per IP (standard)
   - Limits: 5 requests per 15 minutes per IP (strict - for sensitive endpoints)

2. **User-Based Rate Limiting (Authenticated)**
   - Applied to authenticated procedures
   - Enforces daily query limits by subscription tier
   - Minute-based burst protection per tier

3. **Redis-Based Rate Limiting (Express Routes)**
   - Production-ready distributed rate limiting
   - Fallback to in-memory if Redis unavailable
   - Tier-aware limits for different subscription levels

## Implementation Details

### Express Routes (server/_core/index.ts)

#### Protected Endpoints:
- `/api/health` - Public limiter (100 req/min)
- `/api/ready` - Public limiter (100 req/min) - **NEW: Protected against health check abuse**
- `/api/live` - Public limiter (100 req/min) - **NEW: Protected against liveness probe spam**
- `/api/resilience` - Public limiter (100 req/min)
- `/api/summarize` - AI limiter (10 req/min free, 50 req/min pro, 200 req/min premium)
- `/api/client-error` - Public limiter
- `/api/imagetrend/launch` - Public limiter
- `/api/imagetrend/health` - Public limiter
- `/api/trpc` - Search limiter (30 req/min free, 100 req/min pro, 500 req/min premium)

### tRPC Procedures

#### Search Router (server/routers/search.ts)
All 8 procedures now protected with `publicRateLimitedProcedure`:

| Procedure | Rate Limit | Protection Against |
|-----------|------------|-------------------|
| `semantic` | 10 req/15min per IP | DoS, expensive vector searches |
| `getProtocol` | 10 req/15min per IP | Scraping, data exfiltration |
| `stats` | 10 req/15min per IP | Database abuse, aggregation attacks |
| `coverageByState` | 10 req/15min per IP | Expensive aggregation queries |
| `totalStats` | 10 req/15min per IP | Resource exhaustion |
| `agenciesByState` | 10 req/15min per IP | Data scraping |
| `agenciesWithProtocols` | 10 req/15min per IP | Bulk data extraction |
| `searchByAgency` | 10 req/15min per IP | DoS, semantic search abuse |

#### Counties Router (server/routers/counties.ts)
Protected with `publicRateLimitedProcedure`:

| Procedure | Rate Limit | Protection Against |
|-----------|------------|-------------------|
| `list` | 10 req/15min per IP | Scraping all county data |
| `get` | 10 req/15min per IP | Individual record scraping |

#### Integration Router (server/routers/integration.ts)
Protected with `strictPublicRateLimitedProcedure`:

| Procedure | Rate Limit | Protection Against |
|-----------|------------|-------------------|
| `logAccess` | 5 req/15min per IP | Log flooding, DB write abuse |

#### Auth Router (server/routers/auth.ts)
Protected with `publicRateLimitedProcedure`:

| Procedure | Rate Limit | Protection Against |
|-----------|------------|-------------------|
| `me` | 10 req/15min per IP | Account enumeration, brute force |

## Rate Limit Response Headers

All rate-limited endpoints return standardized headers:

```http
X-RateLimit-Limit: 10                    # Max requests in window
X-RateLimit-Remaining: 7                 # Remaining requests
X-RateLimit-Reset: 1706054400            # Unix timestamp when limit resets
X-RateLimit-Daily-Limit: 100             # Daily limit (authenticated only)
X-RateLimit-Daily-Remaining: 85          # Daily remaining (authenticated only)
X-RateLimit-Daily-Reset: 1706140800      # Daily reset timestamp (authenticated only)
Retry-After: 45                          # Seconds to wait (when rate limited)
```

## Rate Limit Error Response

When rate limited, clients receive:

```json
{
  "error": "RATE_LIMITED",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retryAfter": 45,
  "limit": 10,
  "subscriptionTier": "free"
}
```

## Security Benefits

### 1. DoS Attack Prevention
- Limits computational resources per IP
- Prevents expensive operations (semantic search, AI queries) from overwhelming system
- Health check endpoints protected against probe flooding

### 2. Scraping Protection
- Makes bulk data extraction economically infeasible
- 10 requests per 15 minutes = max 960 requests/day per IP
- County and protocol data cannot be scraped at scale

### 3. Brute Force Prevention
- Auth endpoints (`me`) rate limited to prevent account enumeration
- Integration logging endpoint protected against malicious log injection

### 4. Database Protection
- Statistics and aggregation queries rate limited
- Prevents resource exhaustion from complex queries
- Write operations (integration logs) strictly limited

### 5. Cost Control
- AI/LLM endpoints heavily rate limited (10 req/min free tier)
- Semantic search (Voyage AI embeddings) protected
- Prevents API cost explosion from abuse

## Subscription Tier Limits

### Free Tier
- Minute: 5-10 requests/minute (depending on endpoint)
- Daily: 10 queries/day
- Search: 30 requests/minute
- AI: 10 requests/minute

### Pro Tier
- Minute: 20 requests/minute
- Daily: 100 queries/day
- Search: 100 requests/minute
- AI: 50 requests/minute

### Premium Tier
- Minute: 60 requests/minute
- Daily: Unlimited
- Search: 500 requests/minute
- AI: 200 requests/minute

## Testing Rate Limits

### Manual Testing
```bash
# Test search endpoint rate limit (should fail on 11th request within 15 min)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/trpc/search.semantic \
    -H "Content-Type: application/json" \
    -d '{"query":"CPR"}' \
    -i
done

# Check rate limit headers in response
curl -i http://localhost:3000/api/health
```

### Load Testing
```bash
# Use Apache Bench to verify rate limiting
ab -n 20 -c 5 http://localhost:3000/api/health
```

## Monitoring

Rate limit violations are logged with:
- IP address
- Endpoint path
- Subscription tier (if authenticated)
- Request ID for tracing

Example log:
```json
{
  "level": "warn",
  "userId": "user_123",
  "subscriptionTier": "free",
  "ip": "192.168.1.1",
  "path": "/api/trpc/search.semantic",
  "limit": 10,
  "msg": "Rate limit exceeded"
}
```

## Fallback Behavior

### Redis Unavailable
When Redis is down, the system automatically falls back to in-memory rate limiting:
- Uses Map-based storage
- Automatic cleanup every 60 seconds
- Same rate limits applied
- Warning logged: "Redis not available, using in-memory rate limiter"

### Graceful Degradation
Rate limiter errors never block requests:
```typescript
try {
  // Check rate limit
} catch (error) {
  logger.error({ error }, "Rate limiter error");
  next(); // Allow request to proceed
}
```

## CORS Configuration

Rate limit headers are exposed to browsers via CORS:
```javascript
"Access-Control-Expose-Headers":
  "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, " +
  "X-RateLimit-Daily-Limit, X-RateLimit-Daily-Remaining, " +
  "X-RateLimit-Daily-Reset, Retry-After"
```

## Future Improvements

1. **Distributed Rate Limiting**: Full Redis implementation for horizontal scaling
2. **Dynamic Rate Limits**: Adjust limits based on system load
3. **IP Reputation**: Block known malicious IPs automatically
4. **Geographic Rate Limits**: Different limits per region
5. **Webhook Rate Limits**: Stripe webhook endpoint protection
6. **GraphQL Query Cost**: Complexity-based rate limiting

## Related Files

- `/server/_core/rateLimit.ts` - In-memory rate limiter
- `/server/_core/rateLimitRedis.ts` - Redis-based rate limiter
- `/server/_core/trpc.ts` - tRPC middleware definitions
- `/server/_core/types/rateLimit.ts` - Shared types
- `/server/_core/index.ts` - Express route configuration

## Compliance

Rate limiting supports:
- **OWASP API Security**: API4:2023 - Unrestricted Resource Consumption
- **HIPAA**: Protects against unauthorized access attempts
- **PCI DSS**: Requirement 6.5.10 - Broken Authentication and Session Management

## Updated: 2026-01-23
