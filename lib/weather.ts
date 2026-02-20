/**
 * Weather condition derivation from WMO 4680 codes and cloud cover fallback.
 *
 * FMI stores the wawa (WMO 4680) code in weather_observations.weather_code.
 * This is the primary source for weather condition labels and icons.
 */

import type { WeatherCondition } from './types'

/**
 * Map WMO 4680 wawa code to human-readable weather condition.
 *
 * FMI provides the wawa code directly in weather_observations.weather_code.
 * This is more reliable than deriving conditions from cloud_cover + precipitation.
 */
export function weatherConditionFromCode(wawaCode: number | null): WeatherCondition {
  if (wawaCode === null || wawaCode === undefined || isNaN(wawaCode)) {
    return { label: 'Unknown', icon: 'HelpCircle' }
  }

  const code = Math.round(wawaCode)

  // Clear / Fair
  if (code === 0) return { label: 'Clear', icon: 'Sun' }
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: 'CloudSun' }

  // Haze / Dust
  if (code === 4 || code === 5) return { label: 'Haze', icon: 'Haze' }

  // Mist
  if (code === 10) return { label: 'Mist', icon: 'CloudFog' }

  // Lightning
  if (code === 12) return { label: 'Distant Lightning', icon: 'Zap' }

  // Squalls
  if (code === 18) return { label: 'Squalls', icon: 'Wind' }

  // Fog
  if (code >= 20 && code <= 21) return { label: 'Fog', icon: 'CloudFog' }
  if (code >= 30 && code <= 35) return { label: 'Fog', icon: 'CloudFog' }

  // Drizzle
  if (code === 22 || (code >= 51 && code <= 53)) return { label: 'Drizzle', icon: 'CloudDrizzle' }
  if (code >= 54 && code <= 56) return { label: 'Freezing Drizzle', icon: 'CloudDrizzle' }

  // Rain
  if (code === 23 || (code >= 61 && code <= 63)) return { label: 'Rain', icon: 'CloudRain' }
  if (code >= 64 && code <= 65) return { label: 'Heavy Rain', icon: 'CloudRain' }
  if (code >= 66 && code <= 67) return { label: 'Freezing Rain', icon: 'CloudRain' }

  // Snow
  if (code === 24 || (code >= 71 && code <= 73)) return { label: 'Snow', icon: 'Snowflake' }
  if (code >= 74 && code <= 78) return { label: 'Heavy Snow', icon: 'Snowflake' }

  // Freezing precipitation
  if (code === 25) return { label: 'Freezing Rain', icon: 'CloudRain' }

  // Thunderstorm
  if (code === 26 || (code >= 91 && code <= 99)) return { label: 'Thunderstorm', icon: 'CloudLightning' }

  // Blowing snow/sand
  if (code >= 27 && code <= 29) return { label: 'Blowing Snow', icon: 'Wind' }

  // Precipitation (general)
  if (code >= 40 && code <= 49) return { label: 'Precipitation', icon: 'CloudRain' }

  // Showers
  if (code >= 80 && code <= 84) return { label: 'Showers', icon: 'CloudRain' }
  if (code >= 85 && code <= 87) return { label: 'Snow Showers', icon: 'Snowflake' }

  // Hail
  if (code === 89 || code === 90) return { label: 'Hail', icon: 'CloudHail' }

  return { label: 'Unknown', icon: 'HelpCircle' }
}

/**
 * Fallback: derive a basic condition from cloud cover (oktas) when wawa code
 * is not available (null/NaN from FMI).
 */
export function weatherConditionFromCloudCover(
  cloudCoverOktas: number | null,
  precipitationMm: number | null
): WeatherCondition {
  if (precipitationMm !== null && precipitationMm > 0) {
    if (precipitationMm > 4) return { label: 'Heavy Rain', icon: 'CloudRain' }
    if (precipitationMm > 1) return { label: 'Rain', icon: 'CloudRain' }
    return { label: 'Light Rain', icon: 'CloudDrizzle' }
  }

  if (cloudCoverOktas === null) return { label: 'Unknown', icon: 'HelpCircle' }

  if (cloudCoverOktas <= 1) return { label: 'Clear', icon: 'Sun' }
  if (cloudCoverOktas <= 3) return { label: 'Partly Cloudy', icon: 'CloudSun' }
  if (cloudCoverOktas <= 6) return { label: 'Cloudy', icon: 'Cloud' }
  return { label: 'Overcast', icon: 'Cloud' }
}

/**
 * Get precipitation label from amount in mm.
 * Format: "2.1 mm -- Light rain"
 */
export function precipitationLabel(mm: number | null): string {
  if (mm === null || mm === 0) return 'No precipitation'
  if (mm < 0.5) return `${mm.toFixed(1)} mm (Trace)`
  if (mm < 2.5) return `${mm.toFixed(1)} mm (Light rain)`
  if (mm < 7.5) return `${mm.toFixed(1)} mm (Moderate rain)`
  return `${mm.toFixed(1)} mm (Heavy rain)`
}

/**
 * Convert wind direction degrees to 16-point compass direction.
 */
export function windDirectionToCompass(degrees: number | null): string {
  if (degrees === null) return '--'
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

/**
 * Get cloud cover description from oktas value.
 */
export function cloudCoverLabel(oktas: number | null): string {
  if (oktas === null) return '--'
  if (oktas <= 0) return '0/8 (Clear)'
  if (oktas <= 2) return `${oktas}/8 (Few clouds)`
  if (oktas <= 4) return `${oktas}/8 (Scattered)`
  if (oktas <= 6) return `${oktas}/8 (Broken)`
  if (oktas <= 7) return `${oktas}/8 (Mostly cloudy)`
  return '8/8 (Overcast)'
}
