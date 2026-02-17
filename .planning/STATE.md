# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.
**Current focus:** Phase 1: Data Pipeline

## Current Position

Phase: 1 of 3 (Data Pipeline)
Plan: 2 of 2 in current phase (PHASE COMPLETE)
Status: Phase 01 Complete
Last activity: 2026-02-17 -- Completed 01-02 (FMI Weather Polling and Cron Jobs)

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 3min
- Total execution time: 0.10 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 2 | 6min | 3min |

**Recent Trend:**
- Last 5 plans: 01-01 (3min), 01-02 (3min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: FMI polling via pg_cron + pg_net inside Supabase (not Vercel cron -- Hobby tier limits to daily)
- [Roadmap]: Computed comfort metrics (dew point, humidity, comfort class) grouped with live dashboard, not a separate phase
- [Context]: FMI parsing via Supabase Edge Function (not pg_net inside database)
- [Context]: Store all available sensor fields + raw JSON payload
- [Context]: Sensor config table with timestamp-based assignment history (supports repurposing and replacement)
- [Context]: Staleness = 3 missed update cycles, not absolute time
- [01-01]: Pressure stored in Pascals as received from Ruuvi Station (no conversion)
- [01-01]: Outlier detection: 4 range checks (temp, humidity, pressure, voltage)
- [01-01]: Rate limiting at 60 req/min per deviceId (in-memory Map)
- [01-01]: Auth via Bearer token matching Supabase anon key
- [01-01]: Duplicate handling via unique constraint violation (23505) - silent rejection
- [01-01]: Auto-register unknown MACs with display_name from tag.name
- [01-01]: Status-only response format: { ok, accepted, duplicates, outliers }
- [01-02]: FMI XML parsed with fast-xml-parser removeNSPrefix:true and deepGet helper for defensive nested access
- [01-02]: Only last 20 minutes of FMI observations inserted per poll (not full 12-hour response)
- [01-02]: Deduplication via Supabase upsert with ignoreDuplicates (ON CONFLICT DO NOTHING)
- [01-02]: FMI polling doubles as Supabase keep-alive -- no separate mechanism needed
- [01-02]: Vault secrets use placeholder values requiring manual update after deployment
- [01-02]: Storage monitoring logged as source='system', status='storage_check'

### Pending Todos

None yet.

### Blockers/Concerns

- Ruuvi Station Android payload format needs verification against actual POST (field names uncertain)
- FMI XML/GML response parsing needs testing with real FMISID 100968 responses before finalizing parser
- Vault secrets must be updated with real Supabase project URL and anon key before cron jobs will work

## Session Continuity

Last session: 2026-02-17
Stopped at: Phase 2 context gathered
Resume file: .planning/phases/02-live-dashboard/02-CONTEXT.md
