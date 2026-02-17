# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.
**Current focus:** Phase 1: Data Pipeline

## Current Position

Phase: 1 of 3 (Data Pipeline)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-02-17 -- Phase 1 context gathered

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
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

### Pending Todos

None yet.

### Blockers/Concerns

- Ruuvi Station Android payload format needs verification against actual POST (field names uncertain)
- FMI XML/GML response parsing needs testing with real FMISID 100968 responses before finalizing parser
- Supabase monthly partition automation needed before 2026-03-01

## Session Continuity

Last session: 2026-02-17
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-data-pipeline/01-CONTEXT.md
