'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bed,
  Baby,
  Sofa,
  Home,
  AlertTriangle,
  BatteryLow,
  Droplets,
  Gauge,
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
}

interface RoomCardProps {
  reading: LatestSensorReading
}

export function RoomCard({ reading }: RoomCardProps) {
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

  // Room icon
  const roomKey = reading.room_name?.toLowerCase() ?? 'default'
  const RoomIcon = ICON_MAP[roomKey] ?? Home

  // Pressure in hPa
  const pressureHpa = pressure !== null ? sensorPressureToHpa(pressure) : null

  return (
    <Card
      className={`relative transition-all ${
        stale ? 'opacity-50' : ''
      } ${colors ? colors.tint : ''}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: room name + icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RoomIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">
              {reading.display_name ?? reading.room_name ?? reading.mac_address}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {stale && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
            {lowBattery && (
              <BatteryLow className="h-3.5 w-3.5 text-red-500" />
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
