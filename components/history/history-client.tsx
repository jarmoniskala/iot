'use client'

import { useState, useCallback, useTransition } from 'react'
import { subHours, subDays } from 'date-fns'
import { Crosshair, MousePointer } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { usePersistedState } from '@/lib/hooks/use-persisted-state'
import { createClient } from '@/lib/supabase/client'
import {
  fetchSensorHistory,
  fetchGaps,
  fetchSummaryStats,
  getBucketMinutes,
} from '@/lib/queries/history'
import { TimeRangePicker } from './time-range-picker'
import { RoomSelector } from './room-selector'
import { TrendChart } from './trend-chart'
import { SummaryStats } from './summary-stats'
import type {
  HistoryBucket,
  GapInterval,
  SummaryStatsRow,
  SensorConfig,
  TimeRangePreset,
  TooltipMode,
  Metric,
} from '@/lib/types'

interface HistoryClientProps {
  initialReadings: HistoryBucket[]
  initialGaps: GapInterval[]
  initialStats: SummaryStatsRow[]
  sensorConfig: SensorConfig[]
}

function getDateRange(
  preset: TimeRangePreset,
  customRange: { from: string; to: string } | null
): { from: Date; to: Date; rangeHours: number } {
  const now = new Date()

  switch (preset) {
    case '1h':
      return { from: subHours(now, 1), to: now, rangeHours: 1 }
    case '2h':
      return { from: subHours(now, 2), to: now, rangeHours: 2 }
    case '3h':
      return { from: subHours(now, 3), to: now, rangeHours: 3 }
    case '6h':
      return { from: subHours(now, 6), to: now, rangeHours: 6 }
    case '12h':
      return { from: subHours(now, 12), to: now, rangeHours: 12 }
    case '24h':
      return { from: subHours(now, 24), to: now, rangeHours: 24 }
    case '7d':
      return { from: subDays(now, 7), to: now, rangeHours: 168 }
    case '30d':
      return { from: subDays(now, 30), to: now, rangeHours: 720 }
    case 'custom': {
      if (!customRange) {
        return { from: subHours(now, 24), to: now, rangeHours: 24 }
      }
      const fromDate = new Date(customRange.from)
      const toDate = new Date(customRange.to)
      const hours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60)
      return { from: fromDate, to: toDate, rangeHours: hours }
    }
  }
}

export function HistoryClient({
  initialReadings,
  initialGaps,
  initialStats,
  sensorConfig,
}: HistoryClientProps) {
  const [metric, setMetric] = usePersistedState<Metric>('history-metric', 'temperature')
  const [timeRange, setTimeRange] = usePersistedState<TimeRangePreset>(
    'history-range',
    '24h'
  )
  const [customRange, setCustomRange] = usePersistedState<{
    from: string
    to: string
  } | null>('history-custom-range', null)
  const [selectedRooms, setSelectedRooms] = usePersistedState<string[]>(
    'history-rooms',
    sensorConfig.map((s) => s.mac_address)
  )
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('shared')
  const [readings, setReadings] = useState(initialReadings)
  const [gaps, setGaps] = useState(initialGaps)
  const [stats, setStats] = useState(initialStats)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  const { rangeHours } = getDateRange(timeRange, customRange)

  const refetchData = useCallback(
    async (preset: TimeRangePreset, custom: { from: string; to: string } | null) => {
      setLoading(true)
      try {
        const { from, to } = getDateRange(preset, custom)
        const fromISO = from.toISOString()
        const toISO = to.toISOString()
        const rangeH = (to.getTime() - from.getTime()) / (1000 * 60 * 60)
        const bucketMinutes = getBucketMinutes(rangeH)

        const supabase = createClient()
        const [newReadings, newGaps, newStats] = await Promise.all([
          fetchSensorHistory(supabase, fromISO, toISO, bucketMinutes),
          fetchGaps(supabase, fromISO, toISO),
          fetchSummaryStats(supabase, fromISO, toISO),
        ])

        setReadings(newReadings)
        setGaps(newGaps)
        setStats(newStats)
      } catch (err) {
        console.error('Failed to refetch history data:', err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handleTimeRangeChange = useCallback(
    (newRange: TimeRangePreset) => {
      setTimeRange(newRange)
      if (newRange !== 'custom') {
        startTransition(() => {
          refetchData(newRange, null)
        })
      }
    },
    [setTimeRange, refetchData]
  )

  const handleCustomRangeChange = useCallback(
    (newCustom: { from: string; to: string } | null) => {
      setCustomRange(newCustom)
      if (newCustom) {
        startTransition(() => {
          refetchData('custom', newCustom)
        })
      }
    },
    [setCustomRange, refetchData]
  )

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-5 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[1.728rem] font-semibold leading-tight tracking-tight">History</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setTooltipMode((prev) =>
                prev === 'shared' ? 'single' : 'shared'
              )
            }
            title={
              tooltipMode === 'shared'
                ? 'Shared tooltip (all rooms)'
                : 'Single tooltip (nearest)'
            }
          >
            {tooltipMode === 'shared' ? (
              <Crosshair className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <MousePointer className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </Button>
        </div>

        {/* Metric tabs */}
        <Tabs
          value={metric}
          onValueChange={(v) => setMetric(v as Metric)}
          className="mb-3"
        >
          <TabsList>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="humidity">Humidity</TabsTrigger>
            <TabsTrigger value="pressure">Pressure</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Time range picker */}
        <div className="mb-3">
          <TimeRangePicker
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            customRange={customRange}
            onCustomRangeChange={handleCustomRangeChange}
          />
        </div>

        {/* Room selector */}
        <div className="mb-5">
          <RoomSelector
            sensorConfig={sensorConfig}
            selectedRooms={selectedRooms}
            onSelectedRoomsChange={setSelectedRooms}
          />
        </div>

        {/* Loading indicator */}
        {(loading || isPending) && (
          <div className="text-sm text-muted-foreground mb-2">Loading...</div>
        )}

        {/* Trend chart */}
        <div className="mb-5">
          <TrendChart
            readings={readings}
            selectedRooms={selectedRooms}
            metric={metric}
            sensorConfig={sensorConfig}
            tooltipMode={tooltipMode}
            rangeHours={rangeHours}
          />
        </div>

        {/* Summary stats */}
        <SummaryStats
          stats={stats}
          selectedRooms={selectedRooms}
          metric={metric}
          sensorConfig={sensorConfig}
        />
      </main>
    </div>
  )
}
