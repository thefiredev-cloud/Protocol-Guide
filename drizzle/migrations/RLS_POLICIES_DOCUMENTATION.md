# Row Level Security (RLS) Policies Documentation

## Overview

Migration `0027_add_row_level_security_policies.sql` implements comprehensive Row Level Security (RLS) policies for all database tables to ensure HIPAA compliance and proper data isolation.

## Security Principles

### 1. User Isolation
Users can only access their own personal data (queries, bookmarks, search history, etc.)

### 2. Agency Scoping
Agency members can access agency data based on their role within the agency.

### 3. Admin Elevation
System admins have elevated access for user management and analytics.

### 4. Service Role Access
Backend services have full access for operations and system functions.

### 5. Public Safety Data
Medical protocols remain publicly accessible for first responder safety.

### 6. HIPAA Compliance
No unauthorized access to Protected Health Information (PHI).

---

## Helper Functions

### `get_current_user_id()`
Maps Supabase `auth.uid()` to internal user ID from the `users` table.

**Usage:**
```sql
SELECT * FROM queries WHERE user_id = get_current_user_id();
```

### `is_admin()`
Returns `true` if current user has `role = 'admin'`.

**Usage:**
```sql
SELECT * FROM audit_logs WHERE is_admin();
```

### `is_agency_member(agency_id)`
Returns `true` if current user is an active member of the specified agency.

**Usage:**
```sql
SELECT * FROM protocol_versions WHERE is_agency_member(agency_id);
```

### `is_agency_admin(agency_id)`
Returns `true` if current user is an owner or admin of the specified agency.

**Usage:**
```sql
UPDATE agencies SET name = 'New Name' WHERE is_agency_admin(id);
```

---

## Table-by-Table Policy Reference

### 1. `users` - User Accounts
**Access Levels:**
- **Self**: Read/update own profile (cannot elevate role)
- **Admin**: Read/update all users
- **Service**: Full access

**Policies:**
- `users_select_own` - Users read own profile
- `users_update_own` - Users update own profile (role protected)
- `users_insert_own` - Users create own account during signup
- `users_select_admin` - Admins read all users
- `users_update_admin` - Admins update any user
- `users_all_service_role` - Service full access

**HIPAA Notes:** Contains PII - strict isolation required

---

### 2. `queries` - Query History
**Access Levels:**
- **Self**: Read/insert own queries
- **Admin**: Read all (analytics only, no PHI)
- **Service**: Full access

**Policies:**
- `queries_select_own` - Users read own queries
- `queries_insert_own` - Users create queries
- `queries_select_admin` - Admins read all
- `queries_all_service_role` - Service full access

**HIPAA Notes:** Query text may reference patient scenarios - strict isolation

---

### 3. `bookmarks` - User Bookmarks
**Access Levels:**
- **Self**: Full CRUD on own bookmarks
- **Service**: Full access

**Policies:**
- `bookmarks_select_own`
- `bookmarks_insert_own`
- `bookmarks_delete_own`
- `bookmarks_all_service_role`

---

### 4. `search_history` - Search History
**Access Levels:**
- **Self**: Read/insert/delete own history
- **Service**: Full access

**Policies:**
- `search_history_select_own`
- `search_history_insert_own`
- `search_history_delete_own`
- `search_history_all_service_role`

**HIPAA Notes:** Search terms may contain clinical context - strict isolation

---

### 5. `feedback` - User Feedback
**Access Levels:**
- **Self**: Read own, create, update pending
- **Admin**: Read/update all (moderation)
- **Service**: Full access

**Policies:**
- `feedback_select_own`
- `feedback_insert_own`
- `feedback_update_own_pending` - Only pending status
- `feedback_select_admin`
- `feedback_update_admin`
- `feedback_all_service_role`

---

### 6. `audit_logs` - Audit Trail
**Access Levels:**
- **Admin**: Read only
- **Service**: Full access (write logs)

**Policies:**
- `audit_logs_select_admin`
- `audit_logs_all_service_role`

**HIPAA Notes:** Audit trail required for compliance - admin read-only

---

### 7. `agencies` - Agency Directory
**Access Levels:**
- **Public**: Read all
- **Agency Admin**: Update own agency
- **System Admin**: Full access
- **Service**: Full access

**Policies:**
- `agencies_select_public`
- `agencies_update_admin` - Agency admins
- `agencies_all_admin` - System admins
- `agencies_all_service_role`

---

### 8. `agency_members` - Agency Membership
**Access Levels:**
- **Member**: Read members of own agencies
- **Self**: Read own memberships
- **Agency Admin**: Manage members (invite, roles, remove)
- **System Admin**: Full access
- **Service**: Full access

**Policies:**
- `agency_members_select_member`
- `agency_members_select_own`
- `agency_members_all_agency_admin`
- `agency_members_all_admin`
- `agency_members_all_service_role`

---

### 9. `protocol_versions` - Protocol Versioning
**Access Levels:**
- **Public**: Read published protocols
- **Agency Member**: Read all agency protocols
- **Protocol Author**: Create drafts, update own drafts
- **Agency Admin**: Approve/publish protocols
- **Service**: Full access

**Policies:**
- `protocol_versions_select_published`
- `protocol_versions_select_member`
- `protocol_versions_insert_author`
- `protocol_versions_update_author` - Draft/review only
- `protocol_versions_update_admin`
- `protocol_versions_all_service_role`

**Workflow:**
1. Author creates draft
2. Author updates draft/review versions
3. Agency admin approves and publishes
4. Public can read published versions

---

### 10. `protocol_uploads` - File Uploads
**Access Levels:**
- **Agency Member**: Read agency uploads, create uploads
- **Self**: Update own uploads
- **Agency Admin**: Manage all agency uploads
- **Service**: Full access

**Policies:**
- `protocol_uploads_select_member`
- `protocol_uploads_insert_member`
- `protocol_uploads_update_own`
- `protocol_uploads_all_agency_admin`
- `protocol_uploads_all_service_role`

---

### 11. `user_auth_providers` - OAuth Providers
**Access Levels:**
- **Self**: Read own providers
- **Service**: Full access (manages linking)

**Policies:**
- `user_auth_providers_select_own`
- `user_auth_providers_all_service_role`

**Security Notes:** Contains OAuth tokens - strict isolation

---

### 12. `user_counties` - County Preferences
**Access Levels:**
- **Self**: Full CRUD
- **Service**: Full access

**Policies:**
- `user_counties_select_own`
- `user_counties_all_own`
- `user_counties_all_service_role`

---

### 13. `user_states` - State Subscriptions
**Access Levels:**
- **Self**: Full CRUD
- **Service**: Full access

**Policies:**
- `user_states_select_own`
- `user_states_all_own`
- `user_states_all_service_role`

---

### 14. `user_agencies` - Agency Subscriptions
**Access Levels:**
- **Self**: Read/manage own subscriptions
- **Agency Admin**: See all users with agency access
- **Service**: Full access

**Policies:**
- `user_agencies_select_own`
- `user_agencies_select_agency_admin`
- `user_agencies_all_own`
- `user_agencies_all_service_role`

---

### 15. `contact_submissions` - Contact Form
**Access Levels:**
- **Admin**: Read/update all
- **Service**: Full access (public form submission)

**Policies:**
- `contact_submissions_select_admin`
- `contact_submissions_update_admin`
- `contact_submissions_all_service_role`

**Security Notes:** Contains PII - admin access only

---

### 16. `counties` - Geographic Reference
**Access Levels:**
- **Public**: Read all
- **Admin**: Full access
- **Service**: Full access

**Policies:**
- `counties_select_public`
- `counties_all_admin`
- `counties_all_service_role`

---

### 17. `protocol_chunks` - Protocol Content
**Access Levels:**
- **Public**: Read all
- **Service**: Full access (ingestion)

**Policies:**
- `protocol_chunks_select_public`
- `protocol_chunks_all_service_role`

**Safety Notes:** Medical protocols are public safety data

---

### 18. `integration_logs` - Partner Analytics
**Access Levels:**
- **Admin**: Read all
- **Service**: Full access

**Policies:**
- `integration_logs_select_admin`
- `integration_logs_all_service_role`

**HIPAA Notes:** No PHI after migration 0012 - analytics only

---

### 19. `stripe_webhook_events` - Payment Processing
**Access Levels:**
- **Service**: Full access only

**Policies:**
- `stripe_webhook_events_all_service_role`

---

### 20. `push_tokens` - Push Notifications
**Access Levels:**
- **Self**: Full CRUD
- **Service**: Full access

**Policies:**
- `push_tokens_select_own`
- `push_tokens_all_own`
- `push_tokens_all_service_role`

---

### 21. `drip_emails_sent` - Email Campaigns
**Access Levels:**
- **Self**: Read own email history
- **Service**: Full access (sends emails)

**Policies:**
- `drip_emails_sent_select_own`
- `drip_emails_sent_all_service_role`

---

## Testing RLS Policies

### Setup Test Environment

```sql
-- Create test users
INSERT INTO auth.users (id, email) VALUES
    ('user1-uuid', 'user1@test.com'),
    ('user2-uuid', 'user2@test.com'),
    ('admin-uuid', 'admin@test.com');

INSERT INTO users (supabase_id, email, role) VALUES
    ('user1-uuid', 'user1@test.com', 'user'),
    ('user2-uuid', 'user2@test.com', 'user'),
    ('admin-uuid', 'admin@test.com', 'admin');
```

### Test User Isolation

```sql
-- Set session as user1
SET LOCAL request.jwt.claims TO '{"sub": "user1-uuid"}';
SET ROLE authenticated;

-- User1 creates a query
INSERT INTO queries (user_id, county_id, query_text)
VALUES (
    (SELECT id FROM users WHERE supabase_id = 'user1-uuid'),
    1,
    'Test query'
);

-- User1 can read own queries
SELECT * FROM queries; -- Should return user1's queries only

-- Switch to user2
SET LOCAL request.jwt.claims TO '{"sub": "user2-uuid"}';

-- User2 cannot see user1's queries
SELECT * FROM queries; -- Should return empty or user2's queries only
```

### Test Admin Access

```sql
-- Set session as admin
SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid"}';
SET ROLE authenticated;

-- Admin can read all queries
SELECT * FROM queries; -- Should return all queries

-- Admin can read audit logs
SELECT * FROM audit_logs; -- Should work

-- Switch to regular user
SET LOCAL request.jwt.claims TO '{"sub": "user1-uuid"}';

-- Regular user cannot read audit logs
SELECT * FROM audit_logs; -- Should return empty or error
```

### Test Agency Access

```sql
-- Create test agency
INSERT INTO agencies (name, slug, state_code) VALUES
    ('Test Fire Dept', 'test-fd', 'CA');

-- Add admin member
INSERT INTO agency_members (agency_id, user_id, role, status) VALUES
    (1, (SELECT id FROM users WHERE supabase_id = 'admin-uuid'), 'owner', 'active');

-- Set session as agency owner
SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid"}';
SET ROLE authenticated;

-- Agency owner can create protocol version
INSERT INTO protocol_versions (
    agency_id,
    protocol_number,
    title,
    version,
    created_by
) VALUES (
    1,
    'R-001',
    'Respiratory Distress',
    '1.0',
    (SELECT id FROM users WHERE supabase_id = 'admin-uuid')
);

-- Verify agency owner can read
SELECT * FROM protocol_versions; -- Should return protocols

-- Switch to non-member
SET LOCAL request.jwt.claims TO '{"sub": "user1-uuid"}';

-- Non-member cannot see draft protocols
SELECT * FROM protocol_versions WHERE status = 'draft'; -- Should return empty

-- Non-member can see published protocols
SELECT * FROM protocol_versions WHERE status = 'published'; -- Should work
```

### Test Public Access

```sql
-- Set session as anonymous
RESET ROLE;
SET ROLE anon;

-- Anon can read counties
SELECT * FROM counties; -- Should work

-- Anon can read protocol chunks
SELECT * FROM protocol_chunks; -- Should work

-- Anon can read agencies
SELECT * FROM agencies; -- Should work

-- Anon cannot read user data
SELECT * FROM users; -- Should return empty or error
SELECT * FROM queries; -- Should return empty or error
```

---

## Security Best Practices

### 1. Always Use Service Role for Backend Operations
```typescript
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Not anon key
);
```

### 2. Never Bypass RLS in Application Code
RLS policies are the security boundary - don't circumvent them.

### 3. Use Parameterized Queries
```typescript
// Good
const { data } = await supabase
  .from('queries')
  .select('*')
  .eq('user_id', userId);

// Bad - RLS will still protect, but this is inefficient
const { data } = await supabase
  .from('queries')
  .select('*');
```

### 4. Test Policies Before Deployment
Run the test scenarios above in a staging environment before production deployment.

### 5. Monitor RLS Performance
Add indexes on RLS filter columns:
```sql
-- Already added in migration 0027
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_agency_members_agency_id ON agency_members(agency_id);
```

### 6. Document Policy Changes
Update this document when adding new policies or modifying existing ones.

---

## Common Queries

### Check RLS Status
```sql
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All Policies
```sql
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Table Permissions
```sql
SELECT
    tablename,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY tablename, grantee;
```

### Verify Helper Functions
```sql
SELECT
    routine_name,
    routine_type,
    security_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'is_%' OR routine_name LIKE 'get_%'
ORDER BY routine_name;
```

---

## Troubleshooting

### Issue: User Can't Access Own Data
**Cause:** `supabase_id` mismatch or missing JWT claim

**Solution:**
```sql
-- Check user's supabase_id
SELECT id, supabase_id, email FROM users WHERE email = 'user@example.com';

-- Verify JWT claim in session
SELECT auth.uid();
```

### Issue: Admin Can't Access Data
**Cause:** User role not set to 'admin'

**Solution:**
```sql
-- Check user's role
SELECT id, email, role FROM users WHERE email = 'admin@example.com';

-- Update role if needed (as service_role)
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### Issue: Agency Member Can't Access Agency Data
**Cause:** Not in `agency_members` table or status not 'active'

**Solution:**
```sql
-- Check membership
SELECT am.*, u.email
FROM agency_members am
JOIN users u ON u.id = am.user_id
WHERE am.agency_id = 1;

-- Add membership if missing
INSERT INTO agency_members (agency_id, user_id, role, status)
VALUES (1, user_id_here, 'member', 'active');
```

### Issue: RLS Policy Too Restrictive
**Cause:** Policy logic doesn't cover edge case

**Solution:**
1. Identify the policy blocking access
2. Review policy SQL in migration file
3. Add additional condition or create new policy
4. Test in staging before production

---

## Migration Rollback

If you need to rollback this migration:

```sql
-- Drop all RLS policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Disable RLS on all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'drizzle%'
    ) LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_agency_member(INTEGER);
DROP FUNCTION IF EXISTS is_agency_admin(INTEGER);

-- Revoke permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
```

---

## HIPAA Compliance Notes

### PHI Protection
- **queries**: Query text may reference patient scenarios - strict user isolation
- **search_history**: Search terms may contain clinical context - isolated
- **integration_logs**: PHI removed in migration 0012 - now analytics only
- **contact_submissions**: Contains PII - admin access only
- **audit_logs**: Required for compliance - admin read-only

### Audit Trail
All RLS policy executions are logged at the PostgreSQL level. Additional application-level logging should be implemented for:
- User data access
- Admin actions
- Policy violations

### Access Review
Quarterly review of:
1. Admin user list
2. Agency owner/admin roles
3. Service role usage
4. Policy effectiveness

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

---

**Last Updated:** 2026-01-23
**Migration Version:** 0027
**Status:** Production Ready
