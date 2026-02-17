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
