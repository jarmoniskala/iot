'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LatestSensorReading, WeatherObservation, SensorConfig } from '@/lib/types'

interface RealtimeProviderProps {
  initialReadings: LatestSensorReading[]
  initialWeather: WeatherObservation | null
  sensorConfig: SensorConfig[]
  children: (props: {
    readings: Map<string, LatestSensorReading>
    weather: WeatherObservation | null
    sensorConfig: SensorConfig[]
  }) => React.ReactNode
}

export function RealtimeProvider({
  initialReadings,
  initialWeather,
  sensorConfig,
  children,
}: RealtimeProviderProps) {
  const [readings, setReadings] = useState<Map<string, LatestSensorReading>>(() => {
    const map = new Map<string, LatestSensorReading>()
    for (const r of initialReadings) {
      map.set(r.mac_address, r)
    }
    return map
  })
  const [weather, setWeather] = useState<WeatherObservation | null>(initialWeather)
  const [configs, setConfigs] = useState<SensorConfig[]>(sensorConfig)

  // Merge a new sensor reading into state, enriching with config data
  const handleSensorInsert = useCallback((newReading: Record<string, unknown>) => {
    const macAddress = newReading.mac_address as string
    setReadings((prev) => {
      const next = new Map(prev)
      // Find config for this MAC to get display_name and room_name
      const config = configs.find(
        (c) => c.mac_address === macAddress && c.unassigned_at === null
      )
      const enriched: LatestSensorReading = {
        mac_address: macAddress,
        measured_at: newReading.measured_at as string,
        temperature: newReading.temperature as number | null,
        humidity: newReading.humidity as number | null,
        pressure: newReading.pressure as number | null,
        battery_voltage: newReading.battery_voltage as number | null,
        rssi: newReading.rssi as number | null,
        sensor_name: newReading.sensor_name as string | null,
        is_outlier: newReading.is_outlier as boolean,
        display_name: config?.display_name ?? null,
        room_name: config?.room_name ?? null,
      }
      // Only update if not an outlier
      if (!enriched.is_outlier) {
        next.set(macAddress, enriched)
      }
      return next
    })
  }, [configs])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          handleSensorInsert(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weather_observations' },
        (payload) => {
          setWeather(payload.new as unknown as WeatherObservation)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sensor_config' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setConfigs((prev) =>
              prev.map((c) =>
                c.id === (payload.new as SensorConfig).id
                  ? (payload.new as SensorConfig)
                  : c
              )
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error -- data still shows from initial fetch')
        }
        if (status === 'TIMED_OUT') {
          console.warn('Realtime channel timed out -- attempting reconnect')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [handleSensorInsert])

  return <>{children({ readings, weather, sensorConfig: configs })}</>
}
