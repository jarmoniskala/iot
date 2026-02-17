import { createClient } from '@/lib/supabase/server'
import { RealtimeProvider } from '@/components/dashboard/realtime-provider'
import { RoomGrid } from '@/components/dashboard/room-grid'
import { WeatherPanel } from '@/components/dashboard/weather-panel'
import { DarkModeToggle } from '@/components/dashboard/dark-mode-toggle'
import type { LatestSensorReading, WeatherObservation, SensorConfig } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // Fetch latest sensor readings from the view (one per active sensor)
  const { data: sensorReadings } = await supabase
    .from('latest_sensor_readings')
    .select('*')

  // Fetch active sensor config for display names and room assignments
  const { data: sensorConfig } = await supabase
    .from('sensor_config')
    .select('*')
    .is('unassigned_at', null)

  // Fetch latest weather observation from the view
  const { data: weatherRows } = await supabase
    .from('latest_weather')
    .select('*')

  const initialReadings = (sensorReadings ?? []) as LatestSensorReading[]
  const configs = (sensorConfig ?? []) as SensorConfig[]
  const initialWeather = (weatherRows && weatherRows.length > 0
    ? weatherRows[0]
    : null) as WeatherObservation | null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <h1 className="text-sm font-medium tracking-tight">
            Home IoT Monitor
          </h1>
          <DarkModeToggle />
        </div>
      </header>

      {/* Dashboard content */}
      <main className="max-w-7xl mx-auto p-4">
        <RealtimeProvider
          initialReadings={initialReadings}
          initialWeather={initialWeather}
          sensorConfig={configs}
        >
          {({ readings, weather, sensorConfig: liveConfig }) => (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* Room cards -- main area */}
              <div className="flex-1 min-w-0">
                <RoomGrid readings={readings} sensorConfig={liveConfig} />
              </div>

              {/* Weather panel -- side panel on desktop, stacked on mobile */}
              <WeatherPanel weather={weather} />
            </div>
          )}
        </RealtimeProvider>
      </main>
    </div>
  )
}
