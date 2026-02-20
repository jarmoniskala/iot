'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bed,
  Baby,
  Sofa,
  Home,
  Monitor,
  TreePine,
  AlertTriangle,
  BatteryWarning,
  Droplets,
  Gauge,
  Pencil,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { dewPoint, absoluteHumidity, classifyComfort, sensorPressureToHpa } from '@/lib/comfort'
import { isSensorStale, useNow } from '@/lib/staleness'
import { BATTERY_LOW_THRESHOLD_V } from '@/lib/constants'
import type { LatestSensorReading } from '@/lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  bedroom: Bed,
  "kid's room": Baby,
  'living room': Sofa,
  office: Monitor,
  outdoors: TreePine,
}

/** Available room icons for the icon selector */
export const AVAILABLE_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Bed,
  Baby,
  Sofa,
  Monitor,
  TreePine,
  Home,
}

/* Comfort badge Tailwind classes */
const COMFORT_BADGE: Record<string, { className: string }> = {
  dry: { className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' },
  comfortable: { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400' },
  humid: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400' },
  very_humid: { className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400' },
}

interface RoomCardProps {
  reading: LatestSensorReading
  onEdit?: () => void
}

export function RoomCard({ reading, onEdit }: RoomCardProps) {
  const now = useNow()
  const stale = isSensorStale(reading.measured_at, now)
  const lowBattery =
    reading.battery_voltage !== null &&
    reading.battery_voltage < BATTERY_LOW_THRESHOLD_V

  const temp = reading.temperature
  const rh = reading.humidity
  const pressure = reading.pressure

  const dp = temp !== null && rh !== null ? dewPoint(temp, rh) : null
  const ah = temp !== null && rh !== null ? absoluteHumidity(temp, rh) : null
  const comfort = rh !== null ? classifyComfort(rh) : null
  const badge = comfort ? COMFORT_BADGE[comfort.class] : null

  const [RoomIcon, setRoomIcon] = useState<React.ComponentType<{ className?: string; strokeWidth?: number }>>(Home)

  useEffect(() => {
    try {
      const storedIcon = localStorage.getItem('room-icon-' + reading.mac_address)
      if (storedIcon && AVAILABLE_ICONS[storedIcon]) {
        setRoomIcon(() => AVAILABLE_ICONS[storedIcon])
        return
      }
    } catch {
      // Ignore
    }
    const roomKey = reading.room_name?.toLowerCase() ?? 'default'
    setRoomIcon(() => ICON_MAP[roomKey] ?? Home)
  }, [reading.mac_address, reading.room_name])

  const pressureHpa = pressure !== null ? sensorPressureToHpa(pressure) : null
  const dim = stale ? 'opacity-50' : ''

  return (
    <div className="group relative flex flex-col p-5 bg-card rounded-lg border border-border">
      {/* Icon + room name — centered, never dims */}
      <div className="flex items-center gap-2 mb-4">
        <RoomIcon className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
        <span className="text-[1.2rem] font-medium truncate text-foreground dark:text-white">
          {reading.display_name ?? reading.room_name ?? reading.mac_address}
        </span>
      </div>

      {/* Action indicators — top-right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded shrink-0"
            aria-label="Edit room"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
          </button>
        )}
        {lowBattery && (
          <Link href="/health" title="Low battery" onClick={(e) => e.stopPropagation()} className="flex items-center shrink-0">
            <BatteryWarning className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
          </Link>
        )}
        {stale && (
          <Link href="/health" title="Stale data" onClick={(e) => e.stopPropagation()} className="flex items-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
          </Link>
        )}
      </div>

      {/* Comfort tag */}
      {comfort && badge && (
        <div className={`mb-3 ${dim}`}>
          <span className={`text-[0.833rem] font-medium px-2.5 py-1 rounded-md ${badge.className}`}>
            {comfort.label}
          </span>
        </div>
      )}

      {/* Temperature — hero number */}
      <div className={`mb-3 ${dim}`}>
        <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
          {temp !== null ? temp.toFixed(1) : '--'}
        </span>
        <span className="text-sm font-light ml-0.5 text-muted-foreground dark:text-white/60">°C</span>
      </div>

      {/* Secondary metrics */}
      <div className={`flex items-center gap-4 mb-3 ${dim}`}>
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3 w-3 text-muted-foreground/50 dark:text-white/50" strokeWidth={1.5} />
          <span className="text-[0.833rem] tabular-nums text-foreground/80 dark:text-white/80">
            {rh !== null ? `${rh.toFixed(0)}%` : '--'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3 w-3 text-muted-foreground/50 dark:text-white/50" strokeWidth={1.5} />
          <span className="text-[0.833rem] tabular-nums text-foreground/80 dark:text-white/80">
            {pressureHpa !== null ? `${pressureHpa.toFixed(0)} hPa` : '--'}
          </span>
        </div>
      </div>

      {/* Comfort metrics row */}
      <div className={`flex items-center gap-3 mb-3 ${dim}`}>
        <span className="text-[0.833rem] tabular-nums text-muted-foreground/70">
          Dp {dp !== null ? `${dp.toFixed(1)}°` : '--'}
        </span>
        <span className="text-[0.833rem] tabular-nums text-muted-foreground/70">
          AH {ah !== null ? `${ah.toFixed(1)} g/m³` : '--'}
        </span>
      </div>

      {/* Timestamp */}
      <div className={dim}>
        <span className="text-[0.694rem] text-muted-foreground/50">
          {stale ? 'Last seen ' : ''}
          {formatDistanceToNow(new Date(reading.measured_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
