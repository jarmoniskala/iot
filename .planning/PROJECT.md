# Home IoT Monitor

## What This Is

A web-based dashboard for monitoring indoor climate across rooms in a Helsinki-area flat, using RuuviTag BLE sensors for indoor measurements and the Finnish Meteorological Institute (FMI) API for outdoor weather data. The system ingests sensor data via Ruuvi Station Android app forwarding, polls FMI every 10 minutes, and provides real-time readings, historical trend charts, system health diagnostics, and storage monitoring through a responsive Next.js dashboard.

## Core Value

See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.

## Requirements

### Validated

- ✓ Ruuvi sensor ingestion via edge function with validation and auto-registration — v1.0
- ✓ FMI weather polling via pg_cron with XML parsing — v1.0
- ✓ Live dashboard with room cards, comfort metrics, and weather panel — v1.0
- ✓ Staleness warnings and battery level indicators — v1.0
- ✓ Mobile-responsive layout with dark mode — v1.0
- ✓ Dew point, absolute humidity, and comfort classification per room — v1.0
- ✓ Historical trend charts with time range presets and room overlay — v1.0
- ✓ Summary stats (min, max, average) per room — v1.0
- ✓ System health page with battery/RSSI trends and severity indicators — v1.0
- ✓ Measurement sequence gap detection — v1.0
- ✓ Database storage monitoring with dashboard widget — v1.0
- ✓ Supabase keep-alive via FMI polling — v1.0
- ✓ Sortable card grid with drag-to-reorder — v1.0
- ✓ Room name and icon editing — v1.0

### Active

- [ ] Data gap visualization on trend charts (HIST-04 — deferred from v1.0, needs RELY-01)
- [ ] Raspberry Pi as always-on BLE gateway (RELY-01)
- [ ] Mold risk indicator (ADVN-01)
- [ ] Ventilation suggestion indicator (ADVN-02)
- [ ] Visibility and cloud cover detail (WTHR-01)

### Out of Scope

- User authentication / multi-tenant — personal dashboard for one household
- Push notifications / SMS alerts — using Ruuvi Station app's built-in alerts
- Thermostat / HVAC control — read-only monitoring only
- Alerting rules engine — hardcoded visual indicators sufficient
- Data export to CSV — query PostgreSQL directly
- Unit conversion (F/C) — Finnish household, Celsius/hPa/m/s
- Sensor configuration UI — 3 fixed sensors, configured in code
- Weather forecasts — focus on observed data
- Ruuvi Cloud integration — direct forwarding to Supabase

## Context

Shipped v1.0 with 6,817 LOC across TypeScript, TSX, CSS, and SQL.
Tech stack: Next.js 16, React 19, Tailwind v4, shadcn/ui, Supabase (PostgreSQL + Edge Functions + Realtime), Recharts, @tanstack/react-table.
8 database migrations, 2 edge functions, 3 pages (Dashboard, History, Health).
13 low-severity tech debt items documented in milestone audit.
HIST-04 (gap visualization) deferred — infrastructure built but rendering not connected until Raspberry Pi provides continuous data.

## Constraints

- **Hosting**: Vercel free tier for frontend and cron jobs
- **Database**: Supabase free tier for PostgreSQL storage and edge functions
- **Frontend**: Next.js (user preference, natural Vercel fit)
- **Data source (indoor)**: Ruuvi Station Android data forwarding — no additional hardware
- **Data source (outdoor)**: FMI open data API (Helsinki-Vantaa airport station)
- **Cost**: Zero ongoing cost target — free tiers only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FMI API over outdoor RuuviTag | Helsinki-Vantaa airport is nearby; richer weather data | ✓ Good — provides wind, precipitation, cloud cover |
| Android data forwarding over Ruuvi Cloud | No Gateway needed; no subscription; direct to own DB | ✓ Good — zero cost, works reliably |
| Supabase over local storage | Indefinite retention; accessible from anywhere; free tier | ✓ Good — Realtime subscriptions are key |
| Pi deferred to v2 | Avoid hardware cost; phone forwarding works for v1 | ✓ Good — forced HIST-04 deferral but acceptable |
| Sensor vs diagnostics split | Keep dashboard focused on climate; health in separate view | ✓ Good — clean separation of concerns |
| pg_cron + pg_net for FMI polling | Vercel Hobby cron limited to daily; Supabase cron runs every 10min | ✓ Good — also serves as keep-alive |
| Comfort metrics in live dashboard | Grouped with Phase 2 not separate phase; dew point/humidity/comfort | ✓ Good — natural fit with room cards |
| Pressure stored in Pascals | As received from Ruuvi Station; converted at display time | ✓ Good — consistent raw storage |
| WMO 4680 wawa code for weather conditions | Primary source with cloud cover fallback | ✓ Good — accurate condition mapping |
| SECURITY DEFINER for storage RPCs | anon role can't access pg_database_size; DEFINER bypasses safely | ✓ Good — minimal privilege escalation |

---
*Last updated: 2026-02-20 after v1.0 milestone*
