-- Migration: Add department subscription fields to agencies table
-- Date: 2026-01-22
-- Description: Adds seatCount and annualBilling fields to support department pricing tiers

-- Add seatCount column for tracking licensed seats per agency
ALTER TABLE agencies
ADD COLUMN seatCount INT DEFAULT 1 NOT NULL
COMMENT 'Number of licensed seats for the agency subscription';

-- Add annualBilling column for tracking billing interval
ALTER TABLE agencies
ADD COLUMN annualBilling BOOLEAN DEFAULT FALSE NOT NULL
COMMENT 'Whether agency is on annual billing (true) or monthly billing (false)';

-- Add index for querying agencies by subscription tier and seat count
CREATE INDEX idx_agencies_subscription ON agencies(subscriptionTier, seatCount);

-- Update existing agencies to have default values
UPDATE agencies
SET seatCount = 1, annualBilling = FALSE
WHERE seatCount IS NULL OR annualBilling IS NULL;
