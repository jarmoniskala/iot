# Domain Pitfalls

**Domain:** Home IoT Climate Monitoring Dashboard (RuuviTag BLE sensors, FMI API, Supabase, Next.js/Vercel)
**Researched:** 2026-02-17

## Critical Pitfalls

Mistakes that cause data loss, system failure, or require significant rework.

### Pitfall 1: Supabase Free Tier 500MB Storage Wall Kills Data Collection Silently

**What goes wrong:** The Supabase free tier provides 500MB of database storage (approximately 40-60MB is consumed by pre-installed extensions). When exceeded, the database enters **read-only mode** -- all INSERTs fail silently from the application's perspective. The Ruuvi data forwarding and FMI polling will continue running but data is simply lost. With 3 sensors reporting every 2 minutes, plus outdoor data, you will generate roughly 2,200 rows/day. A typical sensor row (timestamp 8B + sensor_id UUID 16B + temperature 8B + humidity 8B + pressure 8B + battery 8B + metadata ~20B + 24B tuple header + index overhead) is approximately 150-200 bytes per row. At ~200 bytes/row and 2,200 rows/day, that is ~440KB/day, ~13MB/month, ~160MB/year. With indexes and table bloat, realistic usage is closer to 200-250MB/year. You will hit the 500MB wall within 1.5-2 years, possibly sooner with indexes on multiple columns.

**Why it happens:** "Keep all data indefinitely" sounds free when starting, but time-series data grows linearly forever. The 500MB limit is not obviously documented in the onboarding flow, and the read-only mode transition happens without application-level errors that are easy to catch.

**Consequences:** Complete data loss for the period between hitting the limit and discovering/fixing it. No backfill possible for sensor data -- those readings are gone forever. Recovery requires either upgrading to Pro ($25/month for 8GB) or manually deleting data and running VACUUM to reclaim space.

**Prevention:**
- Build a storage monitoring query from day one: `SELECT pg_database_size(current_database())` -- expose this on the dashboard
- Set up an alert threshold at 400MB (80% of limit)
- Design the schema with future downsampling in mind: keep 1-minute resolution for recent data (30 days), downsample to 15-minute averages for older data, daily averages for 1+ year old data
- Use appropriate data types: `real` (4 bytes) instead of `double precision` (8 bytes) for temperature/humidity/pressure (0.01 precision is more than sufficient)
- Consider column ordering to minimize padding waste

**Detection:** Monitor `pg_database_size()` weekly. Watch for INSERT failures in edge function logs. Add a health-check endpoint that attempts a test INSERT.

**Phase:** Must be addressed in Phase 1 (data ingestion). Storage monitoring should ship with the first deployment.

---

### Pitfall 2: Android Battery Optimization Kills Ruuvi Station Background Scanning

**What goes wrong:** Android's Doze mode and manufacturer-specific battery optimization (Samsung, Xiaomi, Huawei are the worst offenders) will aggressively kill or throttle Ruuvi Station's background scanning. Data gaps can be **hours long** even with 2-minute scan intervals configured. The app relies on BLE scanning which Android 6+ explicitly restricts during Doze sleep periods -- no advertising packets are reported at all.

**Why it happens:** Android treats any app that uses Bluetooth in the background as a battery drain candidate. Each manufacturer adds their own layer of aggressive power management on top of stock Android (Adaptive Battery, App Standby Buckets, manufacturer-specific optimizers). The Ruuvi Station app documentation explicitly warns about this.

**Consequences:** Unpredictable, potentially large gaps in sensor data. The dashboard shows "last reading: 3 hours ago" regularly. Data completeness drops to 60-80% instead of the expected 95%+. Users lose trust in the system.

**Prevention:**
- Disable battery optimization for Ruuvi Station in Android settings (Settings > Apps > Ruuvi Station > Battery > Unrestricted)
- Enable "Keep device awake" in Ruuvi Station settings
- Use a dedicated Android phone plugged into a charger permanently as the gateway (a cheap used phone works fine)
- Build data gap detection into the dashboard: if no reading for >10 minutes, show a warning
- Design the data model to handle gaps gracefully -- use timestamp-based queries, never assume regular intervals
- Consider the Ruuvi Gateway hardware ($80) as a long-term replacement for phone-based forwarding -- it was specifically built to solve this reliability problem

**Detection:** Dashboard should track "time since last reading" per sensor. Alert if gap exceeds 2x the configured interval. Weekly data completeness report.

**Phase:** Phase 1 (data ingestion). The phone setup guide and gap detection must be part of initial deployment. Documenting the battery optimization steps is essential.

---

### Pitfall 3: Supabase Free Tier Project Pausing After 7 Days of "Inactivity"

**What goes wrong:** Supabase pauses free-tier projects after 7 days of inactivity. The definition of "inactivity" is not purely based on database writes -- it relates to API and dashboard activity. If the Ruuvi data flows only through edge functions and nobody visits the dashboard for a week (vacation, travel), the project may be paused. When paused, ALL data ingestion stops, the edge function endpoint returns errors, and the project must be manually unpaused from the Supabase dashboard.

**Why it happens:** Supabase uses this mechanism to manage free-tier resource consumption. The threshold is aggressive (7 days) and the recovery requires manual intervention.

**Consequences:** Complete data loss during the paused period. If the phone-based gateway continues sending POST requests to a paused project, those requests fail silently (or with errors the Ruuvi Station app ignores). Extended outages possible if the user is on vacation and not monitoring.

**Prevention:**
- Implement a keep-alive mechanism: the Vercel cron job that polls FMI data also queries Supabase, which counts as activity. If the cron runs daily, this alone should prevent pausing.
- Add a secondary keep-alive: a GitHub Actions scheduled workflow that pings the Supabase REST API every 3 days
- Monitor the project status via the Supabase Management API
- Consider upgrading to Pro plan ($25/month) if data reliability is genuinely important -- this eliminates pausing entirely

**Detection:** Health-check endpoint that returns the last successful database write timestamp. External uptime monitor (UptimeRobot free tier) pinging the health endpoint.

**Phase:** Phase 1 (infrastructure). The FMI cron job doubles as a keep-alive, but add explicit monitoring.

---

### Pitfall 4: FMI API Returns Complex XML/GML, Not JSON -- Parsing is Non-Trivial

**What goes wrong:** The FMI Open Data API is a WFS 2.0 (Web Feature Service) that returns data as GML-encoded XML, not JSON. Developers expecting a simple REST API with JSON responses are surprised by multi-level nested XML with GML namespaces, coordinate reference systems, and OGC standards compliance. Parsing this correctly in a serverless function (either Supabase Edge Function or Vercel API route) requires XML parsing libraries and careful namespace handling.

**Why it happens:** FMI follows OGC/ISO standards for geospatial data distribution. This is standard for meteorological services but unfamiliar to web developers.

**Consequences:** Significant development time spent on XML parsing. Brittle parsing code that breaks when FMI changes minor XML structure details. The 10-second Vercel Hobby plan timeout for serverless functions may be tight if XML parsing is inefficient.

**Prevention:**
- Use a proven XML parsing library: `fast-xml-parser` for Node.js (lightweight, handles namespaces)
- Pre-build and test the FMI query URL thoroughly. The stored query for Helsinki-Vantaa observations is: `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::multipointcoverage&fmisid=100968&parameters=t2m,rh,ws_10min,wg_10min,wd_10min,p_sea,r_1h&timestep=10`
- Cache parsed results to avoid re-parsing on page loads
- Write comprehensive tests for the XML parsing with real FMI response samples
- The FMI API has a 20,000 requests/day limit (more than sufficient for hourly polling)
- FMI may change the API or station availability without notice (their terms state no uptime guarantee)

**Detection:** Parse errors in the cron job logs. Compare expected vs actual fields in parsed output. Test with saved XML snapshots.

**Phase:** Phase 1 (data ingestion). Build and test the FMI parser as a standalone module before integrating.

---

## Moderate Pitfalls

### Pitfall 5: Vercel Hobby Plan Cron Jobs Run Only Once Per Day

**What goes wrong:** Developers assume they can poll FMI data every 10-15 minutes using Vercel cron jobs. On the Hobby (free) plan, cron expressions that run more frequently than daily **fail deployment**. Even daily crons have imprecise timing -- a `0 8 * * *` schedule can trigger anytime between 08:00:00 and 08:59:59.

**Why it happens:** Vercel restricts cron frequency to reduce free-tier resource usage. This is documented but easy to miss.

**Consequences:** If relying on Vercel crons for FMI polling, you only get one outdoor weather reading per day instead of the expected hourly or 10-minute intervals. The dashboard's outdoor data appears stale.

**Prevention:**
- Use an external cron service for higher-frequency polling: cron-job.org (free, reliable), Upstash QStash, or GitHub Actions scheduled workflows can trigger a Vercel API route every 10-30 minutes
- The Vercel API route itself just needs to fetch FMI data and insert into Supabase -- well within the 10-second hobby timeout
- Alternatively, use Supabase's pg_cron extension to schedule a database function that calls FMI via pg_net (keeps everything server-side)
- Design the system so the daily Vercel cron serves as a fallback, with higher-frequency polling handled externally

**Detection:** Check the timestamp of the latest outdoor weather reading on the dashboard. If it is older than the expected interval, the cron is not running.

**Phase:** Phase 1 (data ingestion). Decide on the cron strategy before building the FMI polling.

---

### Pitfall 6: Rendering Thousands of Data Points Freezes the Dashboard

**What goes wrong:** A week of sensor data at 2-minute intervals is 5,040 data points per sensor. A month is ~21,600. Three sensors plus outdoor data means 80,000+ points for a monthly view. Charting libraries (Recharts, Chart.js) will render all of these as individual SVG/Canvas elements, causing visible lag (2-5 seconds), high memory usage, and janky interactions (tooltips, zoom, pan).

**Why it happens:** Developers query all raw data and pass it directly to the charting library. The library faithfully renders every point even though the screen is only ~1,000 pixels wide, making 95%+ of the data points invisible (stacked on the same pixel).

**Consequences:** Slow initial page load. Laggy chart interactions. High client-side memory usage. Poor mobile performance. Users perceive the dashboard as broken or sluggish.

**Prevention:**
- Server-side downsampling: Create a Supabase database function that returns downsampled data based on the requested time range:
  - Last 24h: raw data (720 points per sensor -- fine)
  - Last 7 days: 15-minute averages (~672 points)
  - Last 30 days: 1-hour averages (~720 points)
  - Last year: daily averages (~365 points)
- Always cap the number of data points returned to ~1,000 per series
- Use Chart.js with the decimation plugin (built-in) or Recharts with manual data thinning
- Consider uPlot for the best time-series rendering performance (Canvas-based, handles 100K+ points natively)
- Implement lazy loading: render the default view first, load historical data on demand

**Detection:** Lighthouse performance audit on the dashboard page. Measure time-to-interactive with realistic data volumes.

**Phase:** Phase 2 (dashboard/visualization). But the downsampling SQL functions should be designed in Phase 1 alongside the schema.

---

### Pitfall 7: Supabase Edge Function CORS Misconfiguration Blocks Ruuvi Data

**What goes wrong:** The Supabase Edge Function receiving POST requests from Ruuvi Station must handle CORS manually -- unlike Supabase's REST API, edge functions do not automatically include CORS headers. If the OPTIONS preflight handler is missing or misconfigured, the browser (and potentially the Ruuvi Station app) will receive 403/CORS errors and silently drop data.

**Why it happens:** Developers test the edge function with curl or Postman (which ignores CORS) and assume it works. The Ruuvi Station Android app may or may not enforce CORS (it depends on implementation), but any browser-based testing or future web clients will fail.

**Consequences:** Data ingestion silently fails. Difficult to debug because CORS errors are client-side and not logged server-side.

**Prevention:**
- Add the CORS handler at the very top of every edge function:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```
- Test with a browser fetch() call, not just curl
- Add the CORS headers to ALL responses, not just the OPTIONS response
- Use `@supabase/supabase-js` v2.95.0+ which provides importable CORS headers

**Detection:** Test the edge function URL from a browser console with `fetch()`. Check for CORS errors in browser DevTools network tab.

**Phase:** Phase 1 (data ingestion). Must be correct from the first deployment.

---

### Pitfall 8: No Data Validation on Incoming Sensor Data

**What goes wrong:** The Ruuvi Station forwards raw sensor data as JSON via HTTP POST. Without validation, the edge function inserts whatever it receives -- including malformed data, duplicate readings (if the app retries), readings with impossible values (temperature of 999 due to sensor glitch), or data from sensors not in your fleet (if the endpoint is discovered by others).

**Why it happens:** In the rush to get data flowing, validation is skipped. "It's just my sensors, what could go wrong?"

**Consequences:** Corrupt data in the database. Charts showing impossible spikes. Averages skewed by outlier readings. Potential security issue if the edge function endpoint is public and unsecured.

**Prevention:**
- Validate incoming data in the edge function:
  - Check that `deviceId` / MAC address matches known sensors
  - Validate temperature is between -50 and +60 C
  - Validate humidity is between 0 and 100%
  - Validate pressure is between 87000 and 108500 Pa
  - Reject duplicate timestamps per sensor (within a tolerance window)
- Add an API key or bearer token to the edge function (Ruuvi Station supports custom headers)
- Log rejected data for debugging (but do not store it in the main table)
- Add a `data_quality` flag column to mark readings that pass validation but look suspicious

**Detection:** Dashboard anomaly detection: if a reading differs from the previous reading by more than 10C (or 20% humidity), flag it. Periodic data quality reports.

**Phase:** Phase 1 (data ingestion). Validation must ship with the edge function from day one.

---

## Minor Pitfalls

### Pitfall 9: Timezone Confusion Between Sensor, Server, and Display

**What goes wrong:** RuuviTag data includes timestamps in Unix epoch milliseconds (UTC). FMI API returns timestamps in UTC. Supabase stores timestamps. The Next.js dashboard renders in the user's browser timezone (Europe/Helsinki, UTC+2 or UTC+3 during DST). If timezone handling is inconsistent, charts show data offset by 2-3 hours, "today's" data includes yesterday, and time-range queries return wrong windows.

**Prevention:**
- Store ALL timestamps as `timestamptz` (timestamp with timezone) in PostgreSQL -- never use `timestamp` without timezone
- Store raw UTC timestamps from sensors; never convert before storage
- Convert to local timezone only at the display layer (in the browser)
- Use `date-fns-tz` or `luxon` for timezone-aware date operations in the frontend
- Finland's timezone (Europe/Helsinki) has DST transitions in March and October -- test these edge cases

**Phase:** Phase 1 (schema design) and Phase 2 (dashboard rendering).

---

### Pitfall 10: FMI Station ID and Parameter Names are Fragile

**What goes wrong:** The FMI API uses station identifiers (FMISID) and parameter codes (`t2m`, `rh`, `ws_10min`) that can change. Stations can be decommissioned, parameters renamed, or measurement methods changed. Helsinki-Vantaa airport (FMISID 100968) is a major station unlikely to disappear, but parameter availability can vary.

**Prevention:**
- Abstract the FMI station ID and parameter names into configuration (environment variables), not hardcode them
- Handle missing parameters gracefully -- if `r_1h` (rain) is not returned, do not crash the parser
- Log warnings when expected parameters are missing
- Have a fallback station configured (e.g., Helsinki Kaisaniemi, FMISID 100971)

**Phase:** Phase 1 (FMI integration). Build resilient parsing from the start.

---

### Pitfall 11: Vercel Hobby Plan 10-Second Function Timeout

**What goes wrong:** API routes on Vercel's Hobby plan timeout after 10 seconds. If the dashboard makes a query that scans a large time range over millions of rows without proper indexing, or if the FMI API is slow to respond, the function times out and returns a 504 error.

**Prevention:**
- Add proper indexes on the sensor data table: composite index on `(sensor_id, timestamp)` and `(timestamp)` for range queries
- Use Supabase's connection pooler (Supavisor) with transaction mode for serverless functions
- Set aggressive timeouts on FMI API fetch calls (5 seconds max)
- For the dashboard, use server-side rendering (SSR) with Next.js caching rather than client-side API calls that go through Vercel functions
- Use Vercel Fluid Compute if available to extend effective timeout

**Phase:** Phase 2 (dashboard). Design queries and indexes in Phase 1.

---

### Pitfall 12: Missing Database Indexes Cause Slow Queries at Scale

**What goes wrong:** PostgreSQL without indexes on time-series tables performs sequential scans. At 500K+ rows (about 8 months of data), queries for "last 24 hours of sensor X" go from 50ms to 5+ seconds. This compounds with the 10-second Vercel timeout.

**Prevention:**
- Create indexes at table creation time, not as an afterthought:
  - `CREATE INDEX idx_readings_sensor_time ON readings (sensor_id, recorded_at DESC)` for per-sensor time-range queries
  - `CREATE INDEX idx_readings_time ON readings (recorded_at DESC)` for global time-range queries
- Consider table partitioning by month if data exceeds 2M rows (roughly 2.5 years at current ingestion rates)
- Use `EXPLAIN ANALYZE` on your most common queries during development to verify index usage

**Phase:** Phase 1 (schema design). Indexes must be part of the initial migration.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data ingestion (Phase 1) | Android kills Ruuvi background scanning | Dedicated phone, battery optimization disabled, gap detection |
| Data ingestion (Phase 1) | Supabase project pauses after 7 days | FMI cron doubles as keep-alive, external monitoring |
| Data ingestion (Phase 1) | Edge function CORS blocks POST data | Handle OPTIONS preflight, test from browser |
| Data ingestion (Phase 1) | No validation allows corrupt data | Validate ranges, deduplicate, authenticate |
| Schema design (Phase 1) | Wrong timestamp type causes timezone bugs | Always use `timestamptz`, convert at display only |
| Schema design (Phase 1) | Missing indexes cause slow queries later | Create indexes with the table, not after |
| FMI integration (Phase 1) | XML/GML parsing complexity underestimated | Use fast-xml-parser, test with real responses, handle missing params |
| FMI polling (Phase 1) | Vercel cron only runs daily on Hobby | Use external cron service (cron-job.org) for higher frequency |
| Dashboard (Phase 2) | Rendering too many data points freezes UI | Server-side downsampling, cap at ~1000 points per series |
| Long-term (Phase 3+) | 500MB storage limit hit in 1.5-2 years | Monitor size, implement downsampling strategy, plan for Pro or export |

## Sources

- [Supabase Pricing & Free Tier Limits](https://supabase.com/pricing)
- [Supabase Database Size Documentation](https://supabase.com/docs/guides/platform/database-size)
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Edge Function CORS Documentation](https://supabase.com/docs/guides/functions/cors)
- [Supabase Pause Prevention (GitHub)](https://github.com/travisvn/supabase-pause-prevention)
- [Ruuvi Station Data Forwarding (Android)](https://ruuvi.com/app-settings-data-forwarding-android/)
- [Ruuvi Battery Optimization Guide](https://ruuvi.com/how-to-turn-off-battery-optimisations-on-mobile-devices-to-help-ruuvi-station-run-optimally/)
- [Ruuvi Background Scanning Settings](https://ruuvi.com/app-settings-background-scanning/)
- [Ruuvi Gateway Purpose](https://ruuvi.com/ruuvi-gateway-is-built-to-fix-all-the-bluetooth-sensor-data-routing-issues-2/)
- [FMI Open Data Manual](https://en.ilmatieteenlaitos.fi/open-data-manual)
- [FMI WFS Services](https://en.ilmatieteenlaitos.fi/open-data-manual-fmi-wfs-services)
- [Vercel Cron Job Limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Hobby Plan Limits](https://vercel.com/docs/plans/hobby)
- [Vercel Function Timeout Documentation](https://vercel.com/docs/functions/limitations)
- [PostgreSQL Time Series Best Practices (AWS)](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/)
- [PostgreSQL Row Size Estimation](https://ars-codia.raphaelbauer.com/2019/11/estimate-row-size-in-bytes-on-postgresql.html)
- [PostgreSQL Column Padding and Alignment](https://www.cybertec-postgresql.com/en/type-alignment-padding-bytes-no-space-waste-in-postgresql/)
- [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html)
