import { createClient } from '@/lib/supabase/server'
import { fetchSensorHistory, fetchGaps, fetchSummaryStats } from '@/lib/queries/history'
import { HistoryClient } from '@/components/history/history-client'
import type { SensorConfig } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = await createClient()

  // Default 24h range
  const now = new Date()
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const toISO = now.toISOString()
  const fromISO = from.toISOString()

  // Fetch initial data in parallel
  const [readings, gaps, stats, sensorConfigResult] = await Promise.all([
    fetchSensorHistory(supabase, fromISO, toISO, 5),
    fetchGaps(supabase, fromISO, toISO),
    fetchSummaryStats(supabase, fromISO, toISO),
    supabase
      .from('sensor_config')
      .select('*')
      .is('unassigned_at', null),
  ])

  const sensorConfig = (sensorConfigResult.data ?? []) as SensorConfig[]

  return (
    <HistoryClient
      initialReadings={readings}
      initialGaps={gaps}
      initialStats={stats}
      sensorConfig={sensorConfig}
    />
  )
}
