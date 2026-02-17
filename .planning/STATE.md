# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.
**Current focus:** Phase 2: Live Dashboard

## Current Position

Phase: 2 of 3 (Live Dashboard)
Plan: 1 of 2 in current phase
Status: Executing Phase 02
Last activity: 2026-02-17 -- Completed 02-01 (Live Dashboard Core)

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5min
- Total execution time: 0.23 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 2 | 6min | 3min |
| 02-live-dashboard | 1 | 8min | 8min |

**Recent Trend:**
- Last 5 plans: 01-01 (3min), 01-02 (3min), 02-01 (8min)
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
- [02-01]: Scaffolded in temp dir then copied to avoid create-next-app conflicts with existing dirs
- [02-01]: @dnd-kit installed with --legacy-peer-deps for React 19 compatibility
- [02-01]: force-dynamic on page.tsx for per-request Supabase queries
- [02-01]: WMO 4680 wawa code as primary weather condition source with cloud cover fallback
- [02-01]: Comfort colors: emerald=comfortable, amber=dry, orange=humid, red=very humid
- [02-01]: Pressure conversion at display time via sensorPressureToHpa() (Pa / 100)
- [02-01]: RealtimeProvider uses render props pattern for live data propagation
- [02-01]: Mobile weather panel collapsed by default

### Pending Todos

None yet.

### Blockers/Concerns

- Ruuvi Station Android payload format needs verification against actual POST (field names uncertain)
- FMI XML/GML response parsing needs testing with real FMISID 100968 responses before finalizing parser
- Vault secrets must be updated with real Supabase project URL and anon key before cron jobs will work

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 02-01-PLAN.md
Resume file: .planning/phases/02-live-dashboard/02-01-SUMMARY.md
