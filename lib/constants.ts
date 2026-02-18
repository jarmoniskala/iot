/**
 * Application constants for the Home IoT Monitor dashboard.
 */

import type { ComfortClass } from './types'

/**
 * Battery voltage threshold for low battery warning.
 *
 * RuuviTag battery range: 1.6V to 3.646V (Data Format 5).
 * Below 2.4V: battery is low, sensor may become unreliable.
 */
export const BATTERY_LOW_THRESHOLD_V = 2.4

/**
 * Staleness thresholds.
 * Staleness = 3 missed update cycles.
 */
export const STALE_SENSOR_THRESHOLD_MS = 900_000 // 15 minutes (3 * 5min scan interval)
export const STALE_WEATHER_THRESHOLD_MS = 1_800_000 // 30 minutes (3 * 10min)

/**
 * Room icon mapping for lucide-react.
 * Maps room_name to lucide-react icon component name.
 */
export const ROOM_ICONS: Record<string, string> = {
  bedroom: 'Bed',
  "kid's room": 'Baby',
  'living room': 'Sofa',
  outdoors: 'TreePine',
  office: 'Monitor',
  default: 'Home',
}

/**
 * Comfort classification color mapping.
 * Maps ComfortClass to Tailwind CSS class tokens for badge, card tint, and text.
 */
export const COMFORT_COLORS: Record<ComfortClass, {
  badge: string
  tint: string
  text: string
  border: string
}> = {
  dry: {
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    tint: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  comfortable: {
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    tint: 'bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  humid: {
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    tint: 'bg-orange-500/5',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
  },
  very_humid: {
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400',
    tint: 'bg-red-500/5',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
  },
}

// ── History constants ──────────────────────────────────────────────

/**
 * Default color palette for room overlays in history charts.
 * Blue, violet, amber, red, cyan -- up to 5 rooms.
 */
export const ROOM_COLOR_PALETTE: string[] = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
]

/**
 * Gap detection threshold in minutes.
 * 3 missed 5-min scan intervals = 15 minutes.
 * Matches STALE_SENSOR_THRESHOLD_MS / 60000.
 */
export const GAP_THRESHOLD_MINUTES = 15
