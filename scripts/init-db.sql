-- Protocol Guide - Local Development Database Init
-- This runs on first container start

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Note: pgvector requires special Docker image (ankane/pgvector)
-- For local dev without vectors, embeddings will use Voyage API directly

-- Create schemas if needed
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Protocol Guide database initialized successfully';
END $$;
