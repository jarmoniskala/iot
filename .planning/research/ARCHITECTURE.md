# Architecture Patterns

**Domain:** Home IoT monitoring dashboard (indoor climate + outdoor weather)
**Researched:** 2026-02-17

## Recommended Architecture

This is a **hub-and-spoke ingestion architecture** with two independent data sources feeding a central PostgreSQL database, consumed by a single Next.js dashboard.

```
                        +---------------------+
                        |   Next.js Dashboard  |
                        |     (on Vercel)      |
                        +----------+----------+
                                   |
                          REST queries / Realtime
                                   |
                        +----------v----------+
                        |      Supabase        |
                        |   (PostgreSQL +      |
                        |    Edge Functions +  |
                        |    Realtime)         |
                        +---+-------------+---+
                            |             |
                  Edge Function     pg_cron + pg_net
                  (webhook receiver)   (scheduled)
                            |             |
                  HTTP POST via     HTTP GET to
                  Ruuvi Station     FMI Open Data
                  Android App       WFS API
                            |             |
                  +---+---+---+    +------+------+
                  | RuuviTag  |    | Helsinki-   |
                  | Sensors   |    | Vantaa      |
                  | (3 rooms) |    | Airport     |
                  +-----------+    | Weather Stn |
                                   +-------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Runtime |
|-----------|---------------|-------------------|---------|
| RuuviTag sensors (x3) | Broadcast BLE advertisements with temperature, humidity, pressure, battery, acceleration, movement counter | Ruuvi Station app (BLE) | Always-on hardware |
| Ruuvi Station Android app | BLE gateway -- scans sensors, forwards readings via HTTP POST | Supabase Edge Function (HTTPS) | Android phone, must be in BLE range |
| Supabase Edge Function: `ingest-ruuvi` | Receives Ruuvi Station POST, validates payload, normalizes data, inserts into `sensor_readings` table | Supabase PostgreSQL (direct) | Deno on Supabase edge network |
| Supabase Edge Function: `fetch-fmi` | Queries FMI WFS API, parses XML response, inserts into `weather_readings` table | FMI API (HTTPS), Supabase PostgreSQL (direct) | Deno on Supabase edge network |
| pg_cron scheduler | Triggers `fetch-fmi` edge function on schedule (every 10 min) | pg_net to invoke edge function | PostgreSQL extension |
| Supabase PostgreSQL | Stores all sensor data, weather data, device metadata; provides REST API and Realtime subscriptions | All other components | Managed PostgreSQL |
| Next.js Dashboard | Renders sensor data views and system health views; subscribes to real-time updates | Supabase (via supabase-js client) | Vercel serverless + client-side |

### Why pg_cron Instead of Vercel Cron

**Confidence: HIGH** (verified via Vercel docs)

Vercel Hobby (free) tier limits cron jobs to **daily execution only**. Hourly or sub-hourly schedules fail deployment. Since FMI weather data should be polled every 10-30 minutes to stay current, Vercel cron is unsuitable on the free tier.

Supabase provides `pg_cron` + `pg_net` extensions that can invoke Edge Functions on any schedule, from every second to annually. This runs entirely within Supabase, costs nothing extra, and avoids the Vercel limitation entirely.

```sql
-- Example: Poll FMI every 10 minutes
SELECT cron.schedule(
  'fetch-fmi-weather',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/fetch-fmi',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Data Flow

### Flow 1: Indoor Sensor Data (Push-based)

```
RuuviTag BLE broadcast (Data Format 5 / RAWv2)
  --> Ruuvi Station Android app scans BLE
  --> App formats JSON payload with all sensor readings
  --> HTTP POST to Supabase Edge Function URL
  --> Edge Function `ingest-ruuvi`:
        1. Validate payload structure and API key/device ID
        2. Extract per-tag measurements (temp, humidity, pressure, battery, etc.)
        3. Map tag MAC addresses to room names via `devices` table
        4. INSERT into `sensor_readings` table
  --> Supabase Realtime broadcasts INSERT event
  --> Dashboard receives update via WebSocket subscription
```

**RuuviTag Data Format 5 (RAWv2) fields available** (HIGH confidence, from official docs):
- Temperature: -163.835 to +163.835 C (0.005 C resolution)
- Humidity: 0-100% (0.0025% resolution)
- Atmospheric pressure: 50000-115536 Pa (1 Pa resolution)
- Acceleration X/Y/Z: -32767 to 32767 mG
- Battery voltage: 1600-3647 mV (1 mV resolution)
- TX power: -40 to +22 dBm
- Movement counter: 0-255 (increments on motion)
- Measurement sequence number: 0-65534 (for deduplication and packet loss detection)

**Ruuvi Station Android forwarding payload** (MEDIUM confidence, based on Gateway API docs and community examples):
The app sends a JSON body containing a `deviceId` (phone identifier), `eventId`, `tags` object keyed by MAC address, where each tag has `rssi`, `temperature`, `humidity`, `pressure`, `accelX`, `accelY`, `accelZ`, `voltage`, `movementCounter`, `measurementSequenceNumber`, and `dataFormat` fields.

### Flow 2: Outdoor Weather Data (Pull-based)

```
pg_cron triggers every 10 minutes
  --> pg_net calls Edge Function `fetch-fmi`
  --> Edge Function makes HTTP GET to FMI Open Data WFS API:
        URL: https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0
             &request=getFeature
             &storedquery_id=fmi::observations::weather::multipointcoverage
             &place=Helsinki-Vantaan%20lentoasema
             &parameters=t2m,rh,ws_10min,wg_int,wd_10min,p_sea,r_1h
             &timestep=10
  --> Parse XML response (WFS MultiPointCoverage format)
  --> Extract: temperature, humidity, wind speed, gusts, wind direction,
       sea-level pressure, precipitation
  --> INSERT into `weather_readings` table
  --> Supabase Realtime broadcasts INSERT event
  --> Dashboard receives update via WebSocket subscription
```

**FMI API details** (MEDIUM confidence, from FMI docs):
- Free, no API key required (Creative Commons Attribution 4.0 license)
- WFS 2.0.0 XML responses
- Helsinki-Vantaa airport station available via `place` parameter
- 10-minute observation intervals standard
- Stored query: `fmi::observations::weather::multipointcoverage`

### Flow 3: Dashboard Data Consumption

```
User opens dashboard
  --> Next.js page loads (server component fetches initial data from Supabase)
  --> Client component subscribes to Supabase Realtime channel:
        - sensor_readings table: INSERT events
        - weather_readings table: INSERT events
  --> On each new reading:
        1. Update current values display
        2. Append to time-series chart data
        3. Recalculate derived metrics (trend, min/max)
  --> User can switch between:
        - Sensor Data view (temp, humidity, pressure per room + outdoor)
        - System Health view (battery, signal strength, movement, last seen)
```

## Database Schema

### Core Tables

```sql
-- Device registry: maps MAC addresses to human-readable names
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_address TEXT UNIQUE NOT NULL,        -- e.g., 'AA:BB:CC:DD:EE:FF'
  name TEXT NOT NULL,                       -- e.g., 'Living Room'
  location TEXT,                            -- e.g., 'indoor' or 'outdoor'
  device_type TEXT NOT NULL DEFAULT 'ruuvitag',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indoor sensor readings from RuuviTags
CREATE TABLE sensor_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  device_id UUID REFERENCES devices(id) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,         -- when the sensor took the reading
  received_at TIMESTAMPTZ DEFAULT now(),    -- when we received it
  temperature REAL,                          -- Celsius
  humidity REAL,                             -- percentage
  pressure REAL,                             -- hPa (Pa / 100)
  battery_voltage REAL,                      -- millivolts
  tx_power SMALLINT,                         -- dBm
  rssi SMALLINT,                             -- signal strength at gateway
  movement_counter SMALLINT,
  measurement_sequence INTEGER,
  accel_x REAL,
  accel_y REAL,
  accel_z REAL,
  PRIMARY KEY (id, measured_at)
) PARTITION BY RANGE (measured_at);

-- Outdoor weather readings from FMI API
CREATE TABLE weather_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  station TEXT NOT NULL DEFAULT 'Helsinki-Vantaa',
  measured_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  temperature REAL,                          -- Celsius
  humidity REAL,                             -- percentage
  pressure REAL,                             -- hPa (sea-level)
  wind_speed REAL,                           -- m/s
  wind_gust REAL,                            -- m/s
  wind_direction REAL,                       -- degrees
  precipitation REAL,                        -- mm/h
  PRIMARY KEY (id, measured_at)
) PARTITION BY RANGE (measured_at);
```

### Partitioning Strategy

Since all data is kept indefinitely, partition by month. This keeps individual partition sizes manageable and makes queries over recent time ranges fast (partition pruning).

```sql
-- Create partitions monthly (automate via pg_cron)
CREATE TABLE sensor_readings_2026_01 PARTITION OF sensor_readings
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE sensor_readings_2026_02 PARTITION OF sensor_readings
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... etc
```

At 3 sensors reporting every ~10 seconds, that is roughly 780,000 rows/month for sensor_readings. At FMI polling every 10 minutes, that is ~4,300 rows/month for weather_readings. Monthly partitions keep each partition well under 1 million rows -- fast enough without advanced indexing.

### Indexes

```sql
-- Most dashboard queries filter by device + time range
CREATE INDEX idx_sensor_readings_device_time
  ON sensor_readings (device_id, measured_at DESC);

CREATE INDEX idx_weather_readings_time
  ON weather_readings (measured_at DESC);
```

### Key Schema Design Decisions

1. **Separate tables for sensor vs weather data.** They have different schemas, different ingestion patterns, and different sources. Forcing them into one table creates sparse columns and complicates queries.

2. **`devices` table for metadata.** MAC addresses are not human-readable. A lookup table maps them to room names and enables future device additions without schema changes.

3. **`measured_at` vs `received_at`.** Distinguishing sensor measurement time from server receive time handles late-arriving data correctly and enables latency monitoring for system health.

4. **REAL not DOUBLE PRECISION.** Sensor precision does not warrant 8-byte doubles. REAL (4 bytes) saves ~40% storage on numeric columns with zero practical accuracy loss for 0.005 C resolution data.

5. **No TimescaleDB.** Supabase provides only the Apache 2 Edition, which lacks continuous aggregates, compression, and retention policies (those are in the Community Edition). Native PostgreSQL partitioning is simpler and sufficient at this data volume.

## Patterns to Follow

### Pattern 1: Edge Function as Thin Ingestion Layer

**What:** Edge functions do minimal work -- validate, normalize, insert. No business logic, no aggregation, no alerting.

**Why:** Keeps the critical data path simple and fast. Edge functions have a 2-second CPU time limit on Supabase free tier. Complex processing risks timeouts. Push aggregation and alerting to database views or dashboard queries.

**Example:**
```typescript
// supabase/functions/ingest-ruuvi/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Extract and normalize tag readings
  const readings = Object.entries(payload.tags).map(([mac, data]: [string, any]) => ({
    mac_address: mac,
    measured_at: new Date(data.updateAt || Date.now()).toISOString(),
    temperature: data.temperature,
    humidity: data.humidity,
    pressure: data.pressure ? data.pressure / 100 : null, // Pa to hPa
    battery_voltage: data.voltage,
    rssi: data.rssi,
    movement_counter: data.movementCounter,
    measurement_sequence: data.measurementSequenceNumber,
    accel_x: data.accelX,
    accel_y: data.accelY,
    accel_z: data.accelZ,
  }))

  // Resolve MAC -> device_id and insert
  // ... (lookup + batch insert)

  return new Response(JSON.stringify({ inserted: readings.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Pattern 2: Server Components for Initial Load, Client Components for Real-time

**What:** Use Next.js server components to fetch the last N hours of data on page load (fast, SEO-friendly, no loading spinner). Use client components only for Supabase Realtime subscriptions that append new data points.

**Why:** Avoids loading states on first render. Minimizes client-side JavaScript. Keeps the dashboard feeling instant.

```
Page (Server Component)
  |-- fetches last 24h of readings from Supabase
  |-- passes data as props to:
      |
      SensorChart (Client Component)
        |-- renders initial chart from props
        |-- subscribes to Realtime for new readings
        |-- appends new points to chart state
```

### Pattern 3: Supabase Realtime for Live Updates

**What:** Subscribe to Postgres Changes on `sensor_readings` and `weather_readings` tables for INSERT events. Use this instead of polling.

**Why:** A personal dashboard has 1-2 concurrent users max. Supabase Realtime on the free tier handles this easily. No need for polling intervals or manual refresh.

```typescript
// Subscribe to new sensor readings
const channel = supabase
  .channel('sensor-updates')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
    (payload) => {
      // Append new reading to chart data
      addReading(payload.new)
    }
  )
  .subscribe()
```

**Important:** Enable the `supabase_realtime` publication on the tables you want to subscribe to:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
```

### Pattern 4: Database Views for Derived Metrics

**What:** Use PostgreSQL views (or materialized views for expensive aggregations) to compute derived metrics like daily averages, min/max, or "time since last reading."

**Why:** Keeps computation in the database where it is fast, avoids duplicating logic in the dashboard, and works automatically as new data arrives.

```sql
-- Latest reading per device (for current values display)
CREATE VIEW latest_readings AS
SELECT DISTINCT ON (device_id)
  sr.*,
  d.name AS device_name,
  d.location
FROM sensor_readings sr
JOIN devices d ON d.id = sr.device_id
ORDER BY device_id, measured_at DESC;

-- System health view
CREATE VIEW device_health AS
SELECT
  d.id,
  d.name,
  d.mac_address,
  lr.battery_voltage,
  lr.rssi,
  lr.movement_counter,
  lr.measured_at AS last_seen,
  EXTRACT(EPOCH FROM (now() - lr.measured_at)) AS seconds_since_last_reading
FROM devices d
LEFT JOIN latest_readings lr ON lr.device_id = d.id;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Polling the Database from the Dashboard

**What:** Using `setInterval` to re-fetch data every N seconds from the client.

**Why bad:** Wastes bandwidth, increases database load, creates inconsistent update intervals. With 3 sensors reporting every ~10 seconds, polling means either too-frequent queries (wasteful) or missed data points.

**Instead:** Use Supabase Realtime subscriptions. Data arrives exactly when it is inserted.

### Anti-Pattern 2: Storing Raw BLE Advertisement Hex Data

**What:** Saving the raw hex-encoded BLE advertisement payload and parsing it later.

**Why bad:** Ruuvi Station already decodes Data Format 5 into human-readable fields. Re-parsing hex is wasted effort and makes queries impossible without application-layer decoding.

**Instead:** Store decoded numeric values directly. The edge function receives already-decoded data from the Ruuvi Station app.

### Anti-Pattern 3: One Giant Table for All Data Types

**What:** Putting indoor sensor readings, outdoor weather data, and device metadata in a single table with nullable columns.

**Why bad:** Sparse columns waste storage, queries require filtering by type, and schema evolution becomes painful. Indoor and outdoor data have fundamentally different schemas and update frequencies.

**Instead:** Separate `sensor_readings`, `weather_readings`, and `devices` tables.

### Anti-Pattern 4: Using Vercel Cron on Free Tier for Frequent Tasks

**What:** Configuring Vercel cron to poll FMI API every 10 minutes.

**Why bad:** Vercel Hobby tier only supports daily cron jobs. Builds will fail with: "Hobby accounts are limited to daily cron jobs."

**Instead:** Use Supabase `pg_cron` + `pg_net` to schedule Edge Function invocations at any interval.

### Anti-Pattern 5: Complex Client-Side Data Transformation

**What:** Fetching raw readings and computing aggregates (hourly averages, daily min/max) in the browser.

**Why bad:** Slow on mobile, duplicated logic across views, breaks when data volume grows. Loading 780K rows/month of raw data to compute a daily average in JavaScript is wasteful.

**Instead:** Use PostgreSQL views or queries with aggregation. Fetch pre-computed results.

## Scalability Considerations

| Concern | Current (3 sensors) | Phase 2 (+ Raspberry Pi) | Future (10+ sensors) |
|---------|---------------------|--------------------------|----------------------|
| Data volume | ~780K rows/month sensor, ~4.3K rows/month weather. Well within 500MB free tier for 6+ months. | Same volume, more reliable ingestion (always-on gateway vs phone). | Monthly partitions still work. Consider materialized views for aggregates. |
| Ingestion reliability | Depends on phone being in BLE range and app running. Data gaps when phone leaves or app sleeps. | Raspberry Pi eliminates phone dependency. Much more reliable. | Multiple gateways possible, need deduplication via `measurement_sequence`. |
| Dashboard performance | Trivial load. Server component initial fetch + Realtime for 1-2 users. | No change. | May need to pre-aggregate for long time ranges (e.g., yearly views). |
| Database connections | Well within Supabase free tier limits. Edge functions use connection pooling. | Same. | Same, unless many concurrent dashboard users (unlikely for personal project). |
| Storage | ~50MB/year at current rates. Free tier 500MB lasts years. | Same. | At 10 sensors: ~250MB/year. Still fine for years. Pro plan if needed ($25/mo for 8GB). |

## Suggested Build Order

Based on component dependencies, build in this order:

### Step 1: Database Foundation
- Create Supabase project
- Define `devices`, `sensor_readings`, `weather_readings` tables with partitioning
- Create indexes and views (`latest_readings`, `device_health`)
- Seed `devices` table with 3 RuuviTag MAC addresses and room names
- Enable `supabase_realtime` publication on data tables

**Rationale:** Everything else depends on the database schema existing.

### Step 2: Ruuvi Ingestion Pipeline
- Build `ingest-ruuvi` Edge Function
- Configure Ruuvi Station Android app data forwarding URL
- Test end-to-end: sensor -> phone -> edge function -> database
- Verify data appears in Supabase table explorer

**Rationale:** Indoor sensor data is the primary data source and the most complex ingestion path (involves external hardware). Get this working and validated before building the dashboard.

### Step 3: FMI Weather Ingestion
- Build `fetch-fmi` Edge Function (HTTP GET to FMI WFS API, XML parsing)
- Enable `pg_cron` and `pg_net` extensions
- Create cron schedule to invoke `fetch-fmi` every 10 minutes
- Store Supabase URL and service role key in Vault

**Rationale:** Can be built in parallel with Step 2, but is simpler (no external hardware dependency). Having both data sources flowing before building the dashboard means the dashboard has real data from day one.

### Step 4: Dashboard - Current Values
- Next.js project setup on Vercel
- Server component: fetch latest readings from `latest_readings` view
- Client component: Supabase Realtime subscription for live updates
- Display current temperature, humidity, pressure per room + outdoor

**Rationale:** Start with the simplest and most useful view. Validates the full pipeline end-to-end.

### Step 5: Dashboard - Time Series Charts
- Add Recharts (via Tremor or directly) for line charts
- Query time-range data (last 24h, 7d, 30d)
- Chart temperature, humidity, pressure over time per room
- Outdoor weather overlay on indoor charts

**Rationale:** Requires the same data pipeline but adds historical queries and visualization complexity.

### Step 6: Dashboard - System Health View
- Display battery voltage, signal strength (RSSI), movement counter, last-seen time per device
- Alert indicators for: battery below threshold, no data received in N minutes
- Use `device_health` view

**Rationale:** Secondary view, depends on same data pipeline. Battery and connectivity monitoring prevent silent data loss.

### Step 7 (Phase 2): Raspberry Pi Gateway
- Set up Raspberry Pi as always-on BLE scanner
- Forward readings to same `ingest-ruuvi` Edge Function
- Remove phone dependency for sensor data collection

**Rationale:** Replaces the weakest link in the architecture (phone as gateway) but the same edge function and database schema work unchanged.

## Sources

- [Ruuvi Data Format 5 (RAWv2)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2)
- [Ruuvi Station Data Forwarding (Android)](https://ruuvi.com/app-settings-data-forwarding-android/)
- [Ruuvi Gateway API](https://docs.ruuvi.com/communicate-with-ruuvi-cloud/cloud/gateway-api)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Scheduling Edge Functions (pg_cron)](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Table Partitioning](https://supabase.com/docs/guides/database/partitions)
- [Supabase TimescaleDB (Apache 2 Edition only)](https://supabase.com/docs/guides/database/extensions/timescaledb)
- [FMI Open Data Manual](https://en.ilmatieteenlaitos.fi/open-data-manual)
- [FMI WFS Services](https://en.ilmatieteenlaitos.fi/open-data-manual-fmi-wfs-services)
- [Vercel Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Tremor (React chart components)](https://www.tremor.so/)
