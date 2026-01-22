-- Migration: Add Row-Level Security Policies
-- Description: Secure all Supabase tables with appropriate RLS policies
-- Date: 2026-01-22
-- Priority: HIGH - Security vulnerability fix

-- ============================================================================
-- TABLE 1: manus_protocol_chunks
-- ============================================================================

-- Enable RLS on protocol chunks table
ALTER TABLE public.manus_protocol_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all protocol chunks
-- Reasoning: Protocols are public medical information, safe to read by anyone
CREATE POLICY "Allow public read access to protocol chunks"
    ON public.manus_protocol_chunks
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Only service_role can insert protocol chunks
-- Reasoning: Only backend services should add new protocols during data migration
CREATE POLICY "Allow service_role to insert protocol chunks"
    ON public.manus_protocol_chunks
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Only service_role can update protocol chunks
-- Reasoning: Only backend services should modify protocol content
CREATE POLICY "Allow service_role to update protocol chunks"
    ON public.manus_protocol_chunks
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Only service_role can delete protocol chunks
-- Reasoning: Only backend services should remove protocols
CREATE POLICY "Allow service_role to delete protocol chunks"
    ON public.manus_protocol_chunks
    FOR DELETE
    TO service_role
    USING (true);

-- Add table and column comments for documentation
COMMENT ON TABLE public.manus_protocol_chunks IS 'EMS protocol chunks with Voyage AI embeddings for semantic search';
COMMENT ON COLUMN public.manus_protocol_chunks.agency_id IS 'Foreign key to agencies.id';
COMMENT ON COLUMN public.manus_protocol_chunks.embedding IS 'Voyage AI embedding vector (1536 dimensions)';
COMMENT ON COLUMN public.manus_protocol_chunks.protocol_number IS 'Protocol identifier (e.g., R-001, C-502)';
COMMENT ON COLUMN public.manus_protocol_chunks.image_urls IS 'Array of image URLs associated with this protocol chunk';


-- ============================================================================
-- TABLE 2: users (if exists in Supabase)
-- ============================================================================

-- Note: Check if this table exists in Supabase (may be in MySQL only)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Enable RLS on users table
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

        -- Policy: Users can read their own data
        CREATE POLICY "Users can read their own data"
            ON public.users
            FOR SELECT
            TO authenticated
            USING (auth.uid()::text = supabase_id);

        -- Policy: Users can update their own data
        CREATE POLICY "Users can update their own data"
            ON public.users
            FOR UPDATE
            TO authenticated
            USING (auth.uid()::text = supabase_id)
            WITH CHECK (auth.uid()::text = supabase_id);

        -- Policy: Service role has full access
        CREATE POLICY "Service role has full access to users"
            ON public.users
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Policy: Allow user creation during signup
        CREATE POLICY "Allow user creation during signup"
            ON public.users
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid()::text = supabase_id);

        COMMENT ON TABLE public.users IS 'User accounts and preferences';
        RAISE NOTICE 'RLS policies added to users table';
    ELSE
        RAISE NOTICE 'users table does not exist in Supabase, skipping';
    END IF;
END
$$;


-- ============================================================================
-- TABLE 3: queries (query history/logs)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'queries') THEN
        -- Enable RLS on queries table
        ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

        -- Policy: Users can read their own query history
        CREATE POLICY "Users can read their own query history"
            ON public.queries
            FOR SELECT
            TO authenticated
            USING (
                user_id IN (
                    SELECT id FROM public.users WHERE supabase_id = auth.uid()::text
                )
            );

        -- Policy: Users can insert their own queries
        CREATE POLICY "Users can insert their own queries"
            ON public.queries
            FOR INSERT
            TO authenticated
            WITH CHECK (
                user_id IN (
                    SELECT id FROM public.users WHERE supabase_id = auth.uid()::text
                )
            );

        -- Policy: Service role has full access
        CREATE POLICY "Service role has full access to queries"
            ON public.queries
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Policy: Admins can read all queries (for analytics)
        CREATE POLICY "Admins can read all queries"
            ON public.queries
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE supabase_id = auth.uid()::text
                    AND role = 'admin'
                )
            );

        COMMENT ON TABLE public.queries IS 'User query history and analytics';
        RAISE NOTICE 'RLS policies added to queries table';
    ELSE
        RAISE NOTICE 'queries table does not exist in Supabase, skipping';
    END IF;
END
$$;


-- ============================================================================
-- TABLE 4: agencies (already has RLS from create-agencies-table.sql)
-- ============================================================================

-- Verify agencies table has RLS enabled
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agencies') THEN
        -- Ensure RLS is enabled (should already be from creation script)
        ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

        -- Check if policies already exist, if not create them
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'agencies'
            AND policyname = 'Allow public read access to agencies'
        ) THEN
            CREATE POLICY "Allow public read access to agencies"
                ON public.agencies
                FOR SELECT
                TO PUBLIC
                USING (true);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'agencies'
            AND policyname = 'Allow service_role full access to agencies'
        ) THEN
            CREATE POLICY "Allow service_role full access to agencies"
                ON public.agencies
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
        END IF;

        RAISE NOTICE 'RLS policies verified for agencies table';
    ELSE
        RAISE NOTICE 'agencies table does not exist yet';
    END IF;
END
$$;


-- ============================================================================
-- TABLE 5: feedback (if exists in Supabase)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback') THEN
        -- Enable RLS on feedback table
        ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

        -- Policy: Users can read their own feedback
        CREATE POLICY "Users can read their own feedback"
            ON public.feedback
            FOR SELECT
            TO authenticated
            USING (
                user_id IN (
                    SELECT id FROM public.users WHERE supabase_id = auth.uid()::text
                )
            );

        -- Policy: Users can create their own feedback
        CREATE POLICY "Users can create their own feedback"
            ON public.feedback
            FOR INSERT
            TO authenticated
            WITH CHECK (
                user_id IN (
                    SELECT id FROM public.users WHERE supabase_id = auth.uid()::text
                )
            );

        -- Policy: Users can update their own pending feedback
        CREATE POLICY "Users can update their own pending feedback"
            ON public.feedback
            FOR UPDATE
            TO authenticated
            USING (
                user_id IN (
                    SELECT id FROM public.users WHERE supabase_id = auth.uid()::text
                )
                AND status = 'pending'
            )
            WITH CHECK (status = 'pending');

        -- Policy: Admins can read all feedback
        CREATE POLICY "Admins can read all feedback"
            ON public.feedback
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE supabase_id = auth.uid()::text
                    AND role = 'admin'
                )
            );

        -- Policy: Admins can update feedback status
        CREATE POLICY "Admins can update all feedback"
            ON public.feedback
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE supabase_id = auth.uid()::text
                    AND role = 'admin'
                )
            )
            WITH CHECK (true);

        -- Policy: Service role has full access
        CREATE POLICY "Service role has full access to feedback"
            ON public.feedback
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        COMMENT ON TABLE public.feedback IS 'User feedback and protocol error reports';
        RAISE NOTICE 'RLS policies added to feedback table';
    ELSE
        RAISE NOTICE 'feedback table does not exist in Supabase, skipping';
    END IF;
END
$$;


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on protocol chunks to anon users
GRANT SELECT ON public.manus_protocol_chunks TO anon;

-- Grant full access to authenticated users (controlled by RLS)
GRANT SELECT ON public.manus_protocol_chunks TO authenticated;

-- Grant full access to service_role
GRANT ALL ON public.manus_protocol_chunks TO service_role;

-- Grant SELECT on agencies to anon users
GRANT SELECT ON public.agencies TO anon;
GRANT SELECT ON public.agencies TO authenticated;
GRANT ALL ON public.agencies TO service_role;


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add index on agency_id for filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_agency_id
    ON public.manus_protocol_chunks(agency_id);

-- Add index on protocol_number for exact lookups
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_protocol_number
    ON public.manus_protocol_chunks(protocol_number);

-- Add index on section for filtering
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_section
    ON public.manus_protocol_chunks(section);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_protocol_chunks_agency_section
    ON public.manus_protocol_chunks(agency_id, section);


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('manus_protocol_chunks', 'agencies', 'users', 'queries', 'feedback')
ORDER BY tablename;

-- Verify policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('manus_protocol_chunks', 'agencies', 'users', 'queries', 'feedback')
ORDER BY tablename, policyname;

-- Verify permissions
SELECT
    tablename,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN ('manus_protocol_chunks', 'agencies')
    AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY tablename, grantee;
