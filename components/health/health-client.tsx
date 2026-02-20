'use client'

import { HealthTable } from '@/components/health/health-table'
import type { SensorHealth } from '@/lib/types'

interface HealthClientProps {
  initialHealth: SensorHealth[]
}

export function HealthClient({ initialHealth }: HealthClientProps) {
  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-5">
      <div>
        <h1 className="text-[1.728rem] font-semibold leading-tight tracking-tight">System Health</h1>
        <p className="text-[1.44rem] font-light text-muted-foreground mt-1">
          Battery, signal, uptime, and connectivity status for all sensors.
        </p>
      </div>
      <HealthTable data={initialHealth} />
    </div>
  )
}
