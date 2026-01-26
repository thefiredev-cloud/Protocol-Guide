-- ============================================================================
-- PENDING MIGRATIONS FOR PRODUCTION SUPABASE
-- ============================================================================
-- Combined migrations: 0028, 0032
-- Generated: 2025-01-26
-- 
-- IMPORTANT: Review each section before running in production!
-- ============================================================================

BEGIN;

-- ============================================================================
-- MIGRATION 0028: Fix RLS Column Reference
-- ============================================================================
-- Description: Fix RLS helper functions to use correct column name (auth_id)
-- The schema uses 'auth_id' but migration 0027 referenced 'supabase_id'
-- Priority: CRITICAL - Auth is broken without this fix
-- ============================================================================

-- Get current user's internal ID from Supabase auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
    SELECT id FROM manus_users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM manus_users
        WHERE auth_id = auth.uid()
        AND role = 'admin'
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is member of agency
CREATE OR REPLACE FUNCTION is_agency_member(agency_id_param INTEGER)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM agency_members am
        JOIN manus_users u ON u.id = am.user_id
        WHERE u.auth_id = auth.uid()
        AND am.agency_id = agency_id_param
        AND am.status = 'active'
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is agency admin or owner
CREATE OR REPLACE FUNCTION is_agency_admin(agency_id_param INTEGER)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM agency_members am
        JOIN manus_users u ON u.id = am.user_id
        WHERE u.auth_id = auth.uid()
        AND am.agency_id = agency_id_param
        AND am.role IN ('admin', 'owner')
        AND am.status = 'active'
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is service role (backend operations)
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
    SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- MIGRATION 0032: Add Waitlist Signups Table
-- ============================================================================
-- Description: Creates waitlist_signups table for email capture on landing page
-- ============================================================================

CREATE TABLE IF NOT EXISTS "waitlist_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"source" varchar(100) DEFAULT 'landing_page',
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "waitlist_signups_email_idx" ON "waitlist_signups" USING btree ("email");
CREATE INDEX IF NOT EXISTS "waitlist_signups_created_idx" ON "waitlist_signups" USING btree ("created_at");

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback these changes, run the following:
--
-- -- Rollback 0032 (waitlist_signups table):
-- DROP INDEX IF EXISTS "waitlist_signups_created_idx";
-- DROP INDEX IF EXISTS "waitlist_signups_email_idx";
-- DROP TABLE IF EXISTS "waitlist_signups";
--
-- -- Rollback 0028 (RLS functions):
-- -- WARNING: Only rollback if you have the previous function definitions!
-- -- These are CREATE OR REPLACE, so they just update existing functions.
-- -- Rolling back would require restoring the old (broken) versions, 
-- -- which is NOT recommended. The new versions fix a critical bug.
-- ============================================================================
