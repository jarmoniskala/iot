/**
 * Comfort metric calculations for indoor climate assessment.
 *
 * Dew point: Magnus-Tetens approximation (Alduchov & Eskridge, 1996)
 * Absolute humidity: Bolton (1980) saturation vapor pressure formula
 * Comfort classification: ASHRAE 30-60% RH comfortable range
 */

import type { ComfortClass, ComfortResult } from './types'

/**
 * Calculate dew point temperature from air temperature and relative humidity.
 * Uses the Magnus-Tetens approximation with improved coefficients.
 *
 * @param tempC - Temperature in Celsius
 * @param rh - Relative humidity in percentage (0-100)
 * @returns Dew point temperature in Celsius
 */
export function dewPoint(tempC: number, rh: number): number {
  const a = 17.625
  const b = 243.04

  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100)
  return (b * alpha) / (a - alpha)
}

/**
 * Calculate absolute humidity (water vapor density) from temperature
 * and relative humidity.
 *
 * Uses the Bolton (1980) saturation vapor pressure formula.
 *
 * @param tempC - Temperature in Celsius
 * @param rh - Relative humidity in percentage (0-100)
 * @returns Absolute humidity in grams per cubic meter (g/m3)
 */
export function absoluteHumidity(tempC: number, rh: number): number {
  // Saturation vapor pressure (hPa) via Bolton (1980)
  const es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5))
  // Actual vapor pressure
  const ea = (rh / 100) * es
  // Convert to absolute humidity using ideal gas law
  // AH = ea * 2.1674 / (273.15 + tempC)
  return (ea * 2.1674) / (273.15 + tempC)
}

/**
 * Classify indoor comfort based on relative humidity.
 *
 * Thresholds based on ASHRAE recommendations:
 * - dry: <30% RH
 * - comfortable: 30-60% RH
 * - humid: 60-70% RH
 * - very humid: >70% RH
 *
 * Colors (user decision): green=comfortable, yellow=dry, orange=humid, red=very humid
 */
export function classifyComfort(rh: number): ComfortResult {
  if (rh < 30) {
    return { class: 'dry' as ComfortClass, label: 'Dry', color: 'yellow' }
  }
  if (rh <= 60) {
    return { class: 'comfortable' as ComfortClass, label: 'Comfortable', color: 'green' }
  }
  if (rh <= 70) {
    return { class: 'humid' as ComfortClass, label: 'Humid', color: 'orange' }
  }
  return { class: 'very_humid' as ComfortClass, label: 'Very Humid', color: 'red' }
}

/**
 * Convert sensor pressure from Pascals (Ruuvi storage format) to hectopascals
 * for display. FMI weather data is already in hPa and does not need conversion.
 */
export function sensorPressureToHpa(pressurePa: number): number {
  return pressurePa / 100
}
