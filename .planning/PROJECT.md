# Home IoT Monitor

## What This Is

A web-based dashboard for monitoring indoor climate across rooms in a Helsinki-area flat, using RuuviTag BLE sensors for indoor measurements and the Finnish Meteorological Institute (FMI) API for outdoor weather data from Helsinki-Vantaa airport. The system stores all data indefinitely and provides both live readings and historical trends.

## Core Value

See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Live dashboard showing current readings per room (bedroom, kid's room, living room)
- [ ] Live outdoor weather from FMI API (Helsinki-Vantaa airport) — temperature, humidity, wind, pressure, precipitation, cloud cover
- [ ] Historical trends with graphs for all sensor data over any timeframe
- [ ] Separate system health view for RuuviTag diagnostics (battery voltage, signal strength, movement counter)
- [ ] Indefinite data retention in Supabase
- [ ] Data ingestion from Ruuvi Station Android app via data forwarding (HTTP POST)
- [ ] Supabase edge function to receive and store forwarded sensor data
- [ ] FMI API polling on a schedule (Vercel cron)
- [ ] Accessible from anywhere (public internet via Vercel)

### Out of Scope

- Mobile push notifications — using Ruuvi Station app's built-in alerts instead
- Ruuvi Cloud integration — phone forwards data directly to Supabase, no cloud middleman
- Raspberry Pi gateway — deferred to Phase 2 as optional upgrade for 24/7 data collection
- Ruuvi Gateway device — unnecessary given Android data forwarding approach

## Context

- 3 RuuviTag sensors installed indoors: bedroom, kid's room, living room
- 4th RuuviTag (outdoor) being retired — replaced by FMI API data from Helsinki-Vantaa airport
- RuuviTags broadcast BLE every 2.5 seconds; internal buffer stores 10 days at 5-minute intervals with Unix timestamps
- Ruuvi Station Android app has data forwarding feature: POSTs BLE readings to a custom HTTP endpoint
- Data forwarding only works when phone is home and app is running — gaps expected when away, tag buffer fills gaps on return
- FMI provides open weather data API for Finnish weather stations
- User has experience with Vercel and Supabase (free tiers)

## Constraints

- **Hosting**: Vercel free tier for frontend and cron jobs
- **Database**: Supabase free tier for PostgreSQL storage and edge functions
- **Frontend**: Next.js (user preference, natural Vercel fit)
- **Data source (indoor)**: Ruuvi Station Android data forwarding — no additional hardware in Phase 1
- **Data source (outdoor)**: FMI open data API (Helsinki-Vantaa airport station)
- **Cost**: Zero ongoing cost target — free tiers only, no hardware purchase in Phase 1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FMI API over outdoor RuuviTag | Helsinki-Vantaa airport is nearby; frees up a sensor; richer weather data (wind, precipitation, cloud cover) | — Pending |
| Android data forwarding over Ruuvi Cloud | No Gateway needed; no subscription; data goes directly to own database | — Pending |
| Supabase over local storage | Indefinite retention; accessible from anywhere; free tier sufficient | — Pending |
| Pi deferred to Phase 2 | Avoid hardware cost; phone forwarding works for initial version; upgrade path clear | — Pending |
| Sensor vs diagnostics split | Keep main dashboard focused on climate data; battery/signal/movement in separate health view | — Pending |

---
*Last updated: 2026-02-17 after initialization*
