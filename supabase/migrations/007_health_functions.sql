-- 007_health_functions.sql
-- PostgreSQL functions for sensor health summary and per-sensor trend data.
-- Used by the /health page for the health table and expandable row charts.

-- 1. get_sensor_health: per-sensor health summary with uptime calculation
CREATE OR REPLACE FUNCTION get_sensor_health(p_hours integer DEFAULT 24)
RETURNS TABLE (
  mac_address text,
  display_name text,
  latest_battery_voltage double precision,
  latest_rssi double precision,
  latest_movement_counter bigint,
  last_seen timestamptz,
  total_readings bigint,
  total_gap_minutes double precision,
  uptime_pct double precision
)
LANGUAGE sql
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (sr.mac_address)
      sr.mac_address,
      sr.battery_voltage,
      sr.rssi,
      sr.movement_counter,
      sr.measured_at
    FROM sensor_readings sr
    WHERE sr.measured_at >= now() - (p_hours || ' hours')::interval
      AND sr.is_outlier = false
    ORDER BY sr.mac_address, sr.measured_at DESC
  ),
  gaps AS (
    SELECT
      sub.mac_address,
      coalesce(sum(sub.gap_minutes), 0) AS total_gap_minutes
    FROM (
      SELECT
        sr.mac_address,
        extract(epoch FROM (sr.measured_at - lag(sr.measured_at) OVER (
          PARTITION BY sr.mac_address ORDER BY sr.measured_at
        ))) / 60.0 AS gap_minutes
      FROM sensor_readings sr
      WHERE sr.measured_at >= now() - (p_hours || ' hours')::interval
        AND sr.is_outlier = false
    ) sub
    WHERE sub.gap_minutes > 15
    GROUP BY sub.mac_address
  ),
  counts AS (
    SELECT
      sr.mac_address,
      count(*) AS total_readings
    FROM sensor_readings sr
    WHERE sr.measured_at >= now() - (p_hours || ' hours')::interval
      AND sr.is_outlier = false
    GROUP BY sr.mac_address
  )
  SELECT
    l.mac_address::text,
    sc.display_name::text,
    l.battery_voltage::double precision AS latest_battery_voltage,
    l.rssi::double precision AS latest_rssi,
    l.movement_counter::bigint AS latest_movement_counter,
    l.measured_at AS last_seen,
    coalesce(c.total_readings, 0)::bigint AS total_readings,
    coalesce(g.total_gap_minutes, 0)::double precision AS total_gap_minutes,
    round((1.0 - coalesce(g.total_gap_minutes, 0) / (p_hours * 60.0)) * 100, 1)::double precision AS uptime_pct
  FROM latest l
  JOIN sensor_config sc
    ON l.mac_address = sc.mac_address
    AND sc.unassigned_at IS NULL
  LEFT JOIN gaps g ON l.mac_address = g.mac_address
  LEFT JOIN counts c ON l.mac_address = c.mac_address
  ORDER BY sc.display_name;
$$;

-- 2. get_sensor_health_trend: raw battery, RSSI, and movement readings for mini charts
DROP FUNCTION IF EXISTS get_sensor_health_trend(text, integer);
CREATE OR REPLACE FUNCTION get_sensor_health_trend(p_mac text, p_hours integer DEFAULT 168)
RETURNS TABLE (
  measured_at timestamptz,
  battery_voltage double precision,
  rssi double precision,
  movement_counter bigint
)
LANGUAGE sql
AS $$
  SELECT
    sr.measured_at,
    sr.battery_voltage::double precision,
    sr.rssi::double precision,
    sr.movement_counter::bigint
  FROM sensor_readings sr
  WHERE sr.mac_address = p_mac
    AND sr.measured_at >= now() - (p_hours || ' hours')::interval
    AND sr.is_outlier = false
  ORDER BY sr.measured_at;
$$;
