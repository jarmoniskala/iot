# Phase 1: Data Pipeline - Research

**Researched:** 2026-02-17
**Domain:** Supabase Edge Functions, PostgreSQL schema design, FMI Open Data API, Ruuvi Station data forwarding
**Confidence:** HIGH

## Summary

Phase 1 establishes the complete data pipeline: RuuviTag sensor readings flow from the Ruuvi Station Android app via HTTP POST to a Supabase Edge Function, which validates and stores them. FMI weather observations for Helsinki-Vantaa airport are fetched every 10 minutes by a second Edge Function triggered by pg_cron + pg_net. The database uses monthly-partitioned tables for sensor readings and weather observations, with a sensor config table supporting room assignment history.

The Ruuvi Station Android app sends **decoded sensor values** (not raw hex) in a JSON payload with fields like `temperature`, `humidity`, `pressure`, `voltage`, etc. The FMI API returns **XML** (WFS standard) with no JSON alternative -- parsing with `fast-xml-parser` via npm import in Deno Edge Functions is the standard approach. Both pg_cron and pg_net are available on Supabase's free tier.

**Primary recommendation:** Build two Edge Functions (sensor ingestion + FMI polling), use pg_cron + pg_net to schedule the FMI function every 10 minutes (which also serves as the keep-alive mechanism), and implement manual monthly partitioning with a pg_cron job since pg_partman availability on Supabase is uncertain.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use sensor name from Ruuvi Station Android app (user-assigned name in the app)
- If sensor has default/unnamed value, the UI should indicate it hasn't been properly named (Phase 2 concern, but pipeline should preserve the raw name)
- 4 sensors initially: bedroom, living room, kid's room, outdoors (outdoors will move to office later)
- Accept readings from any RuuviTag -- new sensors show up automatically
- Unregistered/unnamed sensors categorized differently in UI
- Sensor config table maps MAC addresses to rooms with timestamps, supporting repurposing and replacement
- Sensor management UI in Phase 2 dashboard
- Store all available RuuviTag fields (temp, humidity, pressure, battery, RSSI, movement counter, TX power, etc.)
- Also store raw JSON payload in JSONB column for debugging and format changes
- FMI station: Helsinki-Vantaa airport (FMISID 100968), balcony coordinates ~60.326N, 25.040E
- One station is sufficient -- no multi-station support needed
- Store all available FMI parameters (temperature, humidity, wind speed/direction, pressure, precipitation, cloud cover, dew point, visibility, etc.)
- Observations only -- no forecast storage
- Polling every 10 minutes (matches FMI update frequency)
- Log failed FMI fetches for Phase 3 health view visibility
- FMI fetching and XML parsing via Supabase Edge Function (not inside database)
- Keep all raw data forever (no aggregation, no deletion)
- Free tier Supabase (500MB limit) -- monitor storage usage and alert when approaching limit
- Monthly partitioning for sensor readings tables
- Staleness defined by missed update cycles, not absolute time: 3 consecutive missed updates = stale warning
- Duplicate readings (same sensor + timestamp): reject silently, return success to app, log the duplicate
- Outlier detection: store all readings but flag suspicious values
- Authentication: Supabase anon key
- Backfill: accept all readings regardless of age
- Rate limiting: yes, reasonable limit to prevent abuse
- Basic ingestion metrics: track counts, error rates (feeds Phase 3 health view)

### Claude's Discretion
- Edge function response format (status only vs. echo back)
- Keep-alive strategy (whether FMI polling alone prevents Supabase pause)
- Partition automation implementation details
- Outlier detection thresholds and algorithm
- Rate limiting specifics

### Deferred Ideas (OUT OF SCOPE)
- Sensor management UI -- Phase 2
- Forecast display on dashboard -- Phase 2
- Indoor/outdoor correlation analysis views -- Phase 3

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Supabase edge function receives HTTP POST from Ruuvi Station Android app and stores sensor readings | Ruuvi payload format documented, Edge Function handler pattern verified, Supabase client with service_role_key for bypassing RLS |
| PIPE-02 | Edge function validates incoming sensor data (known MAC, realistic ranges, deduplication) | Unique constraint on (mac_address, measured_at) for dedup, outlier flag column, validation ranges from Data Format 5 spec |
| PIPE-03 | FMI API polled on schedule via pg_cron + pg_net (every 10 min) and stored in database | pg_cron + pg_net invoke Edge Function with `*/10 * * * *` schedule, Edge Function fetches FMI XML and parses with fast-xml-parser |
| PIPE-04 | FMI XML/GML response parsed correctly for Helsinki-Vantaa airport station (FMISID 100968) | FMI WFS multipointcoverage format documented, XML structure analyzed, 13 parameters identified, fast-xml-parser works in Deno |
| PIPE-05 | Database storage usage monitored and displayed on dashboard | SQL query `pg_database_size()` verified, 500MB free tier limit documented, read-only mode at limit |
| PIPE-06 | Supabase project kept alive (prevent 7-day inactivity pause) | FMI polling every 10 minutes provides continuous activity; no additional keep-alive needed |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions | Deno runtime | HTTP endpoint for sensor ingestion + FMI polling | Built into Supabase, globally distributed, pre-populated env vars for DB access |
| @supabase/supabase-js | 2.x (npm) | Supabase client for DB operations from Edge Functions | Official client, use with service_role_key for server-side inserts |
| fast-xml-parser | 4.4.x (npm) | Parse FMI WFS XML responses | Most popular XML parser, works with Deno via `npm:` prefix, handles namespaced XML |
| pg_cron | built-in | Schedule recurring jobs in PostgreSQL | Available on Supabase free tier, standard for scheduling |
| pg_net | built-in | Make HTTP requests from PostgreSQL | Available on Supabase free tier, pairs with pg_cron for Edge Function invocation |
| Supabase Vault | built-in | Secure storage for API keys in SQL context | Recommended by Supabase for pg_cron/pg_net auth tokens |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js/cors | 2.95.0+ | CORS headers for browser-invoked functions | Only if sensor ingestion endpoint needs browser access (unlikely -- Android app calls directly) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-xml-parser | DOMParser (Deno built-in) | DOMParser works for simple XML but fast-xml-parser handles namespaced WFS XML more reliably and gives JSON directly |
| pg_cron + pg_net | External cron (GitHub Actions) | External cron adds dependency; pg_cron is built-in and also prevents project pause |
| Manual partitioning | pg_partman | pg_partman availability on Supabase is uncertain; manual approach is reliable |

**Installation:**
Edge Functions use `npm:` imports in Deno -- no separate install step:
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.4.1";
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── functions/
│   ├── ingest-sensors/
│   │   └── index.ts          # Ruuvi Station HTTP POST handler
│   └── poll-fmi/
│       └── index.ts          # FMI weather observation fetcher
├── migrations/
│   ├── 001_schema.sql         # Tables, partitions, indexes
│   ├── 002_functions.sql      # Database functions (storage check, partition create)
│   └── 003_cron_jobs.sql      # pg_cron schedules, vault secrets
└── seed.sql                   # Initial sensor config data
```

### Pattern 1: Sensor Ingestion Edge Function

**What:** HTTP POST handler that receives Ruuvi Station data, validates, deduplicates, flags outliers, and inserts into partitioned table.
**When to use:** Every incoming sensor reading from the Android app.

```typescript
// Source: Supabase Edge Functions docs + Ruuvi Station payload format
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Bypasses RLS
  );

  const payload = await req.json();
  // payload.tags is an array of sensor readings
  // Each tag has: id (MAC), temperature, humidity, pressure,
  //   voltage, rssi, accelX/Y/Z, movementCounter,
  //   measurementSequenceNumber, txPower, dataFormat, name

  const results = [];
  for (const tag of payload.tags) {
    // Validate, check duplicates, flag outliers, insert
    const { error } = await supabase.from("sensor_readings").insert({
      mac_address: tag.id,
      measured_at: new Date(tag.updateAt),
      temperature: tag.temperature,
      humidity: tag.humidity,
      pressure: tag.pressure,
      battery_voltage: tag.voltage,
      rssi: tag.rssi,
      movement_counter: tag.movementCounter,
      tx_power: tag.txPower,
      accel_x: tag.accelX,
      accel_y: tag.accelY,
      accel_z: tag.accelZ,
      measurement_sequence: tag.measurementSequenceNumber,
      data_format: tag.dataFormat,
      is_outlier: checkOutlier(tag),
      raw_payload: tag,  // JSONB column
    });
    results.push({ mac: tag.id, error: error?.message ?? null });
  }

  return new Response(JSON.stringify({ ok: true, count: results.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Pattern 2: FMI Polling Edge Function

**What:** Fetches latest weather observations from FMI WFS API, parses XML, inserts into weather_observations table.
**When to use:** Invoked every 10 minutes by pg_cron + pg_net.

```typescript
// Source: FMI WFS docs + fast-xml-parser
import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.4.1";

const FMI_URL = "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0" +
  "&request=getFeature" +
  "&storedquery_id=fmi::observations::weather::multipointcoverage" +
  "&fmisid=100968&timestep=10";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const response = await fetch(FMI_URL);
    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,  // Strip namespace prefixes for easier access
    });
    const parsed = parser.parse(xml);
    // Extract observations from parsed XML structure
    // Insert into weather_observations table
  } catch (error) {
    // Log failure for Phase 3 health view
    await supabase.from("ingestion_log").insert({
      source: "fmi",
      status: "error",
      error_message: error.message,
      attempted_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({ ok: true }));
});
```

### Pattern 3: pg_cron + pg_net Scheduling

**What:** Database-level cron job that invokes the FMI Edge Function on schedule.
**When to use:** Set up once during initial deployment.

```sql
-- Source: Supabase docs - Scheduling Edge Functions

-- Store secrets in Vault
SELECT vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'project_url'
);
SELECT vault.create_secret(
  'YOUR_ANON_KEY',
  'anon_key'
);

-- Schedule FMI polling every 10 minutes
SELECT cron.schedule(
  'poll-fmi-weather',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/poll-fmi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);
```

### Pattern 4: Monthly Partition Management

**What:** PostgreSQL function + pg_cron job to automatically create next month's partition.
**When to use:** Runs daily; creates partition for next month if it does not exist yet.

```sql
-- Source: PostgreSQL partitioning docs + Supabase partitioning guide

-- Parent table (partitioned)
CREATE TABLE sensor_readings (
  id bigint GENERATED BY DEFAULT AS IDENTITY,
  mac_address text NOT NULL,
  measured_at timestamptz NOT NULL,
  temperature double precision,
  humidity double precision,
  pressure double precision,
  battery_voltage double precision,
  rssi integer,
  movement_counter integer,
  tx_power integer,
  accel_x double precision,
  accel_y double precision,
  accel_z double precision,
  measurement_sequence integer,
  data_format integer,
  is_outlier boolean DEFAULT false,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (measured_at, id)
) PARTITION BY RANGE (measured_at);

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
  table_name text,
  target_date date DEFAULT now()::date
)
RETURNS void AS $$
DECLARE
  partition_name text;
  start_date date;
  end_date date;
BEGIN
  start_date := date_trunc('month', target_date)::date;
  end_date := (start_date + interval '1 month')::date;
  partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule: create next month's partition daily (idempotent)
SELECT cron.schedule(
  'create-sensor-partitions',
  '0 3 * * *',  -- Daily at 03:00
  $$
  SELECT create_monthly_partition('sensor_readings', now()::date);
  SELECT create_monthly_partition('sensor_readings', (now() + interval '1 month')::date);
  SELECT create_monthly_partition('weather_observations', now()::date);
  SELECT create_monthly_partition('weather_observations', (now() + interval '1 month')::date);
  $$
);
```

### Anti-Patterns to Avoid

- **Storing Supabase keys in Edge Function code:** Use `Deno.env.get()` for pre-populated secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). For pg_cron/pg_net, use Vault.
- **Using RLS for server-side Edge Functions:** Use service_role_key which bypasses RLS. The ingestion function is not user-facing; it receives data from the Android app.
- **Parsing FMI XML with regex:** Use a proper XML parser (fast-xml-parser). FMI XML uses deep nesting and namespaces.
- **Creating partitions manually each month:** Automate with a daily pg_cron job that idempotently creates current + next month partitions.
- **Using ON CONFLICT for dedup in partitioned tables:** Unique constraints work per-partition, but ON CONFLICT may behave unexpectedly across partitions. Use a pre-insert check query instead, or ensure the unique constraint is on the partition key columns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML parsing | Custom string/regex parser | fast-xml-parser (npm) | FMI WFS XML has deep nesting, namespaces, and variable structure; parser handles edge cases |
| Cron scheduling | External cron service or setTimeout loops | pg_cron + pg_net | Built into Supabase, reliable, also prevents project pause through activity |
| Secret management in SQL | Hardcoded keys in cron jobs | Supabase Vault | Secure, updatable without changing cron job definitions |
| Database client in Edge Functions | Raw pg connections | @supabase/supabase-js with service_role_key | Handles connection pooling, types, error handling |
| Partition management | Manual monthly DDL | pg_cron + partition creation function | Forgetting to create a partition causes INSERT failures |

**Key insight:** The FMI XML parsing is the trickiest part of this phase. The response uses WFS/GML standards with namespaced elements, and observation values are in a space-separated `doubleOrNilReasonTupleList` that must be split and mapped to parameter names. This is a structured parsing problem, not something to hand-roll.

## Common Pitfalls

### Pitfall 1: FMI XML Response Structure
**What goes wrong:** The FMI multipointcoverage response encodes observation values as space-separated numbers in a `gml:doubleOrNilReasonTupleList` element, with parameter names in a separate `gmlcov:rangeType` element. Developers expect key-value pairs but get positional data.
**Why it happens:** WFS/GML is a geospatial standard, not a developer-friendly API.
**How to avoid:** Parse the XML with `removeNSPrefix: true` in fast-xml-parser. Extract parameter names from `rangeType/DataRecord/field` elements. Split the tuple list by whitespace. Zip parameter names with values. Handle `NaN` values (FMI uses `NaN` for missing data, not null).
**Warning signs:** Getting `undefined` or wrong values for weather parameters; mixing up parameter order.

### Pitfall 2: Ruuvi Payload Format Differences
**What goes wrong:** The Ruuvi Station Android app's data forwarding payload differs from the Ruuvi Gateway hardware payload. Developers reference Gateway docs but the Android app sends a different structure.
**Why it happens:** The Android app sends decoded values with fields like `temperature`, `humidity` as numbers, plus metadata like `name`, `updateAt`, `deviceId`. The Gateway sends raw hex `data` that must be decoded per Data Format 5.
**How to avoid:** The Android app payload (from `measurement.json.example`) contains: root `tags` array (not nested under `data.tags` object), each with decoded numeric values. Log the first real payload and validate against expected structure. Store the raw JSON for debugging.
**Warning signs:** Getting hex strings instead of numbers; missing `name` field; nested structure mismatch.

### Pitfall 3: Partitioned Table Constraints
**What goes wrong:** Inserting into a partitioned table fails with "no partition of relation found for row" if the target month's partition doesn't exist.
**Why it happens:** PostgreSQL range partitioning requires a matching child partition for every value. Unlike some databases, there's no "default" partition by default.
**How to avoid:** Create a DEFAULT partition as a safety net. Also create current + next month partitions during initial setup, and run the daily pg_cron job to create future partitions. Always create partitions proactively.
**Warning signs:** INSERT errors in logs; data loss during month transitions.

### Pitfall 4: Duplicate Handling with Partitioned Tables
**What goes wrong:** `ON CONFLICT` clauses with unique indexes can behave unexpectedly across partitioned tables in older PostgreSQL versions.
**Why it happens:** Each partition has its own unique index; the parent table constraint is enforced per-partition, not globally.
**How to avoid:** Supabase uses PostgreSQL 15+ where `ON CONFLICT` works correctly with partitioned tables and unique constraints that include the partition key. Ensure the unique constraint is `(mac_address, measured_at)` which includes the partition key `measured_at`. Test with actual duplicate data.
**Warning signs:** Duplicate rows appearing despite unique constraint; conflict resolution not triggering.

### Pitfall 5: Supabase Free Tier Project Pause
**What goes wrong:** Project pauses after 7 days of inactivity, stopping all data collection.
**Why it happens:** Supabase free tier policy pauses inactive projects to save resources.
**How to avoid:** The pg_cron job that polls FMI every 10 minutes counts as database activity and prevents pause. This is built-in with our architecture -- no additional keep-alive mechanism needed. However, if the pg_cron job itself fails or is removed, the project could pause.
**Warning signs:** Data gaps in FMI weather observations; ingestion endpoint returning errors.

### Pitfall 6: Edge Function Timeout on FMI Fetch
**What goes wrong:** FMI API can be slow to respond (especially for large time ranges), causing Edge Function timeout.
**Why it happens:** FMI processes queries on the fly; large time ranges mean more data processing.
**How to avoid:** Request only the latest observation (small time window -- last 20-30 minutes). Set explicit timeout on the fetch call. The pg_net `timeout_milliseconds` should be generous (10000ms) since it includes Edge Function cold start + FMI response time.
**Warning signs:** Timeout errors in ingestion_log; missing weather observations.

### Pitfall 7: 500MB Database Limit
**What goes wrong:** Database enters read-only mode when 500MB is exceeded, halting all data ingestion.
**Why it happens:** Free tier hard limit. With 4 sensors reporting every few minutes plus weather data, this is a real concern over months.
**How to avoid:** Create a SQL function that returns current database size. Schedule it to run daily via pg_cron and log the result. Create a view/function that the Phase 2 dashboard can query. Estimate: ~200 bytes per sensor reading * 4 sensors * 12 readings/hour * 24 hours * 365 days = ~34MB/year for sensor data alone (well within limits). Weather data adds similarly modest amounts. The raw JSONB payloads will be the largest component.
**Warning signs:** Database size growing faster than estimated; approaching 400MB.

## Code Examples

### Ruuvi Station Android Payload (Verified from ruuvi-station-influx-gateway)

```json
{
  "tags": [
    {
      "accelX": 0.0,
      "accelY": 0.0,
      "accelZ": 1.0,
      "dataFormat": 5,
      "defaultBackground": 0,
      "favorite": true,
      "humidity": 42.0,
      "id": "E3:75:CF:37:4E:23",
      "measurementSequenceNumber": 25546,
      "movementCounter": 218,
      "name": "Bedroom",
      "pressure": 101018.0,
      "rawDataBlob": null,
      "rssi": -91,
      "temperature": 22.5,
      "txPower": -32,
      "updateAt": "2024-01-15T10:30:00.000+0200",
      "voltage": 3.14
    }
  ],
  "batteryLevel": 18,
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "661e8400-e29b-41d4-a716-446655440001",
  "location": {
    "accuracy": 10.0,
    "latitude": 60.326,
    "longitude": 25.040
  },
  "time": "2024-01-15T10:30:05.000+0200"
}
```

**Key fields per tag:**
- `id`: MAC address (e.g., "E3:75:CF:37:4E:23")
- `name`: User-assigned name from Ruuvi Station app
- `temperature`: Decoded Celsius value (number)
- `humidity`: Decoded percentage (number)
- `pressure`: Decoded Pascals (number) -- note: Pa not hPa
- `voltage`: Battery voltage in volts (number)
- `rssi`: Signal strength in dBm (negative integer)
- `accelX/Y/Z`: Acceleration in G (numbers)
- `movementCounter`: Movement count (integer)
- `measurementSequenceNumber`: Sequence counter (integer)
- `txPower`: TX power in dBm (integer)
- `dataFormat`: RuuviTag data format version (integer, expect 5)
- `updateAt`: Timestamp string (ISO-ish format with timezone)

**Important notes:**
- `pressure` is in **Pascals**, not hectopascals. Divide by 100 for hPa/mbar.
- `tags` is an **array** at the root level, not nested under `data.tags`.
- The `name` field carries the user-assigned sensor name from the Ruuvi Station app.
- `deviceId` identifies the gateway phone, not the sensor.

### FMI API Request (Verified by querying live API)

```
GET https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::multipointcoverage&fmisid=100968&timestep=10
```

**No API key required.** FMI open data is free under Creative Commons license.

**Response parameters (13 fields in order):**
1. `t2m` - Temperature (Celsius)
2. `ws_10min` - Wind speed 10-min average (m/s)
3. `wg_10min` - Wind gust 10-min (m/s)
4. `wd_10min` - Wind direction 10-min (degrees)
5. `rh` - Relative humidity (%)
6. `td` - Dew point temperature (Celsius)
7. `r_1h` - Precipitation 1-hour (mm)
8. `ri_10min` - Precipitation intensity 10-min (mm/h)
9. `snow_aws` - Snow depth (cm)
10. `p_sea` - Sea-level pressure (hPa)
11. `vis` - Visibility (m)
12. `n_man` - Cloud cover (oktas, 0-8)
13. `wawa` - Present weather code (WMO 4680)

**Response data format:** Values are space-separated in `gml:doubleOrNilReasonTupleList`. Missing values appear as `NaN`. Example row:
```
-7.1 1.7 2.8 216.0 78.0 -10.3 NaN 0.0 NaN 1016.1 58627.0 8.0 24.0
```

### Database Schema (Recommended)

```sql
-- Sensor configuration with assignment history
CREATE TABLE sensor_config (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  mac_address text NOT NULL,
  display_name text NOT NULL,
  room_name text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,  -- NULL = currently active
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sensor_config_mac ON sensor_config(mac_address);
CREATE INDEX idx_sensor_config_active ON sensor_config(mac_address) WHERE unassigned_at IS NULL;

-- Sensor readings (monthly partitioned)
CREATE TABLE sensor_readings (
  id bigint GENERATED BY DEFAULT AS IDENTITY,
  mac_address text NOT NULL,
  measured_at timestamptz NOT NULL,
  temperature double precision,
  humidity double precision,
  pressure double precision,
  battery_voltage double precision,
  rssi integer,
  movement_counter integer,
  tx_power integer,
  accel_x double precision,
  accel_y double precision,
  accel_z double precision,
  measurement_sequence integer,
  data_format integer,
  sensor_name text,         -- Preserved from Ruuvi Station app
  is_outlier boolean DEFAULT false,
  outlier_reason text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (measured_at, id)
) PARTITION BY RANGE (measured_at);

-- Unique constraint for deduplication (includes partition key)
CREATE UNIQUE INDEX idx_sensor_readings_dedup
  ON sensor_readings (mac_address, measured_at);

-- Weather observations (monthly partitioned)
CREATE TABLE weather_observations (
  id bigint GENERATED BY DEFAULT AS IDENTITY,
  observed_at timestamptz NOT NULL,
  fmisid integer NOT NULL DEFAULT 100968,
  temperature double precision,
  wind_speed double precision,
  wind_gust double precision,
  wind_direction double precision,
  humidity double precision,
  dew_point double precision,
  precipitation_1h double precision,
  precipitation_intensity double precision,
  snow_depth double precision,
  pressure double precision,
  visibility double precision,
  cloud_cover double precision,
  weather_code double precision,
  raw_values text,           -- Original space-separated string for debugging
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (observed_at, id)
) PARTITION BY RANGE (observed_at);

CREATE UNIQUE INDEX idx_weather_obs_dedup
  ON weather_observations (fmisid, observed_at);

-- Ingestion log for metrics and error tracking
CREATE TABLE ingestion_log (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  source text NOT NULL,           -- 'ruuvi' or 'fmi'
  status text NOT NULL,           -- 'success', 'error', 'duplicate', 'outlier'
  readings_count integer DEFAULT 0,
  duplicates_count integer DEFAULT 0,
  outliers_count integer DEFAULT 0,
  error_message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ingestion_log_source_time ON ingestion_log(source, created_at DESC);

-- Storage monitoring function
CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS numeric AS $$
  SELECT round(
    pg_database_size(current_database()) / (1024.0 * 1024.0), 2
  );
$$ LANGUAGE sql;

-- Table sizes breakdown
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(table_name text, size_mb numeric, row_estimate bigint) AS $$
  SELECT
    schemaname || '.' || relname AS table_name,
    round(pg_total_relation_size(relid) / (1024.0 * 1024.0), 2) AS size_mb,
    n_live_tup AS row_estimate
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
$$ LANGUAGE sql;
```

### Edge Function: Outlier Detection (Discretion Area)

```typescript
// Recommended outlier thresholds based on RuuviTag Data Format 5 valid ranges
// and reasonable indoor/outdoor conditions in Finland
interface OutlierCheck {
  field: string;
  min: number;
  max: number;
  reason: string;
}

const OUTLIER_CHECKS: OutlierCheck[] = [
  { field: "temperature", min: -40, max: 60, reason: "temperature_out_of_range" },
  { field: "humidity", min: 0, max: 100, reason: "humidity_out_of_range" },
  { field: "pressure", min: 50000, max: 115000, reason: "pressure_out_of_range" },  // Pa
  { field: "voltage", min: 1.6, max: 3.65, reason: "voltage_out_of_range" },
];

function checkOutlier(tag: Record<string, unknown>): { isOutlier: boolean; reason: string | null } {
  for (const check of OUTLIER_CHECKS) {
    const value = tag[check.field] as number;
    if (value !== null && value !== undefined && (value < check.min || value > check.max)) {
      return { isOutlier: true, reason: check.reason };
    }
  }
  return { isOutlier: false, reason: null };
}
```

### Edge Function: Rate Limiting (Discretion Area)

```typescript
// Simple in-memory rate limiting for the ingestion endpoint
// Recommended: 60 requests per minute per device ID
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(deviceId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(deviceId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count++;
  return true;
}
```

**Note:** In-memory rate limiting resets on Edge Function cold starts. This is acceptable for abuse prevention; it does not need to be perfectly persistent. For more robust rate limiting, Upstash Redis can be used, but adds complexity and a dependency.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Edge Functions on Deno 1.x | Deno 2.1+ runtime with npm: imports | Late 2024 | Use `npm:package@version` syntax, not `esm.sh` or `deno.land/x` |
| `verify_jwt` flag on Edge Functions | Explicit auth in function code | 2025 | Handle auth yourself; don't rely on deprecated `verify_jwt` setting |
| Separate pg_cron and pg_net setup | Supabase Cron module (unified) | 2024 | Use `cron.schedule()` with `net.http_post()` in single SQL statement |
| Manual partition creation | pg_partman (limited Supabase support) | Uncertain | pg_partman may be available; fallback to manual function + pg_cron |

**Deprecated/outdated:**
- `esm.sh` and `deno.land/x` imports: Use `npm:` or `jsr:` prefixes instead
- `verify_jwt` Edge Function flag: Moving to explicit JWT verification in code
- FMI API key requirement: FMI open data no longer requires registration or API key

## Open Questions

1. **Exact Ruuvi Station Android payload structure**
   - What we know: The `ruuvi-station-influx-gateway` project documents a payload with decoded values (temperature, humidity, etc. as numbers). The `tags` field is an array at root level.
   - What's unclear: Whether the current Ruuvi Station app version sends exactly this format, or if the format has evolved. The `updateAt` timestamp format may vary.
   - Recommendation: Log the first real payload to a `raw_payload` JSONB column and validate against expected structure. Build the parser defensively with fallbacks. **Confidence: MEDIUM** -- the gateway project is official Ruuvi, but the app may have changed.

2. **Ruuvi Station background scanning default interval**
   - What we know: Configurable between 15 seconds and 1 hour. Data forwarding uses the same interval as background data logging.
   - What's unclear: The exact default value. Likely 1 minute or 5 minutes based on RuuviTag's internal 5-minute logging interval.
   - Recommendation: Not critical for the pipeline -- accept whatever interval the user configures. For staleness calculation, the user defined "3 missed update cycles." Store the per-sensor interval or calculate it from observed data gaps. **Confidence: LOW**

3. **pg_partman on Supabase free tier**
   - What we know: pg_partman was announced as coming to Supabase (late 2024 announcement). Availability status unclear.
   - What's unclear: Whether it's available now, and whether it works on free tier.
   - Recommendation: Use manual partition creation with pg_cron job (documented above). This is reliable and well-understood. If pg_partman becomes available, it can be adopted later as a simplification. **Confidence: HIGH** (for the manual approach).

4. **FMI API rate limits**
   - What we know: FMI open data is free with no API key. No explicit rate limit documentation found.
   - What's unclear: Whether there are undocumented rate limits or IP-based throttling.
   - Recommendation: 6 requests per hour (every 10 minutes) is extremely conservative. Log failures and retry. The FMI API appears to be designed for programmatic access. **Confidence: HIGH** that our usage level is fine.

## Discretion Recommendations

### Edge Function Response Format
**Recommendation: Status only.** Return `{ ok: true, count: N }` or `{ ok: false, error: "message" }`. Do not echo back the full payload -- the Android app doesn't need it, and it wastes bandwidth. Include counts of accepted, duplicated, and flagged readings for observability.

### Keep-Alive Strategy
**Recommendation: FMI polling is sufficient.** The pg_cron job running every 10 minutes constitutes continuous database activity, which prevents the 7-day inactivity pause. No additional keep-alive mechanism is needed. This is the most elegant solution since the FMI polling is already required.

### Partition Automation
**Recommendation: Manual function + pg_cron.** Create a `create_monthly_partition()` PL/pgSQL function that is idempotent (uses `CREATE TABLE IF NOT EXISTS`). Schedule it daily at 03:00 via pg_cron. Always create current month + next month. Include a DEFAULT partition as safety net for unexpected dates. See Pattern 4 above for implementation.

### Outlier Detection Thresholds
**Recommendation: Range-based checks.** Use the physical limits from RuuviTag Data Format 5 spec combined with reasonable environmental bounds. Temperature: -40 to +60C. Humidity: 0 to 100%. Pressure: 500 to 1150 hPa (50000-115000 Pa). Battery: 1.6V to 3.65V. Flag but store all values. See code example above.

### Rate Limiting
**Recommendation: 60 requests/minute per deviceId.** Use in-memory rate limiting (Map) in the Edge Function. This resets on cold starts but provides adequate abuse prevention. Return HTTP 429 with a clear message when rate-limited. The Ruuvi Station app at its most aggressive (15-second interval) sends 4 requests/minute -- well within this limit.

## Sources

### Primary (HIGH confidence)
- Supabase Edge Functions docs - handler pattern, deployment, env vars: https://supabase.com/docs/guides/functions/quickstart
- Supabase Scheduling Edge Functions - pg_cron + pg_net + Vault pattern: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase Edge Function secrets - pre-populated env vars: https://supabase.com/docs/guides/functions/secrets
- Supabase Edge Function auth - securing functions: https://supabase.com/docs/guides/functions/auth
- Supabase table partitioning - range partitioning guide: https://supabase.com/docs/guides/database/partitions
- Supabase database size monitoring: https://supabase.com/docs/guides/platform/database-size
- FMI WFS API - live query with FMISID 100968 (verified working): https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::multipointcoverage&fmisid=100968&timestep=10
- FMI stored query description - parameters and defaults: https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=describeStoredQueries&storedquery_id=fmi%3A%3Aobservations%3A%3Aweather%3A%3Amultipointcoverage
- RuuviTag Data Format 5 (RAWv2) spec: https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2

### Secondary (MEDIUM confidence)
- Ruuvi Station Influx Gateway - payload format example: https://github.com/ruuvi/ruuvi-station-influx-gateway (measurement.json.example shows decoded values with tags array)
- Ruuvi Gateway API docs - HTTP POST structure: https://docs.ruuvi.com/communicate-with-ruuvi-cloud/cloud/gateway-api
- FMI open data manual - API overview: https://en.ilmatieteenlaitos.fi/open-data-manual
- fast-xml-parser on Deno - npm compatibility: https://deno.com/npm/package/fast-xml-parser
- Supabase CORS guide: https://supabase.com/docs/guides/functions/cors
- Supabase free tier pricing: https://supabase.com/pricing

### Tertiary (LOW confidence)
- Ruuvi Station Android data forwarding page (content not extractable, CSS-only rendering): https://ruuvi.com/app-settings-data-forwarding-android/
- pg_partman on Supabase (discussed, availability uncertain): https://github.com/orgs/supabase/discussions/14506

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Supabase Edge Functions, pg_cron, pg_net all verified in official docs
- Architecture: HIGH - pg_cron + pg_net -> Edge Function pattern is officially documented by Supabase
- FMI API: HIGH - Live API query verified, response structure analyzed from real data
- Ruuvi payload format: MEDIUM - Based on official Ruuvi gateway project but Android app format may differ slightly
- Partitioning: HIGH - Standard PostgreSQL range partitioning, well-documented
- Pitfalls: HIGH - Based on real constraints (free tier limits, XML parsing complexity, partition requirements)
- Outlier detection: MEDIUM - Thresholds based on hardware spec, but real-world tuning may be needed

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days -- Supabase and FMI APIs are stable)
