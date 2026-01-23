# Security Validation Tests Summary

This document summarizes the comprehensive security test coverage for Protocol Guide's new security validations.

## Test Files Created

### 1. `/tests/voice-router-security.test.ts` (36 tests)
Tests security validations in the voice transcription router.

#### URL Allowlist Validation (17 tests)
- **Allowed URLs**: Tests that authorized storage domains are accepted
  - Protocol Guide storage (`storage.protocol-guide.com`)
  - Supabase storage (`*.supabase.co`)
  - Cloudflare R2 (`*.r2.cloudflarestorage.com`)
  - URLs with query parameters, fragments, encoded characters

- **Rejected URLs**: Tests that unauthorized domains are blocked
  - Unauthorized domains (evil.com, attacker.net, etc.)
  - HTTP URLs (only HTTPS allowed)
  - Invalid URL formats (javascript:, data:, file:, ftp:)
  - Subdomain spoofing attempts
  - Uppercase characters in subdomain
  - Empty/whitespace URLs
  - Localhost URLs

#### File Size Limits (7 tests)
- Accepts audio under 10MB limit
- Accepts audio at exactly 10MB limit
- Rejects audio exceeding 10MB limit
- Rejects significantly oversized audio (50MB)
- Validates MIME types (audio/webm, audio/mp4, audio/mpeg, etc.)
- Handles MIME types with codec parameters

#### Input Sanitization (6 tests)
- URL format validation in transcribe endpoint
- Optional language parameter handling
- SQL injection in URL path (safely handled)
- XSS payloads in URL path (safely handled)
- Malformed URL handling
- Null bytes in URLs

#### Integration Tests (6 tests)
- Combines URL allowlist with zod validation
- Tests validation at multiple layers
- Edge cases for extremely long URLs

---

### 2. `/tests/protocols-router-security.test.ts` (34 tests)
Tests security validations in the protocol management router.

#### File Size Limits (8 tests)
- Accepts PDF under 20MB limit
- Accepts PDF at exactly 20MB limit
- Rejects PDF exceeding 20MB limit
- Rejects significantly oversized PDF (100MB)
- Calculates actual file size from base64
- Validates MIME type (application/pdf only)
- Uses default MIME type if not provided

#### Input Sanitization (18 tests)
- **File Name Validation**:
  - Valid file names accepted
  - Names exceeding 255 characters rejected
  - Names at 255 character limit accepted
  - Path traversal attempts handled

- **Protocol Number Validation**:
  - Valid protocol numbers accepted
  - Numbers exceeding 50 characters rejected
  - Numbers at 50 character limit accepted

- **Title Validation**:
  - Valid titles accepted
  - Titles exceeding 255 characters rejected
  - Titles at 255 character limit accepted

- **Version Validation**:
  - Valid version strings accepted
  - Default version "1.0" used if not provided
  - Version strings exceeding 20 characters rejected

- **Agency ID Validation**:
  - Valid agency IDs accepted
  - Negative agency IDs handled
  - Zero as agency ID handled

#### Security Tests (8 tests)
- SQL injection in protocol number (parameterized queries prevent)
- SQL injection in title (ORM prevents)
- XSS payloads in title (output escaping prevents)
- XSS payloads in file name (storage layer sanitizes)
- Unicode characters in title
- Special characters in file name
- Empty base64 data
- Optional effective date handling
- Performance with maximum valid input

---

### 3. `/tests/subscription-router-security.test.ts` (50 tests)
Tests security validations in the subscription management router.

#### Authorization Checks (10 tests)
- **Department Checkout Authorization**:
  - Verifies user is agency admin before creating checkout
  - Rejects checkout when user is not agency admin
  - Prevents user from creating checkout for different agency
  - Handles authorization check errors gracefully
  - Rejects invalid agency IDs
  - Enforces authorization before processing payment

- **Customer Portal Authorization**:
  - Requires Stripe customer ID to access portal
  - Validates Stripe customer ID format (`cus_*`)

- **User Context Validation**:
  - Ensures user context exists for protected procedures
  - Rejects requests without user context

#### Input Validation (30 tests)
- **Personal Subscription Checkout**:
  - Valid monthly/annual plans accepted
  - Invalid plan names rejected
  - Valid URLs required for success/cancel callbacks
  - Empty URLs rejected
  - HTTPS enforcement (zod allows all protocols, app should enforce)

- **Department Subscription Checkout**:
  - Valid tiers accepted (starter, professional, enterprise)
  - Invalid tier names rejected
  - Seat count minimum (1) enforced
  - Seat count maximum (1000) enforced
  - Seat count at boundaries accepted
  - Negative seat counts rejected
  - Valid intervals accepted (monthly, annual)
  - Invalid intervals rejected
  - Agency ID validation

- **Customer Portal Access**:
  - Valid return URL accepted
  - Malformed return URLs rejected
  - Empty return URL rejected
  - JavaScript URLs handled (zod allows)
  - Data URLs handled (zod allows)

#### Security Edge Cases (10 tests)
- **Privilege Escalation Prevention**:
  - Non-admin prevented from accessing admin functions
  - Cross-agency access prevented
  - User owns Stripe customer before portal access

- **URL Validation Edge Cases**:
  - URLs with query parameters
  - URLs with fragments
  - URLs with null bytes

- **Integer Overflow Prevention**:
  - Extremely large agency IDs
  - Infinity as seat count rejected
  - NaN as seat count rejected

- **Error Response Patterns**:
  - Appropriate error for unauthorized access
  - Error when no subscription found
  - Error for database failures
  - Error for agency not found

---

## Key Security Features Tested

### 1. URL Allowlist (voice.ts)
- **Purpose**: Prevent SSRF attacks by restricting audio URLs to authorized storage domains
- **Implementation**: Regex patterns validate domains before transcription
- **Coverage**: 17 tests covering allowed domains, rejected domains, and edge cases

### 2. File Size Limits
- **voice.ts**: 10MB limit for audio uploads (base64)
- **protocols.ts**: 20MB limit for PDF uploads (base64)
- **Purpose**: Prevent DoS attacks through oversized uploads
- **Coverage**: 15 tests covering size boundaries and oversized files

### 3. Authorization Checks (subscription.ts)
- **Purpose**: Prevent unauthorized access to agency management functions
- **Implementation**: `isUserAgencyAdmin()` check before department operations
- **Coverage**: 10 tests covering authorization flows and privilege escalation prevention

### 4. Input Sanitization
- **SQL Injection**: Parameterized queries and ORM prevent injection
- **XSS**: Output escaping prevents XSS attacks
- **Path Traversal**: Storage layer normalizes paths
- **Coverage**: 32 tests across all routers

---

## Test Statistics

- **Total Test Files**: 3
- **Total Tests**: 120
- **Test Coverage Areas**:
  - URL validation and allowlisting
  - File size limits and validation
  - Authorization and access control
  - Input sanitization (SQL, XSS, path traversal)
  - Error handling and edge cases
  - Performance considerations

---

## Running the Tests

```bash
# Run all security tests
npx vitest run tests/voice-router-security.test.ts tests/protocols-router-security.test.ts tests/subscription-router-security.test.ts

# Run individual test files
npx vitest run tests/voice-router-security.test.ts
npx vitest run tests/protocols-router-security.test.ts
npx vitest run tests/subscription-router-security.test.ts

# Run with coverage
npx vitest run --coverage tests/*-security.test.ts
```

---

## Notes on Test Design

### Defense in Depth
Tests validate security at multiple layers:
1. **Schema validation** (zod): Basic format checking
2. **Business logic** (allowlist, authorization): Application-level security
3. **Database layer** (parameterized queries): Infrastructure security
4. **Output layer** (escaping): Presentation security

### Safe Handling vs Rejection
Some tests verify that potentially dangerous inputs are safely handled rather than rejected:
- **SQL injection in paths**: Safe because parameterized queries are used
- **XSS in paths**: Safe because output is escaped and paths are used for storage, not rendering
- **Path traversal**: Safe because storage layer normalizes paths

This approach balances security with usability, allowing legitimate use cases while preventing actual attacks.

### Zod URL Validation Behavior
The tests document that zod's `url()` validator accepts all technically valid URL protocols (including `javascript:`, `data:`, `ftp:`). Applications should add additional protocol validation if needed for their specific security requirements.

---

## Future Enhancements

Consider adding tests for:
1. Rate limiting on upload endpoints
2. Content-type validation for uploaded files
3. Virus scanning integration
4. Additional protocol restrictions for callback URLs
5. IP allowlisting for API access
6. Audit logging verification

---

## Related Files

- Source files:
  - `/server/routers/voice.ts`
  - `/server/routers/agency-admin/protocols.ts`
  - `/server/routers/subscription.ts`

- Test configuration:
  - `/vitest.config.ts`
  - `/tests/setup.ts`
