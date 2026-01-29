-- Fix NULL agency_id values in manus_protocol_chunks
-- Maps agency_name to agency_id from agencies table
-- Critical for county filtering to work correctly

-- Los Angeles County EMS Agency
UPDATE manus_protocol_chunks
SET agency_id = 2701
WHERE agency_name = 'Los Angeles County EMS Agency'
  AND agency_id IS NULL;

-- Sierra-Sacramento Valley EMS Agency
UPDATE manus_protocol_chunks pc
SET agency_id = a.id
FROM agencies a
WHERE pc.agency_name = a.name
  AND pc.agency_name = 'Sierra-Sacramento Valley EMS Agency'
  AND pc.agency_id IS NULL;

-- Imperial County EMS Agency
UPDATE manus_protocol_chunks pc
SET agency_id = a.id
FROM agencies a
WHERE pc.agency_name = a.name
  AND pc.agency_name = 'Imperial County EMS Agency'
  AND pc.agency_id IS NULL;

-- San Benito County EMS
UPDATE manus_protocol_chunks pc
SET agency_id = a.id
FROM agencies a
WHERE pc.agency_name = a.name
  AND pc.agency_name = 'San Benito County EMS'
  AND pc.agency_id IS NULL;

-- Marin County EMS Agency
UPDATE manus_protocol_chunks pc
SET agency_id = a.id
FROM agencies a
WHERE pc.agency_name = a.name
  AND pc.agency_name = 'Marin County EMS Agency'
  AND pc.agency_id IS NULL;

-- Generic fix for any remaining NULL agency_ids where name matches
UPDATE manus_protocol_chunks pc
SET agency_id = a.id
FROM agencies a
WHERE pc.agency_name = a.name
  AND pc.agency_id IS NULL;

-- Log the results
DO $$
DECLARE
  fixed_count INTEGER;
  remaining_nulls INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_nulls
  FROM manus_protocol_chunks
  WHERE agency_id IS NULL AND agency_name IS NOT NULL;
  
  RAISE NOTICE 'Remaining chunks with NULL agency_id but non-null agency_name: %', remaining_nulls;
END $$;
