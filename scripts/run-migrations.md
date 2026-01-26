# Running Pending Migrations

This guide covers how to apply the pending migrations (`0028_fix_rls_column_reference.sql` and `0032_add_waitlist_signups.sql`) to production Supabase.

## Migrations Included

| Migration | Description | Priority |
|-----------|-------------|----------|
| 0028 | Fix RLS helper functions to use `auth_id` column | **CRITICAL** |
| 0032 | Add `waitlist_signups` table for email capture | Normal |

---

## Option 1: Supabase Dashboard SQL Editor

1. **Open your Supabase project dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your Protocol Guide project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar

3. **Create a new query**
   - Click **New query**

4. **Paste the migration script**
   - Copy the entire contents of `scripts/pending-migrations.sql`
   - Paste into the SQL Editor

5. **Review the SQL carefully**
   - Verify you're connected to the correct project
   - Check the migrations make sense for your environment

6. **Execute**
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

7. **Verify success** (see verification queries below)

---

## Option 2: Supabase CLI

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref <your-project-ref>`

### Run the Migration

```bash
# From the project root directory
supabase db execute --file scripts/pending-migrations.sql
```

Or push via stdin:
```bash
cat scripts/pending-migrations.sql | supabase db execute
```

### Alternative: Direct psql Connection

If you have the database connection string:
```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" -f scripts/pending-migrations.sql
```

---

## Verification Queries

After running the migrations, execute these queries to confirm success:

### Verify RLS Functions (Migration 0028)

```sql
-- Check all 5 helper functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_current_user_id',
    'is_admin', 
    'is_agency_member',
    'is_agency_admin',
    'is_service_role'
);
-- Expected: 5 rows returned
```

```sql
-- Verify function uses correct column (auth_id, not supabase_id)
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'get_current_user_id';
-- Expected: Should contain 'auth_id = auth.uid()'
```

### Verify Waitlist Table (Migration 0032)

```sql
-- Check table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'waitlist_signups'
ORDER BY ordinal_position;
-- Expected: 4 columns (id, email, source, created_at)
```

```sql
-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'waitlist_signups';
-- Expected: 3 indexes (primary key + 2 custom)
```

### Quick Health Check

```sql
-- All-in-one verification
SELECT 
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_name IN ('get_current_user_id','is_admin','is_agency_member','is_agency_admin','is_service_role')
    ) AS rls_functions_count,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_name = 'waitlist_signups'
    ) AS waitlist_table_exists,
    (SELECT COUNT(*) FROM pg_indexes 
     WHERE tablename = 'waitlist_signups'
    ) AS waitlist_indexes_count;
-- Expected: 5, 1, 3
```

---

## Rollback (If Needed)

### Rollback Waitlist Table (0032)
```sql
DROP INDEX IF EXISTS "waitlist_signups_created_idx";
DROP INDEX IF EXISTS "waitlist_signups_email_idx";
DROP TABLE IF EXISTS "waitlist_signups";
```

### Rollback RLS Functions (0028)
⚠️ **Not recommended** - Migration 0028 fixes a critical auth bug. Rolling back would break authentication.

---

## Troubleshooting

### "relation does not exist" errors
- Ensure migrations are run in order
- Check you're connected to the correct database

### "permission denied" errors
- Make sure you're using a role with sufficient privileges
- For Supabase, use the `postgres` role or service role

### Transaction failed
- The script uses `BEGIN`/`COMMIT` for safety
- If any statement fails, the entire transaction rolls back
- Fix the issue and re-run the entire script
