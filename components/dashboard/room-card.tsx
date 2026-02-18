'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { BATTERY_LOW_THRESHOLD_V, COMFORT_COLORS } from '@/lib/constants'
import type { LatestSensorReading } from '@/lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bedroom: Bed,
  "kid's room": Baby,
  'living room': Sofa,
  office: Monitor,
  outdoors: TreePine,
}

/** Available room icons for the icon selector */
export const AVAILABLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Bed,
  Baby,
  Sofa,
  Monitor,
  TreePine,
  Home,
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

  // Compute comfort metrics
  const dp = temp !== null && rh !== null ? dewPoint(temp, rh) : null
  const ah = temp !== null && rh !== null ? absoluteHumidity(temp, rh) : null
  const comfort = rh !== null ? classifyComfort(rh) : null
  const colors = comfort ? COMFORT_COLORS[comfort.class] : null

  // Room icon: check localStorage for custom icon, fall back to room_name mapping
  const [RoomIcon, setRoomIcon] = useState<React.ComponentType<{ className?: string }>>(Home)

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
    // Fall back to room name mapping
    const roomKey = reading.room_name?.toLowerCase() ?? 'default'
    setRoomIcon(() => ICON_MAP[roomKey] ?? Home)
  }, [reading.mac_address, reading.room_name])

  // Pressure in hPa
  const pressureHpa = pressure !== null ? sensorPressureToHpa(pressure) : null

  return (
    <Card
      className={`group relative transition-all ${
        stale ? 'opacity-50' : ''
      } ${colors ? colors.tint : ''}`}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header: room name + icon + edit button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <RoomIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {reading.display_name ?? reading.room_name ?? reading.mac_address}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent"
                aria-label="Edit room"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            {lowBattery && (
              <Link
                href="/health"
                title="Low battery — view health"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center"
              >
                <BatteryWarning className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </Link>
            )}
            {stale && (
              <Link
                href="/health"
                title="Stale data — view health"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 animate-pulse" />
              </Link>
            )}
          </div>
        </div>

        {/* Primary: temperature */}
        <div className="text-center">
          <span className="text-3xl font-light tabular-nums">
            {temp !== null ? temp.toFixed(1) : '--'}
          </span>
          <span className="text-lg text-muted-foreground ml-0.5">°C</span>
        </div>

        {/* Secondary: humidity and pressure */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            <span className="tabular-nums">
              {rh !== null ? `${rh.toFixed(0)}%` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            <span className="tabular-nums">
              {pressureHpa !== null ? `${pressureHpa.toFixed(0)} hPa` : '--'}
            </span>
          </div>
        </div>

        {/* Comfort metrics */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Dp: {dp !== null ? `${dp.toFixed(1)}°C` : '--'}</span>
            <span>AH: {ah !== null ? `${ah.toFixed(1)} g/m³` : '--'}</span>
          </div>
          {comfort && colors && (
            <div className="flex items-center justify-center">
              <Badge
                variant="secondary"
                className={`text-xs ${colors.badge}`}
              >
                {comfort.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            {stale ? 'Last seen ' : ''}
            {formatDistanceToNow(new Date(reading.measured_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
