-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- TimescaleDB is already enabled by the timescaledb-ha image
-- but we ensure it's available
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;
