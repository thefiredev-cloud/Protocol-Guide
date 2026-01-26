# Authentication Flow

**Version**: 2.0  
**Last Updated**: 2026-01-25

## Overview

Protocol Guide uses **Supabase Auth** for authentication with JWT-based access tokens. The system supports OAuth providers (Google, Apple) and email/password authentication.

---

## Authentication Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Client Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Auth UI    │  │  Token Store │  │   tRPC Client            │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘ │
└─────────┼─────────────────┼──────────────────────┼─────────────────┘
          │                 │                      │
          │ 1. Login        │ 3. Store Token       │ 5. API Requests
          ▼                 │                      │    + Bearer Token
┌─────────────────────┐     │                      │
│   Supabase Auth     │     │                      │
│  ┌───────────────┐  │     │                      │
│  │ OAuth/Email   │──┼─────┘                      │
│  │  Handlers     │  │ 2. JWT Token               │
│  └───────────────┘  │                            │
│  ┌───────────────┐  │                            │
│  │ Token Refresh │  │                            │
│  └───────────────┘  │                            │
└─────────────────────┘                            │
                                                   ▼
                              ┌───────────────────────────────────┐
                              │         Backend Server            │
                              │  ┌────────────────────────────┐  │
                              │  │   Context Creation         │  │
                              │  │   - Extract Bearer token   │  │
                              │  │   - Verify with Supabase   │  │
                              │  │   - Load user from DB      │  │
                              │  └─────────────┬──────────────┘  │
                              │                │                  │
                              │  ┌─────────────▼──────────────┐  │
                              │  │   tRPC Procedures          │  │
                              │  │   - ctx.user available     │  │
                              │  └────────────────────────────┘  │
                              └───────────────────────────────────┘
```

---

## Authentication Methods

### 1. OAuth Authentication (Google/Apple)

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐
│ Client  │────►│ OAuth Login │────►│ Provider (Google│
└─────────┘     │    Page     │     │    or Apple)    │
     ▲          └─────────────┘     └────────┬────────┘
     │                                       │
     │          ┌─────────────┐              │
     │◄─────────│ Callback    │◄─────────────┘
     │  Token   │  Handler    │  Auth Code
     │          └─────────────┘
```

**Flow:**
1. Client initiates OAuth flow via Supabase
2. User redirected to provider (Google/Apple)
3. Provider returns authorization code
4. Supabase exchanges code for tokens
5. Client receives JWT access token + refresh token

### 2. Email/Password Authentication

```
┌─────────┐                    ┌──────────────────┐
│ Client  │───────────────────►│  Supabase Auth   │
└─────────┘  email + password  └────────┬─────────┘
     ▲                                  │
     │       access_token +             │
     │       refresh_token              │
     └──────────────────────────────────┘
```

**Flow:**
1. Client sends email/password to Supabase
2. Supabase validates credentials
3. Returns JWT access token + refresh token

---

## Token Management

### Token Structure

```json
{
  "sub": "user-uuid-from-supabase",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1706205600,
  "exp": 1706209200,
  "aud": "authenticated"
}
```

### Token Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                        Token Lifecycle                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Login ──► Access Token (1 hour) ──► Refresh ──► New Token     │
│                  │                       ▲                      │
│                  │                       │                      │
│                  ▼                       │                      │
│            API Requests          Token Expired?                 │
│                  │                       │                      │
│                  │              Yes ─────┘                      │
│                  │                                              │
│                  ▼                                              │
│            Logout / Revoke ──► All Tokens Invalidated           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Token Storage

| Platform | Storage Location | Security |
|----------|------------------|----------|
| iOS | Secure Keychain | Hardware-backed |
| Android | EncryptedSharedPreferences | AES-256 |
| Web | HttpOnly Cookie | CSRF protected |

---

## Session Cookie Flow (Web)

```
┌─────────┐                    ┌──────────────────┐
│ Browser │                    │     Server       │
└────┬────┘                    └────────┬─────────┘
     │                                  │
     │  1. Login Success                │
     │─────────────────────────────────►│
     │                                  │
     │  2. Set-Cookie: session_token    │
     │     (HttpOnly, Secure, SameSite) │
     │◄─────────────────────────────────│
     │                                  │
     │  3. API Request                  │
     │     Cookie: session_token        │
     │─────────────────────────────────►│
     │                                  │
     │  4. Response                     │
     │◄─────────────────────────────────│
```

### Cookie Options

```javascript
{
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  maxAge: 7 * 24 * 3600, // 7 days
  path: '/',
  domain: '.protocol-guide.com'  // Subdomain sharing
}
```

---

## CSRF Protection

### Token Flow

```
┌─────────┐                    ┌──────────────────┐
│ Browser │                    │     Server       │
└────┬────┘                    └────────┬─────────┘
     │                                  │
     │  1. Initial Request              │
     │─────────────────────────────────►│
     │                                  │
     │  2. Set-Cookie: csrf_token       │
     │◄─────────────────────────────────│
     │                                  │
     │  3. POST /api/trpc/mutation      │
     │     Cookie: csrf_token           │
     │     Header: x-csrf-token         │
     │─────────────────────────────────►│
     │                                  │
     │  4. Validate tokens match        │
     │     (constant-time compare)      │
     │                                  │
```

### CSRF Implementation

```typescript
// Server-side validation
const csrfMiddleware = t.middleware(async (opts) => {
  if (opts.type === "mutation") {
    const headerToken = ctx.req.headers["x-csrf-token"];
    const cookieToken = ctx.req.cookies?.csrf_token;
    
    // Constant-time comparison prevents timing attacks
    const valid = crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
    
    if (!valid) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  }
  return next();
});
```

---

## Backend Context Creation

```typescript
// server/_core/context.ts
export async function createContext({ req, res }) {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  
  // 2. No token = public access
  if (!token) {
    return { req, res, user: null, trace };
  }
  
  // 3. Verify token with Supabase
  const { data: { user: supabaseUser }, error } = 
    await supabase.auth.getUser(token);
    
  if (error || !supabaseUser) {
    return { req, res, user: null, trace };
  }
  
  // 4. Load user data from database
  const user = await db.getUserBySupabaseId(supabaseUser.id);
  
  // 5. Return context with user
  return {
    req,
    res,
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      selectedCountyId: user.selectedCountyId,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
    } : null,
    trace,
  };
}
```

---

## Token Revocation

### Revocation Scenarios

| Scenario | Action | Effect |
|----------|--------|--------|
| Logout | Single token revoked | Current session ends |
| Logout All Devices | All user tokens revoked | All sessions end |
| Password Change | All tokens revoked + force re-auth | Security reset |
| Email Change | All tokens revoked | Re-verification required |
| Admin Suspension | All tokens blacklisted | Account locked |

### Revocation Flow

```
┌─────────┐                    ┌──────────────────┐
│ Client  │                    │     Server       │
└────┬────┘                    └────────┬─────────┘
     │                                  │
     │  1. POST auth.logout             │
     │─────────────────────────────────►│
     │                                  │
     │          2. Revoke in Supabase   │
     │          3. Clear session cookie │
     │          4. Add to blacklist     │
     │                                  │
     │  5. { success: true }            │
     │◄─────────────────────────────────│
     │                                  │
     │  6. Subsequent requests fail     │
     │     with UNAUTHORIZED            │
```

---

## Procedure Access Levels

```typescript
// Public - no auth required
publicProcedure.query(() => { ... });

// Protected - requires any authenticated user
protectedProcedure.mutation(() => {
  // ctx.user is guaranteed non-null
});

// Paid - requires Pro or Enterprise tier
paidProcedure.query(() => {
  // ctx.user.tier is 'pro' or 'enterprise'
});

// Admin - requires admin role
adminProcedure.mutation(() => {
  // ctx.user.role is 'admin'
});
```

---

## Security Best Practices

### For Mobile Apps

1. **Store tokens securely** - Use platform-specific secure storage
2. **Implement token refresh** - Auto-refresh before expiration
3. **Handle 401 gracefully** - Clear tokens and redirect to login
4. **Certificate pinning** - Prevent MITM attacks

### For Web Apps

1. **Use HttpOnly cookies** - Prevent XSS token theft
2. **Enable CSRF protection** - Validate CSRF tokens on mutations
3. **Implement SameSite cookies** - Prevent CSRF attacks
4. **Use Secure flag** - HTTPS only in production

### General

1. **Never log tokens** - Exclude from structured logs
2. **Short token lifetime** - 1 hour access tokens
3. **Implement logout everywhere** - Token revocation support
4. **Monitor failed auth** - Alert on brute force attempts

---

## Related Documentation

- [API Architecture](./API_ARCHITECTURE.md)
- [Rate Limiting Tiers](./RATE_LIMITING_TIERS.md)
- [Error Code Reference](./ERROR_CODE_REFERENCE.md)
- [Security Documentation](../SECURITY.md)
