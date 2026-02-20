import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { fetchDatabaseSize, fetchTableSizes } from '@/lib/queries/storage'
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
  const { data: weatherRows, error: weatherError } = await supabase
    .from('latest_weather')
    .select('*')

  if (weatherError) {
    console.error('Failed to fetch weather:', weatherError.message)
  }

  // Fetch storage metrics via RPC wrappers
  const [dbSizeMb, tableSizes] = await Promise.all([
    fetchDatabaseSize(supabase),
    fetchTableSizes(supabase),
  ])

  const initialReadings = (sensorReadings ?? []) as LatestSensorReading[]
  const configs = (sensorConfig ?? []) as SensorConfig[]
  const initialWeather = (weatherRows && weatherRows.length > 0
    ? weatherRows[0]
    : null) as WeatherObservation | null

  return (
    <DashboardClient
      initialReadings={initialReadings}
      initialWeather={initialWeather}
      sensorConfig={configs}
      storageSizeMb={dbSizeMb}
      storageCheckedAt={new Date().toISOString()}
      tableSizes={tableSizes}
    />
  )
}
