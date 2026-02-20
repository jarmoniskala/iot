'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ROOM_COLOR_PALETTE } from '@/lib/constants'
import type { SummaryStatsRow, Metric, SensorConfig } from '@/lib/types'

const METRIC_CONFIG: Record<Metric, {
  minKey: keyof SummaryStatsRow
  maxKey: keyof SummaryStatsRow
  avgKey: keyof SummaryStatsRow
  unit: string
}> = {
  temperature: {
    minKey: 'min_temp',
    maxKey: 'max_temp',
    avgKey: 'avg_temp',
    unit: '\u00B0C',
  },
  humidity: {
    minKey: 'min_humidity',
    maxKey: 'max_humidity',
    avgKey: 'avg_humidity',
    unit: '%',
  },
  pressure: {
    minKey: 'min_pressure_hpa',
    maxKey: 'max_pressure_hpa',
    avgKey: 'avg_pressure_hpa',
    unit: 'hPa',
  },
}

interface SummaryStatsProps {
  stats: SummaryStatsRow[]
  selectedRooms: string[]
  metric: Metric
  sensorConfig: SensorConfig[]
}

export function SummaryStats({
  stats,
  selectedRooms,
  metric,
  sensorConfig,
}: SummaryStatsProps) {
  const config = METRIC_CONFIG[metric]
  const filteredStats = stats.filter((s) => selectedRooms.includes(s.mac_address))

  if (filteredStats.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredStats.map((row) => {
        const sensorIndex = sensorConfig.findIndex(
          (s) => s.mac_address === row.mac_address
        )
        const color =
          ROOM_COLOR_PALETTE[
            (sensorIndex >= 0 ? sensorIndex : 0) % ROOM_COLOR_PALETTE.length
          ]

        const minVal = row[config.minKey] as number | null
        const maxVal = row[config.maxKey] as number | null
        const avgVal = row[config.avgKey] as number | null

        const formatVal = (v: number | null) =>
          v != null ? v.toFixed(1) : '--'

        return (
          <Card key={row.mac_address} className="gap-0">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium dark:text-white">
                  {row.display_name ?? row.mac_address}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[0.833rem] text-muted-foreground">
                <span>
                  Min{' '}
                  <span className="font-medium text-foreground dark:text-white">
                    {formatVal(minVal)}
                    {config.unit}
                  </span>
                </span>
                <span className="text-border">|</span>
                <span>
                  Max{' '}
                  <span className="font-medium text-foreground dark:text-white">
                    {formatVal(maxVal)}
                    {config.unit}
                  </span>
                </span>
                <span className="text-border">|</span>
                <span>
                  Avg{' '}
                  <span className="font-medium text-foreground dark:text-white">
                    {formatVal(avgVal)}
                    {config.unit}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
