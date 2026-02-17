-- 004_realtime_and_views.sql
-- Phase 2: Enable Supabase Realtime, create dashboard views, and set up RLS policies.

-- ============================================================================
-- 1. ENABLE REALTIME
-- ============================================================================
-- Add tables to the supabase_realtime publication so postgres_changes
-- events fire when new data is inserted.

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE weather_observations;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_config;


-- ============================================================================
-- 2. DASHBOARD VIEWS
-- ============================================================================

-- Latest sensor reading per active sensor (efficient view for dashboard).
-- Uses DISTINCT ON with 1-hour window to limit partition scanning.
-- Joins sensor_config for display_name and room_name.
CREATE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (sr.mac_address)
  sr.mac_address,
  sr.measured_at,
  sr.temperature,
  sr.humidity,
  sr.pressure,
  sr.battery_voltage,
  sr.rssi,
  sr.sensor_name,
  sr.is_outlier,
  sc.display_name,
  sc.room_name
FROM sensor_readings sr
JOIN sensor_config sc ON sc.mac_address = sr.mac_address
  AND sc.unassigned_at IS NULL
WHERE sr.measured_at > now() - interval '1 hour'
  AND sr.is_outlier = false
ORDER BY sr.mac_address, sr.measured_at DESC;

-- Latest weather observation (single most recent row within 1 hour).
CREATE VIEW latest_weather AS
SELECT *
FROM weather_observations
WHERE observed_at > now() - interval '1 hour'
ORDER BY observed_at DESC
LIMIT 1;


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
-- Personal dashboard with no authentication -- permissive policies for anon access.
-- RLS must be enabled for Realtime subscriptions to work with the anon key.

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_config ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access for dashboard queries and Realtime subscriptions
CREATE POLICY "Allow anonymous read access" ON sensor_readings
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON weather_observations
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON sensor_config
  FOR SELECT USING (true);

-- Allow anonymous update on sensor_config for room name/icon editing from dashboard
CREATE POLICY "Allow anonymous update on sensor_config" ON sensor_config
  FOR UPDATE USING (true)
  WITH CHECK (true);
