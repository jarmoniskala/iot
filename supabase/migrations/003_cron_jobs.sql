-- 003_cron_jobs.sql
-- Scheduled jobs for autonomous operation: FMI weather polling, monthly
-- partition creation, and daily storage monitoring.
--
-- Prerequisites:
--   - 001_schema.sql (tables and partitions)
--   - 002_functions.sql (create_monthly_partition, get_database_size_mb)
--
-- IMPORTANT: After running this migration, you MUST update the Vault secrets
-- with your actual Supabase project URL and anon key. See instructions below.


-- ============================================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================================
-- pg_cron and pg_net are typically pre-enabled on Supabase, but include for
-- safety in case they are not.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ============================================================================
-- 2. VAULT SECRETS
-- ============================================================================
-- Store the Supabase project URL and anon (public) key in Vault so that
-- pg_cron jobs can invoke edge functions via pg_net without hardcoding secrets.
--
-- *** YOU MUST REPLACE THESE PLACEHOLDER VALUES ***
--
-- Find your actual values at:
--   Supabase Dashboard -> Settings -> API
--   - "Project URL" -> replace 'https://YOUR_PROJECT_REF.supabase.co'
--   - "anon / public" key -> replace 'YOUR_ANON_KEY'
--
-- After deploying this migration, update the secrets using the Supabase SQL
-- editor or the vault.update_secret function:
--
--   SELECT vault.create_secret('https://abcdefghij.supabase.co', 'project_url');
--   SELECT vault.create_secret('eyJhbGciOi...your-anon-key...', 'anon_key');
--
-- If the secrets already exist (e.g., re-running this migration), you can
-- update them instead:
--
--   UPDATE vault.secrets SET secret = 'https://abcdefghij.supabase.co'
--   WHERE name = 'project_url';
--
--   UPDATE vault.secrets SET secret = 'eyJhbGciOi...your-anon-key...'
--   WHERE name = 'anon_key';

SELECT vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'project_url'
);

SELECT vault.create_secret(
  'YOUR_ANON_KEY',
  'anon_key'
);


-- ============================================================================
-- 3. JOB 1: FMI WEATHER POLLING (every 10 minutes)
-- ============================================================================
-- Invokes the poll-fmi edge function via HTTP POST every 10 minutes.
-- This fetches the latest weather observations from FMI for Helsinki-Vantaa
-- airport (FMISID 100968) and stores them in weather_observations.
--
-- This job also serves as the Supabase project keep-alive mechanism:
-- continuous database activity every 10 minutes prevents the 7-day
-- inactivity pause on the free tier (PIPE-06).
--
-- The edge function handles:
--   - Fetching and parsing FMI WFS XML
--   - Extracting all 13 weather parameters
--   - Inserting only recent observations (deduplication via ON CONFLICT)
--   - Logging success/failure to ingestion_log

SELECT cron.schedule(
  'poll-fmi-weather',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/poll-fmi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('invoked_at', now()::text),
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);


-- ============================================================================
-- 4. JOB 2: MONTHLY PARTITION CREATION (daily at 03:00 UTC)
-- ============================================================================
-- Creates monthly partitions for both sensor_readings and weather_observations.
-- Runs daily at 03:00 UTC to ensure partitions exist before they are needed.
--
-- For each table, creates:
--   - Current month's partition (idempotent, no-op if exists)
--   - Next month's partition (ensures it exists before month rollover)
--
-- The create_monthly_partition() function (from 002_functions.sql) uses
-- CREATE TABLE IF NOT EXISTS, so running this daily is completely safe and
-- idempotent. Both tables also have DEFAULT partitions as a safety net.

SELECT cron.schedule(
  'create-monthly-partitions',
  '0 3 * * *',
  $$
  SELECT create_monthly_partition('sensor_readings', now()::date);
  SELECT create_monthly_partition('sensor_readings', (now() + interval '1 month')::date);
  SELECT create_monthly_partition('weather_observations', now()::date);
  SELECT create_monthly_partition('weather_observations', (now() + interval '1 month')::date);
  $$
);


-- ============================================================================
-- 5. JOB 3: DAILY STORAGE MONITORING (daily at 06:00 UTC)
-- ============================================================================
-- Logs the current database size to ingestion_log for tracking growth over
-- time. The Phase 2 dashboard can query this data to display storage usage
-- and warn when approaching the 500MB free tier limit (PIPE-05).
--
-- Logged as source='system', status='storage_check' so it does not interfere
-- with FMI or Ruuvi ingestion log queries.

SELECT cron.schedule(
  'log-storage-usage',
  '0 6 * * *',
  $$
  INSERT INTO ingestion_log (source, status, details)
  VALUES (
    'system',
    'storage_check',
    jsonb_build_object(
      'database_size_mb', (SELECT get_database_size_mb()),
      'checked_at', now()::text
    )
  );
  $$
);


-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================
-- After deploying this migration and updating Vault secrets, verify that
-- everything is working:
--
-- 1. Check that cron jobs are registered:
--      SELECT jobid, jobname, schedule, command FROM cron.job;
--
-- 2. Check job execution history (after waiting for a cycle):
--      SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- 3. Verify Vault secrets are set (should NOT show placeholder values):
--      SELECT name, description FROM vault.secrets
--      WHERE name IN ('project_url', 'anon_key');
--
-- 4. Verify FMI polling results:
--      SELECT * FROM ingestion_log
--      WHERE source = 'fmi'
--      ORDER BY created_at DESC LIMIT 5;
--
-- 5. Verify storage monitoring:
--      SELECT * FROM ingestion_log
--      WHERE source = 'system' AND status = 'storage_check'
--      ORDER BY created_at DESC LIMIT 5;
