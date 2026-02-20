# Phase 4: Storage Dashboard Widget - Research

**Researched:** 2026-02-20
**Domain:** Front-end dashboard widget for Supabase database storage monitoring
**Confidence:** HIGH

## Summary

Phase 4 is a gap closure phase. The database infrastructure for storage monitoring already exists: `get_database_size_mb()` and `get_table_sizes()` PostgreSQL functions (migration 002), and a daily cron job (`log-storage-usage` in migration 003) that writes storage snapshots to `ingestion_log` with `source='system'` and `status='storage_check'`. The only missing piece is a front-end widget on the dashboard that displays this data.

The widget must show current database size (MB) against the 500 MB Supabase free-tier limit, plus a per-table size breakdown. Two data sources are available: (1) calling the RPC functions directly, or (2) reading historical snapshots from `ingestion_log`. The recommended approach is to **read from `ingestion_log`** for the primary display (the daily cron job already writes there), supplemented by a one-time `get_database_size_mb()` RPC call at page load for a fresh total. This avoids permission issues with `pg_stat_user_tables` access from the anon role.

**Primary recommendation:** Build a compact storage widget component below the room cards on the dashboard, using server-side data fetching via the existing Supabase server client pattern. Read the latest `ingestion_log` storage entry for the display value, with a `SECURITY DEFINER` migration for the PostgreSQL functions as a prerequisite to enable direct RPC calls.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-05 | Database storage usage monitored and displayed on dashboard | Infrastructure fully exists (functions + cron job). Research covers: widget component architecture, data access patterns, permission considerations, progress bar with 500 MB limit, per-table breakdown display. |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. This phase uses only existing project dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.8.0 | Server-side Supabase client for data fetching | Already used in `lib/supabase/server.ts` for all server component queries |
| `@supabase/supabase-js` | ^2.96.0 | Supabase client type imports, `.rpc()` calls | Already used in `lib/queries/*.ts` for all RPC wrapper functions |
| `lucide-react` | ^0.574.0 | Icons (Database, HardDrive, etc.) | Already used across all dashboard components |
| `tailwindcss` | ^4 | Styling consistent with existing dashboard | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | ^3.7.0 | Optional: mini bar chart for table breakdown | Already installed; only if visual bar chart is preferred over text list |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reading `ingestion_log` | Direct RPC to `get_database_size_mb()` | RPC gives real-time data but requires `SECURITY DEFINER` migration; `ingestion_log` data is up to 24h stale but works with zero permission changes |
| Dashboard-embedded widget | Separate `/storage` page | Widget on dashboard provides at-a-glance monitoring (requirement says "displayed on dashboard"); separate page is overkill for a single metric |
| Progress bar | Gauge / radial chart | Progress bar is simpler, more readable, matches the clean card-based design language |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
lib/
  queries/
    storage.ts          # fetchStorageInfo() RPC wrapper + ingestion_log query
  types.ts              # StorageInfo, TableSize type additions
components/
  dashboard/
    storage-widget.tsx   # Client component for storage display
app/
  page.tsx              # Add storage data fetch alongside existing queries
supabase/
  migrations/
    008_storage_security.sql  # SECURITY DEFINER for storage functions
```

### Pattern 1: Server-Side Data Fetching (established project pattern)

**What:** Fetch storage data in the server component (`page.tsx`) and pass as props to a client component
**When to use:** Always -- this is how every data source in the project works
**Confidence:** HIGH -- directly observed in `app/page.tsx`, `app/history/page.tsx`, `app/health/page.tsx`

```typescript
// In app/page.tsx (server component)
// Fetch latest storage entry from ingestion_log
const { data: storageRows } = await supabase
  .from('ingestion_log')
  .select('details, created_at')
  .eq('source', 'system')
  .eq('status', 'storage_check')
  .order('created_at', { ascending: false })
  .limit(1)

const storageInfo = storageRows?.[0]?.details as {
  database_size_mb: number
  checked_at: string
} | null
```

### Pattern 2: RPC Function Wrapper (established project pattern)

**What:** Thin async wrapper around `supabase.rpc()` with error handling
**When to use:** When calling PostgreSQL functions that return structured data
**Confidence:** HIGH -- directly observed in `lib/queries/health.ts` and `lib/queries/history.ts`

```typescript
// lib/queries/storage.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StorageInfo {
  database_size_mb: number
  checked_at: string
}

export interface TableSize {
  table_name: string
  size_mb: number
  row_estimate: number
}

export async function fetchDatabaseSize(
  supabase: SupabaseClient
): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_database_size_mb')
  if (error) {
    console.error('fetchDatabaseSize error:', error)
    return null
  }
  return data as number
}

export async function fetchTableSizes(
  supabase: SupabaseClient
): Promise<TableSize[]> {
  const { data, error } = await supabase.rpc('get_table_sizes')
  if (error) {
    console.error('fetchTableSizes error:', error)
    return []
  }
  return (data ?? []) as TableSize[]
}
```

### Pattern 3: Dashboard Card Component (established project pattern)

**What:** A `bg-card border border-border rounded-lg p-5` card with icon header, hero metric, and secondary details
**When to use:** For all dashboard data displays
**Confidence:** HIGH -- directly observed in `weather-panel.tsx` and `room-card.tsx`

```typescript
// Component structure follows the weather card pattern:
// 1. Icon + label header row
// 2. Hero metric (large font)
// 3. Secondary info (smaller text)
// 4. Timestamp/context line
```

### Anti-Patterns to Avoid

- **Client-side data fetching for initial load:** All other dashboard data is fetched server-side in `page.tsx`. Do not use `useEffect` + `fetch` for the initial storage load.
- **Separate page for storage:** The requirement explicitly says "displayed on dashboard." A separate page fragments the monitoring experience.
- **Polling for storage updates:** Storage changes slowly (daily). No need for Realtime subscriptions or client-side polling. Server-side fetch on page load is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar component | Custom div-based progress bar | Tailwind utility classes on a simple div pair (outer + inner) | Two divs with `bg-*` and `w-[{pct}%]` is simpler than any library component |
| Number formatting | Custom rounding/formatting logic | `toFixed(1)` or `toFixed(2)` (already used throughout) | Consistent with existing codebase pattern |
| Storage threshold colors | Complex conditional logic | Simple ternary: `>80%` = amber, `>90%` = red, else emerald | Matches existing warning color scheme (amber for warning, red for critical) |

**Key insight:** This is an extremely simple widget. The main risk is over-engineering it. A single card with a progress bar and a collapsible table list is all that's needed.

## Common Pitfalls

### Pitfall 1: PostgreSQL Function Permission Denied from Anon Role

**What goes wrong:** Calling `get_database_size_mb()` or `get_table_sizes()` via `supabase.rpc()` with the anon key returns a permission error because these functions internally call `pg_database_size()` and query `pg_stat_user_tables`, which require elevated privileges.
**Why it happens:** The functions in migration 002 were created without `SECURITY DEFINER`, so they execute with the caller's permissions (the `anon` role), which lacks access to PostgreSQL system functions and statistics views.
**How to avoid:** Create a migration that alters both functions to `SECURITY DEFINER` with a locked-down `search_path`. Alternatively, bypass the functions entirely and read from `ingestion_log` (which has no RLS, so anon can read it).
**Warning signs:** RPC calls return `{ error: { code: '42501', message: 'permission denied for function pg_database_size' } }` or similar.
**Confidence:** MEDIUM -- based on PostgreSQL documentation that `pg_database_size()` requires CONNECT privilege and `pg_stat_user_tables` is a statistics view that may have restricted access. Needs validation in actual Supabase environment.

### Pitfall 2: ingestion_log Has No RLS but Also No Anon SELECT Grant

**What goes wrong:** Querying `ingestion_log` from the front-end returns empty results or permission denied.
**Why it happens:** `ingestion_log` was created without `ENABLE ROW LEVEL SECURITY` and without explicit `SELECT` policy for anon. In Supabase, tables in the public schema are typically accessible to anon by default, but if RLS is not enabled, the behavior depends on default grants.
**How to avoid:** Either (a) enable RLS on `ingestion_log` with a permissive SELECT policy (like the other tables), or (b) verify anon access works without RLS. The safest approach is to add RLS + permissive policy, consistent with the rest of the schema.
**Warning signs:** Query returns empty array with no error, or returns a permission error.
**Confidence:** MEDIUM -- Supabase default grants may already allow this, but the project's other tables all use explicit RLS + policies.

### Pitfall 3: Stale Data Display Without Context

**What goes wrong:** The widget shows a database size from the last cron run (potentially 24 hours old) without indicating when the data was collected.
**Why it happens:** The daily cron job runs at 06:00 UTC. If viewed at 05:00 UTC the next day, the displayed size is 23 hours old.
**How to avoid:** Always display the `checked_at` timestamp (stored in `ingestion_log.details.checked_at` or `ingestion_log.created_at`). Show "as of X hours ago" using the same `formatDistanceToNow` pattern used elsewhere.
**Warning signs:** Users confused about whether the displayed size is current.

### Pitfall 4: Table Sizes Include Partition Tables

**What goes wrong:** `get_table_sizes()` returns individual partition tables (e.g., `sensor_readings_2026_02`, `sensor_readings_2026_03`) alongside their parent, making the breakdown confusing and potentially double-counting.
**Why it happens:** `pg_stat_user_tables` lists all user tables, including partitions.
**How to avoid:** Filter the results to show only meaningful top-level tables. Group partitions under their parent table name, or exclude partition tables by filtering out names matching the `_YYYY_MM` suffix pattern.
**Warning signs:** The table breakdown shows many more rows than expected with confusing names.

## Code Examples

### Storage Widget Component (follows weather card pattern)

```typescript
// components/dashboard/storage-widget.tsx
'use client'

import { Database } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StorageWidgetProps {
  sizeMb: number | null
  checkedAt: string | null
  tableSizes: { table_name: string; size_mb: number; row_estimate: number }[]
}

const FREE_TIER_LIMIT_MB = 500

export function StorageWidget({ sizeMb, checkedAt, tableSizes }: StorageWidgetProps) {
  if (sizeMb === null) return null

  const pct = Math.min((sizeMb / FREE_TIER_LIMIT_MB) * 100, 100)
  const barColor =
    pct > 90 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
        <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Storage</span>
      </div>

      {/* Hero metric */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[1.728rem] font-light leading-none tabular-nums">
          {sizeMb.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground font-light">
          / {FREE_TIER_LIMIT_MB} MB
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Table breakdown */}
      {tableSizes.length > 0 && (
        <div className="space-y-1 mb-3">
          {tableSizes.slice(0, 5).map((t) => (
            <div key={t.table_name} className="flex justify-between text-[0.833rem]">
              <span className="text-muted-foreground truncate">{t.table_name}</span>
              <span className="tabular-nums text-foreground/80">{t.size_mb.toFixed(2)} MB</span>
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      {checkedAt && (
        <span className="text-[0.694rem] text-muted-foreground/50">
          Checked {formatDistanceToNow(new Date(checkedAt), { addSuffix: true })}
        </span>
      )}
    </div>
  )
}
```

### SECURITY DEFINER Migration

```sql
-- 008_storage_security.sql
-- Make storage monitoring functions callable by the anon role via SECURITY DEFINER.
-- Required because pg_database_size() and pg_stat_user_tables need elevated privileges.

CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS numeric AS $$
  SELECT round(
    pg_database_size(current_database()) / (1024.0 * 1024.0), 2
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(table_name text, size_mb numeric, row_estimate bigint) AS $$
  SELECT
    schemaname || '.' || relname AS table_name,
    round(pg_total_relation_size(relid) / (1024.0 * 1024.0), 2) AS size_mb,
    n_live_tup AS row_estimate
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
```

### Server Component Data Fetching

```typescript
// In app/page.tsx, alongside existing queries:

// Option A: Read from ingestion_log (works without SECURITY DEFINER)
const { data: storageRows } = await supabase
  .from('ingestion_log')
  .select('details, created_at')
  .eq('source', 'system')
  .eq('status', 'storage_check')
  .order('created_at', { ascending: false })
  .limit(1)

// Option B: Direct RPC (requires SECURITY DEFINER migration)
const { data: dbSize } = await supabase.rpc('get_database_size_mb')
const { data: tableSizes } = await supabase.rpc('get_table_sizes')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side fetch in useEffect | Server component data fetching (RSC) | Next.js 13+ (App Router) | Data available on first render, no loading spinner |
| Custom progress bar libraries | Native Tailwind div-based bars | Tailwind v3+ | Zero dependency, full control |

**Deprecated/outdated:**
- N/A -- this is a simple widget using well-established patterns.

## Data Architecture Decision

### Recommended: Dual-Source Strategy

| Source | Data | Freshness | Permission Concern |
|--------|------|-----------|-------------------|
| `ingestion_log` query | `database_size_mb` from daily cron | Up to 24h stale | None (table in public schema, no RLS) |
| `get_database_size_mb()` RPC | Real-time total size | Live | Requires `SECURITY DEFINER` migration |
| `get_table_sizes()` RPC | Per-table breakdown | Live | Requires `SECURITY DEFINER` migration |

**Recommendation:** Apply the `SECURITY DEFINER` migration and use the RPC functions directly. This gives live data and per-table breakdown. The `ingestion_log` entries serve as a historical fallback and could be used for a future storage trend chart.

### Supabase Free Tier Context

The Supabase free tier allows 500 MB of database storage per project. The daily cron job (`log-storage-usage`, migration 003) already logs database size to `ingestion_log`. The widget surfaces this data and warns when approaching the limit.

**Threshold recommendations:**
- Below 80% (< 400 MB): emerald/green -- healthy
- 80-90% (400-450 MB): amber -- approaching limit
- Above 90% (> 450 MB): red -- critical, action needed

### Table Breakdown Filtering

The `get_table_sizes()` function returns ALL user tables including partitions. For a clean display:

1. Filter out partition tables matching `_\d{4}_\d{2}$` regex pattern
2. Or group by base table name (strip the `_YYYY_MM` suffix) and sum sizes
3. Also filter out `_default` partition tables
4. Show only the top 5-6 tables by size (sensor_readings, weather_observations, ingestion_log, sensor_config, plus any partition overflow)

## Open Questions

1. **Does the anon role have permission to call `pg_database_size()` on Supabase?**
   - What we know: PostgreSQL documentation says `pg_database_size()` requires CONNECT privilege on the database. The Supabase anon role likely has CONNECT but may still lack access to internal statistics functions.
   - What's unclear: Whether Supabase's default grants include this for the anon role.
   - Recommendation: Apply `SECURITY DEFINER` migration regardless -- it's the safe approach. Test in the actual Supabase environment after deployment.

2. **Does the anon role have SELECT access on `ingestion_log` without RLS?**
   - What we know: The table was created without `ENABLE ROW LEVEL SECURITY`. Supabase default grants on the public schema typically allow anon SELECT.
   - What's unclear: Whether the project has modified default grants.
   - Recommendation: For consistency with the rest of the schema, add RLS + permissive SELECT policy for `ingestion_log` in the same migration. This also prevents accidental writes from the anon role.

3. **Widget placement on dashboard**
   - What we know: The dashboard has Weather (top) and Rooms (bottom) sections. Storage is infrastructure monitoring, not a primary user metric.
   - What's unclear: Whether the user wants it as a full-width section, a sidebar widget, or a compact card.
   - Recommendation: Place it below the room grid as a compact single-column card. It is utility/infrastructure info, not a primary metric. Alternatively, it could be placed in the navigation sidebar at the bottom.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/002_functions.sql` -- Verified `get_database_size_mb()` and `get_table_sizes()` function signatures and implementations
- `supabase/migrations/003_cron_jobs.sql` -- Verified `log-storage-usage` cron job writes to `ingestion_log` with `source='system'`, `status='storage_check'`, and `details.database_size_mb`
- `supabase/migrations/001_schema.sql` -- Verified `ingestion_log` table schema (no RLS)
- `supabase/migrations/004_realtime_and_views.sql` -- Verified RLS is only on `sensor_readings`, `weather_observations`, `sensor_config`
- `app/page.tsx`, `components/dashboard/dashboard-client.tsx` -- Verified server-side fetch + client component prop pattern
- `lib/queries/health.ts`, `lib/queries/history.ts` -- Verified `supabase.rpc()` wrapper pattern
- `.planning/v1.0-MILESTONE-AUDIT.md` -- Confirmed PIPE-05 gap: infrastructure exists, front-end display missing
- [Supabase Pricing](https://supabase.com/pricing) -- Confirmed 500 MB free tier limit

### Secondary (MEDIUM confidence)
- [PostgreSQL Documentation: Predefined Roles](https://www.postgresql.org/docs/current/predefined-roles.html) -- `pg_database_size()` permission model
- [Supabase Docs: Database Functions](https://supabase.com/docs/guides/database/functions) -- SECURITY DEFINER behavior
- [Supabase Docs: Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles) -- Anon role capabilities
- [Supabase Docs: Database Size](https://supabase.com/docs/guides/platform/database-size) -- Understanding database and disk size

### Tertiary (LOW confidence)
- None -- all findings verified with official sources or codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; entirely uses existing project libraries
- Architecture: HIGH -- Follows established patterns observed in 6 existing components across 3 phases
- Pitfalls: MEDIUM -- Permission issues with `pg_database_size()` from anon role need validation in live environment; `SECURITY DEFINER` migration is the safe mitigation
- Data access: MEDIUM -- `ingestion_log` access from anon role needs live verification; RLS addition recommended for safety

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no rapidly evolving APIs)
