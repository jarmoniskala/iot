# Phase 3: History and Health - Research

**Researched:** 2026-02-18
**Domain:** Recharts 3.x time-series visualization, PostgreSQL time-bucketed aggregation, shadcn/ui data tables, date range pickers, data gap detection, sensor health metrics
**Confidence:** HIGH

## Summary

Phase 3 adds two major features to the Home IoT Monitor: (1) historical trend charts for temperature, humidity, and pressure with time range selection and room comparison, and (2) a dedicated system health page showing battery, signal, movement, and uptime metrics per sensor. The user has made detailed decisions about chart design (smooth curves with area fill, Apple Health / Vercel Analytics style), interaction patterns (scroll-to-zoom, drag-to-pan, tooltip mode toggle), time range controls (pill buttons with custom date picker), health table layout (sortable columns, expandable rows, color-coded severity), and data gap visualization (dashed lines with shaded bands).

The charting library is Recharts 3.7.x, already identified in the project stack research. Recharts provides `AreaChart` with `type="monotone"` for smooth curves, `connectNulls` control for gap handling, `ReferenceArea` for gap shading, and `Brush` for basic range selection. However, Recharts does **not** have built-in scroll-to-zoom or drag-to-pan. These must be implemented with custom `onWheel`/`onMouseDown` handlers that manipulate the chart domain state -- a well-documented pattern in the Recharts community. The health page uses shadcn/ui's Table component with @tanstack/react-table for sorting, and expandable row details for inline trend charts. The date picker uses shadcn/ui's Calendar + Popover with react-day-picker in range mode.

The data layer requires new PostgreSQL database functions for time-bucketed aggregation (`date_trunc` for hour/day grouping), gap detection (`LAG` window function comparing timestamps), and uptime calculation (gap time / total time). For 30-day ranges at 5-minute intervals, each sensor produces ~8,640 points -- manageable for Recharts without downsampling. Longer custom ranges may benefit from server-side aggregation to reduce payload size.

**Primary recommendation:** Use Recharts 3.7 `AreaChart` with `type="monotone"` and gradient fills for the Apple Health aesthetic. Implement zoom/pan via custom wheel and drag handlers that adjust XAxis domain state. Use `ReferenceArea` components to shade data gaps (detected server-side via LAG window function). Build the health table with @tanstack/react-table for sorting/expanding. Create PostgreSQL database functions for aggregated queries to keep client-side data processing minimal.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Chart design & interaction
- Smooth line charts with curved lines and area fill beneath (Apple Health / Vercel Analytics style)
- Tooltip mode toggle: user can switch between "all rooms at that timestamp" (vertical crosshair) and "single line value" (nearest line)
- Scroll to zoom + drag to pan for in-chart data exploration
- One metric at a time: tabs or buttons to switch between temperature, humidity, and pressure -- rooms overlay within the selected metric

#### Time range controls
- Horizontal pill button row above chart: 24h | 7d | 30d | Custom
- Custom range via date picker popover (calendar UI for start and end dates)
- Summary stats (min, max, average) displayed below the chart for the selected time range
- Selected time range and room selection persisted in localStorage across page reloads

#### Health page layout
- Table view with sortable columns: sensor name, battery voltage, signal strength, movement counter, last seen, uptime %
- Color-coded rows based on severity: green (healthy), amber (warning -- e.g., low battery), red (critical -- e.g., stale data)
- Expandable row detail: click a sensor row to expand and see full battery voltage and signal strength trend charts below
- Uptime percentage and total gap time per sensor shown in the table

#### Health indicators on dashboard
- Subtle warning icons on room cards when battery is low or data is stale
- Icons link to the health page for details

#### Data gap visualization
- Dashed line + light shaded band marks gap periods in trend charts
- Gap threshold: same as live dashboard staleness (3 missed update cycles)
- Hover tooltip on gaps shows duration and time range (e.g., "Offline 2h 15m -- 14:30 to 16:45")

### Claude's Discretion
- Charting library choice
- Exact color palette for room lines
- Chart animation/transition behavior
- Table sorting defaults on health page
- Responsive layout breakpoints for charts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | User can view historical trend charts (line charts) for temperature, humidity, and pressure per room | Recharts 3.7 `AreaChart` with `type="monotone"` and gradient area fill; metric tabs switch the data key; each room is a separate `Area` component with distinct stroke color |
| HIST-02 | User can select time range via presets (24h, 7d, 30d) and custom date range picker | Pill button row for presets; shadcn/ui Calendar + Popover with react-day-picker `mode="range"` for custom dates; selection persisted in localStorage |
| HIST-03 | User can overlay multiple rooms on the same chart for comparison | Multiple `Area` components within the same `AreaChart`, each with its own `dataKey` mapped to room mac_address; room toggle buttons to show/hide lines |
| HIST-04 | Charts show visual markers where data gaps exist (sensor offline, phone away) | Server-side gap detection via LAG window function; gaps rendered as `ReferenceArea` components with dashed borders and light shaded fill; custom tooltip on hover showing gap duration |
| HIST-05 | User can view daily/weekly summary stats (min, max, average) per room | PostgreSQL `date_trunc` aggregation query returns min/max/avg per room for selected time range; displayed as stat cards below chart |
| HLTH-01 | Dedicated system health view shows battery voltage trends per sensor | Health page with expandable rows; @tanstack/react-table for the sortable table; embedded Recharts `AreaChart` in expanded row detail for battery voltage trend |
| HLTH-02 | System health view shows signal strength (RSSI) per sensor | Same expandable row pattern as HLTH-01; RSSI trend chart in expanded detail alongside battery chart |
| HLTH-03 | System health view shows movement counter and last-seen timestamps | Direct columns in the health table: `movement_counter` from latest reading, `last_seen` as relative timestamp via date-fns |
| HLTH-04 | System health view shows measurement sequence gaps (data loss detection) | Gap detection function identifies missing measurement sequences; total gap time and uptime % calculated server-side and displayed in the table |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.7.x | Time-series charts (AreaChart, Tooltip, Brush, ReferenceArea) | Already in project stack. 24.8k GitHub stars. SVG-based declarative API. Native `responsive` prop eliminates `ResponsiveContainer` wrapper. `type="monotone"` for smooth curves. `connectNulls` for gap control. React 19 compatible in 3.x. |
| @tanstack/react-table | 8.21.x | Sortable, expandable data table for health page | Headless table library. Works with shadcn/ui Table component. Provides `SortingState`, `getSortedRowModel()`, `getExpandedRowModel()` for sorting and row expansion. React 19 compatible. |
| react-day-picker | 9.13.x | Calendar UI for custom date range picker | Already a transitive dependency of shadcn/ui Calendar component. `mode="range"` for start/end date selection. React 19 compatible in 9.13.x. |
| date-fns | 4.x | Date formatting, manipulation, time range calculations | Already installed. `format`, `subDays`, `subHours`, `startOfDay`, `endOfDay`, `differenceInMinutes` for time range logic. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Calendar | latest (CLI) | Calendar popover for date range picker | Custom range selection UI. Wraps react-day-picker with shadcn styling. |
| shadcn/ui Table | latest (CLI) | Health page table markup | Styled `<table>` elements: TableHeader, TableBody, TableRow, TableCell. Works with @tanstack/react-table for interactivity. |
| shadcn/ui Tabs | latest (CLI) | Metric switching (temp/humidity/pressure) | Tab buttons to switch between metrics on the history chart page. |
| shadcn/ui Popover | latest (CLI) | Date picker popover container | Already installed. Hosts the Calendar component for custom date selection. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts 3.7 | Chart.js (react-chartjs-2) | Chart.js has built-in zoom plugin but is canvas-based (harder to style with Tailwind, no direct SVG customization). Recharts is already in the project stack and fits the React component model better. |
| Recharts 3.7 | Tremor | Tremor provides pre-built chart components with shadcn-like styling but lacks customization for gap visualization, tooltip modes, and zoom/pan. Too basic for these requirements. |
| Recharts 3.7 | ECharts | Better performance at 100k+ points with WebGL renderer, but overkill for ~26k points max. Imperative API does not fit React patterns. Much larger bundle. |
| Custom zoom/pan | Brush component only | Brush provides range selection via a small overview chart below, but the user specifically requested scroll-to-zoom + drag-to-pan, which requires custom handlers. Brush can optionally be added as a secondary navigation. |
| @tanstack/react-table | Hand-rolled table sorting | @tanstack/react-table provides battle-tested sorting, expansion, and state management. Hand-rolling would duplicate well-solved logic. |

**Installation:**
```bash
# New dependencies for Phase 3
npm install recharts @tanstack/react-table

# shadcn/ui components (copies into codebase)
npx shadcn@latest add table tabs calendar popover
```

**Note:** react-day-picker is installed automatically as a dependency of the shadcn/ui Calendar component. No separate install needed.

## Architecture Patterns

### Recommended Project Structure

```
app/
├── page.tsx                    # Existing dashboard (Phase 2)
├── history/
│   └── page.tsx                # History page (server component -- fetches initial data)
├── health/
│   └── page.tsx                # Health page (server component -- fetches sensor stats)
components/
├── ui/                         # shadcn/ui components (Table, Tabs, Calendar, Popover)
├── dashboard/                  # Existing Phase 2 components
├── history/
│   ├── history-client.tsx      # Client wrapper: manages time range, rooms, metric state
│   ├── trend-chart.tsx         # AreaChart with zoom/pan, gap visualization, tooltip toggle
│   ├── time-range-picker.tsx   # Pill buttons (24h|7d|30d|Custom) + date picker popover
│   ├── room-selector.tsx       # Room toggle buttons for overlay selection
│   ├── summary-stats.tsx       # Min/max/avg stat cards below chart
│   └── chart-tooltip.tsx       # Custom Recharts tooltip (shared vs single mode)
├── health/
│   ├── health-client.tsx       # Client wrapper: manages table state
│   ├── health-table.tsx        # @tanstack/react-table with sortable columns
│   ├── health-row-detail.tsx   # Expandable row: battery + RSSI trend mini-charts
│   └── severity-badge.tsx      # Color-coded severity indicator
lib/
├── queries/
│   ├── history.ts              # Supabase queries: time-bucketed readings, gaps
│   └── health.ts               # Supabase queries: sensor health stats, uptime
├── hooks/
│   ├── use-chart-zoom.ts       # Custom hook: wheel zoom + drag pan state
│   └── use-persisted-state.ts  # localStorage-backed state for time range + room selection
├── types.ts                    # Extended with history/health types
└── constants.ts                # Extended with room colors, severity thresholds
```

### Pattern 1: Server Component Data Fetch + Client Chart

**What:** The history page server component fetches time-bucketed data from Supabase for the default time range (24h). The client component receives this as initial data and manages subsequent fetches when the user changes the time range.
**When to use:** History page load and time range changes.

```typescript
// app/history/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { HistoryClient } from '@/components/history/history-client'
import { subHours } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = await createClient()
  const now = new Date()
  const from = subHours(now, 24)

  // Fetch sensor readings for default 24h range
  const { data: readings } = await supabase
    .from('sensor_readings')
    .select('mac_address, measured_at, temperature, humidity, pressure')
    .gte('measured_at', from.toISOString())
    .lte('measured_at', now.toISOString())
    .eq('is_outlier', false)
    .order('measured_at', { ascending: true })

  // Fetch active sensor config for room names
  const { data: sensorConfig } = await supabase
    .from('sensor_config')
    .select('*')
    .is('unassigned_at', null)

  // Fetch gaps for the time range
  const { data: gaps } = await supabase
    .rpc('detect_gaps', {
      p_from: from.toISOString(),
      p_to: now.toISOString(),
    })

  return (
    <HistoryClient
      initialReadings={readings ?? []}
      initialGaps={gaps ?? []}
      sensorConfig={sensorConfig ?? []}
    />
  )
}
```

### Pattern 2: Custom Zoom/Pan via Wheel and Drag Handlers

**What:** Since Recharts has no built-in zoom/pan, wrap the chart in a container that handles `onWheel` for zoom and `onMouseDown`/`onMouseMove`/`onMouseUp` for drag-to-pan. These handlers update the XAxis `domain` state.
**When to use:** All trend charts on the history page.

```typescript
// lib/hooks/use-chart-zoom.ts
'use client'

import { useState, useCallback, useRef } from 'react'

interface ZoomState {
  left: number    // Unix timestamp for domain start
  right: number   // Unix timestamp for domain end
}

export function useChartZoom(initialLeft: number, initialRight: number) {
  const [domain, setDomain] = useState<ZoomState>({
    left: initialLeft,
    right: initialRight,
  })
  const dragRef = useRef<{ startX: number; startLeft: number; startRight: number } | null>(null)

  const handleWheel = useCallback((e: React.WheelEvent, chartWidth: number, cursorX: number) => {
    e.preventDefault()
    const { left, right } = domain
    const range = right - left
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8 // scroll down = zoom out, up = zoom in
    const cursorRatio = cursorX / chartWidth
    const newRange = range * zoomFactor

    const newLeft = left + (range - newRange) * cursorRatio
    const newRight = newLeft + newRange

    setDomain({ left: Math.max(newLeft, initialLeft), right: Math.min(newRight, initialRight) })
  }, [domain, initialLeft, initialRight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startLeft: domain.left,
      startRight: domain.right,
    }
  }, [domain])

  const handleMouseMove = useCallback((e: React.MouseEvent, chartWidth: number) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const range = dragRef.current.startRight - dragRef.current.startLeft
    const shift = -(dx / chartWidth) * range

    setDomain({
      left: Math.max(dragRef.current.startLeft + shift, initialLeft),
      right: Math.min(dragRef.current.startRight + shift, initialRight),
    })
  }, [initialLeft, initialRight])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const resetZoom = useCallback(() => {
    setDomain({ left: initialLeft, right: initialRight })
  }, [initialLeft, initialRight])

  return { domain, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, resetZoom }
}
```

### Pattern 3: Data Gap Visualization with ReferenceArea

**What:** Data gaps (detected server-side) are rendered as `ReferenceArea` components with dashed borders and light fill. Each gap has a custom tooltip showing duration and time range.
**When to use:** All trend charts when gaps exist in the time range.

```typescript
// Inside trend-chart.tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceArea } from 'recharts'

interface Gap {
  mac_address: string
  gap_start: string   // ISO timestamp
  gap_end: string     // ISO timestamp
  duration_minutes: number
}

// Render gap regions as ReferenceArea components
{gaps.map((gap, i) => (
  <ReferenceArea
    key={`gap-${i}`}
    x1={new Date(gap.gap_start).getTime()}
    x2={new Date(gap.gap_end).getTime()}
    fill="currentColor"
    fillOpacity={0.05}
    stroke="currentColor"
    strokeOpacity={0.2}
    strokeDasharray="4 4"
  />
))}
```

### Pattern 4: Tooltip Mode Toggle (Shared vs Single)

**What:** Recharts `Tooltip` component has a `shared` prop. When `shared={true}`, it shows all room values at the crosshair position. When `shared={false}`, it shows only the nearest line value.
**When to use:** Toggle button on the chart controls.

```typescript
// Tooltip shared mode = "all rooms at that timestamp" (vertical crosshair)
<Tooltip
  shared={tooltipMode === 'shared'}
  cursor={tooltipMode === 'shared' ? { strokeDasharray: '4 4' } : true}
  content={<ChartTooltip mode={tooltipMode} />}
/>
```

### Pattern 5: Expandable Table Rows for Health Detail

**What:** @tanstack/react-table's `getExpandedRowModel()` enables row expansion. When a sensor row is clicked, it reveals embedded mini-charts for battery voltage and RSSI trends.
**When to use:** Health page sensor table.

```typescript
// components/health/health-table.tsx
import { useReactTable, getCoreRowModel, getSortedRowModel, getExpandedRowModel } from '@tanstack/react-table'

const table = useReactTable({
  data: sensors,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  state: { sorting, expanded },
  onSortingChange: setSorting,
  onExpandedChange: setExpanded,
  getRowCanExpand: () => true,
})
```

### Anti-Patterns to Avoid

- **Fetching all raw readings for 30-day charts client-side:** At 3 sensors x 12 readings/hour x 720 hours = ~25,920 points per sensor. This is within Recharts' capability but the HTTP payload will be large (~2-3 MB). For 30-day and custom ranges, use server-side aggregation (5-minute or 15-minute buckets) to reduce payload to ~2,000-6,000 points per sensor.
- **Computing gap detection client-side:** Gap detection requires comparing consecutive timestamps per sensor -- a natural fit for SQL window functions. Do this on the server, not in JavaScript.
- **Using Brush as the only zoom mechanism:** Brush shows a small overview chart for range selection. The user specifically requested scroll-to-zoom + drag-to-pan in the main chart area. Use custom handlers for in-chart interaction; optionally add Brush as a secondary overview.
- **Disabling chart animations entirely:** The user left animation behavior to discretion. Disable initial load animations (jarring on re-render) but keep smooth transitions when domain changes (zoom/pan). Use `isAnimationActive={false}` for initial render, and short transition durations for domain changes.
- **Fetching health page data with separate queries per sensor:** Combine into a single aggregated query that returns all sensor health metrics in one roundtrip.
- **Storing history page state only in React state:** The user decided that time range and room selection should persist across page reloads via localStorage. Use a custom hook that syncs React state with localStorage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth time-series line charts | Custom SVG path rendering | Recharts `Area` with `type="monotone"` | D3 curve interpolation under the hood; handles responsive sizing, animations, tooltips |
| Date range picker calendar | Custom calendar grid | shadcn/ui Calendar + Popover (react-day-picker) | Calendar UI is deceptively complex (month navigation, range highlighting, disabled dates, localization) |
| Table sorting/expanding | Manual sort + toggle state | @tanstack/react-table `getSortedRowModel()` + `getExpandedRowModel()` | Handles sort direction cycling, multi-column sort, row identity during expansion, keyboard accessibility |
| Data gap detection | Client-side timestamp diff loops | PostgreSQL LAG window function | Database can efficiently scan partitioned data with indexes; avoids transferring raw timestamps to client |
| Time-bucketed aggregation | Client-side reduce/group-by | PostgreSQL `date_trunc` + `avg`/`min`/`max` | Database engine is orders of magnitude faster at aggregation; reduces data transfer |
| localStorage-synced state | Manual `useEffect` + `JSON.parse/stringify` per component | Shared `usePersistedState` hook | Centralizes SSR safety checks, serialization, and type safety |
| Scroll-to-zoom math | From-scratch zoom algebra | Documented focal-point zoom pattern (see code example) | Ratio-based focal zoom is a well-known formula; getting it wrong causes jumpy or off-center zoom |

**Key insight:** The heaviest lifting in this phase is SQL aggregation and gap detection. Push as much computation as possible to PostgreSQL where it runs against indexed, partitioned data. The client should receive pre-processed data ready to render.

## Common Pitfalls

### Pitfall 1: Pressure Unit Mismatch in Charts

**What goes wrong:** Historical charts display indoor sensor pressure in Pascals (e.g., "101325") while the axis and comparison expects hPa (e.g., "1013.25").
**Why it happens:** Phase 1 stores sensor pressure in Pascals as received from Ruuvi Station. FMI pressure is in hPa. The conversion happens at display time in the live dashboard but historical queries return raw database values.
**How to avoid:** Apply the conversion in the SQL query or in the data transformation layer before passing to the chart:
```sql
-- In the aggregation query
SELECT
  date_trunc('hour', measured_at) AS bucket,
  mac_address,
  avg(pressure / 100.0) AS avg_pressure_hpa,
  min(pressure / 100.0) AS min_pressure_hpa,
  max(pressure / 100.0) AS max_pressure_hpa
FROM sensor_readings
WHERE ...
GROUP BY bucket, mac_address
```
**Warning signs:** Y-axis on pressure chart shows values in the 100,000s instead of ~1,013.

### Pitfall 2: Chart Re-renders on Every Zoom/Pan Step

**What goes wrong:** The entire chart re-renders on every mouse move during drag or every wheel tick during zoom, causing visible lag.
**Why it happens:** Updating domain state on every event fires a React re-render. Recharts SVG rendering is not free.
**How to avoid:** Throttle wheel events (e.g., once per 50ms). During drag, use `requestAnimationFrame` to batch updates. Use `isAnimationActive={false}` during active zoom/pan to skip transition animations. Consider `React.memo` on child chart components.
**Warning signs:** Visible jank when scrolling to zoom or dragging to pan.

### Pitfall 3: Timezone Confusion in Date Picker vs Database

**What goes wrong:** User selects "Feb 1 - Feb 7" in the date picker but the query uses UTC boundaries, missing readings from the local timezone offset (UTC+2/+3 in Helsinki).
**Why it happens:** PostgreSQL timestamps are stored with timezone (timestamptz). `date_trunc` operates in the session timezone. The JavaScript Date constructor and date-fns may use the browser's local timezone. If the SQL query receives raw UTC timestamps, the date boundaries shift.
**How to avoid:** Use `date-fns` to create start/end timestamps in the user's local timezone, then pass ISO strings to the Supabase query. PostgreSQL will handle the timezone conversion correctly since the column is `timestamptz`. Always pass timezone-aware ISO 8601 strings to the database.
```typescript
import { startOfDay, endOfDay } from 'date-fns'
// These produce local timezone boundaries
const from = startOfDay(selectedRange.from).toISOString() // e.g., "2026-02-01T00:00:00+02:00"
const to = endOfDay(selectedRange.to).toISOString()       // e.g., "2026-02-07T23:59:59+02:00"
```
**Warning signs:** Data appears to be missing at the start or end of the selected range; "off by one day" type issues.

### Pitfall 4: Partition Scanning for Large Time Ranges

**What goes wrong:** A 30-day query scans the entire current month's partition plus potentially the previous month's, returning hundreds of thousands of raw rows.
**Why it happens:** Without server-side aggregation, the query returns every single reading (~26k per sensor for 30 days at 5-min intervals).
**How to avoid:** Create a PostgreSQL function that returns time-bucketed aggregates:
```sql
-- For 24h: return raw readings (manageable volume)
-- For 7d: aggregate to 15-minute buckets (~672 points per sensor)
-- For 30d: aggregate to 1-hour buckets (~720 points per sensor)
```
The function selects the bucket size based on the requested time range. This keeps the response payload under 100KB for any preset range.
**Warning signs:** Chart page takes more than 2 seconds to load on 30-day view; browser memory usage spikes.

### Pitfall 5: Missing Gap Detection for Short Outages

**What goes wrong:** A 30-minute outage does not appear as a gap in the chart because the aggregation bucket (1 hour) contains readings before and after the gap.
**Why it happens:** Time-bucketed aggregation averages over the bucket, hiding intra-bucket gaps.
**How to avoid:** Run gap detection on raw data first, then aggregate. The gap detection function operates at the individual reading level (5-minute expected interval), not the display bucket level. Return both the aggregated chart data and the gap intervals as separate datasets.
**Warning signs:** Known outages do not appear as gaps on the chart; the dashed-line gap markers never appear.

### Pitfall 6: SSR Hydration Mismatch with localStorage

**What goes wrong:** The history page server-renders with default state (24h, all rooms) but the client reads a different selection from localStorage, causing a hydration mismatch flash.
**Why it happens:** localStorage is not available on the server. The server and client render different initial states.
**How to avoid:** Use the same pattern as Phase 2's card order: initialize with default values on the server, then hydrate from localStorage in a `useEffect`. Accept a brief visual update when the client state loads. Alternatively, use URL search params for time range and room selection (shareable, no hydration issue).
**Warning signs:** Flash of default state on page load before localStorage values apply; React hydration warnings.

### Pitfall 7: Expandable Row Re-fetching on Every Toggle

**What goes wrong:** Expanding a health table row triggers a fresh data fetch for battery/RSSI trends every time, even if the row was just collapsed and re-opened.
**Why it happens:** No client-side caching of the trend data for expanded rows.
**How to avoid:** Use TanStack Query (already in the project for Phase 2 consideration) or a simple React state cache. Cache trend data per sensor for a reasonable duration (e.g., 5 minutes). Prefetch on hover or fetch on first expand and cache.
**Warning signs:** Visible loading spinner every time a row is toggled open; unnecessary database queries.

## Code Examples

### Time-Bucketed Aggregation SQL Function

```sql
-- Database function: returns time-bucketed sensor data
-- Source: Standard PostgreSQL date_trunc aggregation pattern
CREATE OR REPLACE FUNCTION get_sensor_history(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket_minutes integer DEFAULT 60
)
RETURNS TABLE(
  bucket timestamptz,
  mac_address text,
  avg_temperature double precision,
  min_temperature double precision,
  max_temperature double precision,
  avg_humidity double precision,
  min_humidity double precision,
  max_humidity double precision,
  avg_pressure_hpa double precision,
  min_pressure_hpa double precision,
  max_pressure_hpa double precision,
  reading_count bigint
) AS $$
BEGIN
  IF p_bucket_minutes <= 5 THEN
    -- For short ranges, return raw readings (no aggregation)
    RETURN QUERY
    SELECT
      sr.measured_at AS bucket,
      sr.mac_address,
      sr.temperature AS avg_temperature,
      sr.temperature AS min_temperature,
      sr.temperature AS max_temperature,
      sr.humidity AS avg_humidity,
      sr.humidity AS min_humidity,
      sr.humidity AS max_humidity,
      sr.pressure / 100.0 AS avg_pressure_hpa,
      sr.pressure / 100.0 AS min_pressure_hpa,
      sr.pressure / 100.0 AS max_pressure_hpa,
      1::bigint AS reading_count
    FROM sensor_readings sr
    WHERE sr.measured_at >= p_from
      AND sr.measured_at <= p_to
      AND sr.is_outlier = false
    ORDER BY sr.measured_at;
  ELSE
    -- For longer ranges, aggregate into buckets
    RETURN QUERY
    SELECT
      date_trunc('hour', sr.measured_at)
        + (floor(extract(minute FROM sr.measured_at) / p_bucket_minutes) * p_bucket_minutes)
        * interval '1 minute' AS bucket,
      sr.mac_address,
      avg(sr.temperature) AS avg_temperature,
      min(sr.temperature) AS min_temperature,
      max(sr.temperature) AS max_temperature,
      avg(sr.humidity) AS avg_humidity,
      min(sr.humidity) AS min_humidity,
      max(sr.humidity) AS max_humidity,
      avg(sr.pressure / 100.0) AS avg_pressure_hpa,
      min(sr.pressure / 100.0) AS min_pressure_hpa,
      max(sr.pressure / 100.0) AS max_pressure_hpa,
      count(*) AS reading_count
    FROM sensor_readings sr
    WHERE sr.measured_at >= p_from
      AND sr.measured_at <= p_to
      AND sr.is_outlier = false
    GROUP BY bucket, sr.mac_address
    ORDER BY bucket;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Gap Detection SQL Function

```sql
-- Database function: detects data gaps per sensor
-- Source: PostgreSQL LAG window function pattern
CREATE OR REPLACE FUNCTION detect_gaps(
  p_from timestamptz,
  p_to timestamptz,
  p_gap_threshold_minutes integer DEFAULT 15  -- 3 * 5min scan interval
)
RETURNS TABLE(
  mac_address text,
  gap_start timestamptz,
  gap_end timestamptz,
  duration_minutes double precision
) AS $$
SELECT
  g.mac_address,
  g.prev_measured_at AS gap_start,
  g.measured_at AS gap_end,
  extract(epoch FROM (g.measured_at - g.prev_measured_at)) / 60.0 AS duration_minutes
FROM (
  SELECT
    sr.mac_address,
    sr.measured_at,
    lag(sr.measured_at) OVER (
      PARTITION BY sr.mac_address
      ORDER BY sr.measured_at
    ) AS prev_measured_at
  FROM sensor_readings sr
  WHERE sr.measured_at >= p_from
    AND sr.measured_at <= p_to
    AND sr.is_outlier = false
) g
WHERE g.prev_measured_at IS NOT NULL
  AND extract(epoch FROM (g.measured_at - g.prev_measured_at)) / 60.0 > p_gap_threshold_minutes
ORDER BY g.mac_address, g.gap_start;
$$ LANGUAGE sql;
```

### Sensor Health Summary SQL Function

```sql
-- Database function: calculates health stats per sensor
CREATE OR REPLACE FUNCTION get_sensor_health(
  p_hours integer DEFAULT 24
)
RETURNS TABLE(
  mac_address text,
  display_name text,
  latest_battery_voltage double precision,
  latest_rssi integer,
  latest_movement_counter integer,
  last_seen timestamptz,
  total_readings bigint,
  total_gap_minutes double precision,
  uptime_pct double precision
) AS $$
WITH latest AS (
  SELECT DISTINCT ON (sr.mac_address)
    sr.mac_address,
    sr.battery_voltage,
    sr.rssi,
    sr.movement_counter,
    sr.measured_at
  FROM sensor_readings sr
  WHERE sr.measured_at > now() - make_interval(hours => p_hours)
    AND sr.is_outlier = false
  ORDER BY sr.mac_address, sr.measured_at DESC
),
gaps AS (
  SELECT
    g.mac_address,
    sum(extract(epoch FROM (g.measured_at - g.prev_measured_at)) / 60.0) AS gap_minutes
  FROM (
    SELECT
      sr.mac_address,
      sr.measured_at,
      lag(sr.measured_at) OVER (
        PARTITION BY sr.mac_address
        ORDER BY sr.measured_at
      ) AS prev_measured_at
    FROM sensor_readings sr
    WHERE sr.measured_at > now() - make_interval(hours => p_hours)
      AND sr.is_outlier = false
  ) g
  WHERE g.prev_measured_at IS NOT NULL
    AND extract(epoch FROM (g.measured_at - g.prev_measured_at)) / 60.0 > 15
  GROUP BY g.mac_address
),
counts AS (
  SELECT
    sr.mac_address,
    count(*) AS total_readings
  FROM sensor_readings sr
  WHERE sr.measured_at > now() - make_interval(hours => p_hours)
    AND sr.is_outlier = false
  GROUP BY sr.mac_address
)
SELECT
  l.mac_address,
  sc.display_name,
  l.battery_voltage AS latest_battery_voltage,
  l.rssi AS latest_rssi,
  l.movement_counter AS latest_movement_counter,
  l.measured_at AS last_seen,
  c.total_readings,
  coalesce(g.gap_minutes, 0) AS total_gap_minutes,
  case
    when p_hours * 60 > 0 then
      round((1.0 - coalesce(g.gap_minutes, 0) / (p_hours * 60.0)) * 100, 1)
    else 100.0
  end AS uptime_pct
FROM latest l
JOIN sensor_config sc ON sc.mac_address = l.mac_address AND sc.unassigned_at IS NULL
LEFT JOIN gaps g ON g.mac_address = l.mac_address
LEFT JOIN counts c ON c.mac_address = l.mac_address;
$$ LANGUAGE sql;
```

### Area Chart with Gradient Fill (Apple Health Style)

```typescript
// Source: Recharts official Area API + gradient pattern
// components/history/trend-chart.tsx

import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceArea } from 'recharts'

const ROOM_COLORS = [
  { stroke: '#3b82f6', fill: '#3b82f6' }, // blue-500
  { stroke: '#8b5cf6', fill: '#8b5cf6' }, // violet-500
  { stroke: '#f59e0b', fill: '#f59e0b' }, // amber-500
]

function TrendChart({ data, rooms, gaps, metric, domain }) {
  return (
    <AreaChart
      data={data}
      responsive
      height={400}
      width="100%"
    >
      <defs>
        {rooms.map((room, i) => (
          <linearGradient key={room.mac} id={`gradient-${room.mac}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ROOM_COLORS[i % ROOM_COLORS.length].fill} stopOpacity={0.3} />
            <stop offset="100%" stopColor={ROOM_COLORS[i % ROOM_COLORS.length].fill} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>

      <XAxis
        dataKey="timestamp"
        type="number"
        domain={[domain.left, domain.right]}
        tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
        scale="time"
      />
      <YAxis />

      <Tooltip shared={tooltipMode === 'shared'} content={<ChartTooltip />} />

      {/* Gap regions */}
      {gaps.map((gap, i) => (
        <ReferenceArea
          key={`gap-${i}`}
          x1={new Date(gap.gap_start).getTime()}
          x2={new Date(gap.gap_end).getTime()}
          fill="currentColor"
          fillOpacity={0.05}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeDasharray="4 4"
        />
      ))}

      {/* One Area per room */}
      {rooms.map((room, i) => (
        <Area
          key={room.mac}
          type="monotone"
          dataKey={`${room.mac}_${metric}`}
          stroke={ROOM_COLORS[i % ROOM_COLORS.length].stroke}
          fill={`url(#gradient-${room.mac})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      ))}
    </AreaChart>
  )
}
```

### Summary Stats Query

```sql
-- Summary stats for a time range per sensor
SELECT
  sr.mac_address,
  sc.display_name,
  min(sr.temperature) AS min_temp,
  max(sr.temperature) AS max_temp,
  round(avg(sr.temperature)::numeric, 1) AS avg_temp,
  min(sr.humidity) AS min_humidity,
  max(sr.humidity) AS max_humidity,
  round(avg(sr.humidity)::numeric, 1) AS avg_humidity,
  min(sr.pressure / 100.0) AS min_pressure_hpa,
  max(sr.pressure / 100.0) AS max_pressure_hpa,
  round(avg(sr.pressure / 100.0)::numeric, 1) AS avg_pressure_hpa
FROM sensor_readings sr
JOIN sensor_config sc ON sc.mac_address = sr.mac_address AND sc.unassigned_at IS NULL
WHERE sr.measured_at >= $1
  AND sr.measured_at <= $2
  AND sr.is_outlier = false
GROUP BY sr.mac_address, sc.display_name;
```

### localStorage-Persisted State Hook

```typescript
// lib/hooks/use-persisted-state.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(defaultValue)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setState(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
  }, [key])

  const setPersistedState = useCallback((value: T) => {
    setState(value)
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore storage quota errors
    }
  }, [key])

  return [state, setPersistedState]
}
```

## Discretion Recommendations

### Charting Library Choice

**Recommendation: Recharts 3.7.x.** Already in the project stack. Handles the data volumes for this project (up to ~26k points per sensor at 30 days). Smooth curves via `type="monotone"`, area fill via gradient `<linearGradient>`, gap visualization via `ReferenceArea`. The main gap is zoom/pan, which requires ~80 lines of custom hook code. This is acceptable given the rest of the ecosystem fits perfectly.

### Room Line Color Palette

**Recommendation:** Use distinct, perceptually-separated colors that work in both light and dark mode:
- Bedroom: `#3b82f6` (blue-500) -- calm, associated with sleep
- Kid's room: `#8b5cf6` (violet-500) -- playful, distinct from blue
- Living room: `#f59e0b` (amber-500) -- warm, living/social space

These colors have sufficient contrast on both white and dark backgrounds. They are also distinguishable for common color vision deficiencies (blue/purple/amber pass deuteranopia simulation).

### Chart Animation/Transition Behavior

**Recommendation:** Disable initial animation on the AreaChart (`isAnimationActive={false}`) to avoid distracting motion when the page loads or the user switches metrics/time ranges. The chart should appear instantly. During zoom/pan interactions, use no animation to maintain responsiveness. The only animation should be a smooth 200ms transition on the XAxis domain when clicking a preset time range button (24h, 7d, 30d).

### Table Sorting Defaults on Health Page

**Recommendation:** Default sort by sensor name (alphabetical ascending). This provides a predictable, scannable order. The sort state should show the sorted column with an arrow indicator. Secondary recommendation: if any sensor has a "critical" severity (stale data), float it to the top by default. This surfaces problems immediately.

### Responsive Layout Breakpoints for Charts

**Recommendation:**
- Mobile (<640px / `sm`): Chart height 250px, pill buttons wrap to 2 rows if needed, summary stats stack vertically, room selector scrolls horizontally
- Tablet (640-1024px / `lg`): Chart height 350px, all controls fit in single rows
- Desktop (>1024px): Chart height 400px, full layout with generous whitespace

Use the Recharts `responsive` prop with percentage width and fixed pixel heights. The chart container should be `w-full`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ResponsiveContainer` wrapper | `responsive` prop on chart component | Recharts 3.3.0 (2025) | One fewer wrapper component; uses standard CSS sizing |
| Recharts 2.x state management | Recharts 3.x internal state rewrite | 3.0 (2025) | Significant reliability improvements for tooltip positioning, animation, and resize handling |
| Manual `react-day-picker` integration | shadcn/ui Calendar component | shadcn/ui 2025 | Pre-styled, accessible calendar with Tailwind integration; range mode built-in |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Already in use since Phase 2; use `createBrowserClient` for chart data fetching |

**Deprecated/outdated:**
- `ResponsiveContainer` in Recharts 3.x: Still works but `responsive` prop is the modern approach
- `recharts@2.x`: Version 3.x has critical state management fixes; do not use 2.x
- Building custom date pickers: Use shadcn/ui Calendar + Popover with react-day-picker

## Open Questions

1. **Data volume for custom date ranges**
   - What we know: Preset ranges (24h, 7d, 30d) can use predefined bucket sizes. Custom ranges could span any duration from 1 day to many months.
   - What's unclear: How to dynamically choose the right bucket size for arbitrary custom ranges so the chart has 500-2000 points (ideal for readability and performance).
   - Recommendation: Calculate bucket size dynamically: `bucket_minutes = max(5, floor(range_hours * 60 / 1500))`. This caps at ~1500 points per sensor regardless of range. **Confidence: HIGH** -- standard downsampling approach.

2. **Recharts performance at maximum data load**
   - What we know: 3 sensors x 1500 aggregated points = 4500 total data points in the chart. Recharts handles this well.
   - What's unclear: Whether custom zoom/pan with frequent domain updates will cause performance issues at this scale.
   - Recommendation: Throttle zoom/pan handlers to 50ms intervals. Use `isAnimationActive={false}` during interactions. Profile during implementation and add further optimization if needed. **Confidence: MEDIUM** -- needs verification with actual rendering performance.

3. **ReferenceArea tooltip for gap hover**
   - What we know: `ReferenceArea` supports mouse event handlers (`onMouseEnter`, `onMouseLeave`). The standard Recharts `Tooltip` component does not automatically show content for `ReferenceArea` -- it only responds to data points.
   - What's unclear: Whether a custom tooltip overlay (positioned via mouse coordinates) is needed for gap hover, or if there is a cleaner Recharts approach.
   - Recommendation: Use `ReferenceArea` mouse events to show a custom absolute-positioned div with gap duration and time range. This avoids fighting Recharts' built-in tooltip system. **Confidence: MEDIUM** -- working pattern but requires custom positioning logic.

4. **Navigation between dashboard and history/health pages**
   - What we know: Phase 2 built a single-page dashboard. Phase 3 adds two new pages (history and health). The user wants health page links from dashboard warning icons.
   - What's unclear: Whether to use Next.js App Router navigation (`<Link>`) or client-side navigation. Whether the header should include page navigation links.
   - Recommendation: Add a simple navigation in the header (e.g., Dashboard | History | Health links). Use Next.js `<Link>` for client-side navigation with prefetching. Health warning icons on room cards should link to `/health`. **Confidence: HIGH** -- standard Next.js routing pattern.

## Sources

### Primary (HIGH confidence)
- [Recharts AreaChart API](https://recharts.github.io/en-US/api/AreaChart/) -- responsive prop, child components, syncId, event handlers
- [Recharts Area API](https://recharts.github.io/en-US/api/Area/) -- type="monotone", connectNulls, fill, gradient, strokeDasharray, animationDuration
- [Recharts Tooltip API](https://recharts.github.io/en-US/api/Tooltip/) -- shared prop, cursor, content customization, filterNull
- [Recharts Brush API](https://recharts.github.io/en-US/api/Brush/) -- startIndex, endIndex, onChange, travellerWidth
- [Recharts ReferenceArea API](https://recharts.github.io/en-US/api/ReferenceArea/) -- x1/x2 coordinate props, fillOpacity, strokeDasharray, mouse events
- [Recharts 3.3.0 release notes](https://github.com/recharts/recharts/releases/tag/v3.3.0) -- responsive prop, ResponsiveContainer replacement
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/) -- memoization, data decimation, throttling
- [shadcn/ui Date Picker docs](https://ui.shadcn.com/docs/components/radix/date-picker) -- Calendar + Popover composition, mode="range"
- [shadcn/ui Data Table docs](https://ui.shadcn.com/docs/components/radix/data-table) -- @tanstack/react-table integration, SortingState, column definitions
- [Phase 1 schema: 001_schema.sql](/Users/jarmoniskala/Documents/iot/supabase/migrations/001_schema.sql) -- sensor_readings partitioned table, pressure in Pascals
- [Phase 2 research: 02-RESEARCH.md](/Users/jarmoniskala/Documents/iot/.planning/phases/02-live-dashboard/02-RESEARCH.md) -- Supabase client patterns, existing component structure

### Secondary (MEDIUM confidence)
- [Recharts zoom/pan discussion](https://github.com/recharts/recharts/discussions/3452) -- confirmed no built-in zoom/pan; custom implementation required
- [Recharts highlight & zoom example](https://recharts.github.io/en-US/examples/HighlightAndZoomLineChart/) -- official drag-select zoom pattern using ReferenceArea + domain state
- [PostgreSQL gap detection patterns](https://www.endpointdev.com/blog/2020/10/postgresql-finding-gaps-in-time-series-data/) -- generate_series anti-join for finding missing intervals
- [shadcn/ui Zoomable Chart implementation](https://next.jqueryscript.net/shadcn-ui/zoomable-chart-interactive/) -- onWheel zoom with focal point, drag pan, React state management
- [react-day-picker v9.13.x](https://daypicker.dev/) -- mode="range" for date range selection, React 19 compatible
- [@tanstack/react-table v8.21.x](https://tanstack.com/table/latest) -- getSortedRowModel, getExpandedRowModel, React 19 compatible

### Tertiary (LOW confidence)
- [Recharts performance at scale](https://www.oreateai.com/blog/recharts-vs-chartjs-navigating-the-performance-maze-for-big-data-visualizations/) -- claims Recharts handles 100k+ points; needs verification with actual zoom/pan interactions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts 3.7, @tanstack/react-table 8.21, react-day-picker 9.13 all verified via official docs and npm; React 19 compatible
- Architecture: HIGH -- server component data fetch + client chart pattern is the same as Phase 2; PostgreSQL aggregation functions are standard SQL
- Chart interactions (zoom/pan): MEDIUM -- Recharts has no built-in support; custom implementation pattern is well-documented but requires careful throttling for performance
- Gap visualization: MEDIUM -- ReferenceArea styling confirmed; custom tooltip for gap hover requires bespoke positioning logic
- Health table: HIGH -- @tanstack/react-table sorting and expansion are well-documented official features
- SQL patterns: HIGH -- date_trunc aggregation, LAG window function gap detection, CTE-based health summary are all standard PostgreSQL
- Pitfalls: HIGH -- pressure unit mismatch, timezone confusion, partition scanning, and re-render performance are real, documented risks

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- stack is stable, no major releases expected)
