-- 006_history_functions.sql
-- PostgreSQL functions for time-bucketed aggregation, gap detection, and summary stats.
-- Used by the /history page for trend charts.

-- 1. get_sensor_history: time-bucketed aggregates for sensor readings
CREATE OR REPLACE FUNCTION get_sensor_history(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket_minutes integer DEFAULT 60
)
RETURNS TABLE (
  bucket timestamptz,
  mac_address text,
  avg_temperature double precision,
  min_temperature double precision,
  max_temperature double precision,
  avg_humidity double precision,
  min_humidity double precision,
  max_humidity double precision,
  avg_pressure_hpa double precision,
  min_pressure_hpa double precision,
  max_pressure_hpa double precision,
  reading_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_bucket_minutes <= 5 THEN
    -- Return raw readings (no aggregation) for short ranges
    RETURN QUERY
    SELECT
      sr.measured_at AS bucket,
      sr.mac_address::text,
      sr.temperature::double precision AS avg_temperature,
      sr.temperature::double precision AS min_temperature,
      sr.temperature::double precision AS max_temperature,
      sr.humidity::double precision AS avg_humidity,
      sr.humidity::double precision AS min_humidity,
      sr.humidity::double precision AS max_humidity,
      (sr.pressure / 100.0)::double precision AS avg_pressure_hpa,
      (sr.pressure / 100.0)::double precision AS min_pressure_hpa,
      (sr.pressure / 100.0)::double precision AS max_pressure_hpa,
      1::bigint AS reading_count
    FROM sensor_readings sr
    WHERE sr.measured_at >= p_from
      AND sr.measured_at < p_to
      AND sr.is_outlier = false
    ORDER BY sr.measured_at, sr.mac_address;
  ELSE
    -- Return time-bucketed aggregates
    RETURN QUERY
    SELECT
      (date_trunc('hour', sr.measured_at)
        + (floor(extract(minute FROM sr.measured_at) / p_bucket_minutes) * p_bucket_minutes) * interval '1 minute'
      ) AS bucket,
      sr.mac_address::text,
      avg(sr.temperature)::double precision AS avg_temperature,
      min(sr.temperature)::double precision AS min_temperature,
      max(sr.temperature)::double precision AS max_temperature,
      avg(sr.humidity)::double precision AS avg_humidity,
      min(sr.humidity)::double precision AS min_humidity,
      max(sr.humidity)::double precision AS max_humidity,
      avg(sr.pressure / 100.0)::double precision AS avg_pressure_hpa,
      min(sr.pressure / 100.0)::double precision AS min_pressure_hpa,
      max(sr.pressure / 100.0)::double precision AS max_pressure_hpa,
      count(*)::bigint AS reading_count
    FROM sensor_readings sr
    WHERE sr.measured_at >= p_from
      AND sr.measured_at < p_to
      AND sr.is_outlier = false
    GROUP BY
      (date_trunc('hour', sr.measured_at)
        + (floor(extract(minute FROM sr.measured_at) / p_bucket_minutes) * p_bucket_minutes) * interval '1 minute'
      ),
      sr.mac_address
    ORDER BY bucket, sr.mac_address;
  END IF;
END;
$$;

-- 2. detect_gaps: find gaps in sensor readings exceeding threshold
CREATE OR REPLACE FUNCTION detect_gaps(
  p_from timestamptz,
  p_to timestamptz,
  p_gap_threshold_minutes integer DEFAULT 15
)
RETURNS TABLE (
  mac_address text,
  gap_start timestamptz,
  gap_end timestamptz,
  duration_minutes double precision
)
LANGUAGE sql
AS $$
  WITH ordered_readings AS (
    SELECT
      sr.mac_address::text,
      sr.measured_at,
      LAG(sr.measured_at) OVER (
        PARTITION BY sr.mac_address
        ORDER BY sr.measured_at
      ) AS prev_measured_at
    FROM sensor_readings sr
    WHERE sr.measured_at >= p_from
      AND sr.measured_at < p_to
      AND sr.is_outlier = false
  )
  SELECT
    r.mac_address,
    r.prev_measured_at AS gap_start,
    r.measured_at AS gap_end,
    extract(epoch FROM (r.measured_at - r.prev_measured_at)) / 60.0 AS duration_minutes
  FROM ordered_readings r
  WHERE r.prev_measured_at IS NOT NULL
    AND extract(epoch FROM (r.measured_at - r.prev_measured_at)) / 60.0 > p_gap_threshold_minutes
  ORDER BY r.mac_address, r.gap_start;
$$;

-- 3. get_summary_stats: per-sensor summary for a time range
CREATE OR REPLACE FUNCTION get_summary_stats(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  mac_address text,
  display_name text,
  min_temp double precision,
  max_temp double precision,
  avg_temp double precision,
  min_humidity double precision,
  max_humidity double precision,
  avg_humidity double precision,
  min_pressure_hpa double precision,
  max_pressure_hpa double precision,
  avg_pressure_hpa double precision
)
LANGUAGE sql
AS $$
  SELECT
    sr.mac_address::text,
    sc.display_name::text,
    min(sr.temperature)::double precision AS min_temp,
    max(sr.temperature)::double precision AS max_temp,
    round(avg(sr.temperature)::numeric, 1)::double precision AS avg_temp,
    min(sr.humidity)::double precision AS min_humidity,
    max(sr.humidity)::double precision AS max_humidity,
    round(avg(sr.humidity)::numeric, 1)::double precision AS avg_humidity,
    min(sr.pressure / 100.0)::double precision AS min_pressure_hpa,
    max(sr.pressure / 100.0)::double precision AS max_pressure_hpa,
    round(avg(sr.pressure / 100.0)::numeric, 1)::double precision AS avg_pressure_hpa
  FROM sensor_readings sr
  LEFT JOIN sensor_config sc
    ON sr.mac_address = sc.mac_address
    AND sc.unassigned_at IS NULL
  WHERE sr.measured_at >= p_from
    AND sr.measured_at < p_to
    AND sr.is_outlier = false
  GROUP BY sr.mac_address, sc.display_name
  ORDER BY sc.display_name NULLS LAST, sr.mac_address;
$$;
