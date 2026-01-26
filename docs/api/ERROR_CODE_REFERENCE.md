# API Error Code Reference

**Version**: 2.0  
**Last Updated**: 2026-01-25

## Overview

Protocol Guide uses structured error responses with consistent error codes. All errors include a request ID for debugging and correlation with server logs.

---

## Error Response Format

### Standard Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User-friendly error message",
    "data": {
      "code": "UNAUTHORIZED",
      "httpStatus": 401,
      "path": "auth.me",
      "requestId": "req_abc123xyz",
      "timestamp": "2026-01-25T10:30:00.000Z"
    }
  }
}
```

### Extended Error Response (API Errors)

```json
{
  "success": false,
  "error": {
    "code": "CLAUDE_RATE_LIMITED",
    "message": "The AI service is temporarily busy. Please try again in a moment.",
    "requestId": "req_abc123xyz",
    "timestamp": "2026-01-25T10:30:00.000Z",
    "retryable": true
  }
}
```

---

## tRPC Error Codes

### Authentication Errors

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `UNAUTHORIZED` | 401 | No valid authentication | "Please sign in to continue" |
| `FORBIDDEN` | 403 | Insufficient permissions | "You don't have permission to perform this action" |

### Validation Errors

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `BAD_REQUEST` | 400 | Invalid input | "Invalid request. Please check your input." |
| `PARSE_ERROR` | 400 | Malformed request body | "Unable to parse request" |

### Resource Errors

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `NOT_FOUND` | 404 | Resource doesn't exist | "The requested resource was not found" |
| `CONFLICT` | 409 | Resource conflict | "This resource already exists" |

### Rate Limiting

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded | "Too many requests. Please wait and try again." |

### Server Errors

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | "An unexpected error occurred. Please try again." |
| `TIMEOUT` | 408 | Request timeout | "Request timed out. Please try again." |
| `CLIENT_CLOSED_REQUEST` | 499 | Client disconnected | N/A (client-side) |

---

## Custom Error Codes

### Claude API Errors

| Code | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `CLAUDE_RATE_LIMITED` | 429 | ✅ Yes | Claude API rate limit |
| `CLAUDE_AUTH_ERROR` | 500 | ❌ No | API key invalid |
| `CLAUDE_SERVER_ERROR` | 503 | ✅ Yes | Claude 5xx error |
| `CLAUDE_OVERLOADED` | 503 | ✅ Yes | Claude at capacity |
| `CLAUDE_TIMEOUT` | 504 | ✅ Yes | Request timeout |
| `CLAUDE_INVALID_REQUEST` | 400 | ❌ No | Bad request to Claude |
| `CLAUDE_API_ERROR` | 500 | ✅ Yes | Generic Claude error |

### Voyage API Errors (Embeddings)

| Code | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `VOYAGE_RATE_LIMITED` | 429 | ✅ Yes | Voyage rate limit |
| `VOYAGE_AUTH_ERROR` | 500 | ❌ No | API key invalid |
| `VOYAGE_SERVER_ERROR` | 503 | ✅ Yes | Voyage 5xx error |
| `VOYAGE_TIMEOUT` | 504 | ✅ Yes | Request timeout |
| `VOYAGE_API_ERROR` | 500 | ✅ Yes | Generic Voyage error |

### Security Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CSRF_MISSING` | 403 | CSRF token not provided |
| `CSRF_MISMATCH` | 403 | CSRF token doesn't match |
| `TOKEN_REVOKED` | 401 | Auth token has been revoked |
| `SESSION_EXPIRED` | 401 | Session has expired |

### Subscription Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SUBSCRIPTION_REQUIRED` | 403 | Feature requires paid subscription |
| `SUBSCRIPTION_EXPIRED` | 403 | Subscription has expired |
| `TIER_LIMIT_EXCEEDED` | 429 | Daily query limit reached |
| `COUNTY_LIMIT_REACHED` | 400 | Max saved counties for tier |

### Webhook Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `WEBHOOK_SIGNATURE_INVALID` | 400 | Stripe signature verification failed |
| `WEBHOOK_ALREADY_PROCESSED` | 200 | Duplicate event (idempotent) |

---

## Error Handling Best Practices

### Client-Side Error Handling

```typescript
try {
  const result = await trpc.query.submit.mutate({ ... });
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
    router.push('/login');
  } else if (error.code === 'TOO_MANY_REQUESTS') {
    // Show rate limit message
    const retryAfter = error.data?.retryAfter;
    showToast(`Please wait ${retryAfter} seconds`);
  } else if (error.code === 'SUBSCRIPTION_REQUIRED') {
    // Prompt upgrade
    showUpgradeModal();
  } else if (error.data?.retryable) {
    // Retry with backoff
    await retryWithBackoff(() => trpc.query.submit.mutate({ ... }));
  } else {
    // Show generic error with request ID
    showError(`Error: ${error.message} (ID: ${error.data?.requestId})`);
  }
}
```

### Reporting Errors

When contacting support, include:
1. **Request ID** (`requestId` from error response)
2. **Timestamp** (when the error occurred)
3. **Error code** (e.g., `CLAUDE_TIMEOUT`)
4. **Steps to reproduce** (what you were doing)

---

## Error Code Categories

### Category: Authentication (4xx)

```
UNAUTHORIZED (401)
├── Missing or invalid token
├── Token expired
└── Token revoked

FORBIDDEN (403)
├── User lacks permission
├── CSRF validation failed
├── Feature requires upgrade
└── Account suspended
```

### Category: Validation (400)

```
BAD_REQUEST (400)
├── Missing required field
├── Invalid field format
├── Value out of range
└── Invalid enum value

PARSE_ERROR (400)
├── Invalid JSON
├── Encoding error
└── Malformed body
```

### Category: Rate Limits (429)

```
TOO_MANY_REQUESTS (429)
├── IP rate limit
├── User minute limit
├── User daily limit
└── Endpoint-specific limit
```

### Category: External Services (5xx)

```
SERVICE_UNAVAILABLE (503)
├── Claude API unavailable
├── Voyage API unavailable
├── Database connection failed
└── Redis unavailable

GATEWAY_TIMEOUT (504)
├── Claude timeout
├── Voyage timeout
└── Database timeout
```

---

## Retry Strategy by Error Code

| Error Code | Retry? | Strategy |
|------------|--------|----------|
| `UNAUTHORIZED` | ❌ | Re-authenticate |
| `FORBIDDEN` | ❌ | Check permissions |
| `BAD_REQUEST` | ❌ | Fix input |
| `NOT_FOUND` | ❌ | Resource doesn't exist |
| `TOO_MANY_REQUESTS` | ✅ | Wait for `Retry-After` |
| `INTERNAL_SERVER_ERROR` | ✅ | Exponential backoff |
| `CLAUDE_*` (retryable) | ✅ | Exponential backoff |
| `VOYAGE_*` (retryable) | ✅ | Exponential backoff |
| `TIMEOUT` | ✅ | Retry once |

---

## HTTP Status Code Summary

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Fix client input |
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check permissions/upgrade |
| 404 | Not Found | Resource missing |
| 408 | Timeout | Retry |
| 429 | Too Many Requests | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 502 | Bad Gateway | Retry |
| 503 | Service Unavailable | Retry with backoff |
| 504 | Gateway Timeout | Retry |

---

## Related Documentation

- [API Architecture](./API_ARCHITECTURE.md)
- [Rate Limiting Tiers](./RATE_LIMITING_TIERS.md)
- [Authentication Flow](./AUTHENTICATION_FLOW.md)
