-- PostgreSQL Migration: Create updated_at trigger function
-- This replaces MySQL's onUpdateNow() behavior
-- Tables affected: users, feedback, agencies, user_auth_providers, protocol_versions

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need auto-updating updated_at

-- Users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Feedback table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_feedback_updated_at') THEN
        CREATE TRIGGER update_feedback_updated_at
            BEFORE UPDATE ON feedback
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Agencies table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agencies_updated_at') THEN
        CREATE TRIGGER update_agencies_updated_at
            BEFORE UPDATE ON agencies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- User Auth Providers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_auth_providers_updated_at') THEN
        CREATE TRIGGER update_user_auth_providers_updated_at
            BEFORE UPDATE ON user_auth_providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Protocol Versions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_protocol_versions_updated_at') THEN
        CREATE TRIGGER update_protocol_versions_updated_at
            BEFORE UPDATE ON protocol_versions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
