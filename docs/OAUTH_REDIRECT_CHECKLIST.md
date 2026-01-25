# OAuth Redirect URL Configuration Checklist

## Overview
This document provides a comprehensive checklist for configuring OAuth redirect URLs in the Supabase Dashboard for Protocol Guide authentication.

**IMPORTANT:** OAuth redirect URL configuration cannot be done via API - it requires manual configuration in the Supabase Dashboard.

---

## Required Redirect URLs

The following redirect URLs must be whitelisted in Supabase Dashboard:

### Development URLs
```
http://localhost:8081/oauth/callback
http://localhost:8082/oauth/callback
```

### Production URLs
```
https://protocol-guide.com/oauth/callback
https://*.protocol-guide.com/oauth/callback
```

### Mobile Deep Link
```
manus20260110193545://oauth/callback
```

**Technical Context:**
- `localhost:8081` - Main web development server (Expo web)
- `localhost:8082` - Mobile OAuth callback fallback
- `manus20260110193545` - Deep link scheme extracted from bundle ID timestamp
- Wildcard subdomain support for staging/preview deployments

---

## Configuration Steps

### 1. Access Supabase Dashboard

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select the **Protocol Guide** project
3. Go to **Authentication** → **URL Configuration**

### 2. Configure Redirect URLs

#### Location in Dashboard:
```
Authentication → URL Configuration → Redirect URLs
```

#### Add Each URL:

1. Click **Add URL** button
2. Paste each URL exactly as shown above
3. Save each URL individually
4. Verify all 5 URLs are added:
   - [ ] `http://localhost:8081/oauth/callback`
   - [ ] `http://localhost:8082/oauth/callback`
   - [ ] `https://protocol-guide.com/oauth/callback`
   - [ ] `https://*.protocol-guide.com/oauth/callback`
   - [ ] `manus20260110193545://oauth/callback`

### 3. Configure Site URL

Set the primary Site URL:
```
https://protocol-guide.com
```

**Note:** For development testing, you may temporarily set this to `http://localhost:8081`, but remember to change it back to production URL before deployment.

---

## Google OAuth Configuration

### Prerequisites
- Google Cloud Console project created
- OAuth 2.0 Client ID created (Web application type)

### Steps to Verify Google OAuth

1. **Access Supabase Auth Providers**
   - Dashboard → **Authentication** → **Providers**
   - Locate **Google** provider

2. **Enable Google Provider**
   - Toggle **Enable** to ON
   - Verify the following fields are configured:

3. **Required Configuration**
   ```
   Client ID: [Your Google OAuth Client ID]
   Client Secret: [Your Google OAuth Client Secret]
   ```

4. **Google Cloud Console Configuration**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services** → **Credentials**
   - Select your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, add:

   ```
   https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
   ```

   Example:
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```

5. **Verification Checklist**
   - [ ] Google provider enabled in Supabase
   - [ ] Client ID and Secret configured
   - [ ] Supabase callback URL added to Google Cloud Console
   - [ ] OAuth consent screen configured (required for production)
   - [ ] Authorized domains include `protocol-guide.com`

### Testing Google OAuth

**Development Test:**
```bash
# Start development server
npx expo start --web

# Navigate to sign-in page
# Click "Sign in with Google"
# Verify redirect to Google OAuth
# Verify successful callback to localhost:8081/oauth/callback
```

**Production Test:**
```bash
# Deploy to production
# Navigate to https://protocol-guide.com
# Test Google OAuth flow
# Verify successful authentication
```

---

## Apple OAuth Configuration

### Prerequisites
- Apple Developer Account (paid membership required)
- App ID registered in Apple Developer Portal
- Services ID configured for Sign in with Apple

### Steps to Verify Apple OAuth

1. **Access Supabase Auth Providers**
   - Dashboard → **Authentication** → **Providers**
   - Locate **Apple** provider

2. **Enable Apple Provider**
   - Toggle **Enable** to ON
   - Verify the following fields are configured:

3. **Required Configuration**
   ```
   Services ID: [Your Apple Services ID]
   Client ID: [Same as Services ID]
   Team ID: [Your Apple Team ID]
   Key ID: [Your Sign in with Apple Key ID]
   Private Key: [Your .p8 private key contents]
   ```

4. **Apple Developer Portal Configuration**

   **Step 4.1: Create App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com/account)
   - Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
   - Create/verify App ID: `space.manus.protocol.guide.t20260110193545`
   - Enable **Sign in with Apple** capability

   **Step 4.2: Create Services ID**
   - Create a Services ID (e.g., `space.manus.protocol.guide.signin`)
   - Enable **Sign in with Apple**
   - Configure domains and redirect URLs:
     - Domains: `protocol-guide.com`
     - Redirect URLs:
       ```
       https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
       ```

   **Step 4.3: Create Sign in with Apple Key**
   - Navigate to **Keys**
   - Create new key with **Sign in with Apple** enabled
   - Download `.p8` file (one-time download)
   - Note the Key ID

5. **Verification Checklist**
   - [ ] Apple provider enabled in Supabase
   - [ ] Services ID configured
   - [ ] Team ID configured
   - [ ] Key ID configured
   - [ ] Private key (.p8 contents) configured
   - [ ] Supabase callback URL added to Apple Services ID
   - [ ] Domain `protocol-guide.com` verified in Apple portal
   - [ ] Sign in with Apple capability enabled on App ID

### Testing Apple OAuth

**Development Test:**
```bash
# Start development server
npx expo start --web

# Navigate to sign-in page
# Click "Sign in with Apple"
# Verify redirect to Apple OAuth
# Verify successful callback to localhost:8081/oauth/callback
```

**Mobile Test (iOS):**
```bash
# Build and run on iOS simulator/device
npx expo run:ios

# Test Apple Sign In
# Verify deep link callback: manus20260110193545://oauth/callback
```

**Production Test:**
```bash
# Deploy to production
# Navigate to https://protocol-guide.com
# Test Apple OAuth flow
# Verify successful authentication
```

---

## Security Considerations

### HTTPS Requirements
- Production URLs MUST use HTTPS
- Local development can use HTTP (localhost only)
- Never expose OAuth credentials in client code

### Deep Link Security
- Deep link scheme `manus20260110193545://` is unique per app build
- If you rebuild with a new timestamp, update the scheme in:
  - `app.config.ts`
  - Supabase redirect URLs
  - Apple Developer Portal (if using universal links)

### Wildcard Subdomain Risks
- `https://*.protocol-guide.com/oauth/callback` allows any subdomain
- Ensure DNS is properly configured to prevent subdomain takeover
- Consider explicitly listing subdomains if only using specific ones (e.g., `staging`, `preview`)

### State Parameter (CSRF Protection)
The OAuth implementation includes state validation:
- Generated in `lib/oauth-state-validation.ts`
- Prevents CSRF attacks
- Validates on callback to ensure request authenticity

---

## Troubleshooting

### Common Issues

#### 1. "Redirect URI mismatch" Error
**Cause:** The redirect URL used in OAuth flow doesn't match Supabase configuration

**Solution:**
- Verify exact URL match (including trailing slashes, http/https)
- Check for typos in Supabase Dashboard
- Ensure protocol (http/https) matches

#### 2. "Invalid OAuth State" Error
**Cause:** State parameter validation failed

**Solution:**
- Check `lib/oauth-state-validation.ts` implementation
- Verify state is properly stored and retrieved
- Clear browser storage and retry

#### 3. Deep Link Not Opening App
**Cause:** Deep link scheme not registered or incorrect

**Solution:**
- Verify `app.config.ts` scheme: `manus20260110193545`
- Rebuild app after changing scheme
- Test deep link with: `xcrun simctl openurl booted manus20260110193545://oauth/callback`

#### 4. Google OAuth Works on Web but Not Mobile
**Cause:** Different redirect URLs for web vs mobile

**Solution:**
- Verify all redirect URLs are whitelisted in Supabase
- Check `lib/supabase-mobile.ts` getRedirectUri() logic
- Ensure Google Cloud Console has Supabase callback URL

#### 5. Apple OAuth "Invalid Client" Error
**Cause:** Services ID or credentials misconfigured

**Solution:**
- Verify Services ID matches Client ID in Supabase
- Check Team ID is correct (10-character alphanumeric)
- Verify .p8 private key is complete (including BEGIN/END lines)
- Ensure Key ID matches the key in Apple Developer Portal

---

## Verification Commands

### Check Current Configuration
```bash
# View current Supabase configuration (requires Supabase CLI)
supabase status

# Check environment variables
cat .env | grep -E '(SUPABASE_URL|SUPABASE_ANON_KEY)'

# Verify deep link scheme
cat app.config.ts | grep -A 5 "scheme:"
```

### Test OAuth Flows
```bash
# Start development server
npx expo start --web

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

---

## Environment-Specific Notes

### Development Environment
- Uses `localhost:8081` and `localhost:8082`
- OAuth providers should work in web browser
- Mobile deep links require simulator/device

### Staging Environment
- Use subdomain: `staging.protocol-guide.com`
- Covered by wildcard: `https://*.protocol-guide.com/oauth/callback`
- Update DNS records to point to staging deployment

### Production Environment
- Primary URL: `https://protocol-guide.com`
- Ensure SSL certificate is valid
- Test all OAuth providers before launch

---

## Code References

### Key Files
- `lib/supabase-mobile.ts` - OAuth flow implementation (lines 17-30 for redirect URI logic)
- `app.config.ts` - Deep link scheme configuration (line 11)
- `lib/oauth-state-validation.ts` - CSRF protection implementation
- `constants/oauth.ts` - OAuth constants and configuration

### Deep Link Scheme Derivation
```typescript
// From app.config.ts
const bundleId = "space.manus.protocol.guide.t20260110193545";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`; // Result: "manus20260110193545"
```

### Redirect URI Logic
```typescript
// From lib/supabase-mobile.ts (lines 17-30)
const getRedirectUri = () => {
  const scheme = Constants.expoConfig?.scheme || "manus20260110193545";

  if (Platform.OS === "web") {
    return typeof window !== "undefined"
      ? `${window.location.origin}/oauth/callback`
      : "http://localhost:8082/oauth/callback";
  }

  return `${scheme}://oauth/callback`;
};
```

---

## Manual Verification Checklist

### Pre-Deployment Checklist
- [ ] All 5 redirect URLs added to Supabase Dashboard
- [ ] Site URL set to `https://protocol-guide.com`
- [ ] Google OAuth provider enabled and configured
- [ ] Apple OAuth provider enabled and configured
- [ ] Google Cloud Console callback URL configured
- [ ] Apple Developer Portal Services ID configured
- [ ] SSL certificate valid for `protocol-guide.com`
- [ ] DNS records point to production deployment

### Post-Deployment Testing
- [ ] Test Google OAuth on web (development)
- [ ] Test Google OAuth on web (production)
- [ ] Test Google OAuth on iOS
- [ ] Test Google OAuth on Android
- [ ] Test Apple OAuth on web (production)
- [ ] Test Apple OAuth on iOS
- [ ] Test Apple OAuth on Android (if supported)
- [ ] Verify OAuth state validation works
- [ ] Verify deep links open app correctly
- [ ] Test logout and re-authentication

---

## Support Resources

### Documentation
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In](https://developer.apple.com/sign-in-with-apple/)

### Supabase Dashboard Access
- Project: Protocol Guide
- URL: https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]

### Contact
For issues with OAuth configuration, contact:
- Supabase Support: https://supabase.com/support
- Protocol Guide Team: [Your contact info]

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-24 | Initial checklist created | Authentication Security Expert |

---

## Notes

- This configuration is based on the current codebase structure as of 2026-01-24
- Deep link scheme `manus20260110193545` is derived from bundle ID timestamp
- If the app is rebuilt with a new bundle ID, the deep link scheme will change
- Always test OAuth flows in all environments (dev, staging, production) before release
- Keep OAuth credentials secure and never commit them to version control

