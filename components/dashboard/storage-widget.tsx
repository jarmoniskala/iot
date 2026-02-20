'use client'

import { Database } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { TableSize } from '@/lib/types'

interface StorageWidgetProps {
  sizeMb: number | null
  checkedAt: string | null
  tableSizes: TableSize[]
}

/** Partition table name pattern: ends with _YYYY_MM or _default */
const PARTITION_RE = /_\d{4}_\d{2}$|_default$/

const LIMIT_MB = 500

export function StorageWidget({ sizeMb, checkedAt, tableSizes }: StorageWidgetProps) {
  if (sizeMb === null) return null

  const pct = Math.min((sizeMb / LIMIT_MB) * 100, 100)
  const barColor =
    pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  // Filter out partition tables and strip public. prefix
  const visibleTables = tableSizes
    .filter((t) => !PARTITION_RE.test(t.table_name))
    .slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
        <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Storage</span>
      </div>

      {/* Hero metric */}
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
          {sizeMb.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground/70 dark:text-white/60 font-light">
          / {LIMIT_MB} MB
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Percentage label */}
      <p className="mt-1.5 text-[0.833rem] text-muted-foreground/60">
        {pct.toFixed(1)}% used
      </p>

      {/* Table breakdown */}
      {visibleTables.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[0.833rem] font-medium text-muted-foreground/80">Top tables</p>
          {visibleTables.map((t) => (
            <div key={t.table_name} className="flex items-center justify-between gap-2">
              <span className="text-[0.833rem] text-muted-foreground truncate">
                {t.table_name.replace(/^public\./, '')}
              </span>
              <span className="text-[0.833rem] tabular-nums text-muted-foreground/70 shrink-0">
                {t.size_mb.toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      {checkedAt && (
        <p className="mt-4 text-[0.833rem] text-muted-foreground/50">
          Checked {formatDistanceToNow(new Date(checkedAt), { addSuffix: true })}
        </p>
      )}
    </div>
  )
}
