'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RoomCard } from './room-card'
import type { LatestSensorReading, SensorConfig, SortMode } from '@/lib/types'

interface RoomGridProps {
  readings: Map<string, LatestSensorReading>
  sensorConfig: SensorConfig[]
  sortMode: SortMode
  onEdit?: (sensor: SensorConfig) => void
  configVersion?: number
}

const CARD_ORDER_KEY = 'card-order'

function SortableCard({
  id,
  reading,
  config,
  onEdit,
  configVersion,
}: {
  id: string
  reading: LatestSensorReading
  config: SensorConfig
  onEdit?: (sensor: SensorConfig) => void
  configVersion?: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <RoomCard
        key={`${id}-${configVersion}`}
        reading={reading}
        onEdit={onEdit ? () => onEdit(config) : undefined}
      />
    </div>
  )
}

export function RoomGrid({
  readings,
  sensorConfig,
  sortMode,
  onEdit,
  configVersion,
}: RoomGridProps) {
  const [customOrder, setCustomOrder] = useState<string[]>([])
  const [orderLoaded, setOrderLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CARD_ORDER_KEY)
      if (stored) {
        setCustomOrder(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
    setOrderLoaded(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const activeSensors = sensorConfig.filter(
    (config) =>
      config.unassigned_at === null && readings.has(config.mac_address)
  )

  const getSortedSensors = useCallback((): SensorConfig[] => {
    const sensors = [...activeSensors]

    switch (sortMode) {
      case 'alphabetical':
        return sensors.sort((a, b) =>
          (a.display_name ?? a.room_name ?? '').localeCompare(
            b.display_name ?? b.room_name ?? ''
          )
        )
      case 'temperature': {
        return sensors.sort((a, b) => {
          const tempA = readings.get(a.mac_address)?.temperature
          const tempB = readings.get(b.mac_address)?.temperature
          if (tempA === null || tempA === undefined) return 1
          if (tempB === null || tempB === undefined) return -1
          return tempB - tempA
        })
      }
      case 'custom': {
        if (!orderLoaded || customOrder.length === 0) {
          return sensors.sort((a, b) =>
            (a.display_name ?? a.room_name ?? '').localeCompare(
              b.display_name ?? b.room_name ?? ''
            )
          )
        }
        return sensors.sort((a, b) => {
          const idxA = customOrder.indexOf(a.mac_address)
          const idxB = customOrder.indexOf(b.mac_address)
          const posA = idxA === -1 ? Number.MAX_SAFE_INTEGER : idxA
          const posB = idxB === -1 ? Number.MAX_SAFE_INTEGER : idxB
          return posA - posB
        })
      }
      default:
        return sensors
    }
  }, [activeSensors, sortMode, readings, customOrder, orderLoaded])

  const sortedSensors = getSortedSensors()

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sortedSensors.findIndex(
        (s) => s.mac_address === active.id
      )
      const newIndex = sortedSensors.findIndex(
        (s) => s.mac_address === over.id
      )

      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(
        sortedSensors.map((s) => s.mac_address),
        oldIndex,
        newIndex
      )

      setCustomOrder(newOrder)
      try {
        localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(newOrder))
      } catch {
        // Ignore storage errors
      }
    },
    [sortedSensors]
  )

  if (activeSensors.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-[0.833rem] text-muted-foreground">
        No sensor data yet. Waiting for first reading from Ruuvi Station...
      </div>
    )
  }

  const gridClassName = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"

  if (sortMode === 'custom') {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedSensors.map((s) => s.mac_address)}
          strategy={rectSortingStrategy}
        >
          <div className={gridClassName}>
            {sortedSensors.map((config) => {
              const reading = readings.get(config.mac_address)!
              return (
                <SortableCard
                  key={config.mac_address}
                  id={config.mac_address}
                  reading={reading}
                  config={config}
                  onEdit={onEdit}
                  configVersion={configVersion}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <div className={gridClassName}>
      {sortedSensors.map((config) => {
        const reading = readings.get(config.mac_address)!
        return (
          <RoomCard
            key={`${config.mac_address}-${configVersion}`}
            reading={reading}
            onEdit={onEdit ? () => onEdit(config) : undefined}
          />
        )
      })}
    </div>
  )
}
