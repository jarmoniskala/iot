// ingest-sensors/index.ts
// Supabase Edge Function: receives HTTP POST from Ruuvi Station Android app,
// validates sensor readings, detects outliers, handles duplicates silently,
// auto-registers unknown sensors, logs ingestion metrics, and rate-limits.

import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, resets on cold start)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(deviceId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(deviceId, { count: 1, resetAt: now + WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT) {
    return false; // rate limited
  }
  entry.count++;
  return true; // allowed
}

// ---------------------------------------------------------------------------
// Outlier detection
// ---------------------------------------------------------------------------
interface OutlierCheck {
  field: string;
  min: number;
  max: number;
  reason: string;
}

const OUTLIER_CHECKS: OutlierCheck[] = [
  { field: "temperature", min: -40, max: 60, reason: "temperature_out_of_range" },
  { field: "humidity", min: 0, max: 100, reason: "humidity_out_of_range" },
  { field: "pressure", min: 50000, max: 115000, reason: "pressure_out_of_range" },
  { field: "voltage", min: 1.6, max: 3.65, reason: "voltage_out_of_range" },
];

function checkOutlier(
  tag: Record<string, unknown>
): { isOutlier: boolean; reason: string | null } {
  for (const check of OUTLIER_CHECKS) {
    const value = tag[check.field] as number | null | undefined;
    if (value !== null && value !== undefined && (value < check.min || value > check.max)) {
      return { isOutlier: true, reason: check.reason };
    }
  }
  return { isOutlier: false, reason: null };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // ---- CORS preflight ----
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // ---- Method check ----
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Supabase client (service role for RLS bypass) ----
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ---- Parse payload ----
    const payload = await req.json();
    const tags = payload.tags;
    const deviceId: string = payload.deviceId || "unknown";

    // ---- Authentication ----
    // Option 1: deviceId in body matches INGEST_API_KEY env var (Ruuvi Station proxy mode)
    // Option 2: Bearer token in Authorization header (programmatic clients)
    const ingestApiKey = Deno.env.get("INGEST_API_KEY");

    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const authenticated =
      (ingestApiKey && deviceId === ingestApiKey) ||
      (bearerToken && bearerToken === supabaseAnonKey);

    if (!authenticated) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tags || !Array.isArray(tags)) {
      return new Response(JSON.stringify({ ok: false, error: "missing_tags" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Rate limiting ----
    if (!checkRateLimit(deviceId)) {
      // Log rate limit event
      await supabase.from("ingestion_log").insert({
        source: "ruuvi",
        status: "rate_limited",
        details: { deviceId, tagCount: tags.length },
      });

      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Process each tag ----
    let accepted = 0;
    let duplicates = 0;
    let outliers = 0;
    let errors = 0;

    for (const tag of tags) {
      // Extract and validate required fields
      const macAddress: string | undefined = tag.id;
      const rawMeasuredAt: string | undefined = tag.updateAt;

      if (!macAddress || !rawMeasuredAt) {
        errors++;
        continue; // skip tags missing required fields
      }

      const measuredAt = new Date(rawMeasuredAt);
      if (isNaN(measuredAt.getTime())) {
        errors++;
        continue; // skip tags with invalid timestamps
      }

      // Outlier detection
      const outlierResult = checkOutlier(tag);
      if (outlierResult.isOutlier) {
        outliers++;
      }

      // Build the reading record
      const reading = {
        mac_address: macAddress,
        measured_at: measuredAt.toISOString(),
        temperature: tag.temperature ?? null,
        humidity: tag.humidity ?? null,
        pressure: tag.pressure ?? null, // stored in Pa as received
        battery_voltage: tag.voltage ?? null,
        rssi: tag.rssi ?? null,
        movement_counter: tag.movementCounter ?? null,
        tx_power: tag.txPower ?? null,
        accel_x: tag.accelX ?? null,
        accel_y: tag.accelY ?? null,
        accel_z: tag.accelZ ?? null,
        measurement_sequence: tag.measurementSequenceNumber ?? null,
        data_format: tag.dataFormat ?? null,
        sensor_name: tag.name ?? null,
        is_outlier: outlierResult.isOutlier,
        outlier_reason: outlierResult.reason,
        raw_payload: tag,
      };

      // Insert the reading
      const { error } = await supabase.from("sensor_readings").insert(reading);

      if (error) {
        // Check for unique constraint violation (duplicate)
        // Postgres error code 23505 = unique_violation
        if (error.code === "23505") {
          duplicates++;
        } else {
          errors++;
        }
        continue;
      }

      accepted++;

      // ---- Auto-register unknown sensors ----
      const { data: existing } = await supabase
        .from("sensor_config")
        .select("id")
        .eq("mac_address", macAddress)
        .is("unassigned_at", null)
        .limit(1);

      if (!existing || existing.length === 0) {
        const displayName: string = tag.name || "Unknown Sensor";
        await supabase.from("sensor_config").insert({
          mac_address: macAddress,
          display_name: displayName,
          room_name: null,
          assigned_at: new Date().toISOString(),
        });
      }
    }

    // ---- Log ingestion metrics ----
    const status = accepted > 0 || duplicates > 0 ? "success" : "error";
    await supabase.from("ingestion_log").insert({
      source: "ruuvi",
      status,
      readings_count: accepted,
      duplicates_count: duplicates,
      outliers_count: outliers,
      error_message: errors > 0 ? `${errors} tag(s) failed validation` : null,
      details: { deviceId, tagCount: tags.length },
    });

    // ---- Response ----
    return new Response(
      JSON.stringify({ ok: true, accepted, duplicates, outliers }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    // ---- Unexpected error ----
    const errorMessage = err instanceof Error ? err.message : String(err);

    await supabase.from("ingestion_log").insert({
      source: "ruuvi",
      status: "error",
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ ok: false, error: "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
