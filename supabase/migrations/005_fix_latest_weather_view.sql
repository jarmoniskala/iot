-- 005_fix_latest_weather_view.sql
-- Fix latest_weather view to skip observations with null temperature
-- (FMI sometimes returns rows for the current 10-min window before data is available)
--
-- No time cutoff here — the UI staleness indicator already communicates data
-- age, so we always return the most recent complete observation. This prevents
-- the dashboard from showing "Waiting for weather data..." during FMI outages.

DROP VIEW IF EXISTS latest_weather;

CREATE VIEW latest_weather AS
SELECT *
FROM weather_observations
WHERE temperature IS NOT NULL
ORDER BY observed_at DESC
LIMIT 1;
