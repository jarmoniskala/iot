---
phase: 03-history-and-health
plan: 01
subsystem: ui, database
tags: [recharts, area-chart, postgresql, time-series, zoom-pan, localStorage, date-fns]

requires:
  - phase: 02-live-dashboard
    provides: "Supabase client/server wrappers, sensor_config table, SensorConfig type, DarkModeToggle, shadcn/ui components"
  - phase: 01-data-pipeline
    provides: "sensor_readings table with measured_at, temperature, humidity, pressure columns and is_outlier flag"
provides:
  - "History page at /history with Recharts AreaChart, time range picker, room selector, gap visualization, summary stats"
  - "Global Navigation component with Dashboard/History/Health links"
  - "PostgreSQL functions: get_sensor_history, detect_gaps, get_summary_stats"
  - "Shared hooks: usePersistedState, useChartZoom"
  - "History query layer: fetchSensorHistory, fetchGaps, fetchSummaryStats, getBucketMinutes"
  - "Types: HistoryBucket, GapInterval, SummaryStatsRow, TimeRangePreset, TooltipMode, Metric"
  - "Constants: ROOM_COLOR_PALETTE, GAP_THRESHOLD_MINUTES"
affects: [03-02-health-dashboard]

tech-stack:
  added: [recharts, "@tanstack/react-table"]
  patterns: [time-bucketed-aggregation, localStorage-persistence, scroll-zoom-drag-pan, gradient-area-chart]

key-files:
  created:
    - supabase/migrations/006_history_functions.sql
    - app/history/page.tsx
    - components/navigation.tsx
    - components/history/history-client.tsx
    - components/history/trend-chart.tsx
    - components/history/time-range-picker.tsx
    - components/history/room-selector.tsx
    - components/history/summary-stats.tsx
    - components/history/chart-tooltip.tsx
    - components/history/gap-tooltip.tsx
    - lib/queries/history.ts
    - lib/hooks/use-chart-zoom.ts
    - lib/hooks/use-persisted-state.ts
  modified:
    - app/layout.tsx
    - components/dashboard/dashboard-client.tsx
    - lib/types.ts
    - lib/constants.ts

key-decisions:
  - "Migration numbered 006 instead of 005 (005 already existed for latest_weather view fix)"
  - "Dashboard header replaced by global Navigation component; SortControls moved to inline toolbar"
  - "Recharts tooltip props defined explicitly instead of extending TooltipProps (generic type issues)"
  - "Pressure conversion in SQL (Pa/100) consistent with Phase 2 display-time pattern"
  - "usePersistedState hydrates from localStorage in useEffect for SSR safety"

patterns-established:
  - "usePersistedState: Generic localStorage-backed state hook with SSR-safe hydration"
  - "useChartZoom: Focal-point scroll-to-zoom and drag-to-pan for any Recharts chart"
  - "History query layer: supabase.rpc() wrappers with getBucketMinutes auto-scaling"
  - "Global Navigation: Shared nav bar in layout.tsx, page-specific toolbars inline"

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04, HIST-05]

duration: 7min
completed: 2026-02-18
---

# Phase 3 Plan 1: History Trend Charts Summary

**Recharts area charts with time-bucketed PostgreSQL aggregation, zoom/pan interaction, gap visualization, room overlay comparison, and persisted state via localStorage**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T18:14:54Z
- **Completed:** 2026-02-18T18:22:30Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments

- PostgreSQL functions for time-bucketed aggregation (get_sensor_history), gap detection (detect_gaps), and summary stats (get_summary_stats) with Pa-to-hPa pressure conversion
- Full history page with smooth gradient area charts, metric tabs (temperature/humidity/pressure), time range presets (24h/7d/30d/Custom), and room toggle overlay
- Scroll-to-zoom (focal-point) and drag-to-pan interaction via custom useChartZoom hook
- Data gap visualization as dashed shaded reference areas with hover tooltips showing offline duration
- Global Navigation component replacing per-page headers, with Dashboard/History/Health links
- localStorage persistence for metric, time range, and room selection via usePersistedState hook

## Task Commits

Each task was committed atomically:

1. **Task 1: Database functions, dependencies, navigation, shared hooks, and query layer** - `325092d` (feat)
2. **Task 2: History page with trend chart, time range controls, room selector, gap visualization, and summary stats** - `128ef12` (feat)

## Files Created/Modified

- `supabase/migrations/006_history_functions.sql` - PostgreSQL functions for time-bucketed aggregation, gap detection, and summary stats
- `app/history/page.tsx` - Server component fetching default 24h data
- `components/navigation.tsx` - Global nav bar with Dashboard/History/Health links and DarkModeToggle
- `components/history/history-client.tsx` - Client wrapper managing metric, time range, rooms, tooltip mode state
- `components/history/trend-chart.tsx` - Recharts AreaChart with gradient fills, gap ReferenceAreas, zoom/pan
- `components/history/time-range-picker.tsx` - Pill buttons (24h/7d/30d/Custom) + calendar date picker popover
- `components/history/room-selector.tsx` - Room toggle buttons with colored dots
- `components/history/summary-stats.tsx` - Min/max/avg stat cards per selected room
- `components/history/chart-tooltip.tsx` - Custom Recharts tooltip with shared/single mode
- `components/history/gap-tooltip.tsx` - Absolute-positioned tooltip for gap ReferenceArea hover
- `lib/queries/history.ts` - Supabase RPC wrappers for history functions
- `lib/hooks/use-chart-zoom.ts` - Scroll-to-zoom and drag-to-pan hook
- `lib/hooks/use-persisted-state.ts` - localStorage-backed React state hook
- `app/layout.tsx` - Added global Navigation component
- `components/dashboard/dashboard-client.tsx` - Removed duplicate header, kept SortControls inline
- `lib/types.ts` - Added HistoryBucket, GapInterval, SummaryStatsRow, TimeRangePreset, TooltipMode, Metric
- `lib/constants.ts` - Added ROOM_COLOR_PALETTE and GAP_THRESHOLD_MINUTES

## Decisions Made

- **Migration numbering:** Used 006 instead of plan's 005 because 005_fix_latest_weather_view.sql already existed (pre-existing from Phase 2)
- **Dashboard header consolidation:** Removed dashboard-client.tsx header; global Navigation now owns title, nav links, and DarkModeToggle. Dashboard's SortControls remain as inline toolbar.
- **Recharts tooltip typing:** Defined PayloadEntry interface explicitly instead of extending recharts' TooltipProps generic (TypeScript compilation issue with complex recharts generics)
- **Pressure conversion in SQL:** Pa/100.0 conversion done in all three SQL functions, consistent with established pattern of storing Pa and converting at display time
- **SSR-safe persistence:** usePersistedState initializes with defaultValue on server, hydrates from localStorage in useEffect to avoid hydration mismatches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file numbering conflict**
- **Found during:** Task 1 (Database functions)
- **Issue:** Plan specified 005_history_functions.sql but 005_fix_latest_weather_view.sql already existed
- **Fix:** Named migration 006_history_functions.sql instead
- **Files modified:** supabase/migrations/006_history_functions.sql
- **Verification:** File created, SQL functions defined correctly
- **Committed in:** 325092d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Recharts TooltipProps type incompatibility**
- **Found during:** Task 2 (Chart tooltip)
- **Issue:** Extending recharts TooltipProps<number, string> didn't expose payload/label as destructurable props (TypeScript error TS2339)
- **Fix:** Defined ChartTooltipProps with explicit payload/label/active fields and PayloadEntry interface
- **Files modified:** components/history/chart-tooltip.tsx
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** 128ef12 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None - dependencies installed cleanly, TypeScript compiled after tooltip fix, Next.js build succeeded on first attempt.

## User Setup Required

None - no external service configuration required. Migration must be applied to Supabase when deploying.

## Next Phase Readiness

- History page fully functional, ready for visual verification
- Navigation component enables adding /health page in 03-02
- usePersistedState and ROOM_COLOR_PALETTE reusable in health dashboard
- Database functions ready for deployment to Supabase

## Self-Check: PASSED

All 13 created files verified on disk. Both task commits (325092d, 128ef12) verified in git log.

---
*Phase: 03-history-and-health*
*Completed: 2026-02-18*
