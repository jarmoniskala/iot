# Phase 2: Live Dashboard - Research

**Researched:** 2026-02-17
**Domain:** Next.js App Router, Supabase Realtime subscriptions, shadcn/ui components, Tailwind CSS v4 dark mode, comfort metric calculations, drag-and-drop reordering
**Confidence:** HIGH

## Summary

Phase 2 builds the primary user-facing value of the entire project: a real-time dashboard showing current temperature, humidity, and pressure for every room (bedroom, kid's room, living room) plus outdoor FMI weather and computed comfort metrics on a single page. The user has made detailed decisions about layout, card design, sorting, dark mode, and data refresh strategy.

The dashboard uses a Next.js 16 App Router application deployed on Vercel, with Supabase Realtime postgres_changes subscriptions for instant data updates. Room cards show live sensor readings with comfort classification (dew point, absolute humidity, comfort class) always visible. An outdoor weather side panel shows all FMI fields. Dark mode is the default, implemented via next-themes with shadcn/ui. Card reordering uses @dnd-kit/sortable with localStorage persistence.

The critical technical challenges are: (1) correctly setting up Supabase Realtime subscriptions in Next.js client components with proper cleanup, (2) enabling Realtime on the partitioned sensor_readings and weather_observations tables, (3) computing comfort metrics client-side from sensor data (dew point via Magnus formula, absolute humidity via saturation vapor pressure), and (4) deriving weather condition labels from FMI's numeric cloud_cover and weather_code fields.

**Primary recommendation:** Build the Next.js project with shadcn/ui, use server components for initial data fetch from Supabase (latest readings + latest weather), use a single client component wrapper for Realtime subscriptions that updates React state on INSERT events, compute comfort metrics with pure TypeScript functions, and derive weather conditions from the WMO 4680 wawa code stored in the database.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- One card per room showing all sensor readings
- Temperature is the primary/dominant reading (large), humidity and pressure secondary (smaller)
- Comfort metrics (dew point, absolute humidity, comfort class) always visible on card -- not hidden behind expand
- Icon + name for room identification (bed, child, couch icons)
- Room names and icons are user-editable from the dashboard
- User-selectable card ordering: alphabetical, by temperature, or custom drag-to-reorder
- Custom drag order persisted to localStorage across sessions
- Sort controls via subtle icon (not prominent top bar)
- Distinct visual section for outdoor weather -- clearly separated from indoor room cards (not same card format)
- Side panel layout: beside room cards on desktop, stacked on mobile
- Collapsible on mobile -- collapsed shows temperature + condition icon, expandable for full details
- Show all FMI fields: temperature, humidity, wind speed, wind direction, pressure, precipitation, cloud cover
- Derived weather condition icon + text label from cloud cover and precipitation data
- Wind direction shown as rotating arrow icon + compass direction (e.g., NW)
- Precipitation with number + descriptive label (e.g., "2.1 mm -- Light rain")
- Relative timestamp ("Updated 10 min ago") showing observation freshness
- Comfort classification uses all three: color-coded badge, subtle card background tint, and text label
- Color scheme: green=comfortable, yellow=dry, orange=humid, red=very humid
- Stale sensor data: card dims/grays out + warning icon + "Last seen X min ago"
- Battery indicator hidden by default, only shows when battery drops below threshold (low battery warning)
- "Updated X min ago" timestamp always visible on every room card
- Supabase Realtime subscription -- data appears the instant it is inserted into the database
- Dark mode by default on first visit, with toggle to switch
- Minimal & clean visual style -- lots of whitespace, subtle borders, restrained colors (Linear/Vercel aesthetic)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIVE-01 | User can see current temperature, humidity, and pressure for each room (bedroom, kid's room, living room) | Server component fetches latest sensor_readings per MAC via DISTINCT ON query; client component subscribes to Realtime INSERT events on sensor_readings table for live updates |
| LIVE-02 | User can see current outdoor weather from FMI (temperature, humidity, wind speed, pressure, precipitation, cloud cover) | Server component fetches latest weather_observations row; client subscribes to INSERT events on weather_observations table; all 13 FMI parameters available in schema |
| LIVE-03 | User can compare indoor vs outdoor readings side-by-side | Side panel layout (desktop: beside room cards; mobile: stacked) provides spatial comparison; same page, same viewport |
| LIVE-04 | Each sensor shows "last updated X minutes ago" with visual warning if data is stale | date-fns `formatDistanceToNow()` for relative timestamps; staleness = 3 missed update cycles computed from per-sensor observed interval; stale cards dim/gray + warning icon |
| LIVE-05 | Each sensor shows battery level indicator (low/ok/good) | Battery voltage stored in sensor_readings; threshold-based classification (e.g., below 2.4V = low); hidden by default, shows warning icon only when low |
| LIVE-06 | Dashboard is mobile-responsive (works well on phone screens) | Tailwind CSS v4 responsive utilities; 2-column grid on mobile, wider grid on desktop; outdoor weather panel stacks below on mobile and is collapsible |
| LIVE-07 | Dashboard supports dark mode toggle | next-themes with shadcn/ui ThemeProvider; `defaultTheme="dark"` for dark-by-default; toggle button in header area |
| COMP-01 | Dashboard shows dew point calculated from temperature and humidity per room | Magnus formula: Td = (243.04 * ln(RH/100) + (17.625*T)/(243.04+T)) / (17.625 - ln(RH/100) - (17.625*T)/(243.04+T)); pure TypeScript function |
| COMP-02 | Dashboard shows absolute humidity per room | Formula: AH = (6.112 * e^((17.67*T)/(T+243.5)) * RH * 2.1674) / (273.15+T) g/m3; pure TypeScript function |
| COMP-03 | Dashboard shows comfort classification per room (dry/comfortable/humid/very humid) | Classification based on relative humidity ranges: dry (<30%), comfortable (30-60%), humid (60-70%), very humid (>70%); dew point used as secondary signal for edge cases |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.x | Full-stack React framework (App Router) | Mature App Router, server components for initial data load, deploys to Vercel with zero config. Already chosen as project standard. |
| React | 19.2.x | UI library | Ships with Next.js 16. Server Components for data fetching, client components for Realtime subscriptions. |
| TypeScript | 5.9.x | Type safety | Stable version. Do NOT use 6.0 beta. |
| Tailwind CSS | 4.x | Utility-first styling | CSS-first configuration (no tailwind.config.js). Built-in container queries. Dark mode via `class` strategy with next-themes. |
| shadcn/ui | latest (CLI) | Component library | Copies components into codebase. Uses Radix UI primitives. Tailwind v4 compatible. Provides Card, Badge, Button, Separator, Skeleton, and Collapsible components. |
| @supabase/supabase-js | 2.95.x | Supabase client (queries + Realtime) | Handles database queries AND Realtime channel subscriptions from client components. |
| @supabase/ssr | 0.8.x | Server-side Supabase client | Creates proper server/client Supabase instances for Next.js App Router. `createBrowserClient` for client components, `createServerClient` for server components. |
| next-themes | latest | Dark mode toggle | Standard library for Next.js theme management. Works with shadcn/ui out of the box. Handles SSR hydration mismatch via `suppressHydrationWarning`. |
| date-fns | 4.x | Relative timestamps | `formatDistanceToNow()` for "Updated X min ago" display. Tree-shakeable. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | 6.3.x | Drag-and-drop foundation | Required for custom card reordering feature |
| @dnd-kit/sortable | 10.0.x | Sortable preset for drag reorder | Thin layer on top of @dnd-kit/core for reorderable grid |
| @dnd-kit/utilities | 3.x | CSS transform utilities | Helper for applying drag transforms to DOM elements |
| lucide-react | latest | Icon library | Room icons (bed, baby, sofa), weather icons (wind, droplets, thermometer, cloud), status icons (alert-triangle, battery-low). Used by shadcn/ui. |
| tw-animate-css | latest | Animation utilities | Replacement for deprecated tailwindcss-animate in Tailwind v4. Required by shadcn/ui. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/react (new experimental) | @dnd-kit/react is a rewrite with new API (DragDropProvider instead of DndContext). Still experimental with limited documentation. Stable packages are safer for production. |
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained (archived by Atlassian). @dnd-kit is the modern replacement. |
| @dnd-kit | Native HTML drag and drop | Native DnD API is inconsistent across browsers and lacks the smooth animations @dnd-kit provides. Not worth hand-rolling. |
| next-themes | Manual dark mode with state | next-themes handles SSR hydration, system preference detection, and localStorage persistence. Reimplementing these is non-trivial. |
| lucide-react | heroicons or phosphor-react | lucide-react is the icon library used by shadcn/ui. Using a different library adds unnecessary bundle weight. |

**Installation:**
```bash
# Core dependencies (add to existing project)
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query date-fns next-themes

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# shadcn/ui setup (interactive -- copies components into codebase)
npx shadcn@latest init

# Add specific shadcn/ui components
npx shadcn@latest add card badge button separator skeleton collapsible
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── layout.tsx               # Root layout with ThemeProvider + Supabase client
├── page.tsx                 # Dashboard page (server component -- initial data fetch)
├── globals.css              # Tailwind v4 CSS with @theme inline + dark mode colors
├── providers.tsx             # Client component wrapping ThemeProvider
components/
├── ui/                      # shadcn/ui components (Card, Badge, Button, etc.)
├── dashboard/
│   ├── room-card.tsx         # Single room card with readings + comfort metrics
│   ├── room-grid.tsx         # Sortable grid of room cards (client component)
│   ├── weather-panel.tsx     # Outdoor weather side panel (client component)
│   ├── sort-controls.tsx     # Sort dropdown (alpha, temp, custom)
│   ├── dark-mode-toggle.tsx  # Theme toggle button
│   └── realtime-provider.tsx # Supabase Realtime subscription manager
lib/
├── supabase/
│   ├── client.ts             # Browser Supabase client (for client components + Realtime)
│   └── server.ts             # Server Supabase client (for server components)
├── comfort.ts                # Dew point, absolute humidity, comfort class calculations
├── weather.ts                # Weather condition derivation from wawa code + cloud cover
├── staleness.ts              # Staleness detection logic
├── types.ts                  # TypeScript types for sensor readings, weather, config
└── constants.ts              # Thresholds, room icons, color mappings
```

### Pattern 1: Server Component Initial Fetch + Client Component Realtime

**What:** The page server component fetches the latest data from Supabase at request time. It passes this data as props to a client component that subscribes to Realtime for live updates.
**When to use:** Every dashboard page load.

```typescript
// app/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { Dashboard } from '@/components/dashboard/dashboard'

export default async function Home() {
  const supabase = await createClient()

  // Fetch latest reading per sensor
  const { data: sensorReadings } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('measured_at', { ascending: false })

  // Get latest per MAC (DISTINCT ON equivalent via client-side dedup)
  const latestByMac = new Map()
  for (const reading of sensorReadings ?? []) {
    if (!latestByMac.has(reading.mac_address)) {
      latestByMac.set(reading.mac_address, reading)
    }
  }

  // Fetch sensor config for display names and room assignments
  const { data: sensorConfig } = await supabase
    .from('sensor_config')
    .select('*')
    .is('unassigned_at', null)

  // Fetch latest weather observation
  const { data: weather } = await supabase
    .from('weather_observations')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <Dashboard
      initialReadings={Array.from(latestByMac.values())}
      sensorConfig={sensorConfig ?? []}
      initialWeather={weather}
    />
  )
}
```

**Note on server-side latest reading query:** The ideal approach is a PostgreSQL view using `DISTINCT ON (mac_address) ... ORDER BY mac_address, measured_at DESC`, but the Supabase JS client does not support `DISTINCT ON`. Options: (1) create a database view `latest_sensor_readings` and query that, (2) use `.rpc()` to call a database function, or (3) fetch recent readings and deduplicate client-side. **Recommendation: Create a database view** -- this is the cleanest approach and was already suggested in Phase 1 architecture research.

### Pattern 2: Supabase Realtime Subscription in Client Component

**What:** A client component subscribes to postgres_changes on sensor_readings and weather_observations tables. On each INSERT event, it updates React state.
**When to use:** Wrap the dashboard in this component to receive live updates.

```typescript
// components/dashboard/realtime-provider.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SensorReading, WeatherObservation } from '@/lib/types'

interface RealtimeProviderProps {
  initialReadings: SensorReading[]
  initialWeather: WeatherObservation | null
  children: (props: {
    readings: Map<string, SensorReading>
    weather: WeatherObservation | null
  }) => React.ReactNode
}

export function RealtimeProvider({
  initialReadings,
  initialWeather,
  children,
}: RealtimeProviderProps) {
  const [readings, setReadings] = useState<Map<string, SensorReading>>(() => {
    const map = new Map()
    for (const r of initialReadings) {
      map.set(r.mac_address, r)
    }
    return map
  })
  const [weather, setWeather] = useState(initialWeather)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const newReading = payload.new as SensorReading
          setReadings((prev) => {
            const next = new Map(prev)
            next.set(newReading.mac_address, newReading)
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weather_observations' },
        (payload) => {
          setWeather(payload.new as WeatherObservation)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <>{children({ readings, weather })}</>
}
```

### Pattern 3: Supabase Client Utilities

**What:** Separate utility files for browser and server Supabase clients.
**When to use:** Import the appropriate client based on component type.

```typescript
// lib/supabase/client.ts (Browser client for client components)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts (Server client for server components)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component -- can't set cookies, but that's ok
            // for read-only operations
          }
        },
      },
    }
  )
}
```

### Pattern 4: Dark Mode with next-themes + shadcn/ui

**What:** Dark-by-default theme with toggle. Uses class-based theme switching.
**When to use:** Set up once in root layout.

```typescript
// components/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
```

```typescript
// app/layout.tsx
import { Providers } from '@/components/providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

```typescript
// components/dashboard/dark-mode-toggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Pattern 5: Sortable Card Grid with @dnd-kit

**What:** Room cards are reorderable via drag-and-drop. Order persisted to localStorage.
**When to use:** For custom drag-to-reorder sort mode.

```typescript
// components/dashboard/room-grid.tsx (simplified)
'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export function RoomGrid({ rooms, sortMode }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }, // prevent accidental drags
  }))

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    if (sortMode === 'custom') {
      const saved = localStorage.getItem('card-order')
      return saved ? JSON.parse(saved) : rooms.map(r => r.mac_address)
    }
    return rooms.map(r => r.mac_address)
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCardOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        const newOrder = arrayMove(prev, oldIndex, newIndex)
        localStorage.setItem('card-order', JSON.stringify(newOrder))
        return newOrder
      })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cardOrder.map((id) => (
            <SortableCard key={id} id={id}>
              <RoomCard room={rooms.find(r => r.mac_address === id)!} />
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

### Anti-Patterns to Avoid

- **Polling the database from the client:** Use Supabase Realtime subscriptions, not `setInterval` with repeated fetches. The user explicitly chose Realtime.
- **Computing comfort metrics on the server/database:** Dew point and absolute humidity are simple formulas. Computing them client-side avoids database schema changes and keeps the computation close to the display logic.
- **Using `useEffect` without cleanup for Realtime channels:** Always call `supabase.removeChannel(channel)` in the useEffect cleanup function. Orphaned subscriptions degrade performance.
- **Fetching all sensor readings on page load:** Only fetch the latest reading per sensor, not the entire history. The Realtime subscription handles updates.
- **Storing card order in the database:** This is a UI preference, not data. localStorage is the right persistence layer for card ordering.
- **Using `tailwindcss-animate`:** Deprecated for Tailwind v4. Use `tw-animate-css` instead.
- **Using `tailwind.config.js`:** Tailwind v4 uses CSS-first `@theme` configuration. No config file needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode toggle with SSR | Custom theme state with cookies + localStorage | next-themes | Handles hydration mismatch, system preference, localStorage persistence, and server rendering correctly |
| Drag-and-drop card reordering | Native HTML drag and drop API | @dnd-kit/sortable | Native DnD is inconsistent across browsers and touch devices; @dnd-kit handles animations, accessibility, and pointer/touch/keyboard sensors |
| Relative timestamps | Manual date diff calculations | date-fns `formatDistanceToNow()` | Handles all edge cases (just now, minutes, hours, days) with i18n support |
| Card/Badge/Button components | Custom styled components | shadcn/ui | Pre-built accessible components with dark mode support, consistent styling, Radix UI primitives |
| Responsive grid layout | CSS media queries | Tailwind responsive utilities (`grid-cols-2 lg:grid-cols-3`) | Cleaner, more maintainable, works with Tailwind's design system |
| Weather condition text labels | Custom cloud_cover + precipitation mapping only | WMO 4680 wawa code lookup table | FMI already provides the `wawa` weather code -- it directly encodes the present weather condition. Map it to labels and icons instead of re-deriving from raw data. |

**Key insight:** The FMI `weather_code` column already stores WMO 4680 wawa codes that encode the present weather condition (rain, snow, fog, clear, etc.). Use this as the primary source for weather condition labels and icons, not a custom derivation from cloud_cover + precipitation_1h. The wawa code is more accurate than anything we could derive ourselves.

## Common Pitfalls

### Pitfall 1: Supabase Realtime Not Receiving Events

**What goes wrong:** Dashboard subscribes to postgres_changes but never receives INSERT events.
**Why it happens:** The table must be added to the `supabase_realtime` publication. Without this, Supabase does not broadcast changes. Additionally, RLS policies may block the Realtime subscription from seeing the rows if using anon key.
**How to avoid:** Add a migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_config;
```
Also ensure RLS policies allow SELECT for the anon role on these tables, or consider disabling RLS for a personal dashboard with no authentication (simpler but less secure).
**Warning signs:** Realtime channel enters SUBSCRIBED state but callback never fires. Data appears in the table when queried directly but dashboard does not update.

### Pitfall 2: Realtime Subscription Cleanup in React Strict Mode

**What goes wrong:** In development, React Strict Mode mounts components twice. The first mount's cleanup runs immediately, potentially closing the Realtime channel before the second mount establishes a new one. This can cause the subscription to enter a CLOSED state.
**Why it happens:** React 18+ Strict Mode intentionally double-invokes effects to surface cleanup issues.
**How to avoid:** The Supabase client is designed to handle this -- `createBrowserClient` returns a singleton, and creating a new channel after removing the old one works correctly. Ensure the cleanup function calls `supabase.removeChannel(channel)` (not `channel.unsubscribe()`). Test in development with Strict Mode enabled. If issues persist, the channel creation can be guarded with a ref.
**Warning signs:** Console messages about CLOSED channels in development; subscription works in production but not dev.

### Pitfall 3: Pressure Unit Inconsistency

**What goes wrong:** Dashboard displays pressure in Pascals (e.g., "101325") instead of hectopascals (e.g., "1013.25 hPa") because the Phase 1 decision was to store pressure in Pascals as received from Ruuvi Station.
**Why it happens:** Ruuvi Station sends pressure in Pascals. The ingest-sensors edge function stores it as-is. FMI weather observations store pressure in hPa (the p_sea parameter is in hPa). This means indoor and outdoor pressure use different units in the database.
**How to avoid:** Convert indoor sensor pressure from Pa to hPa (divide by 100) at display time. FMI pressure is already in hPa. Document this conversion in a utility function:
```typescript
export function sensorPressureToHpa(pressurePa: number): number {
  return pressurePa / 100
}
```
**Warning signs:** Indoor pressure shows as "101325" while outdoor shows as "1013.25".

### Pitfall 4: Stale Timestamp Calculation

**What goes wrong:** The "Updated X min ago" timestamp does not update in real time. It shows "Updated 5 min ago" and stays there even as time passes.
**Why it happens:** `formatDistanceToNow()` computes a static string at render time. Without re-rendering, the string goes stale.
**How to avoid:** Use a periodic re-render interval (e.g., every 30 seconds) via a custom hook that forces re-render of the timestamp. This is a deliberate polling pattern for the display layer, not the data layer:
```typescript
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
```
**Warning signs:** Timestamps stay frozen after initial render; "Updated 1 min ago" stays visible for 10+ minutes.

### Pitfall 5: Partitioned Table DISTINCT ON Performance

**What goes wrong:** Fetching the latest reading per sensor from a partitioned table is slow because PostgreSQL scans many partitions.
**Why it happens:** `DISTINCT ON` on a partitioned table may not efficiently use indexes across partitions, especially as data grows.
**How to avoid:** Create a database view with a subquery that limits to recent data first, then applies DISTINCT ON:
```sql
CREATE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (mac_address) *
FROM sensor_readings
WHERE measured_at > now() - interval '1 hour'
ORDER BY mac_address, measured_at DESC;
```
This ensures PostgreSQL only scans the current month's partition and uses the (mac_address, measured_at) index.
**Warning signs:** Dashboard initial load becomes slow (>2 seconds) as data accumulates over months.

### Pitfall 6: localStorage SSR Mismatch

**What goes wrong:** Accessing `localStorage` in a component causes a hydration mismatch error because localStorage is not available during server-side rendering.
**Why it happens:** Next.js server components and initial HTML render happen on the server where `window` and `localStorage` do not exist.
**How to avoid:** Only access localStorage inside `useEffect` or behind a `typeof window !== 'undefined'` check. For the card order state, initialize with a default value and update from localStorage in useEffect:
```typescript
const [cardOrder, setCardOrder] = useState<string[]>(defaultOrder)
useEffect(() => {
  const saved = localStorage.getItem('card-order')
  if (saved) setCardOrder(JSON.parse(saved))
}, [])
```
**Warning signs:** "Hydration mismatch" console warnings; card order flickers on page load.

### Pitfall 7: Missing Database Migration for Realtime

**What goes wrong:** Realtime subscriptions silently fail because the tables were never added to the `supabase_realtime` publication.
**Why it happens:** Phase 1 schema migrations did not include Realtime publication setup (it was not needed for data ingestion).
**How to avoid:** Add a Phase 2 migration file:
```sql
-- 004_realtime_and_views.sql
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_config;
```
**Warning signs:** Dashboard loads initial data correctly but never updates when new sensor readings arrive.

## Code Examples

### Comfort Metric Calculations

```typescript
// lib/comfort.ts
// Source: Magnus formula (Alduchov and Eskridge, 1996)
// Accurate for -40C to 50C range

/**
 * Calculate dew point temperature from air temperature and relative humidity.
 * Uses the Magnus-Tetens approximation with improved coefficients.
 *
 * @param tempC - Temperature in Celsius
 * @param rh - Relative humidity in percentage (0-100)
 * @returns Dew point temperature in Celsius
 */
export function dewPoint(tempC: number, rh: number): number {
  const a = 17.625
  const b = 243.04

  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100)
  return (b * alpha) / (a - alpha)
}

/**
 * Calculate absolute humidity (water vapor density) from temperature
 * and relative humidity.
 *
 * Uses the Bolton (1980) saturation vapor pressure formula.
 *
 * @param tempC - Temperature in Celsius
 * @param rh - Relative humidity in percentage (0-100)
 * @returns Absolute humidity in grams per cubic meter (g/m3)
 */
export function absoluteHumidity(tempC: number, rh: number): number {
  // Saturation vapor pressure (hPa) via Bolton (1980)
  const es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5))
  // Actual vapor pressure
  const ea = (rh / 100) * es
  // Convert to absolute humidity using ideal gas law
  // AH = (ea * 100) / (Rv * T_kelvin)
  // where Rv = 461.5 J/(kg*K), ea in Pa = ea * 100
  // Simplified: AH = ea * 2.1674 / (273.15 + tempC)
  return (ea * 2.1674) / (273.15 + tempC)
}

/**
 * Classify indoor comfort based on relative humidity.
 *
 * Thresholds based on ASHRAE recommendations (30-60% comfortable range)
 * and common indoor air quality guidelines.
 */
export type ComfortClass = 'dry' | 'comfortable' | 'humid' | 'very_humid'

export interface ComfortResult {
  class: ComfortClass
  label: string
  color: string  // Tailwind color class name
}

export function classifyComfort(rh: number): ComfortResult {
  if (rh < 30) {
    return { class: 'dry', label: 'Dry', color: 'yellow' }
  }
  if (rh <= 60) {
    return { class: 'comfortable', label: 'Comfortable', color: 'green' }
  }
  if (rh <= 70) {
    return { class: 'humid', label: 'Humid', color: 'orange' }
  }
  return { class: 'very_humid', label: 'Very Humid', color: 'red' }
}
```

### Weather Condition Derivation from WMO 4680 Code

```typescript
// lib/weather.ts
// Source: WMO Code Table 4680 (present weather from automatic stations)
// FMI stores this as the `wawa` / `weather_code` field

export interface WeatherCondition {
  label: string
  icon: string  // lucide-react icon name
}

/**
 * Map WMO 4680 wawa code to human-readable weather condition.
 *
 * FMI provides the wawa code directly in weather_observations.weather_code.
 * This is more reliable than deriving conditions from cloud_cover + precipitation.
 */
export function weatherConditionFromCode(wawaCode: number | null): WeatherCondition {
  if (wawaCode === null || wawaCode === undefined) {
    return { label: 'Unknown', icon: 'HelpCircle' }
  }

  const code = Math.round(wawaCode)

  // Clear / Fair
  if (code === 0) return { label: 'Clear', icon: 'Sun' }
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: 'CloudSun' }

  // Haze / Dust
  if (code === 4 || code === 5) return { label: 'Haze', icon: 'Haze' }

  // Mist
  if (code === 10) return { label: 'Mist', icon: 'CloudFog' }

  // Lightning
  if (code === 12) return { label: 'Distant Lightning', icon: 'Zap' }

  // Squalls
  if (code === 18) return { label: 'Squalls', icon: 'Wind' }

  // Fog
  if (code >= 20 && code <= 21) return { label: 'Fog', icon: 'CloudFog' }
  if (code >= 30 && code <= 35) return { label: 'Fog', icon: 'CloudFog' }

  // Drizzle
  if (code === 22 || (code >= 51 && code <= 53)) return { label: 'Drizzle', icon: 'CloudDrizzle' }
  if (code >= 54 && code <= 56) return { label: 'Freezing Drizzle', icon: 'CloudDrizzle' }

  // Rain
  if (code === 23 || (code >= 61 && code <= 63)) return { label: 'Rain', icon: 'CloudRain' }
  if (code >= 64 && code <= 65) return { label: 'Heavy Rain', icon: 'CloudRain' }
  if (code >= 66 && code <= 67) return { label: 'Freezing Rain', icon: 'CloudRain' }

  // Snow
  if (code === 24 || (code >= 71 && code <= 73)) return { label: 'Snow', icon: 'Snowflake' }
  if (code >= 74 && code <= 78) return { label: 'Heavy Snow', icon: 'Snowflake' }

  // Freezing precipitation
  if (code === 25) return { label: 'Freezing Rain', icon: 'CloudRain' }

  // Thunderstorm
  if (code === 26 || (code >= 91 && code <= 99)) return { label: 'Thunderstorm', icon: 'CloudLightning' }

  // Blowing snow/sand
  if (code >= 27 && code <= 29) return { label: 'Blowing Snow', icon: 'Wind' }

  // Precipitation (general)
  if (code >= 40 && code <= 49) return { label: 'Precipitation', icon: 'CloudRain' }

  // Showers
  if (code >= 80 && code <= 84) return { label: 'Showers', icon: 'CloudRain' }
  if (code >= 85 && code <= 87) return { label: 'Snow Showers', icon: 'Snowflake' }

  // Hail
  if (code === 89 || code === 90) return { label: 'Hail', icon: 'CloudHail' }

  return { label: 'Unknown', icon: 'HelpCircle' }
}

/**
 * Fallback: derive a basic condition from cloud cover (oktas) when wawa code
 * is not available (null/NaN from FMI).
 */
export function weatherConditionFromCloudCover(
  cloudCoverOktas: number | null,
  precipitationMm: number | null
): WeatherCondition {
  if (precipitationMm !== null && precipitationMm > 0) {
    if (precipitationMm > 4) return { label: 'Heavy Rain', icon: 'CloudRain' }
    if (precipitationMm > 1) return { label: 'Rain', icon: 'CloudRain' }
    return { label: 'Light Rain', icon: 'CloudDrizzle' }
  }

  if (cloudCoverOktas === null) return { label: 'Unknown', icon: 'HelpCircle' }

  if (cloudCoverOktas <= 1) return { label: 'Clear', icon: 'Sun' }
  if (cloudCoverOktas <= 3) return { label: 'Partly Cloudy', icon: 'CloudSun' }
  if (cloudCoverOktas <= 6) return { label: 'Cloudy', icon: 'Cloud' }
  return { label: 'Overcast', icon: 'Cloud' }
}

/**
 * Get precipitation label from amount in mm.
 */
export function precipitationLabel(mm: number | null): string {
  if (mm === null || mm === 0) return 'None'
  if (mm < 0.5) return `${mm.toFixed(1)} mm -- Trace`
  if (mm < 2.5) return `${mm.toFixed(1)} mm -- Light rain`
  if (mm < 7.5) return `${mm.toFixed(1)} mm -- Moderate rain`
  return `${mm.toFixed(1)} mm -- Heavy rain`
}

/**
 * Convert wind direction degrees to compass direction.
 */
export function windDirectionToCompass(degrees: number | null): string {
  if (degrees === null) return '--'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}
```

### Staleness Detection

```typescript
// lib/staleness.ts
// Staleness = 3 missed update cycles (per Phase 1 decision)

/**
 * Determine if a sensor reading is stale.
 *
 * The user decided staleness = 3 missed update cycles, not absolute time.
 * Since the Ruuvi Station app's scan interval is configurable (default ~60s),
 * we estimate the interval from the sensor data or use a default of 60 seconds.
 *
 * For simplicity in Phase 2, use a default interval of 60 seconds and
 * mark as stale if the reading is older than 3 * 60 = 180 seconds (3 minutes).
 * This can be refined in Phase 3 when per-sensor interval estimation is
 * possible from historical data.
 */
const DEFAULT_INTERVAL_MS = 60_000 // 60 seconds
const STALE_MULTIPLIER = 3

export function isSensorStale(
  measuredAt: Date | string,
  now: Date = new Date()
): boolean {
  const measured = typeof measuredAt === 'string' ? new Date(measuredAt) : measuredAt
  const ageMs = now.getTime() - measured.getTime()
  return ageMs > DEFAULT_INTERVAL_MS * STALE_MULTIPLIER
}

/**
 * Determine if the weather observation is stale.
 * FMI updates every 10 minutes. Stale = 3 * 10 = 30 minutes.
 */
const WEATHER_INTERVAL_MS = 10 * 60_000
const WEATHER_STALE_MULTIPLIER = 3

export function isWeatherStale(
  observedAt: Date | string,
  now: Date = new Date()
): boolean {
  const observed = typeof observedAt === 'string' ? new Date(observedAt) : observedAt
  const ageMs = now.getTime() - observed.getTime()
  return ageMs > WEATHER_INTERVAL_MS * WEATHER_STALE_MULTIPLIER
}
```

### Battery Threshold

```typescript
// lib/constants.ts

/**
 * Battery voltage threshold for low battery warning.
 *
 * RuuviTag battery range: 1.6V to 3.646V (Data Format 5)
 * Typical operating range: 2.4V - 3.0V
 * Below 2.4V: battery is low, sensor may become unreliable
 * Below 2.0V: critical, sensor likely malfunctioning
 *
 * Recommendation: Show low battery warning at 2.4V.
 * This gives the user time to replace the battery before data gaps occur.
 */
export const BATTERY_LOW_THRESHOLD_V = 2.4

/**
 * Room icon mapping for lucide-react.
 * Users can change these from the dashboard (stored in sensor_config or localStorage).
 */
export const ROOM_ICONS: Record<string, string> = {
  bedroom: 'Bed',
  "kid's room": 'Baby',
  'living room': 'Sofa',
  outdoors: 'TreePine',
  office: 'Monitor',
  default: 'Home',
}
```

### Database Migration: Enable Realtime + Latest Readings View

```sql
-- supabase/migrations/004_realtime_and_views.sql

-- Enable Realtime for dashboard tables
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_config;

-- Latest sensor reading per active sensor (efficient view for dashboard)
CREATE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (sr.mac_address)
  sr.mac_address,
  sr.measured_at,
  sr.temperature,
  sr.humidity,
  sr.pressure,
  sr.battery_voltage,
  sr.rssi,
  sr.sensor_name,
  sr.is_outlier,
  sc.display_name,
  sc.room_name
FROM sensor_readings sr
JOIN sensor_config sc ON sc.mac_address = sr.mac_address
  AND sc.unassigned_at IS NULL
WHERE sr.measured_at > now() - interval '1 hour'
  AND sr.is_outlier = false
ORDER BY sr.mac_address, sr.measured_at DESC;

-- Latest weather observation
CREATE VIEW latest_weather AS
SELECT *
FROM weather_observations
WHERE observed_at > now() - interval '1 hour'
ORDER BY observed_at DESC
LIMIT 1;

-- RLS policy: allow anon read access for dashboard queries
-- (Personal dashboard, no authentication required)
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access" ON sensor_readings
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON weather_observations
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON sensor_config
  FOR SELECT USING (true);

-- Allow update on sensor_config for room name/icon editing from dashboard
CREATE POLICY "Allow anonymous update on sensor_config" ON sensor_config
  FOR UPDATE USING (true)
  WITH CHECK (true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwindcss-animate` plugin | `tw-animate-css` | Tailwind v4 (2025) | shadcn/ui components require tw-animate-css, not the old plugin |
| `tailwind.config.js` | CSS-first `@theme inline` in globals.css | Tailwind v4 (2025) | No JavaScript config file needed; colors defined in CSS with OKLCH |
| HSL color values in shadcn/ui | OKLCH color values | shadcn/ui 2025 update | Better perceptual uniformity; dark mode colors updated for accessibility |
| `forwardRef` in shadcn/ui components | Direct ref prop (React 19) | React 19 / shadcn/ui 2025 | Components simplified, `forwardRef` wrapper removed |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Use `createBrowserClient` and `createServerClient` from @supabase/ssr |
| `supabase.channel().unsubscribe()` | `supabase.removeChannel(channel)` | Current recommendation | removeChannel fully removes the channel; unsubscribe only pauses it |
| Default style "default" in shadcn/ui | Default style "new-york" | shadcn/ui 2025 | New projects get the "new-york" style by default |

**Deprecated/outdated:**
- `tailwindcss-animate`: Replaced by `tw-animate-css` for Tailwind v4
- `tailwind.config.js`: Use CSS-first `@theme` configuration in Tailwind v4
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`
- `forwardRef` in React 19 components: React 19 passes refs directly
- `esm.sh` imports in Supabase Edge Functions: Use `npm:` prefix instead

## Discretion Recommendations

### Color Palette and Typography

**Recommendation:** Use shadcn/ui's default "new-york" style with zinc neutral palette. This provides the Linear/Vercel aesthetic the user wants out of the box. For comfort classification colors, use Tailwind's semantic color classes:
- Green (`emerald-500/600`): Comfortable
- Yellow (`amber-500/600`): Dry
- Orange (`orange-500/600`): Humid
- Red (`red-500/600`): Very Humid

Typography: Use the system font stack (Inter or Geist if available via `next/font`). Geist is the Vercel font and matches the requested aesthetic.

### Card Border/Shadow Styling

**Recommendation:** Minimal borders with subtle shadows. In dark mode: `border-zinc-800` with no shadow. In light mode: `border-zinc-200` with `shadow-sm`. Comfort class tint applied via very low-opacity background: `bg-green-500/5` (5% opacity) for comfortable, `bg-red-500/5` for very humid, etc.

### Loading State and Skeleton Design

**Recommendation:** Use shadcn/ui Skeleton component for initial load. Show card-shaped skeletons in the grid while data loads. For the weather panel, show a smaller skeleton. Since the server component does the initial fetch, skeletons only appear if the database query is slow (unlikely for latest readings).

### Error State Handling

**Recommendation:** Three error states:
1. **Initial load failure** (server component): Show a full-page error with retry button. Use Next.js `error.tsx` boundary.
2. **Realtime connection lost**: Show a subtle banner at the top ("Live updates paused -- reconnecting..."). Supabase client auto-reconnects.
3. **No data available** (empty database): Show empty state with friendly message ("No sensor data yet. Waiting for first reading from Ruuvi Station...").

### Battery Threshold

**Recommendation:** 2.4V. RuuviTag CR2477 batteries start at ~3.0V and the sensor becomes unreliable below ~2.0V. 2.4V gives several weeks of warning before the sensor stops transmitting.

### Dark Mode Toggle Placement

**Recommendation:** Top-right corner of the page header, next to the sort controls. Small icon button (Sun/Moon), not a switch. Consistent with Linear/Vercel placement conventions.

### Responsive Breakpoints

**Recommendation:**
- Mobile (<768px / `md`): 2-column card grid, weather panel stacked below cards and collapsible
- Tablet (768-1024px / `lg`): 2-column card grid with weather side panel
- Desktop (>1024px / `xl`): 3-column card grid with weather side panel

Use Tailwind breakpoints: `grid-cols-2 lg:grid-cols-3` for cards, `lg:flex-row` for side panel layout.

### Weather Condition Derivation Logic

**Recommendation:** Use the WMO 4680 `wawa` code (stored as `weather_code` in weather_observations) as the primary source. Map the numeric code to condition labels and Lucide icon names. Fall back to cloud_cover + precipitation_1h derivation when `wawa` is null/NaN (which FMI sometimes reports). The fallback is simpler but less accurate. See the weather condition code example above.

## Open Questions

1. **RLS policies for personal dashboard without authentication**
   - What we know: The dashboard has no user authentication (personal project). The Supabase anon key is used for queries. Realtime subscriptions require the querying role to have SELECT permission.
   - What's unclear: Whether the `supabase_realtime` publication works with RLS disabled, or if explicit RLS policies with `FOR SELECT USING (true)` are needed.
   - Recommendation: Enable RLS with a permissive policy (`USING (true)`) rather than disabling RLS entirely. This is the Supabase-recommended pattern and ensures Realtime works correctly. Test during implementation. **Confidence: MEDIUM**

2. **Sensor config editing from dashboard**
   - What we know: The user wants room names and icons to be user-editable from the dashboard. This requires UPDATE permission on sensor_config.
   - What's unclear: Whether updating sensor_config via the anon key and a permissive RLS policy is secure enough for a personal dashboard, or if a server action / edge function is needed.
   - Recommendation: Use a permissive UPDATE RLS policy for sensor_config. This is a personal dashboard with no public authentication -- the anon key is already exposed in client-side code. An edge function intermediary adds complexity with no security benefit in this context. **Confidence: HIGH**

3. **@dnd-kit React 19 compatibility**
   - What we know: @dnd-kit/core 6.3.x and @dnd-kit/sortable 10.0.x are the stable packages. A new @dnd-kit/react package exists but is experimental with unstable API.
   - What's unclear: Whether the stable packages work correctly with React 19. The peer dependency may list React 16-18. React 19 generally maintains backward compatibility.
   - Recommendation: Use the stable @dnd-kit/core + @dnd-kit/sortable packages. Install with `--legacy-peer-deps` if peer dependency warnings occur. Test drag-and-drop during implementation. If there are issues, the drag feature is a nice-to-have and can be deferred while sort-by-alpha and sort-by-temperature work without it. **Confidence: MEDIUM**

4. **Supabase Realtime on partitioned tables**
   - What we know: sensor_readings and weather_observations are partitioned by month. Realtime subscriptions listen to the parent table.
   - What's unclear: Whether postgres_changes events fire correctly when data is inserted into child partitions through the parent table.
   - Recommendation: Supabase Realtime listens to the WAL (Write-Ahead Log) at the publication level. Inserts via the parent table should produce WAL events for the publication. This is the standard PostgreSQL behavior. Test during implementation. **Confidence: MEDIUM** -- needs verification with actual partitioned table.

## Sources

### Primary (HIGH confidence)
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) -- subscription API, publication setup, filter syntax, event types
- [Supabase Creating a Client for SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createBrowserClient and createServerClient patterns for Next.js App Router
- [Supabase removeChannel API reference](https://supabase.com/docs/reference/javascript/removechannel) -- channel cleanup method signature
- [shadcn/ui Dark Mode for Next.js](https://ui.shadcn.com/docs/dark-mode/next) -- next-themes setup, ThemeProvider, toggle component
- [shadcn/ui Tailwind v4 migration](https://ui.shadcn.com/docs/tailwind-v4) -- tw-animate-css, @theme inline, OKLCH colors, forwardRef removal
- [shadcn/ui Theming docs](https://ui.shadcn.com/docs/theming) -- CSS variable approach, dark mode color definitions
- [Phase 1 schema: 001_schema.sql](supabase/migrations/001_schema.sql) -- table structures for sensor_readings, weather_observations, sensor_config
- [Phase 1 ingest function: ingest-sensors/index.ts](supabase/functions/ingest-sensors/index.ts) -- payload format, field names, pressure in Pascals

### Secondary (MEDIUM confidence)
- [Supabase Realtime with Next.js guide](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) -- server + client component patterns for Realtime
- [WMO Code Table 4680 (CEDA)](https://artefacts.ceda.ac.uk/badc_datadocs/surface/code.html) -- present weather codes from automated stations
- [carnotcycle: How to convert RH to absolute humidity](https://carnotcycle.wordpress.com/2012/08/04/how-to-convert-relative-humidity-to-absolute-humidity/) -- Bolton (1980) saturation vapor pressure formula
- [Omnicalculator: Dew Point Calculator](https://www.omnicalculator.com/physics/dew-point) -- Magnus approximation constants (a=17.625, b=243.04)
- [dnd-kit official docs](https://docs.dndkit.com/presets/sortable) -- sortable preset, SortableContext, useSortable hook
- [dnd-kit GitHub](https://github.com/clauderic/dnd-kit) -- stable versions @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- [ASHRAE thermal comfort FAQ](https://www.ashrae.org/File%20Library/Technical%20Resources/Technical%20FAQs/TC-04.03-FAQ-12.pdf) -- recommended 30-60% RH for comfort

### Tertiary (LOW confidence)
- [dnd-kit/react experimental package](https://github.com/clauderic/dnd-kit/issues/1695) -- new API with DragDropProvider, still experimental, limited documentation
- [Supabase Realtime React Strict Mode issue](https://github.com/supabase/realtime-js/issues/169) -- double-mount subscription behavior in development

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Next.js 16, shadcn/ui, Supabase client, next-themes all verified in official docs and well-established
- Architecture: HIGH -- server component initial fetch + client component Realtime subscription is the documented Supabase + Next.js pattern
- Comfort metrics: HIGH -- Magnus formula and absolute humidity calculation are well-established physics; ASHRAE comfort thresholds are standard
- Weather condition derivation: MEDIUM -- WMO 4680 code mapping is well-documented but FMI may return NaN for wawa in some observations, requiring fallback logic
- Drag-and-drop: MEDIUM -- @dnd-kit is mature but React 19 compatibility is unverified; fallback to non-drag sorting is available
- Realtime on partitioned tables: MEDIUM -- standard PostgreSQL WAL behavior should work but needs verification
- Pitfalls: HIGH -- based on real constraints (Realtime publication, unit conversion, SSR hydration, React Strict Mode)

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days -- stack is stable, no major releases expected)
