---
phase: 01-data-pipeline
plan: 01
subsystem: database
tags: [supabase, postgresql, partitioning, edge-functions, deno, ruuvitag, sensor-ingestion]

# Dependency graph
requires: []
provides:
  - "sensor_config table with MAC-to-room mapping and assignment history"
  - "sensor_readings partitioned table with all RuuviTag fields and dedup index"
  - "weather_observations partitioned table with 13 FMI parameters and dedup index"
  - "ingestion_log table for metrics and error tracking"
  - "create_monthly_partition() idempotent partition creation function"
  - "get_database_size_mb() and get_table_sizes() storage monitoring functions"
  - "ingest-sensors edge function for Ruuvi Station HTTP POST ingestion"
  - "Seed data for 4 initial sensor configurations"
affects: [01-02, 02-dashboard, 03-health]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@2 (npm import in Deno)", "PostgreSQL range partitioning"]
  patterns: ["Supabase Edge Function with Deno.serve handler", "In-memory rate limiting with Map", "Range-based outlier detection", "Unique constraint deduplication with silent error handling", "Auto-registration of unknown sensors"]

key-files:
  created:
    - "supabase/migrations/001_schema.sql"
    - "supabase/migrations/002_functions.sql"
    - "supabase/seed.sql"
    - "supabase/functions/ingest-sensors/index.ts"
  modified: []

key-decisions:
  - "Pressure stored in Pascals as received from Ruuvi Station (no conversion)"
  - "Outlier detection uses 4 range checks: temperature (-40 to 60C), humidity (0-100%), pressure (50000-115000 Pa), voltage (1.6-3.65V)"
  - "Rate limiting at 60 req/min per deviceId using in-memory Map (resets on cold start)"
  - "Auth via Bearer token matching Supabase anon key"
  - "Duplicate handling via Postgres unique constraint violation (code 23505) - silent rejection"
  - "Auto-register unknown MACs with display_name from tag.name or 'Unknown Sensor'"
  - "Status-only response format: { ok, accepted, duplicates, outliers }"

patterns-established:
  - "Edge Function pattern: CORS -> method check -> auth -> rate limit -> process -> log -> respond"
  - "Partitioned table pattern: parent + DEFAULT + monthly children, with idempotent creation function"
  - "Ingestion logging pattern: every request logged with source, status, counts, and JSONB details"

requirements-completed: [PIPE-01, PIPE-02]

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 1 Plan 1: Schema and Sensor Ingestion Summary

**Monthly-partitioned PostgreSQL schema for sensor readings and weather observations, plus Deno edge function handling Ruuvi Station ingestion with validation, dedup, outlier detection, rate limiting, and auto-registration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T19:35:51Z
- **Completed:** 2026-02-17T19:38:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Complete database schema with 4 tables (sensor_config, sensor_readings, weather_observations, ingestion_log) including monthly partitioning, deduplication indexes, and DEFAULT safety net partitions
- Database utility functions for idempotent partition creation and storage monitoring (Supabase 500MB free tier tracking)
- Full-featured Ruuvi sensor ingestion edge function with CORS, auth, rate limiting, outlier detection, duplicate handling, auto-registration, and ingestion logging
- Seed data for 4 initial sensor configurations with placeholder MAC addresses

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema and utility functions** - `f0665b9` (feat)
2. **Task 2: Ruuvi sensor ingestion edge function** - `5399b65` (feat)

## Files Created/Modified
- `supabase/migrations/001_schema.sql` - All 4 database tables with indexes, partitions, and constraints
- `supabase/migrations/002_functions.sql` - create_monthly_partition(), get_database_size_mb(), get_table_sizes()
- `supabase/seed.sql` - Initial sensor_config entries for 4 known RuuviTags
- `supabase/functions/ingest-sensors/index.ts` - HTTP POST handler for Ruuvi Station data forwarding

## Decisions Made
- Pressure stored in Pascals as received from Ruuvi Station app (no hPa conversion) -- consistent with raw data preservation philosophy
- Outlier detection uses first-failing-check approach: temperature, humidity, pressure, voltage ranges checked in order, first failure becomes outlier_reason
- Rate limiting uses in-memory Map that resets on Edge Function cold start -- acceptable for abuse prevention per research recommendation
- Authentication compares Bearer token to Supabase anon key (Ruuvi Station app sends the anon key)
- Auto-registration creates sensor_config entries with room_name=null for unknown MACs, preserving tag.name as display_name
- Response format is status-only ({ ok, accepted, duplicates, outliers }) per discretion recommendation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The Supabase project itself will need to be created and migrations applied during deployment, but that is handled in plan 01-02 (FMI polling and cron jobs).

## Next Phase Readiness
- Database schema is ready for plan 01-02 (FMI polling edge function, pg_cron scheduling, and Supabase deployment)
- weather_observations table and ingestion_log table are ready for the FMI polling function
- create_monthly_partition() function is ready for the daily pg_cron partition automation job
- Sensor ingestion endpoint is ready for testing once the Supabase project is deployed

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (f0665b9, 5399b65) verified in git log.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-17*
