---
phase: 01-data-pipeline
verified: 2026-02-17T00:00:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Deploy to Supabase and POST a real Ruuvi Station payload"
    expected: "Data appears in sensor_readings table within seconds; response is { ok: true, accepted: N, duplicates: 0, outliers: 0 }"
    why_human: "Requires live Supabase project, running Android app, and BLE-connected RuuviTags -- cannot verify network/app integration from codebase alone"
  - test: "Wait for pg_cron to trigger and check ingestion_log"
    expected: "ingestion_log contains a row with source='fmi', status='success', readings_count >= 1 within 10 minutes of deploying with correct Vault secrets"
    why_human: "Requires live Supabase project with pg_cron enabled, real Vault secrets, and clock-based scheduling -- cannot verify timing from codebase"
---

# Phase 1: Data Pipeline Verification Report

**Phase Goal:** Sensor data flows reliably from RuuviTags through the Android app into Supabase, and FMI weather data is polled automatically every 10 minutes -- the database accumulates data 24/7
**Verified:** 2026-02-17
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Ruuvi Station Android app can POST sensor readings to the ingest-sensors edge function and receive a success response | VERIFIED | `Deno.serve` HTTP POST handler exists in `ingest-sensors/index.ts` (line 70); returns `{ ok: true, accepted, duplicates, outliers }` (line 233) |
| 2  | Valid sensor readings are stored in sensor_readings with all fields (temperature, humidity, pressure, battery, RSSI, movement counter, TX power, accel, sequence, data format, sensor name, raw payload) | VERIFIED | All 15 fields mapped in reading record (lines 163-182 of `ingest-sensors/index.ts`); schema defines all columns (lines 44-60 of `001_schema.sql`) |
| 3  | Duplicate readings (same MAC + timestamp) are rejected silently -- success response returned, no duplicate row, duplicate logged | VERIFIED | Unique index `idx_sensor_readings_dedup ON sensor_readings (mac_address, measured_at)` (line 66-67 of `001_schema.sql`); error code 23505 caught, `duplicates++` (lines 190-194 of `ingest-sensors/index.ts`); `duplicates_count` in ingestion_log insert (line 227) |
| 4  | Outlier readings (values outside physical ranges) are stored but flagged with is_outlier=true and outlier_reason | VERIFIED | Four range checks defined (lines 48-53); `is_outlier: outlierResult.isOutlier` and `outlier_reason: outlierResult.reason` included in insert (lines 179-180); insert is NOT skipped for outliers |
| 5  | New/unknown RuuviTags are accepted automatically -- any MAC address can submit readings | VERIFIED | Auto-registration block queries `sensor_config` and inserts new entry if MAC absent (lines 200-216 of `ingest-sensors/index.ts`); no MAC whitelist check before insert |
| 6  | Rate limiting prevents abuse (60 req/min per deviceId) | VERIFIED | `rateLimitMap` Map with 60/min per `deviceId` window (lines 20-36); returns 429 with ingestion_log entry on limit breach (lines 122-131) |
| 7  | FMI weather observations for Helsinki-Vantaa airport (FMISID 100968) are fetched, parsed, and stored | VERIFIED | `FMI_URL` includes `fmisid=100968&timestep=10` (lines 17-20 of `poll-fmi/index.ts`); `upsert` to `weather_observations` with all 13 column fields (lines 354-371) |
| 8  | All 13 FMI parameters are extracted and stored in their respective columns | VERIFIED | `FMI_PARAM_TO_COLUMN` maps all 13 params (t2m, ws_10min, wg_10min, wd_10min, rh, td, r_1h, ri_10min, snow_aws, p_sea, vis, n_man, wawa) to correct DB columns (lines 33-47); positional extraction at lines 218-221 |
| 9  | NaN values in FMI response are stored as NULL | VERIFIED | `parseFmiValue()` uses `Number.isNaN(parsed) ? null : parsed` (lines 70-73 of `poll-fmi/index.ts`); called for every value in extraction loop (line 220) |
| 10 | Duplicate FMI observations (same fmisid + observed_at) are handled without error | VERIFIED | `upsert` with `ignoreDuplicates: true` and `onConflict: "fmisid,observed_at"` (lines 378-381); backed by `idx_weather_obs_dedup ON weather_observations (fmisid, observed_at)` (lines 99-100 of `001_schema.sql`) |
| 11 | Failed FMI fetches are logged to ingestion_log with source='fmi' and status='error' | VERIFIED | Three distinct failure paths all log to ingestion_log with `source: 'fmi', status: 'error'`: fetch error (lines 264-271), HTTP error (lines 290-295), insert error (lines 385-392), and outer catch (lines 432-437) |
| 12 | pg_cron job invokes the poll-fmi edge function every 10 minutes via pg_net | VERIFIED | `cron.schedule('poll-fmi-weather', '*/10 * * * *', ...)` with `net.http_post(url || '/functions/v1/poll-fmi', ...)` (lines 79-94 of `003_cron_jobs.sql`) |
| 13 | FMI polling prevents 7-day Supabase project pause | VERIFIED | Explicitly documented as double-duty in comments (lines 69-72 of `003_cron_jobs.sql`): "This job also serves as the Supabase project keep-alive mechanism" |
| 14 | A daily pg_cron job creates next month's partitions for both sensor_readings and weather_observations | VERIFIED | `cron.schedule('create-monthly-partitions', '0 3 * * *', ...)` creates current + next month partitions for both tables (lines 111-120 of `003_cron_jobs.sql`) |
| 15 | Database storage size is queryable via get_database_size_mb() | VERIFIED | Function defined at lines 51-56 of `002_functions.sql`; called in daily storage monitoring cron job (line 142 of `003_cron_jobs.sql`) |

**Score:** 15/15 truths verified

---

## Required Artifacts

| Artifact | Expected | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Status |
|----------|----------|----------------|---------------------|----------------|--------|
| `supabase/migrations/001_schema.sql` | All 4 DB tables with partitions, indexes, constraints | YES (159 lines) | Full schema -- sensor_config, sensor_readings (partitioned), weather_observations (partitioned), ingestion_log, DEFAULT partitions, Feb/Mar 2026 partitions, all unique dedup indexes | Referenced by 002, 003; used by both edge functions via Supabase client | VERIFIED |
| `supabase/migrations/002_functions.sql` | create_monthly_partition(), get_database_size_mb(), get_table_sizes() | YES (77 lines) | All 3 functions defined; create_monthly_partition uses `CREATE TABLE IF NOT EXISTS` (idempotent) | Called in 003_cron_jobs.sql cron job and available to dashboard in Phase 2 | VERIFIED |
| `supabase/functions/ingest-sensors/index.ts` | HTTP POST handler for Ruuvi Station | YES (257 lines) | Full implementation: CORS, method check, auth, rate limiting, tag processing loop, outlier detection, dedup handling, auto-registration, ingestion logging, error handling | `Deno.serve` registered; inserts to sensor_readings and ingestion_log via supabase client | VERIFIED |
| `supabase/seed.sql` | Initial sensor_config entries for 4 sensors | YES (19 lines) | 4 INSERT rows with placeholder MACs, display_name, room_name, and notes | Standalone seed data; applied once at project init | VERIFIED |
| `supabase/functions/poll-fmi/index.ts` | FMI weather observation fetcher and XML parser | YES (447 lines, min_lines: 80) | Full implementation: CORS, timeout fetch, XMLParser with removeNSPrefix, deepGet helper, positions+values extraction, NaN handling, 20-min filter, upsert with dedup, success/error ingestion logging | `Deno.serve` registered; upserts to weather_observations and logs to ingestion_log | VERIFIED |
| `supabase/migrations/003_cron_jobs.sql` | pg_cron schedules for FMI polling, partition maintenance, Vault secrets | YES (175 lines) | pg_cron and pg_net extensions enabled; 2 Vault secrets with placeholders + update instructions; 3 named cron jobs; verification queries documented | `cron.schedule` wires to poll-fmi via net.http_post; `create_monthly_partition` called from cron | VERIFIED |

---

## Key Link Verification

### Plan 01-01 Key Links

| From | To | Via | Pattern | Status | Evidence |
|------|----|-----|---------|--------|----------|
| `ingest-sensors/index.ts` | sensor_readings table | `supabase.from('sensor_readings').insert()` | `from.*sensor_readings.*insert` | WIRED | Line 185: `await supabase.from("sensor_readings").insert(reading)` |
| `ingest-sensors/index.ts` | ingestion_log table | `supabase.from('ingestion_log').insert()` | `from.*ingestion_log.*insert` | WIRED | Lines 122-127, 221-229, 243-246 -- three distinct insert paths |
| `001_schema.sql` | sensor_readings table | UNIQUE INDEX for deduplication | `idx_sensor_readings_dedup` | WIRED | Lines 66-67: `CREATE UNIQUE INDEX idx_sensor_readings_dedup ON sensor_readings (mac_address, measured_at)` |

### Plan 01-02 Key Links

| From | To | Via | Pattern | Status | Evidence |
|------|----|-----|---------|--------|----------|
| `poll-fmi/index.ts` | weather_observations table | `supabase.from('weather_observations').upsert()` | `from.*weather_observations.*(insert\|upsert)` | WIRED | Lines 376-382: `supabase.from("weather_observations").upsert(rows, { onConflict: "fmisid,observed_at", ignoreDuplicates: true })` |
| `poll-fmi/index.ts` | ingestion_log table | `supabase.from('ingestion_log').insert()` on success and failure | `from.*ingestion_log.*insert` | WIRED | Lines 264-271, 290-295, 329-341, 385-392, 408-419, 432-437 -- all error and success paths log |
| `003_cron_jobs.sql` | `poll-fmi/index.ts` | pg_net HTTP POST to edge function URL | `net.http_post` | WIRED | Lines 83-92: `SELECT net.http_post(url := ... \|\| '/functions/v1/poll-fmi', ...)` |
| `003_cron_jobs.sql` | create_monthly_partition function | pg_cron daily job calls partition function | `create_monthly_partition` | WIRED | Lines 115-118: four `SELECT create_monthly_partition(...)` calls in daily cron body |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PIPE-01 | 01-01 | Supabase edge function receives HTTP POST from Ruuvi Station and stores sensor readings | SATISFIED | `ingest-sensors/index.ts` accepts POST; inserts to `sensor_readings`; returns 200 with `{ ok: true, accepted, ... }` |
| PIPE-02 | 01-01 | Edge function validates incoming sensor data (realistic ranges, deduplication) | SATISFIED | Outlier detection via 4 range checks; dedup via unique constraint + 23505 catch; required field validation (`macAddress`, `measuredAt`). NOTE: design accepts unknown MACs via auto-registration rather than rejecting them -- this is intentional and documented |
| PIPE-03 | 01-02 | FMI API polled on schedule via pg_cron + pg_net (every 10 min) and stored | SATISFIED | `003_cron_jobs.sql` line 80: `'*/10 * * * *'`; `net.http_post` to `/functions/v1/poll-fmi`; `poll-fmi/index.ts` stores via upsert |
| PIPE-04 | 01-02 | FMI XML/GML response parsed correctly for Helsinki-Vantaa airport (FMISID 100968) | SATISFIED | `FMI_URL` contains `fmisid=100968`; `FMI_PARAM_TO_COLUMN` maps all 13 parameters; `extractObservations()` parses positions and doubleOrNilReasonTupleList with defensive deepGet helper |
| PIPE-05 | 01-02 | Database storage usage monitored and displayed on dashboard | SATISFIED (infrastructure only -- display is Phase 2) | `get_database_size_mb()` function in `002_functions.sql`; daily `log-storage-usage` cron job inserts to `ingestion_log` with `database_size_mb` field; Phase 2 dashboard will query this |
| PIPE-06 | 01-02 | Supabase project kept alive (prevent 7-day inactivity pause) | SATISFIED | FMI polling every 10 minutes provides continuous database activity; explicitly documented as keep-alive in `003_cron_jobs.sql` comments (lines 69-72) |

All 6 Phase 1 requirements are accounted for. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `supabase/migrations/003_cron_jobs.sql` lines 52, 57 | Vault placeholder values `YOUR_PROJECT_REF`, `YOUR_ANON_KEY` | INFO | Intentional -- plan spec requires placeholder values with instructions. User must update after deployment. Clear update instructions provided at lines 29-49. Cron jobs will fail silently until updated, but this is expected pre-deployment state. |
| `supabase/seed.sql` lines 15-18 | Placeholder MAC addresses `XX:XX:XX:XX:XX:01..04` | INFO | Intentional -- plan spec requires placeholder MACs with instructions. Auto-registration will create correct entries on first real POST, making the seed entries redundant but harmless. |

No blocker anti-patterns. No stub implementations. No empty handlers.

---

## Human Verification Required

### 1. End-to-End Ruuvi Station POST

**Test:** Configure Ruuvi Station Android app to forward data to the deployed Supabase edge function URL (`https://YOUR_PROJECT_REF.supabase.co/functions/v1/ingest-sensors`) with the anon key as Authorization Bearer token. Trigger a scan.
**Expected:** Within seconds, a row appears in `sensor_readings`. The response is `{ ok: true, accepted: N, duplicates: 0, outliers: 0 }`. A corresponding row in `ingestion_log` shows `source='ruuvi', status='success', readings_count=N`.
**Why human:** Requires a deployed Supabase project, a real Android phone running Ruuvi Station, and BLE-connected RuuviTags. The app-to-edge-function network path, Ruuvi Station's exact payload format, and Android BLE connection cannot be verified from code alone.

### 2. FMI pg_cron Automatic Polling

**Test:** Deploy migrations (including 003_cron_jobs.sql) to a live Supabase project. Update Vault secrets with real project URL and anon key. Wait up to 10 minutes.
**Expected:** `SELECT * FROM ingestion_log WHERE source='fmi' ORDER BY created_at DESC LIMIT 3;` returns rows with `status='success'` and `readings_count >= 1`. `SELECT COUNT(*) FROM weather_observations;` returns a positive count.
**Why human:** Requires a live Supabase project with pg_cron and pg_net enabled, correctly set Vault secrets, real FMI API reachability, and clock-based scheduling. Cannot simulate pg_cron execution from code.

---

## Gaps Summary

No gaps found. All 15 observable truths verified against the actual codebase. All 6 artifacts exist, are substantive (no stubs), and are correctly wired. All 6 Phase 1 requirements (PIPE-01 through PIPE-06) are satisfied by the implementation.

Two items flagged for human verification require a live Supabase deployment and real hardware -- they are integration concerns that cannot be verified from code inspection alone, not gaps in the implementation.

The two INFO-level placeholder patterns (Vault secrets, seed MACs) are by design and match the plan specification exactly.

---

## Commit Verification

All commits documented in SUMMARY files verified in git log:

| Commit | Message | Plan |
|--------|---------|------|
| `f0665b9` | feat(01-01): database schema, utility functions, and seed data | 01-01 |
| `5399b65` | feat(01-01): Ruuvi sensor ingestion edge function | 01-01 |
| `feba716` | feat(01-02): FMI weather polling edge function | 01-02 |
| `cd44714` | feat(01-02): pg_cron scheduled jobs and Vault secrets | 01-02 |

---

_Verified: 2026-02-17_
_Verifier: Claude (gsd-verifier)_
