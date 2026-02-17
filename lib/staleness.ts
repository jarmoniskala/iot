/**
 * Staleness detection for sensors and weather data.
 *
 * Staleness = 3 missed update cycles (per project decision):
 * - Sensors: 3 * 60s = 180s (3 minutes)
 * - Weather: 3 * 10min = 30 minutes
 */

'use client'

import { useState, useEffect } from 'react'
import { STALE_SENSOR_THRESHOLD_MS, STALE_WEATHER_THRESHOLD_MS } from './constants'

/**
 * Determine if a sensor reading is stale.
 *
 * Stale if the reading is older than 3 minutes (3 missed 60s update cycles).
 */
export function isSensorStale(
  measuredAt: Date | string,
  now: Date = new Date()
): boolean {
  const measured = typeof measuredAt === 'string' ? new Date(measuredAt) : measuredAt
  const ageMs = now.getTime() - measured.getTime()
  return ageMs > STALE_SENSOR_THRESHOLD_MS
}

/**
 * Determine if the weather observation is stale.
 *
 * FMI updates every 10 minutes. Stale = 3 * 10 = 30 minutes.
 */
export function isWeatherStale(
  observedAt: Date | string,
  now: Date = new Date()
): boolean {
  const observed = typeof observedAt === 'string' ? new Date(observedAt) : observedAt
  const ageMs = now.getTime() - observed.getTime()
  return ageMs > STALE_WEATHER_THRESHOLD_MS
}

/**
 * Custom React hook that forces re-render periodically so relative
 * timestamps stay fresh. Returns the current time as a Date object.
 *
 * @param intervalMs - Re-render interval in milliseconds (default 30s)
 */
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
