# Phase 2: Live Dashboard - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time dashboard showing current temperature, humidity, and pressure for every room (bedroom, kid's room, living room) plus outdoor FMI weather and computed comfort metrics on a single page. Historical trends and system health views are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Room card layout
- One card per room showing all sensor readings
- Temperature is the primary/dominant reading (large), humidity and pressure secondary (smaller)
- Comfort metrics (dew point, absolute humidity, comfort class) always visible on card — not hidden behind expand
- Icon + name for room identification (bed, child, couch icons)
- Room names and icons are user-editable from the dashboard
- User-selectable card ordering: alphabetical, by temperature, or custom drag-to-reorder
- Custom drag order persisted to localStorage across sessions
- Sort controls via subtle icon (not prominent top bar)

### Outdoor weather display
- Distinct visual section — clearly separated from indoor room cards (not same card format)
- Side panel layout: beside room cards on desktop, stacked on mobile
- Collapsible on mobile — collapsed shows temperature + condition icon, expandable for full details
- Show all FMI fields: temperature, humidity, wind speed, wind direction, pressure, precipitation, cloud cover
- Derived weather condition icon + text label from cloud cover and precipitation data
- Wind direction shown as rotating arrow icon + compass direction (e.g., NW)
- Precipitation with number + descriptive label (e.g., "2.1 mm — Light rain")
- Relative timestamp ("Updated 10 min ago") showing observation freshness

### Comfort & status indicators
- Comfort classification uses all three: color-coded badge, subtle card background tint, and text label
- Color scheme: green=comfortable, yellow=dry, orange=humid, red=very humid
- Stale sensor data: card dims/grays out + warning icon + "Last seen X min ago"
- Battery indicator hidden by default, only shows when battery drops below threshold (low battery warning)
- "Updated X min ago" timestamp always visible on every room card

### Data refresh
- Supabase Realtime subscription — data appears the instant it's inserted into the database

### Overall look & feel
- Dark mode by default on first visit, with toggle to switch
- Minimal & clean visual style — lots of whitespace, subtle borders, restrained colors (Linear/Vercel aesthetic)
- Mobile layout: 2-column grid with cards side by side, vertical scroll (not horizontal swipe)
- Desktop: room cards in grid with outdoor weather side panel

### Claude's Discretion
- Exact color palette and typography choices
- Card border/shadow styling details
- Loading state and skeleton design
- Error state handling (API errors, connection issues)
- Exact battery threshold for low warning
- Dark mode toggle placement
- Responsive breakpoints between mobile 2-col grid and desktop layout
- Weather condition derivation logic (mapping cloud cover + precipitation to condition labels)

</decisions>

<specifics>
## Specific Ideas

- Linear/Vercel aesthetic for the overall design — clean, not cluttered
- Comfort classification should be immediately glanceable without reading numbers
- Weather panel should feel like useful context alongside indoor readings, not a separate weather app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-live-dashboard*
*Context gathered: 2026-02-17*
