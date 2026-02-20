---
phase: 03-history-and-health
plan: 02
subsystem: ui, database
tags: [tanstack-react-table, recharts, postgresql, health-monitoring, severity, battery, rssi, sensor-health]

requires:
  - phase: 03-history-and-health
    plan: 01
    provides: "Navigation component, recharts dependency, history SQL patterns (LAG window function, CTE gap detection)"
  - phase: 02-live-dashboard
    provides: "Room card component, staleness utilities, Supabase client/server wrappers, shadcn/ui table component"
  - phase: 01-data-pipeline
    provides: "sensor_readings table with battery_voltage, rssi, movement_counter, is_outlier columns; sensor_config table"
provides:
  - "Health page at /health with @tanstack/react-table sortable/expandable table"
  - "PostgreSQL functions: get_sensor_health (uptime, gaps, latest readings), get_sensor_health_trend (battery/RSSI time series)"
  - "Health query layer: fetchSensorHealth, fetchSensorHealthTrend, getSeverity"
  - "Types: SensorHealth, SensorHealthTrend, SeverityLevel"
  - "Components: HealthClient, HealthTable, HealthRowDetail, SeverityBadge"
  - "Dashboard room card health warning icons linking to /health"
affects: []

tech-stack:
  added: []
  patterns: [severity-based-row-coloring, expandable-table-rows-with-lazy-fetch, cte-based-health-aggregation]

key-files:
  created:
    - supabase/migrations/007_health_functions.sql
    - app/health/page.tsx
    - components/health/health-client.tsx
    - components/health/health-table.tsx
    - components/health/health-row-detail.tsx
    - components/health/severity-badge.tsx
    - lib/queries/health.ts
  modified:
    - lib/types.ts
    - components/dashboard/room-card.tsx

key-decisions:
  - "Migration numbered 007 (006 already taken by history functions from plan 03-01)"
  - "BatteryWarning icon replaces BatteryLow for dashboard warnings (more visually distinct)"
  - "Stale data warning uses animate-pulse for critical attention; low battery does not animate"
  - "Expandable row trend data fetched lazily on expand with fetchedRef to prevent re-fetches"
  - "Custom sort function prioritizes severity (critical > warning > healthy) then alphabetical"

patterns-established:
  - "Severity classification: Pure function mapping sensor health data to healthy/warning/critical"
  - "Lazy-fetch expandable rows: useRef guard prevents duplicate RPC calls on re-expand"
  - "Health warning links: Always-visible icons on room cards linking to dedicated health page"

requirements-completed: [HLTH-01, HLTH-02, HLTH-03, HLTH-04]

duration: 4min
completed: 2026-02-18
---

# Phase 3 Plan 2: Sensor Health Dashboard Summary

**Sortable/expandable health table with severity indicators, battery/RSSI trend charts, uptime tracking, and dashboard warning icons linking to /health**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T18:25:30Z
- **Completed:** 2026-02-18T18:29:09Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- PostgreSQL functions for per-sensor health summary (uptime %, gap minutes, latest readings) and trend data (battery voltage, RSSI over 7 days)
- Full health page with @tanstack/react-table featuring sortable columns, severity-based row coloring (green/amber/red), and expandable rows with lazy-fetched 7-day trend mini-charts
- Severity classification system: critical (stale or low battery), warning (low uptime or borderline battery), healthy
- Dashboard room cards gain warning icons (BatteryWarning, AlertTriangle) that link directly to /health page

## Task Commits

Each task was committed atomically:

1. **Task 1: Health database function, query layer, types, and health page with sortable expandable table** - `0483116` (feat)
2. **Task 2: Dashboard health warning icons linking to health page** - `f766ebd` (feat)

## Files Created/Modified

- `supabase/migrations/007_health_functions.sql` - PostgreSQL functions: get_sensor_health (CTE-based per-sensor health summary) and get_sensor_health_trend (raw battery/RSSI readings)
- `app/health/page.tsx` - Server component fetching 24h health data via Supabase RPC
- `components/health/health-client.tsx` - Client wrapper with page header and HealthTable
- `components/health/health-table.tsx` - @tanstack/react-table with sorting, expansion, severity row coloring, sort indicators
- `components/health/health-row-detail.tsx` - Expandable row with lazy-fetched 7-day battery voltage and RSSI trend AreaCharts
- `components/health/severity-badge.tsx` - Color-coded severity pill (healthy/warning/critical)
- `lib/queries/health.ts` - Supabase RPC wrappers and getSeverity pure function
- `lib/types.ts` - Added SensorHealth, SensorHealthTrend, SeverityLevel types
- `components/dashboard/room-card.tsx` - Added BatteryWarning and AlertTriangle icons wrapped in Links to /health

## Decisions Made

- **Migration numbering:** Used 007 instead of plan's 006 because 006_history_functions.sql already existed from plan 03-01
- **BatteryWarning over BatteryLow:** Switched to BatteryWarning icon from lucide-react for dashboard cards (more visually distinct warning indicator)
- **Pulse animation only for stale:** Only the stale data AlertTriangle uses animate-pulse; low battery warning is static to differentiate severity levels
- **Lazy fetch with ref guard:** HealthRowDetail uses useRef to prevent duplicate trend data fetches when rows are re-expanded within the same component lifecycle
- **Severity-first sorting:** Custom sort function puts critical sensors at top regardless of name, then warning, then healthy within each group

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file numbering conflict**
- **Found during:** Task 1 (Database functions)
- **Issue:** Plan specified 006_health_functions.sql but 006_history_functions.sql already existed from plan 03-01
- **Fix:** Named migration 007_health_functions.sql instead
- **Files modified:** supabase/migrations/007_health_functions.sql
- **Verification:** File created, both SQL functions defined correctly
- **Committed in:** 0483116 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration renumbering was necessary to avoid conflict. No scope creep.

## Issues Encountered

None - all dependencies already installed (@tanstack/react-table, recharts, date-fns), TypeScript compiled cleanly, Next.js build succeeded on first attempt.

## User Setup Required

None - no external service configuration required. Migration 007 must be applied to Supabase when deploying.

## Next Phase Readiness

- All three pages (Dashboard, History, Health) fully functional and accessible via global Navigation
- Phase 3 complete: all HIST and HLTH requirements satisfied
- Application ready for deployment verification and testing with real Supabase data

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (0483116, f766ebd) verified in git log.

---
*Phase: 03-history-and-health*
*Completed: 2026-02-18*
