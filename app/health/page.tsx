import { createClient } from '@/lib/supabase/server'
import { fetchSensorHealth } from '@/lib/queries/health'
import { HealthClient } from '@/components/health/health-client'

export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const supabase = await createClient()
  const healthData = await fetchSensorHealth(supabase, 24)

  return <HealthClient initialHealth={healthData} />
}
