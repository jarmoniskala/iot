---
phase: 01-data-pipeline
plan: 02
subsystem: database
tags: [supabase, deno, edge-functions, fmi, weather-api, xml-parsing, pg_cron, pg_net, vault, scheduling]

# Dependency graph
requires:
  - phase: 01-01
    provides: "weather_observations table, ingestion_log table, create_monthly_partition() function, get_database_size_mb() function"
provides:
  - "poll-fmi edge function that fetches, parses, and stores FMI weather observations"
  - "pg_cron job for FMI polling every 10 minutes (also serves as keep-alive)"
  - "pg_cron job for daily partition creation (both sensor_readings and weather_observations)"
  - "pg_cron job for daily storage monitoring logged to ingestion_log"
  - "Vault secrets for secure pg_net edge function invocation"
affects: [02-dashboard, 03-health]

# Tech tracking
tech-stack:
  added: ["fast-xml-parser@4.4.1 (npm import in Deno)", "pg_cron scheduling", "pg_net HTTP invocation", "Supabase Vault for secrets"]
  patterns: ["FMI WFS XML parsing with namespace stripping", "pg_cron + pg_net -> Edge Function invocation pattern", "Vault-based secret management for cron jobs"]

key-files:
  created:
    - "supabase/functions/poll-fmi/index.ts"
    - "supabase/migrations/003_cron_jobs.sql"
  modified: []

key-decisions:
  - "FMI XML parsed with fast-xml-parser removeNSPrefix:true and deepGet helper for defensive nested access"
  - "Only last 20 minutes of FMI observations inserted per poll (not full 12-hour response)"
  - "Deduplication via Supabase upsert with ignoreDuplicates (ON CONFLICT DO NOTHING on fmisid, observed_at)"
  - "FMI polling doubles as Supabase keep-alive -- no separate keep-alive mechanism needed"
  - "Vault secrets use placeholder values requiring manual update after deployment"
  - "Storage monitoring logged as source='system', status='storage_check' to avoid interfering with FMI/Ruuvi log queries"

patterns-established:
  - "FMI XML parsing: extract positions (timestamps) and doubleOrNilReasonTupleList (values) separately, zip by index, map NaN to null"
  - "pg_cron scheduling: named jobs with cron expressions, pg_net for HTTP calls, Vault for auth tokens"
  - "Edge Function invocation from database: pg_cron -> pg_net -> Edge Function URL with Bearer auth from Vault"

requirements-completed: [PIPE-03, PIPE-04, PIPE-05, PIPE-06]

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 1 Plan 2: FMI Weather Polling and Cron Jobs Summary

**FMI weather observation polling via Deno edge function with fast-xml-parser, plus pg_cron scheduling for automated FMI polling, partition creation, and storage monitoring using Vault-secured pg_net invocation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T19:40:53Z
- **Completed:** 2026-02-17T19:43:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- FMI weather polling edge function that fetches WFS XML, parses all 13 weather parameters, handles NaN as NULL, filters to recent observations only, deduplicates, and logs results
- Three pg_cron scheduled jobs: FMI polling every 10 minutes (doubles as keep-alive), daily partition creation for both partitioned tables, and daily storage monitoring
- Vault secrets setup for secure edge function invocation from pg_net without hardcoded API keys

## Task Commits

Each task was committed atomically:

1. **Task 1: FMI weather polling edge function** - `feba716` (feat)
2. **Task 2: pg_cron scheduled jobs and Vault secrets** - `cd44714` (feat)

## Files Created/Modified
- `supabase/functions/poll-fmi/index.ts` - Deno edge function that fetches FMI WFS XML for Helsinki-Vantaa airport (FMISID 100968), parses 13 weather parameters with fast-xml-parser, converts NaN to null, inserts recent observations with deduplication, and logs to ingestion_log
- `supabase/migrations/003_cron_jobs.sql` - pg_cron and pg_net extensions, Vault secrets with placeholder values, three scheduled jobs (FMI polling, partition creation, storage monitoring), and verification query documentation

## Decisions Made
- FMI XML parsed with `removeNSPrefix: true` and a `deepGet()` helper function for defensive navigation through deeply nested XML-to-JSON structure, with array unwrapping for inconsistent single-element handling
- Only observations from the last 20 minutes are inserted per poll cycle, preventing re-insertion of the full 12-hour history FMI returns by default
- Deduplication uses Supabase JS client `upsert` with `ignoreDuplicates: true` which translates to `ON CONFLICT (fmisid, observed_at) DO NOTHING`
- FMI polling every 10 minutes provides continuous database activity, eliminating the need for a separate Supabase keep-alive mechanism
- Vault secrets are created with obvious placeholder values (`YOUR_PROJECT_REF`, `YOUR_ANON_KEY`) with clear instructions to find real values at Supabase Dashboard -> Settings -> API
- Storage monitoring uses `source='system'` and `status='storage_check'` to differentiate from ingestion log entries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

After deploying migrations to Supabase, the user must update Vault secrets with actual project values:
1. Navigate to Supabase Dashboard -> Settings -> API
2. Copy "Project URL" and "anon / public" key
3. Update Vault secrets via SQL editor:
   - `UPDATE vault.secrets SET secret = 'https://your-project.supabase.co' WHERE name = 'project_url';`
   - `UPDATE vault.secrets SET secret = 'your-actual-anon-key' WHERE name = 'anon_key';`
4. Verify with: `SELECT jobid, jobname, schedule FROM cron.job;`

## Next Phase Readiness
- Phase 1 data pipeline is complete: both sensor ingestion and weather polling edge functions are ready
- pg_cron provides autonomous operation once deployed: FMI polling, partition management, storage monitoring
- The Phase 2 dashboard can query weather_observations, sensor_readings, ingestion_log, and storage check logs
- Phase 3 health view can query ingestion_log for FMI success/failure rates

## Self-Check: PASSED

All 2 created files verified on disk. Both task commits (feba716, cd44714) verified in git log. poll-fmi/index.ts is 447 lines (min_lines: 80 satisfied). 003_cron_jobs.sql contains `cron.schedule` and `net.http_post` as required.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-17*
