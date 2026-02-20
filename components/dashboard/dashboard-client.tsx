'use client'

import { useState, useCallback } from 'react'
import { RealtimeProvider } from './realtime-provider'
import { RoomGrid } from './room-grid'
import { WeatherHero } from './weather-panel'
import { SortControls } from './sort-controls'
import { EditRoomDialog } from './edit-room-dialog'
import { StorageWidget } from './storage-widget'
import type {
  LatestSensorReading,
  WeatherObservation,
  SensorConfig,
  SortMode,
  TableSize,
} from '@/lib/types'

interface DashboardClientProps {
  initialReadings: LatestSensorReading[]
  initialWeather: WeatherObservation | null
  sensorConfig: SensorConfig[]
  storageSizeMb: number | null
  storageCheckedAt: string | null
  tableSizes: TableSize[]
}

export function DashboardClient({
  initialReadings,
  initialWeather,
  sensorConfig,
  storageSizeMb,
  storageCheckedAt,
  tableSizes,
}: DashboardClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical')
  const [editingSensor, setEditingSensor] = useState<SensorConfig | null>(null)
  const [configVersion, setConfigVersion] = useState(0)

  const handleEdit = useCallback((sensor: SensorConfig) => {
    setEditingSensor(sensor)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditingSensor(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <RealtimeProvider
        initialReadings={initialReadings}
        initialWeather={initialWeather}
        sensorConfig={sensorConfig}
      >
        {({ readings, weather, sensorConfig: liveConfig }) => (
          <>
            {/* ─── Weather section ─── */}
            <WeatherHero weather={weather} />

            {/* ─── Room cards section ─── */}
            <div className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-5 pt-6 pb-8">
                {/* Section heading */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[1.728rem] font-semibold leading-tight tracking-tight text-foreground">Rooms</h2>
                    <p className="text-[1.44rem] font-light text-muted-foreground mt-1">Indoor sensor readings</p>
                  </div>
                  <SortControls sortMode={sortMode} onSortChange={setSortMode} />
                </div>

                <RoomGrid
                  readings={readings}
                  sensorConfig={liveConfig}
                  sortMode={sortMode}
                  onEdit={handleEdit}
                  configVersion={configVersion}
                />
              </div>
            </div>

            {/* ─── Storage section ─── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-5 pb-8">
              <StorageWidget
                sizeMb={storageSizeMb}
                checkedAt={storageCheckedAt}
                tableSizes={tableSizes}
              />
            </div>

            {/* Edit room dialog */}
            {editingSensor && (
              <EditRoomDialog
                sensor={editingSensor}
                isOpen={!!editingSensor}
                onClose={handleCloseEdit}
                onSave={() => {
                  setConfigVersion(v => v + 1)
                  setEditingSensor(null)
                }}
              />
            )}
          </>
        )}
      </RealtimeProvider>
    </div>
  )
}
