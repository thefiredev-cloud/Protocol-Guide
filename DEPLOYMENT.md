# Protocol Guide - Netlify Deployment Guide

## Overview

Protocol Guide is deployed as a PWA (Progressive Web App) on Netlify. The frontend is built using Expo Web, while the Express API server must be deployed separately (e.g., Railway, Fly.io, or as Netlify Functions).

---

## 1. netlify.toml Configuration Validation

### Current Configuration Status: VALID

| Setting | Value | Status |
|---------|-------|--------|
| Build Command | `pnpm install && pnpm build && npx expo export --platform web && cp -r public/* dist/` | OK |
| Publish Directory | `dist` | OK |
| Node Version | `20` | OK |
| CI Mode | `true` | OK |

### Security Headers: CONFIGURED

All security headers are properly configured:

- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-XSS-Protection**: `1; mode=block` - XSS protection
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Referrer control
- **Content-Security-Policy**: Configured for Supabase and Anthropic API connections

### Redirect Rules: CONFIGURED

- SPA routing enabled (`/* -> /index.html` with status 200)
- API routes are commented out (server deployed separately)

### Caching Strategy: CONFIGURED

| Path | Cache-Control |
|------|--------------|
| `/assets/*`, `/*.js`, `/*.css` | `public, max-age=31536000, immutable` |
| `/service-worker.js`, `/sw.js` | `public, max-age=0, must-revalidate` |
| `/*.html` | `public, max-age=0, must-revalidate` |

---

## 2. Environment Variables Checklist

### CRITICAL (Must Have for Deployment)

Configure these in Netlify Dashboard > Site Settings > Environment Variables:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API for AI responses | `sk-ant-api03-...` | YES |
| `VOYAGE_API_KEY` | Voyage AI for embeddings | `pa-...` | YES |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | YES |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) | `eyJ...` | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (server-side only) | `eyJ...` | YES |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` | YES |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Generate with `openssl rand -base64 32` | YES |

### STRIPE PAYMENTS (Required for Pro Features)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_...` or `sk_test_...` | YES |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` or `pk_test_...` | YES |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret | `whsec_...` | YES |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Monthly subscription price ID | `price_...` | YES |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Annual subscription price ID | `price_...` | YES |

### OPTIONAL

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_AUTH_SECRET` | NextAuth session encryption | `your-32-char-secret` | NO |
| `NEXT_AUTH_URL` | NextAuth callback URL | `https://protocol-guide.com` | NO |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL | `https://forge.manus.ai/api` | NO |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API key | `mfk_...` | NO |
| `PORT` | Server port (for backend deployment) | `3000` | NO |

### Environment-Specific Notes

- **Production**: Use `sk_live_*` and `pk_live_*` Stripe keys
- **Preview/Staging**: Use `sk_test_*` and `pk_test_*` Stripe keys
- **JWT_SECRET**: Must be different per environment
- **SUPABASE_SERVICE_ROLE_KEY**: NEVER expose to client; only use server-side

---

## 3. Build Verification

### Build Command Breakdown

```bash
pnpm install          # Install dependencies
pnpm build            # Build server bundle (esbuild -> dist/index.js)
npx expo export       # Export Expo web app (-> dist/)
  --platform web
cp -r public/* dist/  # Copy PWA assets (manifest.json, icons, sw.js)
```

### Build Artifacts

After successful build, `dist/` contains:

```
dist/
  index.html              # Entry point
  favicon.ico             # Favicon
  metadata.json           # Build metadata
  manifest.json           # PWA manifest (copied from public/)
  icon-192.png            # PWA icon (copied from public/)
  icon-512.png            # PWA icon (copied from public/)
  sw.js                   # Service worker (copied from public/)
  _expo/
    static/
      css/                # Bundled CSS
      js/                 # Bundled JavaScript
  assets/                 # Images, fonts
```

### Build Output Sizes (Typical)

- Server bundle: ~64 KB
- Web bundle: ~2.9 MB (uncompressed)
- Total assets: ~1.2 MB

### Build Time

- Server build: ~3ms
- Expo web export: ~4-5 seconds
- Total: ~30-60 seconds on Netlify

---

## 4. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured in Netlify Dashboard
- [ ] Stripe webhook endpoint created: `https://your-domain.com/api/webhooks/stripe`
- [ ] Supabase project is running and accessible
- [ ] Database migrations applied (`pnpm db:push`)
- [ ] API server deployed and accessible (if using separate backend)

### Deployment Steps

1. **Connect Repository**
   - Go to Netlify Dashboard
   - Click "Add new site" > "Import an existing project"
   - Connect GitHub repository
   - Select `Protocol Guide Manus` repository

2. **Configure Build Settings**
   - Build command: Auto-detected from `netlify.toml`
   - Publish directory: Auto-detected as `dist`
   - Base directory: Leave empty (root)

3. **Set Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add all CRITICAL and STRIPE variables from checklist above
   - Use "Sensitive variable" for API keys

4. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete (~1-2 minutes)

5. **Verify Deployment**
   - [ ] Site loads without errors
   - [ ] PWA can be installed (Chrome shows install prompt)
   - [ ] Service worker registered
   - [ ] API endpoints respond (if using Netlify Functions)

### Post-Deployment

- [ ] Verify Sentry error tracking is working
- [ ] Test authentication flow
- [ ] Test Stripe payment flow
- [ ] Verify AI chat responses work
- [ ] Check browser console for errors
- [ ] Test on mobile devices

---

## 5. Backend Deployment Options

Since the Express server is not deployed on Netlify, choose one:

### Option A: Netlify Functions (Serverless)

Uncomment the API redirect in `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

Create `netlify/functions/api.ts` adapter.

### Option B: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option C: Fly.io

```bash
# Install Fly CLI
brew install flyctl

# Login and deploy
fly auth login
fly launch
fly deploy
```

---

## 6. Troubleshooting

### Build Failures

| Error | Solution |
|-------|----------|
| `pnpm: command not found` | Netlify auto-installs pnpm; check Node version |
| `expo: command not found` | Ensure `expo` is in dependencies, not devDependencies |
| TypeScript errors | Build skips type checking; run `pnpm check` locally first |

### Runtime Errors

| Issue | Solution |
|-------|----------|
| 404 on refresh | Verify SPA redirect in `netlify.toml` |
| CORS errors | Add API domain to CSP in `netlify.toml` |
| API timeout | Backend server may be cold starting |

### Performance

- Enable Netlify Edge Functions for faster responses
- Use Netlify CDN for static assets (automatic)
- Consider Netlify Image CDN for optimized images

---

## 7. Monitoring

### Recommended Services

- **Errors**: Sentry (configure `SENTRY_DSN`)
- **Uptime**: Netlify Analytics or Pingdom
- **Performance**: Netlify Analytics
- **Logs**: Netlify Functions logs or backend provider logs

### Health Check Endpoint

Consider adding a `/api/health` endpoint that returns:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-22T12:00:00Z"
}
```

---

## Quick Reference

```bash
# Local development
pnpm dev

# Build verification
pnpm build && npx expo export --platform web

# Type checking
pnpm check

# Run tests
pnpm test

# Database migrations
pnpm db:push
```

---

*Last updated: 2026-01-22*
