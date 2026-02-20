// poll-fmi/index.ts
// Supabase Edge Function: fetches weather observations from the FMI WFS API
// for Helsinki-Vantaa airport (FMISID 100968), parses the XML response,
// and stores recent observations in the weather_observations table.
//
// Invoked every 10 minutes by pg_cron + pg_net (see 003_cron_jobs.sql).
// Also serves as the Supabase project keep-alive mechanism.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.4.1";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FMI_URL =
  "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0" +
  "&request=getFeature" +
  "&storedquery_id=fmi::observations::weather::multipointcoverage" +
  "&fmisid=100968&timestep=10";

const FMISID = 100968;

// Only insert observations from the last 20 minutes to avoid re-inserting
// the full 12-hour history that FMI returns by default.
const RECENT_WINDOW_MS = 20 * 60 * 1000;

// FMI fetch timeout per attempt.
const FETCH_TIMEOUT_MS = 8000;

// Retry configuration: 3 attempts, exponential backoff (1s, 2s).
// Worst case total: 8s + 1s + 8s + 2s + 8s = 27s (well within Edge Function limit).
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];

// Map FMI parameter names to weather_observations column names.
// Order matches the FMI multipointcoverage response for FMISID 100968.
const FMI_PARAM_TO_COLUMN: Record<string, string> = {
  t2m: "temperature",
  ws_10min: "wind_speed",
  wg_10min: "wind_gust",
  wd_10min: "wind_direction",
  rh: "humidity",
  td: "dew_point",
  r_1h: "precipitation_1h",
  ri_10min: "precipitation_intensity",
  snow_aws: "snow_depth",
  p_sea: "pressure",
  vis: "visibility",
  n_man: "cloud_cover",
  wawa: "weather_code",
};

// Ordered list of expected parameter names (for positional mapping).
const EXPECTED_PARAMS = Object.keys(FMI_PARAM_TO_COLUMN);

// ---------------------------------------------------------------------------
// CORS headers (same pattern as ingest-sensors)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single value from the FMI response. FMI uses "NaN" for missing data.
 * Returns null for NaN or unparseable values.
 */
function parseFmiValue(raw: string): number | null {
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Navigate a nested object by a dot-separated path. Returns undefined if any
 * segment is missing. Handles arrays by picking the first element when the
 * path expects an object but encounters an array (common in XML-to-JSON where
 * single-element arrays get unwrapped inconsistently).
 */
function deepGet(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      // If we hit an array when expecting an object, take the first element
      current = current[0];
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// ---------------------------------------------------------------------------
// FMI XML Parsing
// ---------------------------------------------------------------------------

interface ParsedObservation {
  observedAt: Date;
  values: Record<string, number | null>;
  rawValues: string;
}

/**
 * Extract observations from the parsed FMI WFS XML response.
 *
 * The FMI multipointcoverage response structure (after namespace stripping):
 *
 *   FeatureCollection > member > GridSeriesObservation > domainSet >
 *     SimpleMultiPoint > positions
 *       => newline-separated lines: "lat lon unixTimestamp"
 *
 *   FeatureCollection > member > GridSeriesObservation > rangeSet >
 *     DataBlock > doubleOrNilReasonTupleList
 *       => newline-separated lines: "val1 val2 ... val13"
 *
 *   FeatureCollection > member > GridSeriesObservation > rangeSet >
 *     DataBlock > rangeType > DataRecord > field
 *       => array of { @_name: "t2m" }, { @_name: "ws_10min" }, etc.
 *
 * Note: The actual nesting may vary. fast-xml-parser with removeNSPrefix
 * strips all namespace prefixes, simplifying access.
 */
function extractObservations(parsed: unknown): ParsedObservation[] {
  // Navigate to the GridSeriesObservation
  const observation = deepGet(
    parsed,
    "FeatureCollection.member.GridSeriesObservation"
  );
  if (!observation) {
    throw new Error(
      "FMI XML: could not find GridSeriesObservation at " +
        "FeatureCollection.member.GridSeriesObservation"
    );
  }

  // The coverage data is nested under result.MultiPointCoverage
  const coverage = deepGet(observation, "result.MultiPointCoverage");
  if (!coverage) {
    throw new Error(
      "FMI XML: could not find MultiPointCoverage at " +
        "result.MultiPointCoverage"
    );
  }

  // --- Extract timestamps from positions ---
  const positionsRaw = deepGet(
    coverage,
    "domainSet.SimpleMultiPoint.positions"
  );
  if (typeof positionsRaw !== "string") {
    throw new Error(
      "FMI XML: positions not found or not a string at " +
        "domainSet.SimpleMultiPoint.positions"
    );
  }

  const positionLines = positionsRaw
    .trim()
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  // Each position line: "lat lon unixTimestampInSeconds"
  const timestamps: Date[] = positionLines.map((line: string) => {
    const parts = line.split(/\s+/);
    const unixSeconds = parseInt(parts[parts.length - 1], 10);
    if (isNaN(unixSeconds)) {
      throw new Error(`FMI XML: could not parse timestamp from position line: "${line}"`);
    }
    return new Date(unixSeconds * 1000);
  });

  // --- Extract parameter names (for verification) ---
  const rangeType = deepGet(coverage, "rangeType");
  if (rangeType) {
    const dataRecord = deepGet(rangeType, "DataRecord.field");
    if (Array.isArray(dataRecord)) {
      const paramNames = dataRecord.map(
        (f: Record<string, unknown>) => f["@_name"] as string
      );
      // Verify parameter order matches our expectation
      for (let i = 0; i < Math.min(paramNames.length, EXPECTED_PARAMS.length); i++) {
        if (paramNames[i] !== EXPECTED_PARAMS[i]) {
          console.warn(
            `FMI parameter order mismatch at index ${i}: ` +
              `expected "${EXPECTED_PARAMS[i]}", got "${paramNames[i]}"`
          );
        }
      }
    }
  }

  // --- Extract values ---
  const valuesRaw = deepGet(
    coverage,
    "rangeSet.DataBlock.doubleOrNilReasonTupleList"
  );
  if (typeof valuesRaw !== "string") {
    throw new Error(
      "FMI XML: doubleOrNilReasonTupleList not found or not a string at " +
        "rangeSet.DataBlock.doubleOrNilReasonTupleList"
    );
  }

  const valueLines = valuesRaw
    .trim()
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  if (valueLines.length !== timestamps.length) {
    throw new Error(
      `FMI XML: timestamp count (${timestamps.length}) does not match ` +
        `value row count (${valueLines.length})`
    );
  }

  // --- Zip timestamps + values into observations ---
  const observations: ParsedObservation[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const rawLine = valueLines[i];
    const rawParts = rawLine.split(/\s+/);
    const values: Record<string, number | null> = {};

    for (let j = 0; j < EXPECTED_PARAMS.length; j++) {
      const columnName = FMI_PARAM_TO_COLUMN[EXPECTED_PARAMS[j]];
      values[columnName] = j < rawParts.length ? parseFmiValue(rawParts[j]) : null;
    }

    observations.push({
      observedAt: timestamps[i],
      values,
      rawValues: rawLine,
    });
  }

  return observations;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // ---- CORS preflight ----
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // ---- Supabase client (service role for RLS bypass) ----
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ---- Fetch FMI data with retry + timeout ----
    let fmiResponse: Response | null = null;
    let lastError: string | null = null;
    let attempts = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      attempts = attempt + 1;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(FMI_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          fmiResponse = res;
          break;
        }

        // HTTP error — capture for logging, retry on 5xx
        const body = await res.text().catch(() => "(unreadable)");
        lastError = `FMI returned HTTP ${res.status}: ${body.slice(0, 200)}`;

        if (res.status < 500) {
          // Client error (4xx) — no point retrying
          break;
        }
      } catch (fetchErr: unknown) {
        clearTimeout(timeoutId);
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        const isTimeout = msg.includes("abort") || msg.includes("AbortError");
        lastError = isTimeout
          ? `FMI fetch timed out after ${FETCH_TIMEOUT_MS}ms`
          : `FMI fetch failed: ${msg}`;
      }

      // Wait before next attempt (unless this was the last one)
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }

    if (!fmiResponse) {
      await supabase.from("ingestion_log").insert({
        source: "fmi",
        status: "error",
        error_message: lastError ?? "Unknown fetch error",
        details: { url: FMI_URL, attempts },
      });

      return new Response(
        JSON.stringify({ ok: false, error: "fmi_fetch_failed", attempts }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- Parse XML ----
    const xmlText = await fmiResponse.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      numberParseOptions: { leadingZeros: false, hex: false },
      isLeafNode: (_name: string, jpath: string) => {
        // Force positions and tuple list to stay as strings
        return jpath.endsWith(".positions") ||
          jpath.endsWith(".doubleOrNilReasonTupleList");
      },
    });
    const parsed = parser.parse(xmlText);

    // ---- Extract observations ----
    const allObservations = extractObservations(parsed);

    // ---- Filter to recent observations only (last 20 minutes) ----
    const cutoff = new Date(Date.now() - RECENT_WINDOW_MS);
    const recentObservations = allObservations.filter(
      (obs) => obs.observedAt >= cutoff
    );

    if (recentObservations.length === 0) {
      // No recent observations -- log and return success (not an error)
      await supabase.from("ingestion_log").insert({
        source: "fmi",
        status: "success",
        readings_count: 0,
        duplicates_count: 0,
        details: {
          totalInResponse: allObservations.length,
          recentCount: 0,
          cutoff: cutoff.toISOString(),
          latestInResponse: allObservations.length > 0
            ? allObservations[allObservations.length - 1].observedAt.toISOString()
            : null,
          attempts,
        },
      });

      return new Response(
        JSON.stringify({ ok: true, observations: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- Build rows for upsert ----
    const rows = recentObservations.map((obs) => ({
      observed_at: obs.observedAt.toISOString(),
      fmisid: FMISID,
      temperature: obs.values.temperature,
      wind_speed: obs.values.wind_speed,
      wind_gust: obs.values.wind_gust,
      wind_direction: obs.values.wind_direction,
      humidity: obs.values.humidity,
      dew_point: obs.values.dew_point,
      precipitation_1h: obs.values.precipitation_1h,
      precipitation_intensity: obs.values.precipitation_intensity,
      snow_depth: obs.values.snow_depth,
      pressure: obs.values.pressure,
      visibility: obs.values.visibility,
      cloud_cover: obs.values.cloud_cover,
      weather_code: obs.values.weather_code,
      raw_values: obs.rawValues,
    }));

    // ---- Insert with ON CONFLICT DO NOTHING for deduplication ----
    // The unique index idx_weather_obs_dedup (fmisid, observed_at) handles dedup.
    // Supabase JS client upsert with ignoreDuplicates sends ON CONFLICT DO NOTHING.
    const { error: insertError, count } = await supabase
      .from("weather_observations")
      .upsert(rows, {
        onConflict: "fmisid,observed_at",
        ignoreDuplicates: true,
        count: "exact",
      });

    if (insertError) {
      await supabase.from("ingestion_log").insert({
        source: "fmi",
        status: "error",
        error_message: `Insert failed: ${insertError.message}`,
        details: {
          code: insertError.code,
          rowCount: rows.length,
        },
      });

      return new Response(
        JSON.stringify({ ok: false, error: "insert_failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const inserted = count ?? rows.length;
    const duplicateCount = rows.length - inserted;

    // ---- Log success ----
    await supabase.from("ingestion_log").insert({
      source: "fmi",
      status: "success",
      readings_count: inserted,
      duplicates_count: duplicateCount,
      details: {
        totalInResponse: allObservations.length,
        recentCount: recentObservations.length,
        latestObservation: recentObservations[recentObservations.length - 1]
          .observedAt.toISOString(),
        attempts,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, observations: inserted }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    // ---- Unexpected error (parse failure, etc.) ----
    const errorMessage = err instanceof Error ? err.message : String(err);

    await supabase.from("ingestion_log").insert({
      source: "fmi",
      status: "error",
      error_message: errorMessage,
      details: { url: FMI_URL },
    });

    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
