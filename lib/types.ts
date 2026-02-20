/**
 * TypeScript types for the Home IoT Monitor dashboard.
 * Matches the database schema from 001_schema.sql.
 */

/** Row from sensor_readings table. Pressure is in Pascals (as stored by Ruuvi Station). */
export interface SensorReading {
  id: number
  mac_address: string
  measured_at: string
  temperature: number | null
  humidity: number | null
  pressure: number | null
  battery_voltage: number | null
  rssi: number | null
  movement_counter: number | null
  tx_power: number | null
  accel_x: number | null
  accel_y: number | null
  accel_z: number | null
  measurement_sequence: number | null
  data_format: number | null
  sensor_name: string | null
  is_outlier: boolean
  outlier_reason: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
}

/** Row from weather_observations table. Pressure is in hPa (from FMI). */
export interface WeatherObservation {
  id: number
  observed_at: string
  fmisid: number
  temperature: number | null
  wind_speed: number | null
  wind_gust: number | null
  wind_direction: number | null
  humidity: number | null
  dew_point: number | null
  precipitation_1h: number | null
  precipitation_intensity: number | null
  snow_depth: number | null
  pressure: number | null
  visibility: number | null
  cloud_cover: number | null
  weather_code: number | null
  raw_values: string | null
  created_at: string
}

/** Row from sensor_config table. */
export interface SensorConfig {
  id: number
  mac_address: string
  display_name: string
  room_name: string | null
  assigned_at: string
  unassigned_at: string | null
  notes: string | null
  created_at: string
}

/** Result from the latest_sensor_readings view -- SensorReading fields plus config join. */
export interface LatestSensorReading {
  mac_address: string
  measured_at: string
  temperature: number | null
  humidity: number | null
  pressure: number | null
  battery_voltage: number | null
  rssi: number | null
  sensor_name: string | null
  is_outlier: boolean
  display_name: string | null
  room_name: string | null
}

/** Comfort classification categories. */
export type ComfortClass = 'dry' | 'comfortable' | 'humid' | 'very_humid'

/** Result from classifyComfort(). */
export interface ComfortResult {
  class: ComfortClass
  label: string
  color: string
}

/** Weather condition label and icon. */
export interface WeatherCondition {
  label: string
  icon: string
}

/** Card sort mode for the room grid. */
export type SortMode = 'alphabetical' | 'temperature' | 'custom'

// ── History types ──────────────────────────────────────────────────

/** Row from get_sensor_history RPC. Pressure already converted to hPa. */
export interface HistoryBucket {
  bucket: string
  mac_address: string
  avg_temperature: number | null
  min_temperature: number | null
  max_temperature: number | null
  avg_humidity: number | null
  min_humidity: number | null
  max_humidity: number | null
  avg_pressure_hpa: number | null
  min_pressure_hpa: number | null
  max_pressure_hpa: number | null
  reading_count: number
}

/** Row from detect_gaps RPC. */
export interface GapInterval {
  mac_address: string
  gap_start: string
  gap_end: string
  duration_minutes: number
}

/** Row from get_summary_stats RPC. */
export interface SummaryStatsRow {
  mac_address: string
  display_name: string
  min_temp: number | null
  max_temp: number | null
  avg_temp: number | null
  min_humidity: number | null
  max_humidity: number | null
  avg_humidity: number | null
  min_pressure_hpa: number | null
  max_pressure_hpa: number | null
  avg_pressure_hpa: number | null
}

/** Time range preset for history page. */
export type TimeRangePreset = '1h' | '2h' | '3h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'custom'

/** Tooltip mode for history chart. */
export type TooltipMode = 'shared' | 'single'

/** Metric type for history chart. */
export type Metric = 'temperature' | 'humidity' | 'pressure'

// ── Storage types ─────────────────────────────────────────────────

/** Row from get_table_sizes RPC. */
export interface TableSize {
  table_name: string
  size_mb: number
  row_estimate: number
}

// ── Health types ──────────────────────────────────────────────────

/** Row from get_sensor_health RPC. */
export interface SensorHealth {
  mac_address: string
  display_name: string
  latest_battery_voltage: number | null
  latest_rssi: number | null
  latest_movement_counter: number | null
  last_seen: string
  total_readings: number
  total_gap_minutes: number
  uptime_pct: number
}

/** Row from get_sensor_health_trend RPC. */
export interface SensorHealthTrend {
  measured_at: string
  battery_voltage: number | null
  rssi: number | null
  movement_counter: number | null
}

/** Severity level for sensor health status. */
export type SeverityLevel = 'healthy' | 'warning' | 'critical'
