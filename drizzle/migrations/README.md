# Database Migrations - Foreign Key Schema Fixes

**Date:** 2026-01-23
**Purpose:** Add foreign key constraints for referential integrity

---

## Overview

This directory contains migrations to add **35+ foreign key constraints** to the Protocol Guide database schema. Currently, all relationships are application-level only, which risks data corruption.

## Migration Files

### 0018 - Pre-Migration Validation ✓

**File:** `0018_pre_migration_validation.sql`

**Purpose:** Detect orphaned records before adding foreign keys

**Run:** BEFORE all other migrations

**Output:** Validation report showing orphaned record counts

**Action:** If orphans found, clean them up before proceeding

```bash
mysql -u user -p db < 0018_pre_migration_validation.sql > validation_report.txt
```

---

### 0019 - Fix Data Type Mismatches ✓

**File:** `0019_fix_data_type_mismatches.sql`

**Purpose:** Fix type incompatibilities that prevent FK creation

**Changes:**
- Adds `internalAgencyId` (int) to `integration_logs`
- Populates from `agencyName` where possible
- Enables FK to `agencies.id`

**Why:** `integrationLogs.agencyId` is VARCHAR (partner IDs) but `agencies.id` is INT

```bash
mysql -u user -p db < 0019_fix_data_type_mismatches.sql
```

---

### 0020 - Add Unique Constraints ✓

**File:** `0020_add_unique_constraints.sql`

**Purpose:** Prevent duplicate data

**Constraints Added:**
- `user_auth_providers`: UNIQUE(userId, provider)
- `agency_members`: UNIQUE(agencyId, userId)
- `stripe_webhook_events`: UNIQUE(eventId)
- `agencies`: UNIQUE(slug)
- `users`: UNIQUE(openId), UNIQUE(supabaseId)

**Why:** Prevents duplicates before FKs enforce relationships

```bash
mysql -u user -p db < 0020_add_unique_constraints.sql
```

---

### 0021 - Add Foreign Keys (Users) ✓

**File:** `0021_add_foreign_keys_part1_users.sql`

**Purpose:** Add all user-related foreign keys (17 FKs)

**Relationships:**

**CASCADE DELETE** (Personal data):
- bookmarks.userId → users.id
- feedback.userId → users.id
- queries.userId → users.id
- userAuthProviders.userId → users.id
- agencyMembers.userId → users.id
- userCounties.userId → users.id
- searchHistory.userId → users.id

**SET NULL** (Analytics/Audit):
- auditLogs.userId → users.id
- analyticsEvents.userId → users.id
- protocolAccessLogs.userId → users.id
- searchAnalytics.userId → users.id
- sessionAnalytics.userId → users.id
- protocolVersions.publishedBy → users.id
- agencyMembers.invitedBy → users.id

**RESTRICT** (Critical data):
- conversionEvents.userId → users.id
- protocolUploads.uploadedBy → users.id

**Self-referencing:**
- users.selectedCountyId → counties.id
- users.homeCountyId → counties.id

```bash
mysql -u user -p db < 0021_add_foreign_keys_part1_users.sql
```

---

### 0022 - Add Foreign Keys (Complete) ✓

**File:** `0022_add_foreign_keys_part2_complete.sql`

**Purpose:** Add remaining foreign keys for counties, agencies, protocols

**County FKs (5):**
- protocolChunks.countyId → counties.id (RESTRICT)
- queries.countyId → counties.id (CASCADE)
- feedback.countyId → counties.id (SET NULL)
- userCounties.countyId → counties.id (CASCADE)
- searchHistory.countyId → counties.id (SET NULL)

**Agency FKs (6):**
- bookmarks.agencyId → agencies.id (SET NULL)
- agencyMembers.agencyId → agencies.id (CASCADE)
- protocolVersions.agencyId → agencies.id (CASCADE)
- integrationLogs.internalAgencyId → agencies.id (SET NULL)
- protocolAccessLogs.agencyId → agencies.id (SET NULL)
- searchAnalytics.agencyId → agencies.id (SET NULL)

**Protocol FKs (2):**
- protocolUploads.versionId → protocol_versions.id (CASCADE)
- protocolAccessLogs.protocolChunkId → protocolChunks.id (CASCADE)

```bash
mysql -u user -p db < 0022_add_foreign_keys_part2_complete.sql
```

---

### ROLLBACK - Remove Foreign Keys

**File:** `ROLLBACK_FOREIGN_KEYS.sql`

**Purpose:** Emergency rollback if needed

**Warning:** This removes all data integrity enforcement!

```bash
mysql -u user -p db < ROLLBACK_FOREIGN_KEYS.sql
```

---

## Running Migrations

### Option 1: Automated Script (Recommended)

```bash
cd /Users/tanner-osterkamp/Protocol\ Guide\ Manus

# Dry run first
./scripts/run-fk-migration.sh --dry-run

# Run for real
./scripts/run-fk-migration.sh
```

The script will:
1. Create backup
2. Run validation
3. Check for orphaned data
4. Run all migrations in order
5. Verify foreign keys created
6. Report results

### Option 2: Manual Execution

```bash
# 1. Backup
mysqldump -u user -p db > backup.sql

# 2. Validation
mysql -u user -p db < 0018_pre_migration_validation.sql > validation.txt

# 3. Review validation
cat validation.txt

# 4. Run migrations (if validation passed)
mysql -u user -p db < 0019_fix_data_type_mismatches.sql
mysql -u user -p db < 0020_add_unique_constraints.sql
mysql -u user -p db < 0021_add_foreign_keys_part1_users.sql
mysql -u user -p db < 0022_add_foreign_keys_part2_complete.sql

# 5. Verify
mysql -u user -p db -e "
  SELECT COUNT(*) as total_fks
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL;
"
# Should show 35+
```

---

## Migration Order

**CRITICAL:** Must run in this exact order!

1. ✅ **0018** - Validation (find orphaned data)
2. ✅ **0019** - Type fixes (enable FK creation)
3. ✅ **0020** - Unique constraints (prevent duplicates)
4. ✅ **0021** - User FKs (most critical relationships)
5. ✅ **0022** - Complete (all remaining FKs)

**Do NOT:**
- Skip validation
- Reorder migrations
- Run Part 2 before Part 1

---

## Verification

### Check Foreign Keys Created

```sql
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
```

Should show 35+ rows.

### Count by Referenced Table

```sql
SELECT
  REFERENCED_TABLE_NAME,
  COUNT(*) as fk_count
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
GROUP BY REFERENCED_TABLE_NAME
ORDER BY fk_count DESC;
```

Expected:
- users: ~17 FKs
- counties: ~5 FKs
- agencies: ~6 FKs
- protocol_versions: ~1 FK
- protocolChunks: ~1 FK

---

## Testing After Migration

### 1. Test CASCADE DELETE

```sql
-- Create test user
INSERT INTO users (openId, name, email, queryCountToday)
VALUES ('test_cascade', 'Test User', 'test@example.com', 0);

SET @test_id = LAST_INSERT_ID();

-- Create bookmark
INSERT INTO bookmarks (userId, protocolNumber, protocolTitle, content)
VALUES (@test_id, 'TEST-001', 'Test', 'Content');

-- Verify bookmark exists
SELECT COUNT(*) FROM bookmarks WHERE userId = @test_id;

-- Delete user (should cascade to bookmark)
DELETE FROM users WHERE id = @test_id;

-- Verify bookmark deleted
SELECT COUNT(*) FROM bookmarks WHERE userId = @test_id;
-- Should be 0
```

### 2. Test RESTRICT

```sql
-- Try to delete county with protocols (should fail)
DELETE FROM counties
WHERE id = (SELECT DISTINCT countyId FROM protocolChunks LIMIT 1);
-- Error: Cannot delete or update a parent row
```

### 3. Test SET NULL

```sql
-- Create user, create audit log, delete user
INSERT INTO users (openId, name, email, queryCountToday)
VALUES ('test_setnull', 'Test', 'test@example.com', 0);

SET @user_id = LAST_INSERT_ID();

INSERT INTO audit_logs (userId, action)
VALUES (@user_id, 'test');

DELETE FROM users WHERE id = @user_id;

-- Audit log should exist with NULL userId
SELECT * FROM audit_logs WHERE action = 'test';
-- userId should be NULL
```

---

## Common Issues

### Issue: "Cannot add foreign key constraint"

**Cause:** Orphaned data exists

**Solution:**
```sql
-- Find orphaned records
SELECT * FROM bookmarks b
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.userId);

-- Clean up
DELETE FROM bookmarks
WHERE userId NOT IN (SELECT id FROM users);
```

### Issue: "Duplicate entry for key 'unique_user_provider'"

**Cause:** Duplicate OAuth providers

**Solution:**
```sql
-- Find duplicates
SELECT userId, provider, COUNT(*)
FROM user_auth_providers
GROUP BY userId, provider
HAVING COUNT(*) > 1;

-- Keep most recent
DELETE uap1 FROM user_auth_providers uap1
INNER JOIN user_auth_providers uap2
WHERE uap1.userId = uap2.userId
  AND uap1.provider = uap2.provider
  AND uap1.id < uap2.id;
```

---

## Rollback

If migration fails or causes issues:

```bash
# Option 1: Full restore
mysql -u user -p db < backup.sql

# Option 2: Remove FKs only
mysql -u user -p db < ROLLBACK_FOREIGN_KEYS.sql
```

Rollback time: 30 seconds - 1 minute

---

## Documentation

For more information, see:

- **Executive Summary:** `/docs/EXECUTIVE_SUMMARY_SCHEMA_FIXES.md`
- **Migration Guide:** `/docs/MIGRATION_GUIDE_FOREIGN_KEYS.md`
- **Relationship Diagram:** `/docs/SCHEMA_RELATIONSHIPS_DIAGRAM.md`
- **Technical Report:** `/docs/SCHEMA_ISSUES_REPORT.md`
- **Quick Checklist:** `/SCHEMA_FIX_CHECKLIST.md`

---

## Migration Status

- [ ] Not started
- [ ] Validation complete (no orphans)
- [ ] Type fixes applied
- [ ] Unique constraints added
- [ ] User FKs added
- [ ] All FKs added
- [ ] Schema updated
- [ ] Tests passing
- [ ] Deployed to production

---

## NEW: Row Level Security (RLS) Migration

**Date:** 2026-01-23
**Migration:** `0027_add_row_level_security_policies.sql`
**Priority:** CRITICAL - HIPAA Compliance

### Overview

Migration 0027 implements comprehensive Row Level Security (RLS) policies for all database tables to ensure:
- **User Isolation**: Users can only access their own data
- **Agency Scoping**: Agency members access data based on role
- **Admin Elevation**: System admins have elevated access
- **HIPAA Compliance**: No unauthorized PHI access
- **Public Safety**: Medical protocols remain accessible

### What's Included

1. **RLS Policies for 21 Tables**
   - `users`, `queries`, `bookmarks`, `search_history`
   - `feedback`, `audit_logs`, `agencies`, `agency_members`
   - `protocol_versions`, `protocol_uploads`, `user_auth_providers`
   - `user_counties`, `user_states`, `user_agencies`
   - `contact_submissions`, `counties`, `protocol_chunks`
   - `integration_logs`, `stripe_webhook_events`, `push_tokens`
   - `drip_emails_sent`

2. **Helper Functions**
   - `get_current_user_id()` - Maps auth.uid() to internal user ID
   - `is_admin()` - Check admin role
   - `is_agency_member(agency_id)` - Check agency membership
   - `is_agency_admin(agency_id)` - Check agency admin/owner role

3. **Role-Based Permissions**
   - `anon` - Public read access to counties, protocols, agencies
   - `authenticated` - User-scoped access per RLS policies
   - `service_role` - Full access (backend operations)

### Running the RLS Migration

```bash
# Apply RLS policies
psql $DATABASE_URL -f drizzle/migrations/0027_add_row_level_security_policies.sql

# Test RLS policies
psql $DATABASE_URL -f drizzle/migrations/0027_test_rls_policies.sql
```

### Verification

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### Documentation

- **Full Documentation**: `RLS_POLICIES_DOCUMENTATION.md` - Complete policy reference
- **Developer Guide**: `RLS_DEVELOPER_GUIDE.md` - How to work with RLS in code
- **Test Suite**: `0027_test_rls_policies.sql` - Automated tests
- **Migration**: `0027_add_row_level_security_policies.sql` - Policy definitions

### Key Features

**User Isolation:**
```typescript
// Frontend (RLS enforced)
const { data: queries } = await supabase.from('queries').select('*');
// Returns only current user's queries
```

**Agency Scoping:**
```typescript
// Agency members see agency protocols
const { data: protocols } = await supabase
  .from('protocol_versions')
  .select('*')
  .eq('agency_id', agencyId);
// RLS verifies user is member of agencyId
```

**Admin Access:**
```typescript
// Admins see all data
const { data: allQueries } = await supabase.from('queries').select('*');
// If admin: returns all queries
// If user: returns only own queries
```

### HIPAA Compliance

RLS policies enforce HIPAA requirements:
- **queries**: Query text may reference patient scenarios - strict user isolation
- **search_history**: Search terms may contain clinical context - isolated
- **audit_logs**: Required for compliance - admin read-only
- **integration_logs**: PHI removed in migration 0012 - analytics only
- **contact_submissions**: Contains PII - admin access only

### Testing

Run the test suite to verify all policies:
```bash
psql $DATABASE_URL -f drizzle/migrations/0027_test_rls_policies.sql
```

Expected output:
- ✅ PASS: User isolation working
- ✅ PASS: Agency scoping working
- ✅ PASS: Admin access working
- ✅ PASS: Public data accessible
- ✅ PASS: Helper functions working

### Rollback

If needed, rollback instructions are included in the migration file:
```sql
-- Drop all policies
-- Disable RLS on tables
-- Drop helper functions
-- Revoke permissions
```

### Migration Checklist

- [ ] Review RLS documentation
- [ ] Backup database
- [ ] Apply RLS migration (0027)
- [ ] Run test suite
- [ ] Verify policies in Supabase dashboard
- [ ] Test frontend access as different user roles
- [ ] Test backend service role operations
- [ ] Update application code if needed
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor for access issues

---

**Last Updated:** 2026-01-23
**Status:** Ready for execution
**Risk Level:** Low
**Estimated Time:** 15-30 minutes
