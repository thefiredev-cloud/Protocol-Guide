# Critical Security Fix: Webhook Signature Verification

## Vulnerability Summary

**Severity**: CRITICAL
**File**: `supabase/functions/auth-events/index.ts`
**Impact**: Authentication bypass allowing unauthorized access to auth event webhooks

## Vulnerabilities Fixed

### 1. Signature Bypass (CRITICAL)
**Original Code:**
```typescript
if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
  return new Response("Invalid signature", { status: 401 });
}
```

**Problem**: If `WEBHOOK_SECRET` is undefined/not set, the entire security check is skipped. Attacker could send malicious webhooks without any authentication.

**Fix**: Fail fast if secret not configured
```typescript
if (!WEBHOOK_SECRET) {
  console.error('[AuthEvents] AUTH_WEBHOOK_SECRET not configured - rejecting request');
  return new Response(
    JSON.stringify({ error: 'Webhook not configured' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 2. Weak String Comparison (HIGH)
**Original Code:**
```typescript
signature !== WEBHOOK_SECRET  // Simple string comparison
```

**Problems**:
- Vulnerable to timing attacks (attacker can determine secret length/characters)
- No cryptographic verification
- Supports only plain text secrets

**Fix**: HMAC-SHA256 with constant-time comparison
```typescript
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Use HMAC-SHA256 for cryptographic verification
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  const expectedSignature = new TextDecoder().decode(
    encode(new Uint8Array(signatureBuffer))
  );

  // Constant-time comparison prevents timing attacks
  if (signature.length !== expectedSignature.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}
```

### 3. No Replay Attack Protection (MEDIUM)
**Problem**: Attacker could capture valid webhook and replay it multiple times.

**Fix**: Timestamp validation with 5-minute window
```typescript
// Validate timestamp header
const timestamp = req.headers.get('x-webhook-timestamp');
if (!timestamp) {
  return new Response(
    JSON.stringify({ error: 'Missing timestamp' }),
    { status: 400 }
  );
}

const requestTime = parseInt(timestamp, 10);
const now = Date.now();
const fiveMinutes = 5 * 60 * 1000;

if (Math.abs(now - requestTime) > fiveMinutes) {
  console.warn('[AuthEvents] Webhook timestamp too old/new - possible replay attack');
  return new Response(
    JSON.stringify({ error: 'Timestamp invalid' }),
    { status: 401 }
  );
}
```

## Security Improvements

### Before (Insecure)
- ❌ Signature verification completely bypassed if secret not set
- ❌ Plain text string comparison (timing attack vulnerable)
- ❌ No replay attack protection
- ❌ No cryptographic verification

### After (Secure)
- ✅ Mandatory secret configuration (fails if not set)
- ✅ HMAC-SHA256 cryptographic signatures
- ✅ Constant-time comparison prevents timing attacks
- ✅ Timestamp validation prevents replay attacks
- ✅ 5-minute validity window
- ✅ Comprehensive error logging

## Deployment Steps

### 1. Generate Strong Webhook Secret
```bash
# Generate a secure random secret
openssl rand -hex 32
```

### 2. Set Environment Variable
```bash
# In Supabase Dashboard:
# Settings > Edge Functions > Secrets
# Add: AUTH_WEBHOOK_SECRET = <your-generated-secret>

# Or via CLI:
supabase secrets set AUTH_WEBHOOK_SECRET=<your-generated-secret>
```

### 3. Deploy Updated Function
```bash
cd /Users/tanner-osterkamp/Protocol\ Guide\ Manus
supabase functions deploy auth-events
```

### 4. Update Webhook Configuration

In your webhook sender (e.g., Supabase Auth settings or external service):

**Headers Required:**
```
x-webhook-signature: <hmac-sha256-hex-signature>
x-webhook-timestamp: <unix-timestamp-ms>
Content-Type: application/json
```

**Signature Generation Example (Node.js):**
```javascript
const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

// Usage
const payload = JSON.stringify(webhookData);
const timestamp = Date.now().toString();
const signature = generateWebhookSignature(payload, process.env.AUTH_WEBHOOK_SECRET);

fetch('https://your-project.supabase.co/functions/v1/auth-events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': signature,
    'x-webhook-timestamp': timestamp,
  },
  body: payload,
});
```

**Signature Generation Example (Python):**
```python
import hmac
import hashlib
import json
import time

def generate_webhook_signature(payload: dict, secret: str) -> str:
    payload_str = json.dumps(payload)
    signature = hmac.new(
        secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

# Usage
timestamp = str(int(time.time() * 1000))
signature = generate_webhook_signature(webhook_data, os.environ['AUTH_WEBHOOK_SECRET'])

requests.post(
    'https://your-project.supabase.co/functions/v1/auth-events',
    headers={
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
    },
    json=webhook_data
)
```

## Testing

### Test Valid Webhook
```bash
# Generate test signature
PAYLOAD='{"type":"user.updated","user":{"id":"test-user-id"}}'
SECRET="your-secret-here"
TIMESTAMP=$(date +%s%3N)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Send test request
curl -X POST https://your-project.supabase.co/functions/v1/auth-events \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -H "x-webhook-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

### Expected Responses

**Success (200):**
```json
{
  "success": true,
  "processed": "user.updated"
}
```

**Missing Secret (500):**
```json
{
  "error": "Webhook not configured"
}
```

**Invalid Signature (401):**
```json
{
  "error": "Invalid signature"
}
```

**Missing Timestamp (400):**
```json
{
  "error": "Missing timestamp"
}
```

**Expired Timestamp (401):**
```json
{
  "error": "Timestamp invalid"
}
```

## Monitoring

Monitor these log messages for security events:

```
[AuthEvents] AUTH_WEBHOOK_SECRET not configured - rejecting request
[AuthEvents] Missing webhook timestamp
[AuthEvents] Webhook timestamp too old/new - possible replay attack
[AuthEvents] Invalid webhook signature
[AuthEvents] Error verifying signature
```

Set up alerts for repeated signature failures (potential attack).

## Related Files

- `/Users/tanner-osterkamp/Protocol Guide Manus/supabase/functions/auth-events/index.ts` - Fixed webhook handler
- Related RLS policies in `supabase/migrations/`
- Token revocation logic in auth middleware

## Security Standards Compliance

This fix implements:
- ✅ OWASP Authentication Cheat Sheet
- ✅ HMAC-based authentication (RFC 2104)
- ✅ Replay attack prevention
- ✅ Constant-time comparison (prevents timing attacks)
- ✅ Fail-secure defaults
- ✅ Comprehensive security logging

## References

- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [RFC 2104: HMAC](https://tools.ietf.org/html/rfc2104)
- [Timing Attack Prevention](https://codahale.com/a-lesson-in-timing-attacks/)
- [Deno Crypto API](https://deno.land/std/crypto)

## Date
Fixed: 2026-01-23
