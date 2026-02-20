'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { fetchSensorHealthTrend } from '@/lib/queries/health'
import { BATTERY_LOW_THRESHOLD_V } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import type { SensorHealth, SensorHealthTrend } from '@/lib/types'

interface HealthRowDetailProps {
  sensor: SensorHealth
}

export function HealthRowDetail({ sensor }: HealthRowDetailProps) {
  const [trend, setTrend] = useState<SensorHealthTrend[] | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()
    fetchSensorHealthTrend(supabase, sensor.mac_address, 168).then((data) => {
      setTrend(data)
      setLoading(false)
    })
  }, [sensor.mac_address])

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[150px] w-full" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[150px] w-full" />
        </div>
      </div>
    )
  }

  if (!trend || trend.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No trend data available for the last 7 days.
      </div>
    )
  }

  const chartData = trend.map((row) => ({
    time: new Date(row.measured_at).getTime(),
    battery_voltage: row.battery_voltage,
    rssi: row.rssi,
    movement_counter: row.movement_counter,
  }))

  // Find movement events (where counter changed from previous reading)
  const movementEvents: { time: number; counter: number }[] = []
  for (let i = 1; i < trend.length; i++) {
    const curr = trend[i].movement_counter
    const prev = trend[i - 1].movement_counter
    if (curr != null && prev != null && curr !== prev) {
      movementEvents.push({ time: new Date(trend[i].measured_at).getTime(), counter: curr })
    }
  }

  const formatTick = (ts: number) => format(new Date(ts), 'MMM d')

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
      {/* Battery voltage trend */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[0.833rem] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-2">
          Battery Voltage (7d)
        </h4>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`battGrad-${sensor.mac_address}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTick}
              tick={{ fontSize: 11, fill: '#657080' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#657080' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'V', position: 'insideLeft', style: { fontSize: 11 } }}
              domain={['auto', 'auto']}
            />
            <ReferenceLine
              y={BATTERY_LOW_THRESHOLD_V}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="battery_voltage"
              stroke="#3b82f6"
              fill={`url(#battGrad-${sensor.mac_address})`}
              isAnimationActive={false}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* RSSI trend */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[0.833rem] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-2">
          Signal Strength (7d)
        </h4>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`rssiGrad-${sensor.mac_address}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTick}
              tick={{ fontSize: 11, fill: '#657080' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#657080' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'dBm', position: 'insideLeft', style: { fontSize: 11 } }}
              domain={['auto', 'auto']}
            />
            <Area
              type="monotone"
              dataKey="rssi"
              stroke="#8b5cf6"
              fill={`url(#rssiGrad-${sensor.mac_address})`}
              isAnimationActive={false}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>

      {/* Movement events */}
      {movementEvents.length > 0 && (
        <div>
          <h4 className="text-[0.833rem] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-2">
            Movement Events (7d) — {movementEvents.length} detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {movementEvents.slice(-20).map((evt, i) => (
              <span
                key={i}
                className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                title={`Counter: ${evt.counter}`}
              >
                {format(new Date(evt.time), 'MMM d HH:mm')} ({formatDistanceToNow(new Date(evt.time), { addSuffix: true })})
              </span>
            ))}
          </div>
        </div>
      )}
      {movementEvents.length === 0 && (
        <p className="text-xs text-muted-foreground">No movement detected in the last 7 days.</p>
      )}
    </div>
  )
}
