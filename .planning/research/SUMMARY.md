# Project Research Summary

**Project:** Home IoT Monitoring Dashboard (RuuviTag + FMI)
**Domain:** Home IoT indoor climate monitoring with outdoor weather correlation
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

This is a personal IoT monitoring dashboard combining three RuuviTag BLE sensors (indoor climate: temperature, humidity, pressure) with Finnish Meteorological Institute (FMI) outdoor weather data, served as a Next.js web application hosted on Vercel with Supabase as the backend. Experts build this class of system as a hub-and-spoke ingestion architecture: sensors push data through a lightweight edge function into a central PostgreSQL database, and the dashboard pulls from that single source of truth. The key architectural decision is to keep all scheduling inside Supabase (pg_cron + pg_net) rather than relying on Vercel, which limits free-tier crons to daily execution — completely unusable for hourly weather polling. The recommended stack is Next.js 16 + React 19 + TypeScript 5.9 + Tailwind 4 + Supabase (PostgreSQL + Edge Functions + Realtime) + Recharts 3, all operating at zero cost indefinitely within free-tier limits.

The biggest risks are infrastructure reliability, not application complexity. Android battery optimization will kill the Ruuvi Station background scanner, causing large data gaps unless the phone is dedicated and plugged in with optimization disabled. Supabase will pause the free project after 7 days of inactivity, causing total data loss during paused periods — the FMI cron job doubles as a keep-alive, and an external uptime monitor is essential. Data volume will hit the 500MB Supabase free-tier storage limit within 1.5-2 years, requiring a downsampling strategy to be planned from day one even if not implemented immediately. These three pitfalls all affect Phase 1 and must be addressed before the dashboard is built.

The feature set is well-scoped for a personal project. Live readings per room, outdoor weather from FMI, historical trend charts, and sensor health monitoring are clear table stakes. Computed comfort metrics (dew point, mold risk indicator) are valuable differentiators that add meaningful insight beyond raw numbers, but should be deferred to Phase 3 after the data pipeline is solid. The dashboard should never attempt authentication, push notifications, thermostat control, or data export — these are anti-features that add complexity without proportional value for a household of one.

## Key Findings

### Recommended Stack

The stack is cohesive and designed to operate at zero cost indefinitely. Next.js 16 with App Router provides Server Components for fast initial data loading and Client Components for Supabase Realtime subscriptions. Supabase handles the entire backend: PostgreSQL for storage, Edge Functions (Deno) for ingestion endpoints, Realtime for live dashboard updates, and pg_cron + pg_net for scheduled FMI polling. Recharts 3 (with its new responsive prop) handles time-series visualization. TanStack Query manages client-side caching and background refetching. The FMI scheduling decision is critical: use pg_cron inside Supabase, not Vercel cron — Vercel Hobby limits cron to daily execution.

**Core technologies:**
- Next.js 16.1 + React 19.2: Full-stack framework — App Router, Server Components, Turbopack default
- TypeScript 5.9: Type safety — avoid 6.0 beta (unstable Go-rewrite transition)
- Tailwind CSS 4: Styling — CSS-first config (@theme), no tailwind.config.js
- shadcn/ui: Component library — copies source, zero dependency overhead, Radix UI primitives
- Supabase (PostgreSQL): Database + Auth + Edge Functions + Realtime — free tier covers years of usage
- @supabase/ssr 0.8: Server-side Supabase client — replaces deprecated auth-helpers-nextjs
- Supabase Edge Functions (Deno): Ingestion endpoints + FMI polling — 500k invocations/month free
- pg_cron + pg_net: FMI polling schedule — any interval, no cost, inside Supabase
- Recharts 3.7: Charts — SVG-based, new responsive prop, no ResponsiveContainer wrapper needed
- TanStack Query 5.90: Client data fetching — polling, caching, Suspense hooks
- Zod 4.3: Validation — 14x faster than v3, TypeScript-first inference
- date-fns 4: Date handling — tree-shakeable, functional API
- Vercel Hobby: Hosting — zero-config Next.js deploy, 100GB bandwidth/month

**Free tier budget verdict:** Sustainable indefinitely. 3 sensors x ~1 reading/min generates ~135k edge invocations/month (3.7x headroom). Storage grows ~13-50MB/month depending on schema efficiency; the 500MB limit is reached in 1.5-2 years.

### Expected Features

All features organized by the three-phase MVP recommendation from FEATURES.md.

**Must have (table stakes) — Phase 1:**
- Live readings per room (temperature, humidity, pressure) — core value proposition
- Outdoor weather display from FMI — temperature, humidity, wind speed, pressure
- Indoor vs outdoor comparison — trivial once both sources exist, high perceived value
- Data freshness indicator — "last updated X minutes ago" per sensor; trust signal
- Sensor battery level — prevents surprise dead sensors (battery voltage mapped to low/ok/good)
- Mobile-responsive layout — most checking will be on phone

**Should have (differentiators) — Phase 2 and 3:**
- Historical trend charts with time range selector (24h, 7d, 30d, custom) — second-highest value feature
- System health dashboard — battery trends, RSSI, movement counter, sequence gaps
- Data gap detection — visual markers on charts for missing data windows
- Computed comfort metrics — dew point, absolute humidity, comfort classification
- Room comparison overlay — multi-series charts across rooms
- Daily/weekly summary stats — min/max/avg per room per day
- Dark mode — CSS theme, low effort, high polish

**Defer (v2+ or indefinitely):**
- Mold risk indicator — compelling, but cold-surface estimation model needs validation
- Ventilation suggestion — fun but gimmicky; validate actual usage patterns first
- FMI weather enrichment beyond basic temp/humidity/wind — link to FMI instead

**Anti-features (never build):**
- User authentication / multi-tenant
- Push notifications / SMS alerts
- Thermostat / HVAC control
- Complex alerting rules engine
- Unit conversion toggle (hardcode Celsius)
- Real-time WebSocket custom server (use Supabase Realtime)

### Architecture Approach

The architecture is a hub-and-spoke ingestion pattern: two independent data sources (Ruuvi Station Android app pushing sensor data, pg_cron pulling FMI weather data) feed into a central Supabase PostgreSQL database, consumed by a single Next.js dashboard on Vercel. The database schema uses three tables: `devices` (MAC-to-room-name mapping), `sensor_readings` (indoor climate, partitioned monthly), `weather_readings` (FMI outdoor data, partitioned monthly). Server Components load initial data; Client Components hold Supabase Realtime subscriptions for live updates. Database views (`latest_readings`, `device_health`) pre-compute common queries. Edge functions are kept thin — validate, normalize, insert only.

**Major components:**
1. Ruuvi Station Android app — BLE gateway: scans RuuviTags, forwards via HTTP POST to edge function
2. Edge Function `ingest-ruuvi` — validates with Zod, maps MAC to device_id, bulk inserts to sensor_readings
3. Edge Function `fetch-fmi` — HTTP GET to FMI WFS API, XML/GML parsing, inserts to weather_readings
4. pg_cron scheduler — triggers fetch-fmi every 10 minutes via pg_net HTTP call
5. Supabase PostgreSQL — single source of truth; views, indexes, Realtime publication
6. Next.js Dashboard (Vercel) — Server Component initial load + Client Component Realtime subscriptions
7. Recharts + TanStack Query — time-series visualization with client-side cache and polling fallback

### Critical Pitfalls

All four critical pitfalls originate in Phase 1 and cascade into data loss if ignored.

1. **Supabase free tier storage wall (500MB)** — store readings with `REAL` not `DOUBLE PRECISION` (halves storage), monitor `pg_database_size()` on the dashboard, design downsampling strategy from day one even if not activated immediately. Alert at 400MB.

2. **Android battery optimization kills Ruuvi background scanning** — dedicate a plugged-in phone, disable battery optimization for Ruuvi Station, build gap detection into the dashboard (warn if no reading for 10+ minutes), plan for a Raspberry Pi or Ruuvi Gateway as a long-term reliable alternative.

3. **Supabase project pauses after 7 days of inactivity** — FMI cron runs every 10 minutes, which inherently keeps the project active. Add an external uptime monitor (UptimeRobot free) pinging a health endpoint. Add a GitHub Actions keep-alive as secondary insurance.

4. **FMI API returns XML/GML, not JSON** — use `fast-xml-parser`, test parsing with real saved API responses before integrating into the cron job. Handle missing parameters gracefully (r_1h rain data is sometimes absent). Use FMISID 100968 (Helsinki-Vantaa), not the place-name parameter.

5. **Edge function CORS misconfiguration blocks Ruuvi data silently** — add OPTIONS preflight handler at the top of every edge function, test with browser `fetch()` not just curl.

## Implications for Roadmap

Based on combined research, a four-phase structure is recommended. Phase 1 is the critical path — everything downstream depends on reliable data flowing into the database.

### Phase 1: Data Pipeline Foundation

**Rationale:** Architecture research mandates building in dependency order: database schema first, then ingestion, then dashboard. All critical pitfalls are Phase 1 concerns. The dashboard built on a broken or unreliable pipeline is worthless. Getting real sensor data flowing before writing any UI code validates the hardware integration early when it is cheapest to fix.

**Delivers:** Working end-to-end pipeline — RuuviTag BLE > Android app > edge function > Supabase DB; FMI weather polling every 10 minutes via pg_cron; database health monitoring; data gap detection in ingestion layer.

**Addresses (from FEATURES.md):** None of the user-facing features — this phase is entirely infrastructure. But it enables everything in Phases 2-4.

**Avoids (from PITFALLS.md):**
- Storage wall: schema designed with `REAL` types, storage monitoring view from day one
- Supabase pausing: FMI cron doubles as keep-alive
- Android gaps: gap detection and phone setup documented as part of this phase
- CORS errors: CORS handler required in edge function acceptance criteria
- Data validation: Zod schema validates all incoming sensor data
- Timezone bugs: all timestamps stored as `timestamptz` (UTC), convert at display layer only
- Missing indexes: composite index on (device_id, measured_at DESC) created with the table

**Key tasks:**
- Supabase project setup, extensions (pg_cron, pg_net), vault for secrets
- Schema: `devices`, `sensor_readings`, `weather_readings` tables with monthly partitions and indexes
- Views: `latest_readings`, `device_health`
- Edge Function: `ingest-ruuvi` (Zod validation, MAC lookup, bulk insert, CORS)
- Edge Function: `fetch-fmi` (FMI WFS XML parse, insert, error handling)
- pg_cron schedule: fetch-fmi every 10 minutes
- Storage monitoring query exposed via health endpoint
- Ruuvi Station Android setup guide (battery optimization steps documented)
- External uptime monitor (UptimeRobot) pinging health endpoint

### Phase 2: Core Dashboard — Live Readings

**Rationale:** Once data is flowing reliably, build the minimum viable dashboard. This phase delivers the primary user value: seeing current conditions in each room and outdoor at a glance. Server Component initial load + Realtime subscription pattern is the architecture focus.

**Delivers:** Mobile-responsive dashboard showing live temperature, humidity, and pressure per room; outdoor FMI conditions side-by-side; data freshness indicator per sensor; battery level indicators; indoor vs outdoor delta.

**Addresses (from FEATURES.md):** All Phase 1 table stakes features — live readings, outdoor weather, indoor/outdoor comparison, data freshness, battery level, mobile layout.

**Uses (from STACK.md):** Next.js 16 App Router, shadcn/ui cards, Supabase Realtime subscriptions, TanStack Query for client polling fallback, Tailwind 4.

**Implements (from ARCHITECTURE.md):** Pattern 2 (Server Components for initial load, Client Components for Realtime), Pattern 3 (Supabase Realtime subscriptions), Pattern 4 (database views for derived metrics).

**Key tasks:**
- Next.js project on Vercel, Supabase client setup (@supabase/ssr)
- Dashboard layout: room cards grid (3 indoor + 1 outdoor), mobile-first
- Server Component: fetch from `latest_readings` view on load
- Client Component: Supabase Realtime subscription, append new readings to state
- Data freshness badge: "X min ago" with warning state if stale
- Battery voltage to percentage/status mapping (1.6V–3.647V range)
- Indoor vs outdoor comparison: temperature and humidity deltas displayed

### Phase 3: Historical Data and System Health

**Rationale:** Historical trends are the second-highest value feature per FEATURES.md. System health monitoring prevents silent data loss. Both require the same data pipeline from Phase 1 but add query complexity and the chart rendering pitfall must be addressed (server-side downsampling).

**Delivers:** Time-series line charts for each sensor (24h, 7d, 30d time ranges), system health view (battery trend, RSSI, movement counter, last-seen per device), data gap visualization on charts, room comparison overlay.

**Addresses (from FEATURES.md):** Phase 2 features in FEATURES.md — historical charts, time range selector, system health dashboard, data gap detection, room comparison overlay.

**Avoids (from PITFALLS.md):** Chart rendering freeze pitfall — server-side downsampling SQL functions must cap returned points at ~1000 per series. 24h returns raw data; 7d returns 15-minute averages; 30d returns 1-hour averages. Vercel 10-second function timeout is avoided by proper indexes (already created in Phase 1) and connection pooling.

**Uses (from STACK.md):** Recharts 3.7 (responsive prop, custom tooltips, brush zoom, reference lines for gap markers), TanStack Query (time-range-keyed queries, refetchInterval), date-fns 4 (axis formatting, relative time display).

**Key tasks:**
- Downsampling SQL functions (PostgreSQL, called from Supabase Edge Functions or RPC)
- Time range selector UI (24h/7d/30d presets + custom date range picker)
- Recharts line charts: temperature, humidity, pressure per sensor over selected range
- Multi-series room comparison view (all indoor sensors on same chart)
- Data gap detection: identify missing measurement_sequence windows, render as dashed segments
- System health view: battery voltage trend chart, RSSI history, movement counter, last-seen timestamps

### Phase 4: Computed Insights and Polish

**Rationale:** Comfort metrics and daily/weekly summaries are differentiators that elevate the dashboard from "just another temperature display" to genuinely useful. Dark mode is low effort. Mold risk indicator is deferred unless Phase 3 data reveals patterns that validate the cold-surface model.

**Delivers:** Dew point, absolute humidity, and comfort classification displayed per room; daily/weekly min/max/avg summary cards; dark mode CSS theme.

**Addresses (from FEATURES.md):** Phase 3 features from FEATURES.md — computed comfort metrics, daily/weekly summary stats, dark mode.

**Key tasks:**
- Dew point calculation: August-Roche-Magnus approximation (pure client-side math)
- Absolute humidity formula (derivation from temp + relative humidity)
- Comfort classification thresholds (dry/comfortable/humid/very humid)
- Daily/weekly aggregate queries (PostgreSQL GROUP BY date_trunc)
- Summary stats card component (min/max/avg per room per day)
- Dark mode: Tailwind CSS variables, system preference detection, toggle button

### Phase Ordering Rationale

- Phase 1 before everything: database schema is the foundation all other components depend on. Data loss from infrastructure failures cannot be recovered. Getting real sensor data flowing validates hardware integration before any UI investment.
- Phase 2 before Phase 3: live readings are the primary user value. Building charts before live readings inverts the dependency — charts need data to display.
- Phase 3 before Phase 4: historical data enables computed insights. Comfort classification over time is more useful than a single point-in-time calculation. Daily summaries require data from multiple days.
- Feature dependency graph from FEATURES.md confirms this order: live readings -> historical charts -> room comparison/gap detection/daily stats.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (FMI integration):** The Ruuvi Station Android data forwarding payload structure is documented at MEDIUM confidence only. The exact JSON field names the app sends (vs. what the Ruuvi Gateway sends) need verification against actual app behavior. Run a test POST capture before writing the Zod schema. Also: FMI XML/GML response structure requires testing with real responses from FMISID 100968 before writing the parser.

- **Phase 1 (Supabase Vault for secrets):** Using Vault to store the Supabase service role key (needed by pg_net when calling edge functions) is documented in Supabase docs but the exact SQL syntax for reading from Vault inside a pg_cron job is worth verifying against current docs before implementation.

- **Phase 3 (data gap detection algorithm):** Detecting gaps via measurement_sequence number gaps is well-defined, but time-based gap detection (when sequence resets to 0) requires a practical strategy that may need iteration with real data.

Phases with standard patterns (skip additional research):

- **Phase 2 (Next.js + Supabase Realtime):** Well-documented patterns, official Supabase guide for Next.js App Router Realtime. shadcn/ui component installation is mechanical. No novel patterns required.

- **Phase 4 (comfort metrics):** Dew point and absolute humidity are standard meteorological formulas. No research needed — just implement the equations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm and official release blogs. Free-tier limits verified from Vercel and Supabase pricing pages. Version pins are specific (e.g., TS 5.9 not 6.0 beta) with documented rationale. |
| Features | HIGH | Feature set is well-matched to domain. Table stakes derived from analysis of comparable IoT dashboards. RuuviTag data fields verified from official RAWv2 spec. FMI parameters verified from FMI open data documentation. |
| Architecture | HIGH | Hub-and-spoke pattern is standard for this class of system. pg_cron + pg_net scheduling verified from Supabase docs. Vercel cron limitation is documented fact. Schema design follows PostgreSQL best practices. |
| Pitfalls | HIGH | Android battery optimization pitfall is documented by Ruuvi themselves with dedicated setup guide. Supabase pausing is documented and has known workarounds. Storage estimation is based on verified row sizes and ingestion rates. CORS issue is a known Supabase edge function gotcha with documented solution. |

**Overall confidence:** HIGH

### Gaps to Address

- **Ruuvi Station Android payload format (MEDIUM confidence):** The exact JSON structure the app sends may differ slightly from the Gateway API docs used as reference. Capture an actual POST from the app before finalizing the Zod schema. Field names like `accelX` vs `acceleration_x` need verification.

- **FMI parameter availability for FMISID 100968:** The r_1h (precipitation) parameter is listed as available but observation-dependent. Test the WFS URL with real responses, save samples for parser testing, and implement graceful fallback for any missing parameters.

- **Supabase Vault + pg_net integration:** The exact SQL for reading secrets from Vault within a pg_cron-scheduled pg_net call is documented but may require testing. Alternative: hardcode the edge function URL (public) and pass the service role key via a hardcoded SQL string stored in the cron definition (less secure but simpler).

- **Raspberry Pi gateway (Phase 2 stretch):** Mentioned in ARCHITECTURE.md as the path to reliable ingestion, replacing the phone dependency. Not scoped in any phase above. Worth identifying as a fast-follow after Phase 2 if Android data gaps are observed in production.

- **Supabase monthly partition automation:** The schema uses monthly partitions but creating future partitions requires either manual action or a pg_cron job. The automation script is not specified in the research. This needs a solution before 2026-03-01 if starting now.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.1 release blog](https://nextjs.org/blog/next-16-1) — Turbopack stable, v16.1 features
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — React 19.2, App Router dynamic defaults
- [@supabase/supabase-js on npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.95.3 confirmed
- [@supabase/ssr on npm](https://www.npmjs.com/package/@supabase/ssr) — v0.8.0 confirmed
- [Supabase Cron documentation](https://supabase.com/docs/guides/cron) — pg_cron + pg_net on all tiers
- [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) — Deno runtime, limits
- [Supabase Edge Function CORS documentation](https://supabase.com/docs/guides/functions/cors) — CORS handler pattern
- [Supabase pricing](https://supabase.com/pricing) — 500MB storage, 500k invocations, 2GB egress
- [Supabase Pause Prevention](https://github.com/travisvn/supabase-pause-prevention) — inactivity workaround
- [Supabase Table Partitioning](https://supabase.com/docs/guides/database/partitions) — monthly partition pattern
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) — subscription pattern
- [Vercel Cron Jobs pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — daily limit on Hobby confirmed
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) — bandwidth and serverless limits
- [Recharts on npm](https://www.npmjs.com/package/recharts) — v3.7.0 confirmed
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — responsive prop
- [Zod v4 release announcement](https://www.infoq.com/news/2025/08/zod-v4-available/) — 14x faster string parsing
- [TanStack Query on npm](https://www.npmjs.com/package/@tanstack/react-query) — v5.90.x confirmed
- [TypeScript releases](https://github.com/microsoft/typescript/releases) — 5.9.3 stable, 6.0 beta status
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config
- [RuuviTag data format 5 (RAWv2)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2) — sensor payload spec
- [Ruuvi Battery Optimization Guide](https://ruuvi.com/how-to-turn-off-battery-optimisations-on-mobile-devices-to-help-ruuvi-station-run-optimally/) — Android Doze mitigation
- [Ruuvi Gateway purpose](https://ruuvi.com/ruuvi-gateway-is-built-to-fix-all-the-bluetooth-sensor-data-routing-issues-2/) — alternative to phone gateway
- [FMI Open Data](https://en.ilmatieteenlaitos.fi/open-data) — WFS 2.0, stored queries, no auth
- [FMI WFS Services](https://en.ilmatieteenlaitos.fi/open-data-manual-fmi-wfs-services) — parameter codes, station IDs
- [pg_net extension](https://github.com/supabase/pg_net) — async HTTP from PostgreSQL

### Secondary (MEDIUM confidence)
- [Ruuvi Station Data Forwarding (Android)](https://ruuvi.com/app-settings-data-forwarding-android/) — Android forwarding payload structure (field names need verification)
- [Ruuvi Gateway API](https://docs.ruuvi.com/communicate-with-ruuvi-cloud/cloud/gateway-api) — Gateway payload used as reference for app payload
- [Home Assistant Mold Indicator](https://www.home-assistant.io/integrations/mold_indicator/) — mold risk calculation methodology
- [Thermal Comfort integration](https://github.com/dolezsa/thermal_comfort) — comfort metric formulas reference
- [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html) — downsampling pitfall data

### Tertiary (LOW confidence)
- [Smart Home Dashboard UX Design](https://developex.com/blog/smart-home-dashboard-ux-design/) — UX patterns for IoT dashboards (general reference only)
- [Kaiterra IAQ Dashboard Guide](https://learn.kaiterra.com/en/resources/indoor-air-quality-dashboard-what-to-look-for) — table stakes analysis (commercial product, not directly comparable)

---
*Research completed: 2026-02-17*
*Ready for roadmap: yes*
