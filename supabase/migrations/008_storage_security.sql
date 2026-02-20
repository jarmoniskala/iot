-- 008_storage_security.sql
-- Recreate storage monitoring functions with SECURITY DEFINER so the anon
-- role can call them via RPC, and enable RLS on ingestion_log.


-- ============================================================================
-- 1. GET DATABASE SIZE IN MB (SECURITY DEFINER)
-- ============================================================================
-- Uses pg_database_size() which requires elevated privileges.
-- SECURITY DEFINER runs as the function owner (postgres), not the caller.

CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS numeric AS $$
  SELECT round(
    pg_database_size(current_database()) / (1024.0 * 1024.0), 2
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. GET TABLE SIZES (SECURITY DEFINER)
-- ============================================================================
-- Uses pg_stat_user_tables and pg_total_relation_size() which need elevated
-- privileges. Returns all user tables ordered by size descending.

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(table_name text, size_mb numeric, row_estimate bigint) AS $$
  SELECT
    schemaname || '.' || relname AS table_name,
    round(pg_total_relation_size(relid) / (1024.0 * 1024.0), 2) AS size_mb,
    n_live_tup AS row_estimate
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 3. INGESTION_LOG RLS
-- ============================================================================
-- Enable RLS and grant anon SELECT so storage check entries are readable.

ALTER TABLE ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read ingestion_log"
  ON ingestion_log
  FOR SELECT
  TO anon
  USING (true);
