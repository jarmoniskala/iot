'use client'

import { HealthTable } from '@/components/health/health-table'
import type { SensorHealth } from '@/lib/types'

interface HealthClientProps {
  initialHealth: SensorHealth[]
}

export function HealthClient({ initialHealth }: HealthClientProps) {
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Battery, signal, uptime, and connectivity status for all sensors.
        </p>
      </div>
      <HealthTable data={initialHealth} />
    </div>
  )
}
