---
phase: 04-storage-dashboard-widget
plan: 01
subsystem: ui, database
tags: [supabase, rpc, security-definer, rls, react, dashboard, progress-bar]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: "get_database_size_mb and get_table_sizes PostgreSQL functions, ingestion_log table"
  - phase: 02-live-dashboard
    provides: "Dashboard layout, DashboardClient component, weather-panel card pattern"
provides:
  - "StorageWidget component with progress bar and table breakdown"
  - "SECURITY DEFINER on storage RPC functions for anon access"
  - "RLS policy on ingestion_log"
  - "fetchDatabaseSize and fetchTableSizes query wrappers"
  - "TableSize shared type"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER with SET search_path for privileged RPC wrappers"
    - "Server-side RPC fetch piped through client component props"

key-files:
  created:
    - supabase/migrations/008_storage_security.sql
    - lib/queries/storage.ts
    - components/dashboard/storage-widget.tsx
  modified:
    - lib/types.ts
    - app/page.tsx
    - components/dashboard/dashboard-client.tsx

key-decisions:
  - "SECURITY DEFINER SET search_path = public on both storage RPCs so anon role can call pg_database_size and pg_stat_user_tables"
  - "Partition tables filtered via regex /_\\d{4}_\\d{2}$|_default$/ to avoid cluttering breakdown"
  - "Checked-at timestamp derived from server render time (RPC returns live data)"

patterns-established:
  - "Storage RPC: SECURITY DEFINER pattern for pg_catalog-dependent functions"
  - "Partition filter regex for table size displays"

requirements-completed: [PIPE-05]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 4 Plan 1: Storage Dashboard Widget Summary

**Storage monitoring widget with SECURITY DEFINER RPCs, progress bar against 500 MB free-tier limit, threshold color coding, and per-table breakdown**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T19:50:08Z
- **Completed:** 2026-02-20T19:52:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- SECURITY DEFINER wrappers on get_database_size_mb and get_table_sizes so anon role can invoke them via Supabase RPC
- RLS policy on ingestion_log for anon SELECT access
- Storage widget on dashboard with hero metric, color-coded progress bar (green/amber/red thresholds), top-5 table breakdown, and freshness timestamp
- Server-side storage data fetch integrated into page.tsx with props passed through DashboardClient

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and storage query layer** - `9ac66e0` (feat)
2. **Task 2: Storage widget component and dashboard integration** - `03698bb` (feat)

## Files Created/Modified
- `supabase/migrations/008_storage_security.sql` - SECURITY DEFINER on both storage functions, RLS on ingestion_log
- `lib/queries/storage.ts` - fetchDatabaseSize and fetchTableSizes RPC wrappers
- `lib/types.ts` - Added TableSize interface in new Storage types section
- `components/dashboard/storage-widget.tsx` - Storage widget with progress bar, table breakdown, timestamp
- `app/page.tsx` - Server-side storage data fetch via RPC wrappers
- `components/dashboard/dashboard-client.tsx` - Accepts storage props, renders StorageWidget below room cards

## Decisions Made
- SECURITY DEFINER with `SET search_path = public` on both storage RPCs so the anon role can call pg_database_size and pg_stat_user_tables (these require elevated privileges)
- Partition tables filtered from display using regex `/_\d{4}_\d{2}$|_default$/` to keep the breakdown clean
- "Checked at" timestamp derived from server render time since the RPC returns live data (no separate storage check timestamp)
- Permissive anon SELECT policy on ingestion_log consistent with other table patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - migration must be applied to the Supabase database (`supabase db push` or manual application of 008_storage_security.sql). No new environment variables or external services.

## Next Phase Readiness
- Storage widget is fully integrated and renders on the dashboard
- No further phases planned beyond Phase 4

---
*Phase: 04-storage-dashboard-widget*
*Completed: 2026-02-20*

## Self-Check: PASSED

All 7 files verified present. Both task commits (9ac66e0, 03698bb) found in git log.
