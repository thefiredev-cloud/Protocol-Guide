-- Migration: Add disclaimer_acknowledged_at column to manus_users table
-- Date: 2026-01-30
-- Purpose: Track when users acknowledge the medical disclaimer (legal compliance)

-- Add the new column (nullable, no default - existing users will have NULL)
ALTER TABLE manus_users 
ADD COLUMN IF NOT EXISTS disclaimer_acknowledged_at TIMESTAMPTZ;

-- Create index for faster queries on disclaimer status
CREATE INDEX IF NOT EXISTS idx_manus_users_disclaimer 
ON manus_users (disclaimer_acknowledged_at) 
WHERE disclaimer_acknowledged_at IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'manus_users' 
AND column_name = 'disclaimer_acknowledged_at';
