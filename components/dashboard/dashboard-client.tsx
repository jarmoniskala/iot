'use client'

import { useState, useCallback } from 'react'
import { RealtimeProvider } from './realtime-provider'
import { RoomGrid } from './room-grid'
import { WeatherPanel } from './weather-panel'
import { SortControls } from './sort-controls'
import { EditRoomDialog } from './edit-room-dialog'
import type {
  LatestSensorReading,
  WeatherObservation,
  SensorConfig,
  SortMode,
} from '@/lib/types'

interface DashboardClientProps {
  initialReadings: LatestSensorReading[]
  initialWeather: WeatherObservation | null
  sensorConfig: SensorConfig[]
}

export function DashboardClient({
  initialReadings,
  initialWeather,
  sensorConfig,
}: DashboardClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical')
  const [editingSensor, setEditingSensor] = useState<SensorConfig | null>(null)

  const handleEdit = useCallback((sensor: SensorConfig) => {
    setEditingSensor(sensor)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditingSensor(null)
  }, [])

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Dashboard toolbar */}
      <div className="flex items-center justify-end px-6 py-2 max-w-7xl mx-auto">
        <SortControls sortMode={sortMode} onSortChange={setSortMode} />
      </div>

      {/* Dashboard content */}
      <main className="max-w-7xl mx-auto px-6 pb-6">
        <RealtimeProvider
          initialReadings={initialReadings}
          initialWeather={initialWeather}
          sensorConfig={sensorConfig}
        >
          {({ readings, weather, sensorConfig: liveConfig }) => (
            <>
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
                {/* Room cards -- main area */}
                <div className="flex-1 min-w-0">
                  <RoomGrid
                    readings={readings}
                    sensorConfig={liveConfig}
                    sortMode={sortMode}
                    onEdit={handleEdit}
                  />
                </div>

                {/* Weather panel -- side panel on desktop, stacked on mobile */}
                <WeatherPanel weather={weather} />
              </div>

              {/* Edit room dialog */}
              {editingSensor && (
                <EditRoomDialog
                  sensor={editingSensor}
                  isOpen={!!editingSensor}
                  onClose={handleCloseEdit}
                  onSave={(updated) => {
                    // The Realtime subscription will pick up the Supabase
                    // display_name change. Icon changes are local-only.
                    setEditingSensor(null)
                  }}
                />
              )}
            </>
          )}
        </RealtimeProvider>
      </main>
    </div>
  )
}
