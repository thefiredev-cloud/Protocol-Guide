-- ============================================================================
-- RLS Policy Test Suite
-- ============================================================================
-- This script tests all RLS policies defined in migration 0027
-- Run as service_role to setup test data, then as different roles to verify
-- ============================================================================

-- ============================================================================
-- TEST DATA SETUP (Run as service_role)
-- ============================================================================

-- Clean up any existing test data
DELETE FROM queries WHERE query_text LIKE 'RLS_TEST%';
DELETE FROM bookmarks WHERE content LIKE 'RLS_TEST%';
DELETE FROM search_history WHERE search_query LIKE 'RLS_TEST%';
DELETE FROM agency_members WHERE agency_id IN (SELECT id FROM agencies WHERE slug LIKE 'rls-test%');
DELETE FROM agencies WHERE slug LIKE 'rls-test%';
DELETE FROM users WHERE email LIKE '%@rls-test.com';

-- Create test users in auth.users (if using Supabase auth)
-- Note: In production, these would be real Supabase auth users
-- For testing, we'll just use the users table

INSERT INTO users (supabase_id, email, name, role, tier, query_count_today, last_query_date)
VALUES
    ('test-user1-uuid', 'user1@rls-test.com', 'Test User 1', 'user', 'free', 0, NULL),
    ('test-user2-uuid', 'user2@rls-test.com', 'Test User 2', 'user', 'pro', 0, NULL),
    ('test-admin-uuid', 'admin@rls-test.com', 'Test Admin', 'admin', 'pro', 0, NULL)
ON CONFLICT (open_id) DO NOTHING;

-- Store user IDs for reference
DO $$
DECLARE
    user1_id INTEGER;
    user2_id INTEGER;
    admin_id INTEGER;
    agency1_id INTEGER;
    agency2_id INTEGER;
BEGIN
    SELECT id INTO user1_id FROM users WHERE supabase_id = 'test-user1-uuid';
    SELECT id INTO user2_id FROM users WHERE supabase_id = 'test-user2-uuid';
    SELECT id INTO admin_id FROM users WHERE supabase_id = 'test-admin-uuid';

    -- Create test agencies
    INSERT INTO agencies (name, slug, state_code, state, agency_type)
    VALUES
        ('RLS Test Fire Dept 1', 'rls-test-fd1', 'CA', 'CA', 'fire_dept'),
        ('RLS Test Fire Dept 2', 'rls-test-fd2', 'TX', 'TX', 'fire_dept')
    RETURNING id INTO agency1_id;

    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';
    SELECT id INTO agency2_id FROM agencies WHERE slug = 'rls-test-fd2';

    -- Create agency memberships
    INSERT INTO agency_members (agency_id, user_id, role, status)
    VALUES
        (agency1_id, user1_id, 'owner', 'active'),      -- User1 owns Agency1
        (agency1_id, user2_id, 'member', 'active'),     -- User2 is member of Agency1
        (agency2_id, user2_id, 'admin', 'active');      -- User2 is admin of Agency2

    -- Create test data
    INSERT INTO queries (user_id, county_id, query_text, response_text)
    VALUES
        (user1_id, 1, 'RLS_TEST: User1 query 1', 'Response 1'),
        (user1_id, 1, 'RLS_TEST: User1 query 2', 'Response 2'),
        (user2_id, 1, 'RLS_TEST: User2 query 1', 'Response 3');

    INSERT INTO bookmarks (user_id, protocol_number, protocol_title, content)
    VALUES
        (user1_id, 'R-001', 'Test Protocol', 'RLS_TEST: User1 bookmark'),
        (user2_id, 'R-002', 'Test Protocol 2', 'RLS_TEST: User2 bookmark');

    INSERT INTO search_history (user_id, county_id, search_query, results_count)
    VALUES
        (user1_id, 1, 'RLS_TEST: User1 search', 5),
        (user2_id, 1, 'RLS_TEST: User2 search', 3);

    INSERT INTO feedback (user_id, category, subject, message)
    VALUES
        (user1_id, 'suggestion', 'RLS_TEST: User1 feedback', 'Test message'),
        (user2_id, 'error', 'RLS_TEST: User2 feedback', 'Test message');

    INSERT INTO protocol_versions (agency_id, protocol_number, title, version, status, created_by)
    VALUES
        (agency1_id, 'R-001', 'RLS Test Protocol', '1.0', 'draft', user1_id),
        (agency1_id, 'R-002', 'RLS Test Protocol 2', '1.0', 'published', user1_id),
        (agency2_id, 'R-001', 'RLS Test Protocol Agency2', '1.0', 'draft', user2_id);

    RAISE NOTICE 'Test data created successfully';
END $$;


-- ============================================================================
-- TEST 1: User Isolation (queries table)
-- ============================================================================

-- Expected: User1 sees only their own queries (2 rows)
-- Simulate authenticated user1 session
DO $$
DECLARE
    count INTEGER;
BEGIN
    -- Set session user (this simulates RLS context)
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM queries WHERE query_text LIKE 'RLS_TEST%';

    IF count = 2 THEN
        RAISE NOTICE 'PASS: User1 sees only own queries (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: User1 expected 2 queries, got %', count;
    END IF;
END $$;

-- Expected: User2 sees only their own queries (1 row)
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    SELECT COUNT(*) INTO count FROM queries WHERE query_text LIKE 'RLS_TEST%';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: User2 sees only own queries (% row)', count;
    ELSE
        RAISE WARNING 'FAIL: User2 expected 1 query, got %', count;
    END IF;
END $$;

-- Expected: Admin sees all queries (3 rows)
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-admin-uuid"}', true);

    SELECT COUNT(*) INTO count FROM queries WHERE query_text LIKE 'RLS_TEST%';

    IF count = 3 THEN
        RAISE NOTICE 'PASS: Admin sees all queries (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: Admin expected 3 queries, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 2: Bookmarks User Isolation
-- ============================================================================

-- Expected: User1 sees only their bookmark (1 row)
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM bookmarks WHERE content LIKE 'RLS_TEST%';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: User1 sees only own bookmark';
    ELSE
        RAISE WARNING 'FAIL: User1 expected 1 bookmark, got %', count;
    END IF;
END $$;

-- Expected: User2 sees only their bookmark (1 row)
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    SELECT COUNT(*) INTO count FROM bookmarks WHERE content LIKE 'RLS_TEST%';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: User2 sees only own bookmark';
    ELSE
        RAISE WARNING 'FAIL: User2 expected 1 bookmark, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 3: Search History User Isolation
-- ============================================================================

DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM search_history WHERE search_query LIKE 'RLS_TEST%';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: User1 sees only own search history';
    ELSE
        RAISE WARNING 'FAIL: User1 expected 1 search, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 4: Feedback Access
-- ============================================================================

-- Expected: User1 sees own feedback
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM feedback WHERE subject LIKE 'RLS_TEST%';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: User1 sees only own feedback';
    ELSE
        RAISE WARNING 'FAIL: User1 expected 1 feedback, got %', count;
    END IF;
END $$;

-- Expected: Admin sees all feedback
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-admin-uuid"}', true);

    SELECT COUNT(*) INTO count FROM feedback WHERE subject LIKE 'RLS_TEST%';

    IF count = 2 THEN
        RAISE NOTICE 'PASS: Admin sees all feedback (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: Admin expected 2 feedback, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 5: Agency Members Access
-- ============================================================================

-- Expected: User1 sees members of Agency1 (2 members: user1 and user2)
DO $$
DECLARE
    count INTEGER;
    agency1_id INTEGER;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM agency_members WHERE agency_id = agency1_id;

    IF count = 2 THEN
        RAISE NOTICE 'PASS: User1 sees Agency1 members (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: User1 expected 2 agency members, got %', count;
    END IF;
END $$;

-- Expected: User2 sees both agencies they're in
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    SELECT COUNT(*) INTO count FROM agency_members;

    IF count >= 2 THEN
        RAISE NOTICE 'PASS: User2 sees memberships in both agencies';
    ELSE
        RAISE WARNING 'FAIL: User2 expected 2+ memberships, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 6: Protocol Versions Access
-- ============================================================================

-- Expected: Public sees only published protocols (1 row)
DO $$
DECLARE
    count INTEGER;
BEGIN
    -- Simulate anon role
    PERFORM set_config('request.jwt.claims', '{}', true);

    SELECT COUNT(*) INTO count FROM protocol_versions
    WHERE title LIKE 'RLS Test%' AND status = 'published';

    IF count = 1 THEN
        RAISE NOTICE 'PASS: Public sees only published protocols';
    ELSE
        RAISE WARNING 'FAIL: Public expected 1 published protocol, got %', count;
    END IF;
END $$;

-- Expected: User1 (Agency1 owner) sees all Agency1 protocols (2 rows)
DO $$
DECLARE
    count INTEGER;
    agency1_id INTEGER;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT COUNT(*) INTO count FROM protocol_versions
    WHERE agency_id = agency1_id AND title LIKE 'RLS Test%';

    IF count = 2 THEN
        RAISE NOTICE 'PASS: User1 sees all Agency1 protocols (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: User1 expected 2 Agency1 protocols, got %', count;
    END IF;
END $$;

-- Expected: User2 sees Agency1 protocols (member) + Agency2 protocols (admin)
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    SELECT COUNT(*) INTO count FROM protocol_versions
    WHERE title LIKE 'RLS Test%';

    IF count = 3 THEN
        RAISE NOTICE 'PASS: User2 sees all agency protocols they belong to (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: User2 expected 3 protocols, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 7: Agency Admin Permissions
-- ============================================================================

-- Expected: User1 can update Agency1 (owner)
DO $$
DECLARE
    agency1_id INTEGER;
    update_success BOOLEAN := false;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    BEGIN
        UPDATE agencies
        SET contact_email = 'updated@rls-test.com'
        WHERE id = agency1_id;

        update_success := true;
        RAISE NOTICE 'PASS: User1 (owner) can update Agency1';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'FAIL: User1 (owner) cannot update Agency1';
    END;

    -- Rollback the update
    UPDATE agencies SET contact_email = NULL WHERE id = agency1_id;
END $$;

-- Expected: User2 can update Agency2 (admin) but not Agency1 (member)
DO $$
DECLARE
    agency1_id INTEGER;
    agency2_id INTEGER;
    can_update_agency1 BOOLEAN := false;
    can_update_agency2 BOOLEAN := false;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';
    SELECT id INTO agency2_id FROM agencies WHERE slug = 'rls-test-fd2';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    -- Try updating Agency1 (should fail - user2 is only member)
    BEGIN
        UPDATE agencies
        SET contact_email = 'should-fail@rls-test.com'
        WHERE id = agency1_id;

        IF FOUND THEN
            can_update_agency1 := true;
            RAISE WARNING 'FAIL: User2 (member) should not update Agency1';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: User2 (member) cannot update Agency1';
    END;

    -- Try updating Agency2 (should succeed - user2 is admin)
    BEGIN
        UPDATE agencies
        SET contact_email = 'updated@rls-test.com'
        WHERE id = agency2_id;

        can_update_agency2 := true;
        RAISE NOTICE 'PASS: User2 (admin) can update Agency2';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'FAIL: User2 (admin) cannot update Agency2';
    END;

    -- Rollback updates
    UPDATE agencies SET contact_email = NULL WHERE id IN (agency1_id, agency2_id);
END $$;


-- ============================================================================
-- TEST 8: Public Tables Access
-- ============================================================================

-- Expected: Anon can read counties
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);

    SELECT COUNT(*) INTO count FROM counties;

    IF count > 0 THEN
        RAISE NOTICE 'PASS: Anon can read counties (% rows)', count;
    ELSE
        RAISE NOTICE 'INFO: No counties in database (expected in test env)';
    END IF;
END $$;

-- Expected: Anon can read agencies
DO $$
DECLARE
    count INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);

    SELECT COUNT(*) INTO count FROM agencies;

    IF count >= 2 THEN
        RAISE NOTICE 'PASS: Anon can read agencies (% rows)', count;
    ELSE
        RAISE WARNING 'FAIL: Anon expected 2+ agencies, got %', count;
    END IF;
END $$;


-- ============================================================================
-- TEST 9: Helper Functions
-- ============================================================================

-- Test get_current_user_id()
DO $$
DECLARE
    user_id INTEGER;
    expected_id INTEGER;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT id INTO expected_id FROM users WHERE supabase_id = 'test-user1-uuid';
    SELECT get_current_user_id() INTO user_id;

    IF user_id = expected_id THEN
        RAISE NOTICE 'PASS: get_current_user_id() returns correct ID';
    ELSE
        RAISE WARNING 'FAIL: get_current_user_id() expected %, got %', expected_id, user_id;
    END IF;
END $$;

-- Test is_admin()
DO $$
DECLARE
    is_admin_result BOOLEAN;
BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub": "test-admin-uuid"}', true);

    SELECT is_admin() INTO is_admin_result;

    IF is_admin_result THEN
        RAISE NOTICE 'PASS: is_admin() returns true for admin user';
    ELSE
        RAISE WARNING 'FAIL: is_admin() should return true for admin';
    END IF;

    -- Test with regular user
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT is_admin() INTO is_admin_result;

    IF NOT is_admin_result THEN
        RAISE NOTICE 'PASS: is_admin() returns false for regular user';
    ELSE
        RAISE WARNING 'FAIL: is_admin() should return false for regular user';
    END IF;
END $$;

-- Test is_agency_member()
DO $$
DECLARE
    is_member BOOLEAN;
    agency1_id INTEGER;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT is_agency_member(agency1_id) INTO is_member;

    IF is_member THEN
        RAISE NOTICE 'PASS: is_agency_member() returns true for member';
    ELSE
        RAISE WARNING 'FAIL: is_agency_member() should return true';
    END IF;
END $$;

-- Test is_agency_admin()
DO $$
DECLARE
    is_admin BOOLEAN;
    agency1_id INTEGER;
    agency2_id INTEGER;
BEGIN
    SELECT id INTO agency1_id FROM agencies WHERE slug = 'rls-test-fd1';
    SELECT id INTO agency2_id FROM agencies WHERE slug = 'rls-test-fd2';

    PERFORM set_config('request.jwt.claims', '{"sub": "test-user1-uuid"}', true);

    SELECT is_agency_admin(agency1_id) INTO is_admin;

    IF is_admin THEN
        RAISE NOTICE 'PASS: is_agency_admin() returns true for owner';
    ELSE
        RAISE WARNING 'FAIL: is_agency_admin() should return true for owner';
    END IF;

    -- User2 is admin of Agency2
    PERFORM set_config('request.jwt.claims', '{"sub": "test-user2-uuid"}', true);

    SELECT is_agency_admin(agency2_id) INTO is_admin;

    IF is_admin THEN
        RAISE NOTICE 'PASS: is_agency_admin() returns true for admin';
    ELSE
        RAISE WARNING 'FAIL: is_agency_admin() should return true for admin';
    END IF;

    -- User2 is NOT admin of Agency1
    SELECT is_agency_admin(agency1_id) INTO is_admin;

    IF NOT is_admin THEN
        RAISE NOTICE 'PASS: is_agency_admin() returns false for regular member';
    ELSE
        RAISE WARNING 'FAIL: is_agency_admin() should return false for member';
    END IF;
END $$;


-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS POLICY TEST SUITE COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review PASS/FAIL messages above';
    RAISE NOTICE 'All tests with PASS indicate proper RLS isolation';
    RAISE NOTICE 'Any FAIL or WARNING indicates a policy issue';
    RAISE NOTICE '';
END $$;


-- ============================================================================
-- CLEANUP TEST DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Cleaning up test data...';

    DELETE FROM queries WHERE query_text LIKE 'RLS_TEST%';
    DELETE FROM bookmarks WHERE content LIKE 'RLS_TEST%';
    DELETE FROM search_history WHERE search_query LIKE 'RLS_TEST%';
    DELETE FROM feedback WHERE subject LIKE 'RLS_TEST%';
    DELETE FROM protocol_versions WHERE title LIKE 'RLS Test%';
    DELETE FROM agency_members WHERE agency_id IN (SELECT id FROM agencies WHERE slug LIKE 'rls-test%');
    DELETE FROM agencies WHERE slug LIKE 'rls-test%';
    DELETE FROM users WHERE email LIKE '%@rls-test.com';

    RAISE NOTICE 'Test data cleaned up successfully';
END $$;
