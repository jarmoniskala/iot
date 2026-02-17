'use client'

import { RoomCard } from './room-card'
import type { LatestSensorReading, SensorConfig } from '@/lib/types'

interface RoomGridProps {
  readings: Map<string, LatestSensorReading>
  sensorConfig: SensorConfig[]
}

export function RoomGrid({ readings, sensorConfig }: RoomGridProps) {
  // Get active sensors that have readings
  const activeSensors = sensorConfig
    .filter((config) => config.unassigned_at === null && readings.has(config.mac_address))
    .sort((a, b) => (a.room_name ?? '').localeCompare(b.room_name ?? ''))

  if (activeSensors.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No sensor data yet. Waiting for first reading from Ruuvi Station...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {activeSensors.map((config) => {
        const reading = readings.get(config.mac_address)!
        return <RoomCard key={config.mac_address} reading={reading} />
      })}
    </div>
  )
}
