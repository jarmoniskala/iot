'use client'

import { useMemo, useRef, useCallback, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { useChartZoom } from '@/lib/hooks/use-chart-zoom'
import { ChartTooltip } from './chart-tooltip'
import { GapTooltip } from './gap-tooltip'
import { ROOM_COLOR_PALETTE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import type { HistoryBucket, GapInterval, Metric, TooltipMode, SensorConfig } from '@/lib/types'

const METRIC_KEY_MAP: Record<Metric, keyof HistoryBucket> = {
  temperature: 'avg_temperature',
  humidity: 'avg_humidity',
  pressure: 'avg_pressure_hpa',
}

const METRIC_UNIT: Record<Metric, string> = {
  temperature: '\u00B0C',
  humidity: '%',
  pressure: 'hPa',
}

interface TrendChartProps {
  readings: HistoryBucket[]
  gaps: GapInterval[]
  selectedRooms: string[]
  metric: Metric
  sensorConfig: SensorConfig[]
  tooltipMode: TooltipMode
  rangeHours: number
}

interface ChartDataPoint {
  timestamp: number
  [mac: string]: number | null
}

export function TrendChart({
  readings,
  gaps,
  selectedRooms,
  metric,
  sensorConfig,
  tooltipMode,
  rangeHours,
}: TrendChartProps) {
  const metricKey = METRIC_KEY_MAP[metric]

  // Transform readings into Recharts format
  const chartData = useMemo(() => {
    const bucketMap = new Map<number, ChartDataPoint>()

    for (const row of readings) {
      const ts = new Date(row.bucket).getTime()
      if (!bucketMap.has(ts)) {
        bucketMap.set(ts, { timestamp: ts })
      }
      const point = bucketMap.get(ts)!
      const value = row[metricKey]
      if (selectedRooms.includes(row.mac_address)) {
        point[row.mac_address] = value as number | null
      }
    }

    return Array.from(bucketMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [readings, metricKey, selectedRooms])

  // Compute Y-axis domain with padding
  const yDomain = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const point of chartData) {
      for (const mac of selectedRooms) {
        const val = point[mac]
        if (val != null) {
          if (val < min) min = val
          if (val > max) max = val
        }
      }
    }
    if (min === Infinity) return ['auto', 'auto'] as const
    const range = max - min || 1
    const padding = range * 0.1
    return [Math.floor(min - padding), Math.ceil(max + padding)] as const
  }, [chartData, selectedRooms])

  // Check if zero line is within data range
  const showZeroLine = useMemo(() => {
    if (yDomain[0] === 'auto') return false
    return yDomain[0] <= 0 && yDomain[1] >= 0
  }, [yDomain])

  // Compute initial domain from data
  const initialDomain = useMemo(() => {
    if (chartData.length === 0) {
      const now = Date.now()
      return { left: now - 24 * 60 * 60 * 1000, right: now }
    }
    return {
      left: chartData[0].timestamp,
      right: chartData[chartData.length - 1].timestamp,
    }
  }, [chartData])

  const {
    domain,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    isZoomed,
  } = useChartZoom(initialDomain.left, initialDomain.right)

  // Throttle ref for wheel events
  const throttleRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Gap tooltip state
  const [gapTooltip, setGapTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    gapStart: string
    gapEnd: string
    durationMinutes: number
  }>({ visible: false, x: 0, y: 0, gapStart: '', gapEnd: '', durationMinutes: 0 })

  const handleContainerWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const now = Date.now()
      if (now - throttleRef.current < 50) return
      throttleRef.current = now
      const width = containerRef.current?.clientWidth ?? 800
      handleWheel(e, width)
    },
    [handleWheel]
  )

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true)
      handleMouseDown(e)
    },
    [handleMouseDown]
  )

  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const width = containerRef.current?.clientWidth ?? 800
      handleMouseMove(e, width)
    },
    [handleMouseMove]
  )

  const handleContainerMouseUp = useCallback(() => {
    setIsDragging(false)
    handleMouseUp()
  }, [handleMouseUp])

  // Build room name and color maps
  const roomNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of sensorConfig) {
      map[s.mac_address] = s.display_name
    }
    return map
  }, [sensorConfig])

  const roomColors = useMemo(() => {
    const map: Record<string, string> = {}
    for (let i = 0; i < sensorConfig.length; i++) {
      map[sensorConfig[i].mac_address] =
        ROOM_COLOR_PALETTE[i % ROOM_COLOR_PALETTE.length]
    }
    return map
  }, [sensorConfig])

  // Tick formatter based on range
  const tickFormatter = useCallback(
    (value: number) => {
      const d = new Date(value)
      if (rangeHours <= 24) return format(d, 'HH:mm')
      return format(d, 'MMM d')
    },
    [rangeHours]
  )

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No data available for the selected range
      </div>
    )
  }

  return (
    <div className="relative">
      {isZoomed && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 h-7 text-xs gap-1"
          onClick={resetZoom}
        >
          <RotateCcw className="h-3 w-3" />
          Reset zoom
        </Button>
      )}
      <div
        ref={containerRef}
        className="select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleContainerWheel}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
      >
        <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[250px]">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[domain.left, domain.right]}
              scale="time"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#4b5563"
              strokeOpacity={0.3}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              stroke="#4b5563"
              strokeOpacity={0.3}
              tickLine={false}
              axisLine={false}
              width={45}
              label={{
                value: METRIC_UNIT[metric],
                position: 'insideTopLeft',
                offset: -5,
                style: { fontSize: 11, fill: '#9ca3af' },
              }}
            />

            {/* Zero reference line */}
            {showZeroLine && (
              <ReferenceLine
                y={0}
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="6 3"
              />
            )}

            <Tooltip
              content={
                <ChartTooltip
                  metric={metric}
                  tooltipMode={tooltipMode}
                  roomNames={roomNames}
                  roomColors={roomColors}
                />
              }
              cursor={{
                stroke: '#9ca3af',
                strokeOpacity: 0.3,
                strokeDasharray: '4 4',
              }}
            />

            {/* Gap reference areas */}
            {gaps
              .filter((g) => selectedRooms.includes(g.mac_address))
              .map((gap, i) => {
                const x1 = new Date(gap.gap_start).getTime()
                const x2 = new Date(gap.gap_end).getTime()
                return (
                  <ReferenceArea
                    key={`gap-${i}`}
                    x1={x1}
                    x2={x2}
                    fillOpacity={0.05}
                    fill="#9ca3af"
                    strokeDasharray="4 4"
                    stroke="#9ca3af"
                    strokeOpacity={0.3}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setGapTooltip({
                        visible: true,
                        x: e.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0),
                        y: e.clientY - (containerRef.current?.getBoundingClientRect().top ?? 0),
                        gapStart: gap.gap_start,
                        gapEnd: gap.gap_end,
                        durationMinutes: gap.duration_minutes,
                      })
                    }}
                    onMouseLeave={() => {
                      setGapTooltip((prev) => ({ ...prev, visible: false }))
                    }}
                  />
                )
              })}

            {/* Line per selected room */}
            {selectedRooms.map((mac) => {
              const color = roomColors[mac] ?? '#888'
              return (
                <Line
                  key={mac}
                  type="monotone"
                  dataKey={mac}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                  isAnimationActive={false}
                  connectNulls={true}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <GapTooltip {...gapTooltip} />
    </div>
  )
}
