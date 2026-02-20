# Phase 3: History and Health - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Historical trend charts for temperature, humidity, and pressure per room with time range selection and room comparison. Dedicated system health page showing battery, signal, movement, and uptime per sensor. Data gap visualization in charts. Does NOT include alerting/notifications, data export, or automated actions.

</domain>

<decisions>
## Implementation Decisions

### Chart design & interaction
- Smooth line charts with curved lines and area fill beneath (Apple Health / Vercel Analytics style)
- Tooltip mode toggle: user can switch between "all rooms at that timestamp" (vertical crosshair) and "single line value" (nearest line)
- Scroll to zoom + drag to pan for in-chart data exploration
- One metric at a time: tabs or buttons to switch between temperature, humidity, and pressure — rooms overlay within the selected metric

### Time range controls
- Horizontal pill button row above chart: 24h | 7d | 30d | Custom
- Custom range via date picker popover (calendar UI for start and end dates)
- Summary stats (min, max, average) displayed below the chart for the selected time range
- Selected time range and room selection persisted in localStorage across page reloads

### Health page layout
- Table view with sortable columns: sensor name, battery voltage, signal strength, movement counter, last seen, uptime %
- Color-coded rows based on severity: green (healthy), amber (warning — e.g., low battery), red (critical — e.g., stale data)
- Expandable row detail: click a sensor row to expand and see full battery voltage and signal strength trend charts below
- Uptime percentage and total gap time per sensor shown in the table

### Health indicators on dashboard
- Subtle warning icons on room cards when battery is low or data is stale
- Icons link to the health page for details

### Data gap visualization
- Dashed line + light shaded band marks gap periods in trend charts
- Gap threshold: same as live dashboard staleness (3 missed update cycles)
- Hover tooltip on gaps shows duration and time range (e.g., "Offline 2h 15m — 14:30 to 16:45")

### Claude's Discretion
- Charting library choice
- Exact color palette for room lines
- Chart animation/transition behavior
- Table sorting defaults on health page
- Responsive layout breakpoints for charts

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-history-and-health*
*Context gathered: 2026-02-18*
