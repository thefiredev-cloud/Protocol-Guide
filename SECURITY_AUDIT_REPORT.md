# Protocol Guide Authentication Security Audit Report

**Date:** 2026-01-23
**Auditor:** Authentication Security Expert
**Scope:** OAuth flows, session handling, token management, protected routes, and secure storage

---

## Executive Summary

The Protocol Guide authentication system uses **Supabase Auth** with OAuth providers (Google, Apple). Overall, the implementation follows modern best practices with good token validation and session management. However, several **critical and high-priority security vulnerabilities** were identified that require immediate attention.

### Risk Assessment
- **Critical Issues:** 2
- **High Priority:** 4
- **Medium Priority:** 3
- **Low Priority:** 2

---

## 1. Critical Issues

### 1.1 Missing CSRF Protection on Auth Endpoints

**Severity:** CRITICAL
**File:** `server/_core/oauth.ts`, `server/_core/index.ts`

**Issue:**
The logout endpoint and other auth-related endpoints lack CSRF (Cross-Site Request Forgery) protection. An attacker could force a user to log out or perform other auth actions without consent.

```typescript
// Current implementation - NO CSRF token validation
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});
```

**Impact:**
- Forced logout attacks
- Session fixation vulnerabilities
- State manipulation attacks

**Recommendation:**
Implement CSRF token validation for all state-changing auth operations:

```typescript
// Add CSRF middleware
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: 'strict'
  }
});

// Apply to auth endpoints
app.post("/api/auth/logout", csrfProtection, (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});
```

---

### 1.2 Insufficient Token Refresh Logic

**Severity:** CRITICAL
**File:** `lib/supabase.ts`, `hooks/use-auth.ts`

**Issue:**
The client does not implement explicit token refresh logic. While `autoRefreshToken: true` is set in the Supabase client configuration, there's no fallback handling for refresh failures or expired sessions.

```typescript
// Current implementation
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,  // Relies solely on Supabase SDK
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Impact:**
- Users may be stuck with expired sessions
- No graceful degradation when refresh fails
- Silent auth failures without user notification

**Recommendation:**
Implement explicit refresh token handling with error recovery:

```typescript
// Add refresh handler
export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error('[Auth] Token refresh failed:', error);
    // Force re-authentication
    await supabase.auth.signOut();
    return null;
  }

  return data.session;
}

// In useAuth hook, add refresh interval check
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 60000;

      // Refresh if less than 5 minutes until expiry
      if (minutesUntilExpiry < 5) {
        await refreshSession();
      }
    }
  };

  // Check every 60 seconds
  const interval = setInterval(checkSession, 60000);
  return () => clearInterval(interval);
}, []);
```

---

## 2. High Priority Issues

### 2.1 OAuth State Parameter Not Validated

**Severity:** HIGH
**File:** `lib/supabase-mobile.ts`, `app/oauth/callback.tsx`

**Issue:**
The OAuth state parameter is generated but never validated in the callback, making the flow vulnerable to CSRF attacks and session fixation.

```typescript
// State is generated but not stored or validated
async function generateState(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Callback doesn't validate state parameter
export default function OAuthCallback() {
  // No state validation!
  const { data, error } = await supabase.auth.getSession();
}
```

**Impact:**
- OAuth authorization code interception
- Cross-site request forgery during OAuth flow
- Session fixation attacks

**Recommendation:**
Store state in secure storage and validate on callback:

```typescript
import * as SecureStore from 'expo-secure-store';

// Store state before OAuth
export async function signInWithGoogleMobile() {
  const state = await generateState();
  await SecureStore.setItemAsync('oauth_state', state);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUri,
      queryParams: {
        state: state,  // Include state
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

// Validate state in callback
export default function OAuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const receivedState = url.searchParams.get('state');
      const storedState = await SecureStore.getItemAsync('oauth_state');

      if (!receivedState || receivedState !== storedState) {
        setStatus("error");
        setErrorMessage("Invalid OAuth state - possible CSRF attack");
        return;
      }

      // Clean up
      await SecureStore.deleteItemAsync('oauth_state');

      // Continue with session validation...
    };

    handleCallback();
  }, []);
}
```

---

### 2.2 No Session Expiration Enforcement

**Severity:** HIGH
**File:** `server/_core/context.ts`

**Issue:**
Server-side token validation doesn't check token expiration explicitly. It relies solely on Supabase's `getUser()` method without additional expiry validation.

```typescript
// Current implementation - no explicit expiry check
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    // Only checks if token is valid, not if it's expired
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
  }
}
```

**Impact:**
- Stale tokens may be accepted
- No forced session timeout
- Potential for token reuse after intended expiration

**Recommendation:**
Add explicit expiration validation:

```typescript
import { jwtVerify } from 'jose';

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    try {
      // Verify token signature and expiration
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secret);

      // Check expiration with 5-minute buffer
      const expiresAt = payload.exp ? payload.exp * 1000 : 0;
      const now = Date.now();
      const bufferMs = 5 * 60 * 1000; // 5 minutes

      if (expiresAt && (now + bufferMs) >= expiresAt) {
        console.warn('[Context] Token expires soon or expired');
        return { req: opts.req, res: opts.res, user: null };
      }

      // Verify with Supabase
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (supabaseUser && !error) {
        user = await db.findOrCreateUserBySupabaseId(supabaseUser.id, {
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
        });
      }
    } catch (error) {
      console.error('[Context] Token validation error:', error);
      user = null;
    }
  }

  return { req: opts.req, res: opts.res, user };
}
```

---

### 2.3 Insecure Token Storage in Mobile App

**Severity:** HIGH
**File:** `lib/offline-cache.ts`

**Issue:**
The app uses `AsyncStorage` for caching protocols, which could potentially store sensitive data. While the current implementation doesn't cache tokens, there's no encryption for cached data, and tokens could accidentally be included in protocol metadata.

```typescript
// AsyncStorage is used without encryption
await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
```

**Impact:**
- Cached data readable by malicious apps on rooted/jailbroken devices
- No protection if device is compromised
- Potential PII exposure in protocol responses

**Recommendation:**
Switch to encrypted storage for sensitive data and implement data sanitization:

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Create encrypted storage wrapper
const SecureStorage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      // Web: use sessionStorage or encrypted localStorage
      sessionStorage.setItem(key, value);
    } else {
      // Native: use SecureStore
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// Sanitize cached protocols to remove any tokens
async saveProtocol(protocol: Omit<CachedProtocol, "id" | "timestamp">): Promise<void> {
  // Sanitize protocol data
  const sanitized = {
    ...protocol,
    // Remove any potential sensitive fields
    response: protocol.response.replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED]'),
  };

  // Use secure storage for cached data
  const cache = await this.getAllProtocols();
  // ... rest of implementation
}
```

---

### 2.4 Missing Rate Limiting on Auth Endpoints

**Severity:** HIGH
**File:** `server/_core/index.ts`

**Issue:**
The `/api/auth/logout` endpoint has no rate limiting, making it vulnerable to brute force and DoS attacks.

```typescript
// No rate limiting on auth endpoints
registerOAuthRoutes(app);
```

**Impact:**
- Account enumeration attacks
- Brute force attacks on auth endpoints
- Denial of service through repeated logout requests

**Recommendation:**
Apply strict rate limiting to auth endpoints:

```typescript
import rateLimit from 'express-rate-limit';

// Create auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      path: req.path
    }, 'Auth rate limit exceeded');

    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Apply to auth routes
app.post("/api/auth/logout", authLimiter, (req, res) => {
  // ... logout logic
});
```

---

## 3. Medium Priority Issues

### 3.1 Insufficient Logout Implementation

**Severity:** MEDIUM
**File:** `server/routers/auth.ts`, `hooks/use-auth.ts`

**Issue:**
The logout process only clears cookies on the server but doesn't invalidate the token on Supabase's side or clear all client-side state comprehensively.

```typescript
// Server only clears cookie
logout: publicProcedure.mutation(({ ctx }) => {
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return { success: true } as const;
}),

// Client only calls Supabase signOut
const logout = useCallback(async () => {
  await supabaseSignOut();
  setUser(null);
  setSession(null);
}, []);
```

**Impact:**
- Token may remain valid on Supabase
- Client state may not fully clear
- Potential session persistence issues

**Recommendation:**
Implement comprehensive logout:

```typescript
// Server-side: Add token revocation
logout: publicProcedure.mutation(async ({ ctx }) => {
  const authHeader = ctx.req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    // Revoke token on Supabase
    try {
      await supabaseAdmin.auth.admin.signOut(token);
    } catch (error) {
      logger.error({ error }, 'Failed to revoke token on logout');
    }
  }

  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

  return { success: true } as const;
}),

// Client-side: Clear all related data
const logout = useCallback(async () => {
  try {
    // 1. Sign out from Supabase
    await supabaseSignOut();

    // 2. Clear local state
    setUser(null);
    setSession(null);
    setError(null);

    // 3. Clear any cached sensitive data
    await OfflineCache.clearSensitiveData();

    // 4. Clear AsyncStorage auth-related items
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key =>
      key.includes('auth') ||
      key.includes('session') ||
      key.includes('token')
    );
    await AsyncStorage.multiRemove(authKeys);

    // 5. Reset query cache
    queryClient.clear();

  } catch (err) {
    console.error('[Auth] Logout failed:', err);
    // Force clear even on error
    setUser(null);
    setSession(null);
  }
}, []);
```

---

### 3.2 No Token Blacklisting

**Severity:** MEDIUM
**File:** `server/_core/context.ts`

**Issue:**
There's no mechanism to blacklist compromised tokens or enforce immediate logout across devices.

**Impact:**
- Compromised tokens remain valid until expiration
- No way to force logout from stolen device
- Cannot revoke specific sessions

**Recommendation:**
Implement Redis-based token blacklist:

```typescript
// Add to redis.ts
export async function blacklistToken(token: string, expiresIn: number) {
  if (!isRedisAvailable()) {
    logger.warn('Cannot blacklist token - Redis not available');
    return;
  }

  const key = `blacklist:token:${token}`;
  await redis.set(key, '1', 'EX', expiresIn);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  const key = `blacklist:token:${token}`;
  const result = await redis.get(key);
  return result !== null;
}

// Update context.ts
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      console.warn('[Context] Blacklisted token attempted');
      return { req: opts.req, res: opts.res, user: null };
    }

    // ... rest of validation
  }
}

// Add logout with blacklisting
logout: publicProcedure.mutation(async ({ ctx }) => {
  const token = ctx.req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    // Blacklist token for remaining lifetime (1 hour)
    await blacklistToken(token, 3600);
    await supabaseAdmin.auth.admin.signOut(token);
  }

  // ... rest of logout
});
```

---

### 3.3 Weak Error Messages

**Severity:** MEDIUM
**File:** Multiple files

**Issue:**
Error messages leak information about the authentication state, which could aid attackers.

```typescript
// Current - reveals whether user exists
if (!ctx.user || ctx.user.role !== "admin") {
  throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
}

// Error message: "You do not have required permission (10002)"
```

**Impact:**
- Account enumeration
- Information disclosure
- Aids in targeted attacks

**Recommendation:**
Use generic error messages:

```typescript
// Generic messages that don't reveal auth state
export const UNAUTHED_ERR_MSG = "Authentication required";
export const NOT_ADMIN_ERR_MSG = "Access denied";

// Don't differentiate between "user not found" and "wrong password"
if (!ctx.user) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Authentication required"
  });
}

if (ctx.user.role !== "admin") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Access denied"
  });
}
```

---

## 4. Low Priority Issues

### 4.1 No Session Timeout Configuration

**Severity:** LOW
**File:** `lib/supabase.ts`

**Issue:**
Session timeout is not explicitly configured, relying on Supabase defaults.

**Recommendation:**
Configure explicit session timeout:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Add explicit timeout
    storageKey: 'protocol-guide-auth',
    flowType: 'pkce', // Use PKCE flow for better security
  },
  global: {
    headers: {
      'x-client-version': '1.0.0'
    }
  }
});
```

---

### 4.2 Missing Security Headers

**Severity:** LOW
**File:** `server/_core/index.ts`

**Issue:**
Security headers like Content-Security-Policy, X-Frame-Options are not configured.

**Recommendation:**
Add security headers middleware:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

## 5. Best Practices & Recommendations

### 5.1 Implement MFA/2FA
Consider adding multi-factor authentication for enterprise tier users.

### 5.2 Add Audit Logging
Log all authentication events (login, logout, failed attempts) for security monitoring.

```typescript
// Add to logger.ts
export function logAuthEvent(event: {
  type: 'login' | 'logout' | 'login_failed' | 'token_refresh';
  userId?: string;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
}) {
  logger.info({
    ...event,
    category: 'auth',
    timestamp: new Date().toISOString(),
  }, `Auth event: ${event.type}`);
}
```

### 5.3 Implement Session Management Dashboard
Allow users to view and revoke active sessions from their profile.

### 5.4 Add Biometric Authentication
For mobile apps, add Face ID / Touch ID as optional authentication layer.

### 5.5 Implement Account Lockout
Add temporary account lockout after multiple failed login attempts.

---

## 6. Testing Recommendations

### 6.1 Security Tests to Add

```typescript
// tests/auth-security.test.ts
describe('Auth Security', () => {
  it('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/trpc/user.me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(response.status).toBe(401);
  });

  it('should prevent CSRF attacks on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'https://evil.com');
    expect(response.status).toBe(403);
  });

  it('should blacklist token after logout', async () => {
    const token = await getValidToken();
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    const response = await request(app)
      .get('/api/trpc/user.me')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('should rate limit auth endpoints', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/logout');
    }

    const response = await request(app).post('/api/auth/logout');
    expect(response.status).toBe(429);
  });
});
```

---

## 7. Implementation Priority

### Phase 1 (Immediate - Week 1)
1. ✅ Add CSRF protection
2. ✅ Implement token refresh logic
3. ✅ Add OAuth state validation
4. ✅ Add rate limiting to auth endpoints

### Phase 2 (High Priority - Week 2-3)
1. ✅ Implement session expiration enforcement
2. ✅ Switch to secure storage for mobile
3. ✅ Add token blacklisting
4. ✅ Improve logout implementation

### Phase 3 (Medium Priority - Week 4)
1. ✅ Add security headers
2. ✅ Implement audit logging
3. ✅ Add comprehensive auth tests
4. ✅ Generic error messages

### Phase 4 (Nice to Have - Month 2)
1. ⏳ MFA/2FA implementation
2. ⏳ Session management dashboard
3. ⏳ Biometric authentication
4. ⏳ Account lockout mechanism

---

## 8. Compliance & Standards

### OWASP Authentication Standards
- ✅ Password storage: N/A (OAuth only)
- ⚠️ Session management: Needs improvement
- ⚠️ CSRF protection: Missing
- ✅ Transport security: HTTPS enforced
- ⚠️ Token storage: Needs encryption

### Healthcare Compliance (HIPAA if applicable)
- ✅ Audit logging: Partial (needs enhancement)
- ⚠️ Access controls: Good but needs MFA
- ✅ Encryption in transit: Yes
- ⚠️ Encryption at rest: Needs improvement
- ✅ Session timeout: Configurable

---

## 9. Dependencies Security

### Current Auth Dependencies
- `@supabase/supabase-js`: ^2.49.4 ✅ (Latest)
- `expo-auth-session`: ^7.0.10 ✅
- `jose`: 6.1.0 ✅
- `cookie`: ^1.1.1 ✅

### Recommended Additional Dependencies
- `csurf`: For CSRF protection
- `helmet`: For security headers
- `express-rate-limit`: For auth endpoint rate limiting
- `expo-secure-store`: For encrypted mobile storage

---

## 10. Monitoring & Alerts

### Recommended Alerts
1. **Failed login attempts** > 5 in 10 minutes
2. **Token validation failures** spike
3. **OAuth callback errors** increase
4. **Session expiration** without refresh
5. **Blacklisted token attempts**

### Metrics to Track
- Login success/failure rate
- Token refresh rate
- Average session duration
- OAuth conversion rate
- Auth endpoint latency

---

## Conclusion

The Protocol Guide authentication system has a solid foundation with Supabase Auth and OAuth integration. However, **critical CSRF protection and token refresh handling must be addressed immediately**. The high-priority issues around OAuth state validation and secure storage should be tackled within 2-3 weeks.

Following this audit and implementing the recommended fixes will bring the authentication system to production-grade security standards suitable for healthcare applications handling sensitive EMS protocol data.

**Next Steps:**
1. Review and prioritize fixes with the team
2. Create GitHub issues for each finding
3. Implement Phase 1 fixes immediately
4. Schedule security testing after fixes
5. Set up continuous security monitoring

---

**Report Generated:** 2026-01-23
**Tools Used:** Manual code review, OWASP guidelines, Supabase best practices
**Contact:** For questions about this audit, refer to the security team.
