# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.
**Current focus:** Phase 1: Data Pipeline

## Current Position

Phase: 1 of 3 (Data Pipeline)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-02-17 -- Completed 01-01 (Schema and Sensor Ingestion)

Progress: [██░░░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3min
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 1 | 3min | 3min |

**Recent Trend:**
- Last 5 plans: 01-01 (3min)
- Trend: -

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

### Pending Todos

None yet.

### Blockers/Concerns

- Ruuvi Station Android payload format needs verification against actual POST (field names uncertain)
- FMI XML/GML response parsing needs testing with real FMISID 100968 responses before finalizing parser
- Supabase monthly partition automation needed before 2026-03-01

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 01-01-PLAN.md
Resume file: .planning/phases/01-data-pipeline/01-01-SUMMARY.md
