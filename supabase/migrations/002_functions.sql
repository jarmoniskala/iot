-- 002_functions.sql
-- Database functions for partition creation and storage monitoring.


-- ============================================================================
-- 1. CREATE MONTHLY PARTITION (idempotent)
-- ============================================================================
-- Creates a monthly partition for the given table and target date.
-- Uses CREATE TABLE IF NOT EXISTS so it is safe to call multiple times.
-- Partition naming convention: {table_name}_YYYY_MM
--
-- Usage:
--   SELECT create_monthly_partition('sensor_readings');               -- current month
--   SELECT create_monthly_partition('sensor_readings', '2026-04-01'); -- specific month
--   SELECT create_monthly_partition('weather_observations', (now() + interval '1 month')::date);

CREATE OR REPLACE FUNCTION create_monthly_partition(
  p_table_name text,
  p_target_date date DEFAULT now()::date
)
RETURNS void AS $$
DECLARE
  v_partition_name text;
  v_start_date date;
  v_end_date date;
BEGIN
  v_start_date := date_trunc('month', p_target_date)::date;
  v_end_date := (v_start_date + interval '1 month')::date;
  v_partition_name := p_table_name || '_' || to_char(v_start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    p_table_name,
    v_start_date,
    v_end_date
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 2. GET DATABASE SIZE IN MB
-- ============================================================================
-- Returns the current database size in megabytes as a numeric value.
-- Useful for monitoring the Supabase free tier 500MB limit.
--
-- Usage:
--   SELECT get_database_size_mb();  -- e.g., 42.17

CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS numeric AS $$
  SELECT round(
    pg_database_size(current_database()) / (1024.0 * 1024.0), 2
  );
$$ LANGUAGE sql;


-- ============================================================================
-- 3. GET TABLE SIZES
-- ============================================================================
-- Returns table name, size in MB, and estimated row count for all user tables.
-- Ordered by size descending for quick identification of largest tables.
--
-- Usage:
--   SELECT * FROM get_table_sizes();

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(table_name text, size_mb numeric, row_estimate bigint) AS $$
  SELECT
    schemaname || '.' || relname AS table_name,
    round(pg_total_relation_size(relid) / (1024.0 * 1024.0), 2) AS size_mb,
    n_live_tup AS row_estimate
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
$$ LANGUAGE sql;
