# Token Revocation Security System

## Overview

Comprehensive token revocation mechanism that ensures tokens are invalidated in critical security scenarios, preventing unauthorized access even after authentication events.

## Features Implemented

### 1. Automatic Token Revocation

Tokens are automatically revoked in the following scenarios:

- **Password Change**: All tokens invalidated immediately
- **Email Change**: All tokens invalidated, requires re-verification
- **User-Initiated Logout All Devices**: Manual token revocation
- **Account Deletion**: Permanent token revocation
- **Security Incidents**: Admin-triggered revocation
- **Suspicious Activity**: Automated detection and revocation

### 2. Two-Tier Revocation System

#### Temporary Revocation (7 days TTL)
- Used for: password changes, email changes, logout all
- Stored in Redis with 7-day expiration
- Covers maximum JWT lifetime + buffer

#### Permanent Revocation (No TTL)
- Used for: account deletion, banned users
- Stored in Redis without expiration
- Requires manual cleanup

### 3. Token Revocation Flow

```
┌─────────────────┐
│  Auth Event     │
│ (Password/Email)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Revoke Tokens   │
│ in Redis        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sign Out All    │
│ Sessions (SUP)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Clear Current   │
│ Session Cookie  │
└─────────────────┘
```

## Implementation Details

### Server-Side Components

#### 1. Token Blacklist (`server/_core/token-blacklist.ts`)

**Functions:**
- `revokeUserTokens(userId, reason, metadata?)`: Temporary revocation
- `permanentlyRevokeUserTokens(userId, reason, metadata?)`: Permanent revocation
- `isTokenRevoked(userId)`: Check revocation status
- `getRevocationDetails(userId)`: Get revocation info
- `clearRevocation(userId)`: Clear revocation (testing/admin)

**Revocation Reasons:**
```typescript
type RevocationReason =
  | 'password_change'
  | 'email_change'
  | 'user_initiated_logout_all'
  | 'security_incident'
  | 'account_deletion'
  | 'suspicious_activity'
  | 'admin_action';
```

#### 2. Auth Router Endpoints (`server/routers/auth.ts`)

**New Endpoints:**

```typescript
// Change password (revokes all tokens)
auth.changePassword({
  currentPassword: string,
  newPassword: string (min 8, max 128)
})

// Update email (revokes all tokens)
auth.updateEmail({
  newEmail: string (valid email)
})

// Logout all devices
auth.logoutAllDevices()

// Get security status
auth.securityStatus()
```

#### 3. Context Middleware (`server/_core/context.ts`)

**Token Revocation Check:**
```typescript
// After user authentication
if (user && await isTokenRevoked(user.id.toString())) {
  user = null; // Reject request
}
```

Every authenticated request checks if the user's tokens have been revoked.

### Webhook Handler

**Supabase Auth Events** (`supabase/functions/auth-events/index.ts`)

Handles Supabase auth webhooks for automatic token revocation:

```typescript
Events:
- user.updated → Revoke tokens on password/email change
- user.deleted → Permanent revocation
```

## Setup Instructions

### 1. Redis Configuration

Ensure Redis is configured with sufficient memory for token blacklist:

```bash
# In .env
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

### 2. Supabase Webhook Setup

**Option A: Supabase Dashboard**
1. Go to Authentication > Webhooks
2. Click "Add webhook"
3. Configure:
   - URL: `https://your-project.supabase.co/functions/v1/auth-events`
   - Events: `user.updated`, `user.deleted`
   - Secret: Generate and save to `.env` as `AUTH_WEBHOOK_SECRET`

**Option B: Supabase CLI**
```bash
# Deploy edge function
supabase functions deploy auth-events

# Set webhook
supabase functions create-webhook \
  --url "https://your-project.supabase.co/functions/v1/auth-events" \
  --events "user.updated,user.deleted"
```

### 3. Environment Variables

Add to your `.env`:

```bash
# Existing
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REDIS_URL=your_redis_url

# New
AUTH_WEBHOOK_SECRET=your_webhook_secret
REDIS_TOKEN=your_redis_token
```

## Testing

### Run Token Revocation Tests

```bash
npm test tests/token-revocation.test.ts
```

**Test Coverage:**
- Password change revocation ✓
- Email change revocation ✓
- Logout all devices ✓
- Permanent revocation ✓
- Revocation status checks ✓
- All revocation reasons ✓

### Manual Testing

#### Test Password Change Revocation:
```bash
# 1. Login and get token
# 2. Change password
curl -X POST https://your-api.com/trpc/auth.changePassword \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentPassword":"old","newPassword":"newSecure123!"}'

# 3. Try using old token (should fail)
curl https://your-api.com/trpc/auth.me \
  -H "Authorization: Bearer OLD_TOKEN"
# Expected: 401 Unauthorized
```

#### Test Email Change Revocation:
```bash
# 1. Login and get token
# 2. Update email
curl -X POST https://your-api.com/trpc/auth.updateEmail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"newEmail":"new@example.com"}'

# 3. Try using old token (should fail)
# Expected: 401 Unauthorized
```

## Security Guarantees

### ✅ What This Protects Against

1. **Token Theft After Password Change**
   - Attacker cannot use stolen token after victim changes password

2. **Session Hijacking After Email Change**
   - All sessions invalidated when email is updated

3. **Compromised Account Recovery**
   - User can revoke all sessions via "Logout All Devices"

4. **Deleted Account Access**
   - Permanently revoked tokens cannot be used

5. **Security Incident Response**
   - Admin can immediately revoke user tokens

### ⚠️ Known Limitations

1. **Redis Dependency**
   - If Redis is down, revocation checks return `false` (fail-open)
   - Mitigation: Use Redis cluster with high availability

2. **Race Conditions**
   - Brief window between revocation and next request
   - Mitigation: Supabase also revokes sessions immediately

3. **Webhook Delays**
   - Webhook may take seconds to process
   - Mitigation: Server-side endpoints revoke immediately

## Monitoring

### Key Metrics to Track

1. **Revocation Rate**
   ```bash
   # Check Redis for revocation count
   redis-cli KEYS "revoked:user:*" | wc -l
   ```

2. **Failed Auth Attempts (Revoked)**
   - Monitor logs for `isTokenRevoked` rejections
   - Alert on unusual spikes

3. **Webhook Processing**
   - Monitor Supabase function logs
   - Alert on webhook failures

### Logging

All revocation events are logged with structured data:

```typescript
logger.info({
  userId,
  reason,
  metadata,
  requestId
}, "User tokens revoked");
```

## Best Practices

### For Developers

1. **Always check revocation in auth middleware**
   - Done automatically in `context.ts`

2. **Use appropriate revocation reason**
   - Helps with debugging and compliance

3. **Include metadata for audit trail**
   ```typescript
   revokeUserTokens(userId, 'security_incident', {
     ip: request.ip,
     userAgent: request.headers['user-agent'],
     triggeredBy: 'admin'
   });
   ```

4. **Handle revocation gracefully**
   - Clear client-side state
   - Redirect to login with message

### For Users

1. **Use "Logout All Devices" if account compromised**
   - Available in profile settings

2. **Change password immediately if suspicious**
   - Automatically revokes all tokens

3. **Check security status**
   - Use `auth.securityStatus()` endpoint

## Compliance

This implementation helps meet requirements for:

- **OWASP ASVS**: Session Management (V3)
- **PCI DSS**: Requirement 8.2.5 (token revocation)
- **HIPAA**: Access control (§164.312(a)(1))
- **GDPR**: Article 32 (security of processing)

## Troubleshooting

### Issue: Tokens not being revoked

**Check:**
1. Redis connection: `await getRedis()`
2. Webhook configured: Check Supabase dashboard
3. Environment variables: Verify `REDIS_URL`, `AUTH_WEBHOOK_SECRET`

### Issue: Users getting logged out unexpectedly

**Check:**
1. Revocation details: `getRevocationDetails(userId)`
2. Redis TTL: May be set too short
3. Clock skew: Ensure server time is accurate

### Issue: Webhook not receiving events

**Check:**
1. Supabase webhook URL is correct
2. Edge function deployed: `supabase functions list`
3. Webhook secret matches: Compare env vars

## Migration Guide

If you're adding this to an existing system:

1. **Deploy token-blacklist module**
   ```bash
   git pull
   npm install
   ```

2. **Update environment variables**
   ```bash
   # Add to .env
   AUTH_WEBHOOK_SECRET=generate_random_secret
   ```

3. **Deploy Supabase function**
   ```bash
   supabase functions deploy auth-events
   ```

4. **Configure webhook**
   - Follow setup instructions above

5. **Test in staging**
   ```bash
   npm test tests/token-revocation.test.ts
   ```

6. **Monitor production**
   - Watch logs for revocation events
   - Check Redis memory usage

## Support

For issues or questions:
- Check logs: `logger` outputs in `server/_core/token-blacklist.ts`
- Review tests: `tests/token-revocation.test.ts`
- Contact security team for incident response

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Owner**: Security Team
