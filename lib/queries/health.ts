import type { SupabaseClient } from '@supabase/supabase-js'
import type { SensorHealth, SensorHealthTrend, SeverityLevel } from '@/lib/types'
import { STALE_SENSOR_THRESHOLD_MS, BATTERY_LOW_THRESHOLD_V } from '@/lib/constants'

/**
 * Fetch per-sensor health summary via the get_sensor_health RPC.
 */
export async function fetchSensorHealth(
  supabase: SupabaseClient,
  hours: number = 24
): Promise<SensorHealth[]> {
  const { data, error } = await supabase.rpc('get_sensor_health', {
    p_hours: hours,
  })

  if (error) {
    console.error('fetchSensorHealth error:', error)
    return []
  }

  return (data ?? []) as SensorHealth[]
}

/**
 * Fetch raw battery voltage and RSSI readings for a single sensor
 * over the given time window. Used for the expandable row mini-charts.
 */
export async function fetchSensorHealthTrend(
  supabase: SupabaseClient,
  mac: string,
  hours: number = 168
): Promise<SensorHealthTrend[]> {
  const { data, error } = await supabase.rpc('get_sensor_health_trend', {
    p_mac: mac,
    p_hours: hours,
  })

  if (error) {
    console.error('fetchSensorHealthTrend error:', error)
    return []
  }

  return (data ?? []) as SensorHealthTrend[]
}

/**
 * Determine severity level for a sensor based on its health data.
 *
 * Critical: last_seen older than STALE_SENSOR_THRESHOLD_MS, or battery < BATTERY_LOW_THRESHOLD_V
 * Warning: uptime_pct < 90, or battery < 2.6V
 * Healthy: everything else
 */
export function getSeverity(sensor: SensorHealth): SeverityLevel {
  const now = Date.now()
  const lastSeenMs = new Date(sensor.last_seen).getTime()
  const ageMs = now - lastSeenMs

  // Critical conditions
  if (ageMs > STALE_SENSOR_THRESHOLD_MS) return 'critical'
  if (
    sensor.latest_battery_voltage !== null &&
    sensor.latest_battery_voltage < BATTERY_LOW_THRESHOLD_V
  ) {
    return 'critical'
  }

  // Warning conditions
  if (sensor.uptime_pct < 90) return 'warning'
  if (
    sensor.latest_battery_voltage !== null &&
    sensor.latest_battery_voltage < 2.6
  ) {
    return 'warning'
  }

  return 'healthy'
}
