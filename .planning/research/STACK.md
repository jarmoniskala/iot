# Technology Stack

**Project:** Home IoT Monitoring Dashboard (RuuviTag + FMI)
**Researched:** 2026-02-17
**Overall confidence:** HIGH

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1.x | Full-stack React framework | App Router is mature and stable. Turbopack is default for dev/build (fast). Server Components reduce client JS. Deploys to Vercel with zero config. v16 aligns dynamic rendering defaults with developer expectations. | HIGH |
| React | 19.2.x | UI library | Ships with Next.js 16. Server Components for data fetching, Suspense for loading states, View Transitions for smooth page changes. | HIGH |
| TypeScript | 5.9.x | Type safety | Latest stable. Do NOT use 6.0 beta (released 2026-02-11) -- it is the final JS-based compiler before the Go rewrite (TS 7). Stick with 5.9 for stability. | HIGH |
| Tailwind CSS | 4.x | Utility-first styling | CSS-first configuration (no tailwind.config.js). 5x faster full builds, 100x faster incremental. Built-in container queries. Native to Next.js 16 setup. | HIGH |

### UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | latest (CLI) | Component library | Not a dependency -- copies components into your codebase. Uses Radix UI primitives (unified `radix-ui` package in new-york style). Fully customizable. 100k+ GitHub stars. Used by Vercel themselves. Install via `npx shadcn@latest init`. | HIGH |
| Recharts | 3.7.x | Time-series charts | Most popular React charting library (24.8k GitHub stars). SVG-based, declarative API. v3 rewrote state management for reliability. New native `responsive` prop on chart components eliminates `ResponsiveContainer` wrapper. Built on D3. Good enough for sensor data volumes (hundreds of points, not millions). | HIGH |

### Database & Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase (PostgreSQL) | hosted | Database + Auth + Edge Functions | Free tier: 500 MB storage, 500k edge function invocations/month, 2 GB egress. PostgreSQL means proper time-series queries with `date_trunc`, window functions, and CTEs. Row-level security for API protection. Realtime subscriptions for live updates. | HIGH |
| @supabase/supabase-js | 2.95.x | Supabase client | Isomorphic JS client. Handles database queries, realtime subscriptions, and edge function invocation. Requires Node.js 20+. | HIGH |
| @supabase/ssr | 0.8.x | Server-side Supabase client | Framework-agnostic SSR helper for Next.js App Router. Creates proper server/client Supabase instances with cookie-based session handling. Replaces deprecated `@supabase/auth-helpers-nextjs`. | HIGH |
| Supabase Edge Functions | Deno runtime | API endpoints (data ingestion) | Receives HTTP POST from Ruuvi Station app. Written in TypeScript (Deno). 500k invocations/month on free tier is ample for 3 sensors posting every ~60s (~130k/month). | HIGH |

### Scheduling (FMI Weather Polling)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pg_cron + pg_net | PostgreSQL extensions | Scheduled FMI API polling | **CRITICAL DECISION:** Vercel Hobby plan limits cron jobs to once per day -- completely unusable for hourly weather polling. Supabase provides pg_cron (scheduling) and pg_net (async HTTP) on ALL tiers including free. Use pg_cron to trigger a Supabase Edge Function every hour that fetches FMI data and inserts it into the database. Zero additional cost. | HIGH |

### Data Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | 4.3.x | Schema validation | Validates incoming sensor data and FMI API responses. v4 is 14x faster string parsing, 57% smaller core vs v3. `@zod/mini` (~1.9 KB gzipped) available for edge functions if bundle size matters. TypeScript-first with static type inference. | HIGH |

### Data Fetching (Client)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | 5.90.x | Client-side data fetching | Handles polling, caching, background refetching for dashboard. `refetchInterval` for periodic sensor data updates. Suspense hooks (`useSuspenseQuery`) for clean loading states. 20% smaller than v4. | HIGH |

### Date/Time Handling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | 4.x | Date formatting and manipulation | Tree-shakeable (import only what you use). Functional API fits React patterns. Needed for chart axis formatting, relative time ("5 min ago"), and time range selections. Preferred over dayjs for tree-shaking in Next.js. | MEDIUM |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Hobby (free) | Hosting + deployment | Zero-config Next.js deployment. Automatic preview deploys. Free tier includes 100 GB bandwidth, serverless functions. Git push to deploy. | HIGH |
| Vercel Cron | Hobby (free) | Daily health check only | Limited to 1x/day on Hobby plan. Use ONLY for daily system health summary or cleanup tasks. NOT for FMI polling (too infrequent). | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charting | Recharts 3.7 | ECharts (echarts-for-react) | ECharts is better for 10k+ data points with WebGL, but sensor data is low volume. Recharts has simpler API, better React integration, and smaller bundle. |
| Charting | Recharts 3.7 | Tremor | Tremor is too basic -- limited chart customization. Good for quick internal dashboards but lacks the time-series features needed (custom tooltips, brush zoom, reference lines). |
| Charting | Recharts 3.7 | TanStack Charts | Headless (render-your-own SVG). More work for comparable results. Better for financial data density we do not need. |
| UI Components | shadcn/ui | Chakra UI | Heavier runtime. shadcn/ui copies source code so zero dependency overhead. Better Tailwind integration. |
| UI Components | shadcn/ui | Material UI (MUI) | Massive bundle, opinionated styling fights Tailwind. Not a match for utility-first CSS approach. |
| Scheduling | pg_cron + pg_net | Vercel Cron | Vercel Hobby limits to daily execution. Unusable for hourly FMI polling. |
| Scheduling | pg_cron + pg_net | External cron service (cron-job.org) | Adds external dependency. pg_cron is built into Supabase, no extra service to manage. |
| Date library | date-fns | dayjs | dayjs has smaller base bundle but worse tree-shaking. date-fns modular imports keep actual bundle small in Next.js. |
| Date library | date-fns | Native Intl/Temporal | Temporal is not yet widely available. Intl handles formatting but not manipulation (add days, diff, etc). |
| Validation | Zod 4 | Yup | Zod has better TypeScript inference and is the standard in the Next.js/tRPC ecosystem. |
| Database | Supabase (PostgreSQL) | TimescaleDB | Overkill for 3 sensors. Standard PostgreSQL handles this volume trivially. TimescaleDB would be relevant at 100+ sensors with sub-second intervals. |
| Client fetching | TanStack Query | SWR | TanStack Query has richer devtools, better mutation handling, and suspense support. SWR is lighter but less featured. |

---

## Free Tier Budget Analysis

This stack must operate at zero cost. Here is how each free tier maps to actual usage.

| Service | Free Tier Limit | Projected Usage | Headroom |
|---------|----------------|-----------------|----------|
| **Supabase DB storage** | 500 MB | ~50 MB/year (3 sensors x 1 reading/min x 365 days, ~1.5M rows at ~30 bytes each) | ~10 years |
| **Supabase edge invocations** | 500,000/month | ~135,000/month (3 sensors x ~1/min x 30 days + 720 FMI polls) | 3.7x headroom |
| **Supabase DB egress** | 2 GB/month | ~200 MB/month (dashboard queries) | 10x headroom |
| **Vercel bandwidth** | 100 GB/month | < 1 GB/month (personal dashboard) | 100x headroom |
| **Vercel serverless** | 100 GB-hours/month | < 1 GB-hour/month | 100x headroom |
| **FMI API** | Unlimited (open data) | 720 requests/month (hourly) | No limit |

**Verdict:** Free tier is sustainable indefinitely for a personal 3-sensor setup. The only risk is Supabase pausing the project after 7 days of inactivity (see Pitfalls). pg_cron keeps the database active by design since it runs queries on a schedule.

---

## Data Flow Architecture

```
RuuviTag BLE sensors (3x)
       |
       v
Ruuvi Station (Android app)
       | HTTP POST (JSON)
       v
Supabase Edge Function (/ingest)
       | validates with Zod, inserts
       v
Supabase PostgreSQL
       ^                    |
       |                    | Realtime subscription
  pg_cron + pg_net          v
  (hourly FMI poll)    Next.js Dashboard (Vercel)
       |                    |
       v                    v
  FMI WFS API          TanStack Query (polling + cache)
  (Helsinki-Vantaa)         |
                            v
                        Recharts (time-series visualization)
```

---

## Installation

```bash
# Create Next.js project (Next.js 16 with defaults: TypeScript, Tailwind, App Router, Turbopack)
npx create-next-app@latest iot-dashboard --yes

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query recharts date-fns zod

# Dev dependencies
npm install -D @tanstack/react-query-devtools

# shadcn/ui (interactive setup -- copies components into your codebase)
npx shadcn@latest init

# Add specific shadcn/ui components as needed
npx shadcn@latest add card badge tabs select separator skeleton
```

### Supabase Edge Function Setup

```bash
# Install Supabase CLI
npm install -D supabase

# Initialize Supabase in the project
npx supabase init

# Create edge functions
npx supabase functions new ingest    # Sensor data ingestion
npx supabase functions new fmi-poll  # FMI weather data fetcher
```

### Enable PostgreSQL Extensions (via Supabase Dashboard or SQL)

```sql
-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule FMI polling every hour via edge function
SELECT cron.schedule(
  'poll-fmi-weather',
  '0 * * * *',  -- every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/fmi-poll',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Key Version Pins

Lock these in `package.json` to avoid surprise breakage:

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@supabase/supabase-js": "^2.95.0",
    "@supabase/ssr": "^0.8.0",
    "@tanstack/react-query": "^5.90.0",
    "recharts": "^3.7.0",
    "date-fns": "^4.0.0",
    "zod": "^4.3.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@tanstack/react-query-devtools": "^5.90.0",
    "supabase": "^2.0.0"
  }
}
```

**Do NOT use:**
- `typescript@6.0.0-beta` -- unstable, final JS-based version before Go rewrite
- `@supabase/auth-helpers-nextjs` -- deprecated, replaced by `@supabase/ssr`
- `recharts@2.x` -- v3 has significant state management fixes and the new `responsive` prop
- `moment.js` -- deprecated, massive bundle (330 KB), use date-fns instead
- `tailwind.config.js` -- Tailwind v4 uses CSS-first `@theme` configuration

---

## Ruuvi Station Data Format Reference

The Ruuvi Station app sends RuuviTag RAWv2 (Data Format 5) measurements via HTTP POST. Expected JSON payload per sensor:

```json
{
  "data_format": 5,
  "humidity": 47.62,
  "temperature": 23.58,
  "pressure": 1023.68,
  "acceleration": 993.23,
  "acceleration_x": -48,
  "acceleration_y": -12,
  "acceleration_z": 992,
  "tx_power": 4,
  "battery": 2197,
  "movement_counter": 0,
  "measurement_sequence_number": 88,
  "mac": "d2a36ec8e025",
  "rssi": -80
}
```

Key fields for the dashboard:
- `temperature` (Celsius), `humidity` (%), `pressure` (hPa) -- primary readings
- `battery` (millivolts above 1.6V, range 1600-3646 mV) -- system health
- `rssi` (signal strength, dBm) -- connectivity diagnostics
- `measurement_sequence_number` -- deduplication
- `mac` -- sensor identification (map to room names)

---

## FMI WFS API Reference

FMI Open Data uses WFS 2.0 with stored queries. No API key required (open data, CC BY 4.0 license).

Base URL: `https://opendata.fmi.fi/wfs`

Example query for Helsinki-Vantaa airport observations:
```
https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::simple&place=helsinki-vantaan%20lentoasema&parameters=temperature,humidity,pressure&timestep=60
```

Response format: XML (GML). Parse with a lightweight XML parser in the edge function.

---

## Sources

- [Next.js 16.1 release blog](https://nextjs.org/blog/next-16-1) -- confirmed v16.1 features, Turbopack stable
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- App Router dynamic defaults, React 19.2
- [@supabase/supabase-js on npm](https://www.npmjs.com/package/@supabase/supabase-js) -- confirmed v2.95.3
- [@supabase/ssr on npm](https://www.npmjs.com/package/@supabase/ssr) -- confirmed v0.8.0
- [Supabase Cron documentation](https://supabase.com/docs/guides/cron) -- pg_cron + pg_net on all tiers
- [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) -- Deno runtime, free tier limits
- [Supabase pricing](https://supabase.com/pricing) -- 500 MB storage, 500k invocations, 2 GB egress
- [Vercel Cron Jobs pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) -- Hobby limited to daily
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) -- free tier limits
- [Recharts on npm](https://www.npmjs.com/package/recharts) -- confirmed v3.7.0
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- responsive prop, state rewrite
- [Zod v4 release announcement](https://www.infoq.com/news/2025/08/zod-v4-available/) -- performance improvements
- [TanStack Query on npm](https://www.npmjs.com/package/@tanstack/react-query) -- confirmed v5.90.x
- [TypeScript releases](https://github.com/microsoft/typescript/releases) -- 5.9.3 stable, 6.0 beta
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first config
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog) -- CLI 3.0, new components
- [RuuviTag data format 5 (RAWv2)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2) -- sensor payload spec
- [FMI Open Data](https://en.ilmatieteenlaitos.fi/open-data) -- WFS 2.0, stored queries, no auth required
- [pg_net extension](https://github.com/supabase/pg_net) -- async HTTP from PostgreSQL
- [Supabase pause prevention discussion](https://github.com/travisvn/supabase-pause-prevention) -- free tier inactivity workaround
