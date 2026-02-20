'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROOM_COLOR_PALETTE } from '@/lib/constants'
import type { SensorConfig } from '@/lib/types'

interface RoomSelectorProps {
  sensorConfig: SensorConfig[]
  selectedRooms: string[]
  onSelectedRoomsChange: (rooms: string[]) => void
}

export function RoomSelector({
  sensorConfig,
  selectedRooms,
  onSelectedRoomsChange,
}: RoomSelectorProps) {
  const handleToggle = (mac: string) => {
    const isSelected = selectedRooms.includes(mac)

    if (isSelected) {
      // Prevent deselecting the last room
      if (selectedRooms.length <= 1) return
      onSelectedRoomsChange(selectedRooms.filter((m) => m !== mac))
    } else {
      onSelectedRoomsChange([...selectedRooms, mac])
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sensorConfig.map((sensor, index) => {
        const isSelected = selectedRooms.includes(sensor.mac_address)
        const color = ROOM_COLOR_PALETTE[index % ROOM_COLOR_PALETTE.length]

        return (
          <Button
            key={sensor.mac_address}
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 text-xs gap-1.5 transition-all',
              isSelected
                ? 'border border-border shadow-sm'
                : 'opacity-50 hover:opacity-75'
            )}
            onClick={() => handleToggle(sensor.mac_address)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            {sensor.display_name}
          </Button>
        )
      })}
    </div>
  )
}
