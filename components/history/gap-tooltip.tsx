'use client'

import { format } from 'date-fns'

interface GapTooltipProps {
  visible: boolean
  x: number
  y: number
  gapStart: string
  gapEnd: string
  durationMinutes: number
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function GapTooltip({
  visible,
  x,
  y,
  gapStart,
  gapEnd,
  durationMinutes,
}: GapTooltipProps) {
  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-md"
      style={{
        left: x + 12,
        top: y - 40,
      }}
    >
      <p className="text-sm font-medium text-orange-500 dark:text-orange-400">
        Offline {formatDuration(durationMinutes)}
      </p>
      <p className="text-xs text-muted-foreground">
        {format(new Date(gapStart), 'HH:mm')} &mdash; {format(new Date(gapEnd), 'HH:mm')}
      </p>
    </div>
  )
}
