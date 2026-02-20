'use client'

import { format } from 'date-fns'
import type { Metric, TooltipMode } from '@/lib/types'

const METRIC_UNITS: Record<Metric, string> = {
  temperature: '\u00B0C',
  humidity: '%',
  pressure: 'hPa',
}

interface PayloadEntry {
  value?: number | null
  dataKey?: string | number
  color?: string
  name?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: PayloadEntry[]
  label?: string | number
  metric: Metric
  tooltipMode: TooltipMode
  roomNames: Record<string, string>
  roomColors: Record<string, string>
}

export function ChartTooltip({
  active,
  payload,
  label,
  metric,
  tooltipMode,
  roomNames,
  roomColors,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const timestamp = typeof label === 'number' ? new Date(label) : new Date(label as string)
  const unit = METRIC_UNITS[metric]

  // In single mode, show only the first (hovered) entry
  const entries = tooltipMode === 'single' ? payload.slice(0, 1) : payload

  return (
    <div className="rounded-md border bg-background/95 backdrop-blur-sm px-2.5 py-1.5 shadow-md">
      <p className="text-[0.833rem] text-muted-foreground mb-1">
        {format(timestamp, 'MMM d, HH:mm')}
      </p>
      <div className="space-y-0.5">
        {entries.map((entry) => {
          if (entry.value == null) return null
          const mac = String(entry.dataKey ?? '')
          const name = roomNames[mac] ?? mac
          const color = roomColors[mac] ?? entry.color ?? '#888'

          return (
            <div key={mac} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="font-medium ml-auto tabular-nums">
                {typeof entry.value === 'number'
                  ? entry.value.toFixed(1)
                  : entry.value}
                {unit}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
