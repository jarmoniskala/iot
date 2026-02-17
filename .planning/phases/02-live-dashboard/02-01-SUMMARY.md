---
phase: 02-live-dashboard
plan: 01
subsystem: ui
tags: [nextjs, supabase-realtime, shadcn-ui, tailwind-v4, dark-mode, comfort-metrics, weather, typescript]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: "sensor_readings, weather_observations, and sensor_config tables with monthly partitioning and edge functions"
provides:
  - "Next.js 16 App Router project with Tailwind v4 and shadcn/ui"
  - "Supabase browser and server client utilities"
  - "Live dashboard with room cards, weather panel, and Realtime subscriptions"
  - "Comfort metric functions: dewPoint, absoluteHumidity, classifyComfort"
  - "Weather condition derivation from WMO 4680 codes with cloud cover fallback"
  - "Staleness detection for sensors (3min) and weather (30min)"
  - "Database migration 004: Realtime publication, dashboard views, RLS policies"
  - "Dark mode default with toggle"
affects: [02-02, 03-history]

# Tech tracking
tech-stack:
  added: ["next@16.1.6", "react@19.2.3", "tailwindcss@4", "shadcn/ui (new-york)", "@supabase/ssr@0.8", "@supabase/supabase-js@2.96", "next-themes@0.4", "date-fns@4", "lucide-react", "@dnd-kit/core@6.3", "@dnd-kit/sortable@10.0", "tw-animate-css"]
  patterns: ["Server component initial fetch + client component Realtime subscription", "Supabase createBrowserClient/createServerClient via @supabase/ssr", "next-themes ThemeProvider with class attribute for dark mode", "useNow() hook for periodic timestamp refresh", "postgres_changes subscription with removeChannel cleanup"]

key-files:
  created:
    - "app/page.tsx"
    - "app/layout.tsx"
    - "app/providers.tsx"
    - "app/error.tsx"
    - "app/globals.css"
    - "components/dashboard/realtime-provider.tsx"
    - "components/dashboard/room-card.tsx"
    - "components/dashboard/room-grid.tsx"
    - "components/dashboard/weather-panel.tsx"
    - "components/dashboard/dark-mode-toggle.tsx"
    - "lib/supabase/client.ts"
    - "lib/supabase/server.ts"
    - "lib/types.ts"
    - "lib/comfort.ts"
    - "lib/weather.ts"
    - "lib/staleness.ts"
    - "lib/constants.ts"
    - "supabase/migrations/004_realtime_and_views.sql"
  modified: []

key-decisions:
  - "Scaffolded in temp directory then copied to avoid create-next-app conflicts with existing supabase/ and .planning/ dirs"
  - "Installed @dnd-kit with --legacy-peer-deps for React 19 compatibility"
  - "Used force-dynamic on page.tsx to ensure server-side Supabase queries run on each request"
  - "Weather panel uses WMO 4680 wawa code as primary condition source with cloud cover fallback"
  - "Comfort colors: emerald=comfortable, amber=dry, orange=humid, red=very humid (applied as badge + tint + label)"
  - "Pressure conversion at display time: sensorPressureToHpa() divides Pa by 100"
  - "RealtimeProvider uses render props pattern to pass live data to children"
  - "Mobile weather panel is collapsible (collapsed by default) showing only temp + condition"

patterns-established:
  - "Server component fetch + Realtime client component: page.tsx fetches initial data, RealtimeProvider subscribes for live updates"
  - "Supabase client pattern: lib/supabase/client.ts (browser) and lib/supabase/server.ts (server) with @supabase/ssr"
  - "Comfort metric pattern: pure functions in lib/comfort.ts, computed client-side at render time"
  - "Staleness pattern: threshold-based with useNow() hook for periodic re-evaluation"
  - "Weather derivation pattern: WMO code lookup with cloud cover fallback in lib/weather.ts"
  - "Theme pattern: next-themes ThemeProvider in app/providers.tsx with defaultTheme=dark"

requirements-completed: [LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07, COMP-01, COMP-02, COMP-03]

# Metrics
duration: 8min
completed: 2026-02-17
---

# Phase 2 Plan 1: Live Dashboard Summary

**Next.js 16 real-time dashboard with room cards showing comfort metrics (dew point, absolute humidity, comfort class), FMI weather side panel with WMO 4680 condition derivation, and Supabase Realtime subscriptions for instant data updates**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-17T20:46:11Z
- **Completed:** 2026-02-17T20:54:16Z
- **Tasks:** 2
- **Files modified:** 18 hand-authored + scaffold files

## Accomplishments
- Complete Next.js 16 project with Tailwind v4, shadcn/ui (new-york style), Geist font, and dark mode default
- Live-updating dashboard with Supabase Realtime subscriptions for sensor_readings, weather_observations, and sensor_config
- Room cards displaying temperature (primary), humidity, pressure (hPa), dew point, absolute humidity, comfort classification (badge + tint + label), relative timestamps with auto-refresh, staleness dimming, and conditional battery warnings
- Weather side panel showing all FMI fields with WMO 4680 condition derivation, wind compass direction, precipitation labels, cloud cover descriptions, and mobile collapsible layout
- Database migration 004 enabling Realtime publication, creating latest_sensor_readings and latest_weather views, and setting up RLS policies for anonymous access
- All comfort metric functions (Magnus dew point, Bolton absolute humidity, ASHRAE comfort classification) and weather utilities (wawa code mapping, cloud cover fallback, wind compass, precipitation labels)

## Task Commits

Each task was committed atomically:

1. **Task 1: Next.js scaffold, dependencies, Supabase clients, database migration, types, and utility functions** - `f69351d` (feat)
2. **Task 2: Dashboard page with room cards, weather panel, Realtime subscriptions, and responsive layout** - `578f062` (feat)

## Files Created/Modified
- `app/page.tsx` - Server component fetching from Supabase views, rendering dashboard with RealtimeProvider
- `app/layout.tsx` - Root layout with Geist font, ThemeProvider wrapper, suppressHydrationWarning
- `app/providers.tsx` - Client component wrapping next-themes ThemeProvider (dark default)
- `app/error.tsx` - Error boundary with retry button
- `app/globals.css` - Tailwind v4 CSS-first config with shadcn/ui OKLCH color variables
- `components/dashboard/realtime-provider.tsx` - Supabase Realtime subscriptions for sensor_readings, weather_observations, sensor_config
- `components/dashboard/room-card.tsx` - Room card with temperature, humidity, pressure, comfort metrics, staleness, battery
- `components/dashboard/room-grid.tsx` - Responsive grid (2-col mobile, 3-col desktop)
- `components/dashboard/weather-panel.tsx` - FMI weather panel (side panel desktop, collapsible mobile)
- `components/dashboard/dark-mode-toggle.tsx` - Sun/Moon theme toggle
- `lib/supabase/client.ts` - Browser Supabase client via createBrowserClient
- `lib/supabase/server.ts` - Server Supabase client via createServerClient with cookie handling
- `lib/types.ts` - TypeScript interfaces matching Phase 1 database schema
- `lib/comfort.ts` - dewPoint, absoluteHumidity, classifyComfort, sensorPressureToHpa
- `lib/weather.ts` - weatherConditionFromCode, weatherConditionFromCloudCover, precipitationLabel, windDirectionToCompass, cloudCoverLabel
- `lib/staleness.ts` - isSensorStale, isWeatherStale, useNow hook
- `lib/constants.ts` - BATTERY_LOW_THRESHOLD_V, ROOM_ICONS, COMFORT_COLORS, staleness thresholds
- `supabase/migrations/004_realtime_and_views.sql` - Realtime publication, views, RLS policies

## Decisions Made
- Scaffolded Next.js in a temp directory then copied files to avoid create-next-app refusing to run in a directory with existing files (supabase/, .planning/)
- Installed @dnd-kit with --legacy-peer-deps flag for React 19 peer dependency compatibility
- Used `export const dynamic = 'force-dynamic'` on page.tsx to ensure Supabase queries execute on each request (not statically cached)
- RealtimeProvider uses render props pattern (children function) to pass live data downstream without React context overhead
- Weather condition derivation uses WMO 4680 wawa code as primary source with cloud cover + precipitation fallback when wawa is null/NaN
- Mobile weather panel collapsed by default, showing only temperature and condition icon
- Pressure conversion (Pa to hPa) handled at display time via sensorPressureToHpa() utility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- create-next-app refused to run in the project directory due to existing files (supabase/, .planning/). Resolved by scaffolding in /tmp and copying files back, then running npm install to fix symlinks.

## User Setup Required

None - the `.env.local` file has placeholder values that need to be updated with real Supabase project URL and anon key before the dashboard can connect to data.

## Next Phase Readiness
- Dashboard is fully functional once connected to a Supabase instance with data
- Plan 02-02 (card sorting, drag-to-reorder, room name editing) builds on this foundation
- All component patterns and utilities are established for extension

## Self-Check: PASSED

All 18 created files verified on disk. Both task commits (f69351d, 578f062) verified in git log.

---
*Phase: 02-live-dashboard*
*Completed: 2026-02-17*
