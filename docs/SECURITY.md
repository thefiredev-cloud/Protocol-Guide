# Security Configuration Guide

## Overview

This document outlines security best practices for configuring Protocol Guide. **Never commit secrets or credentials to version control.**

## Environment Variable Security

### Protected by .gitignore

The following files are automatically excluded from git:
- `.env` - Your actual secrets (NEVER commit)
- `.env.*` - All environment variant files
- `.env.example` - Template only (safe to commit, no real values)

### Required Secrets

All secrets MUST be configured via environment variables. Never hardcode them in source code.

## Secret Generation Guide

### 1. JWT Secrets

**Purpose:** Session cookies and authentication tokens

**Generate:**
```bash
# Generate a secure 32+ character secret
openssl rand -base64 32
```

**Environment Variables:**
```bash
JWT_SECRET=<generated-secret-here>
NEXT_AUTH_SECRET=<generated-secret-here>
```

**Security:**
- Minimum 32 characters
- Use cryptographically secure random generation
- Rotate periodically (every 90 days recommended)
- Different secrets for development/staging/production

### 2. Beta Access Code

**Purpose:** Gate access during beta phase

**Generate:**
```bash
# Generate a random uppercase code
openssl rand -hex 8 | tr '[:lower:]' '[:upper:]'
```

**Environment Variables:**
```bash
EXPO_PUBLIC_BETA_ACCESS_CODE=<generated-code-here>
```

**Security:**
- Should be random and unpredictable
- Rotate when compromised
- Remove this gate when going public
- Never use predictable codes like "PROTOCOL2026"

### 3. API Keys

#### Anthropic Claude
```bash
ANTHROPIC_API_KEY=sk-ant-...
```
- Get from: https://console.anthropic.com/
- Must start with `sk-ant-`
- Keep server-side only

#### Voyage AI
```bash
VOYAGE_API_KEY=pa-...
```
- Get from: https://www.voyageai.com/
- Must start with `pa-`
- Keep server-side only

#### Stripe
```bash
STRIPE_SECRET_KEY=sk_test_...          # Development
STRIPE_SECRET_KEY=sk_live_...          # Production
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Development
STRIPE_PUBLISHABLE_KEY=pk_live_...     # Production
STRIPE_WEBHOOK_SECRET=whsec_...
```
- Get from: https://dashboard.stripe.com/apikeys
- Use test keys for development
- Use live keys for production only
- Webhook secret from: Stripe Dashboard > Webhooks

### 4. Database Credentials

#### Supabase
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
- Get from: Supabase Dashboard > Settings > API
- Service role key is highly privileged - keep secure
- Anon key is safe for client-side use

#### PostgreSQL
```bash
DATABASE_URL=postgresql://postgres:PASSWORD@db.your-project.supabase.co:5432/postgres
```
- Never expose database password
- Use connection pooling in production
- Restrict to trusted networks

### 5. Redis (Optional)

```bash
REDIS_URL=https://your-redis.upstash.io
REDIS_TOKEN=your_token_here
```
- Get from: https://console.upstash.com/
- Falls back to in-memory if not configured

## Deployment Security Checklist

### Development Environment

- [ ] Copy `.env.example` to `.env`
- [ ] Generate all required secrets
- [ ] Use test/development API keys
- [ ] Never commit `.env` file
- [ ] Verify `.gitignore` excludes `.env`

### Staging Environment

- [ ] Use separate secrets from development
- [ ] Use test Stripe keys
- [ ] Use separate database
- [ ] Enable logging for debugging

### Production Environment

- [ ] Generate new production secrets (never reuse dev/staging)
- [ ] Use live Stripe keys
- [ ] Enable Redis for distributed rate limiting
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS only
- [ ] Rotate secrets every 90 days
- [ ] Monitor secret access logs

## Secret Rotation

### When to Rotate

- Every 90 days (scheduled)
- When employee with access leaves
- Suspected compromise
- After security incident
- Before major version release

### How to Rotate

1. Generate new secret
2. Update in deployment platform (Netlify, etc.)
3. Deploy with new secret
4. Verify application works
5. Invalidate old secret
6. Update secret in password manager

## Common Security Mistakes

### ❌ DO NOT

- Hardcode secrets in source code
- Commit `.env` files to git
- Use predictable secrets like "admin123"
- Share secrets via email or Slack
- Reuse secrets across environments
- Use development secrets in production
- Store secrets in browser localStorage
- Log secrets to console or files

### ✅ DO

- Use environment variables
- Generate cryptographically secure secrets
- Use different secrets per environment
- Store secrets in password manager (1Password, Bitwarden)
- Use platform secret management (Netlify env vars)
- Rotate secrets regularly
- Audit secret access logs
- Use least-privilege principle

## Emergency Response

### If Secrets Are Compromised

1. **Immediately** rotate affected secrets
2. Deploy new secrets to production
3. Review access logs for unauthorized usage
4. Notify affected users if data breach occurred
5. Document incident in security log
6. Review and update access controls

### If Secrets Are Committed to Git

1. **DO NOT** just delete the commit - it's still in history
2. Immediately rotate ALL secrets in that file
3. Use tools to purge from git history:
   ```bash
   # Use git-filter-repo (recommended)
   git-filter-repo --path .env --invert-paths

   # Or BFG Repo-Cleaner
   bfg --delete-files .env
   ```
4. Force push cleaned history (coordinate with team)
5. Verify secrets are purged from all branches
6. Notify team to re-clone repository

## Secret Management Tools

### Recommended

- **1Password** - Team password manager
- **Bitwarden** - Open source alternative
- **Netlify Env Vars** - Platform-level secrets
- **GitHub Secrets** - For CI/CD workflows
- **Doppler** - Enterprise secret management

### Not Recommended

- Plain text files
- Shared Google Docs
- Email
- Slack messages
- Spreadsheets

## Audit & Compliance

### Regular Audits

- Review who has access to secrets
- Check for hardcoded secrets in codebase
- Verify secret rotation schedule
- Test secret revocation procedures
- Review access logs

### Tools

```bash
# Scan for secrets in codebase
npm install -g detect-secrets
detect-secrets scan

# Check git history for secrets
npm install -g truffleHog
truffleHog --regex --entropy=True .git
```

## Support

For security concerns or to report a vulnerability:
- **Email:** security@protocolguide.com
- **Do not** file public GitHub issues for security vulnerabilities
- Use responsible disclosure practices

## References

- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)

---

**Last Updated:** 2026-01-23
**Version:** 1.0
