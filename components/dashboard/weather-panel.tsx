'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Snowflake,
  Wind,
  Zap,
  HelpCircle,
  CloudHail,
  Haze,
  Droplets,
  Gauge,
  Eye,
  Navigation,
  AlertTriangle,
  ChevronDown,
  Thermometer,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  weatherConditionFromCode,
  weatherConditionFromCloudCover,
  precipitationLabel,
  windDirectionToCompass,
  cloudCoverLabel,
} from '@/lib/weather'
import { isWeatherStale, useNow } from '@/lib/staleness'
import type { WeatherObservation } from '@/lib/types'

// Map icon string names to actual lucide-react components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Snowflake,
  Wind,
  Zap,
  HelpCircle,
  CloudHail,
  Haze,
}

interface WeatherPanelProps {
  weather: WeatherObservation | null
}

export function WeatherPanel({ weather }: WeatherPanelProps) {
  const now = useNow()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!weather) {
    return (
      <Card className="w-full lg:w-72 xl:w-80 shrink-0">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No weather data yet. Waiting for FMI observation...
        </CardContent>
      </Card>
    )
  }

  const stale = isWeatherStale(weather.observed_at, now)

  // Derive weather condition
  const condition =
    weather.weather_code !== null && !isNaN(weather.weather_code)
      ? weatherConditionFromCode(weather.weather_code)
      : weatherConditionFromCloudCover(weather.cloud_cover, weather.precipitation_1h)

  const ConditionIcon = ICON_MAP[condition.icon] ?? HelpCircle
  const compassDir = windDirectionToCompass(weather.wind_direction)
  const windRotation = weather.wind_direction !== null ? weather.wind_direction : 0

  const detailRows = [
    {
      icon: Droplets,
      label: 'Humidity',
      value: weather.humidity !== null ? `${weather.humidity.toFixed(0)}%` : '--',
    },
    {
      icon: Wind,
      label: 'Wind',
      value:
        weather.wind_speed !== null
          ? `${weather.wind_speed.toFixed(1)} m/s`
          : '--',
      extra:
        weather.wind_gust !== null
          ? `(gust ${weather.wind_gust.toFixed(1)})`
          : undefined,
    },
    {
      icon: Navigation,
      label: 'Direction',
      value: compassDir,
      rotation: windRotation,
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: weather.pressure !== null ? `${weather.pressure.toFixed(0)} hPa` : '--',
    },
    {
      icon: CloudRain,
      label: 'Precipitation',
      value: precipitationLabel(weather.precipitation_1h),
    },
    {
      icon: Cloud,
      label: 'Cloud cover',
      value: cloudCoverLabel(weather.cloud_cover),
    },
    {
      icon: Eye,
      label: 'Visibility',
      value:
        weather.visibility !== null
          ? weather.visibility >= 1000
            ? `${(weather.visibility / 1000).toFixed(0)} km`
            : `${weather.visibility.toFixed(0)} m`
          : '--',
    },
    {
      icon: Thermometer,
      label: 'Dew point',
      value: weather.dew_point !== null ? `${weather.dew_point.toFixed(1)}°C` : '--',
    },
  ]

  // Desktop layout (full panel)
  const fullContent = (
    <div className={`space-y-4 ${stale ? 'opacity-50' : ''}`}>
      {/* Condition + temperature header */}
      <div className="text-center space-y-1">
        <ConditionIcon className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">{condition.label}</p>
        <div>
          <span className="text-3xl font-light tabular-nums">
            {weather.temperature !== null ? weather.temperature.toFixed(1) : '--'}
          </span>
          <span className="text-lg text-muted-foreground ml-0.5">°C</span>
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-2.5">
        {detailRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <row.icon
                className="h-3.5 w-3.5 shrink-0"
                style={
                  row.rotation !== undefined
                    ? { transform: `rotate(${row.rotation}deg)` }
                    : undefined
                }
              />
              <span>{row.label}</span>
            </div>
            <div className="text-right tabular-nums">
              <span>{row.value}</span>
              {row.extra && (
                <span className="text-xs text-muted-foreground ml-1">
                  {row.extra}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timestamp + staleness */}
      <div className="text-center pt-1">
        <div className="flex items-center justify-center gap-1">
          {stale && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          <span className="text-xs text-muted-foreground">
            {stale ? 'Last updated ' : 'Updated '}
            {formatDistanceToNow(new Date(weather.observed_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: always-visible side panel */}
      <Card className="hidden lg:block w-72 xl:w-80 shrink-0">
        <CardContent className="p-4">{fullContent}</CardContent>
      </Card>

      {/* Mobile: collapsible panel */}
      <Collapsible open={mobileOpen} onOpenChange={setMobileOpen} className="lg:hidden">
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${stale ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <ConditionIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Outdoors
                  </span>
                  <span className="text-lg font-light tabular-nums">
                    {weather.temperature !== null
                      ? `${weather.temperature.toFixed(1)}°C`
                      : '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {condition.label}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    mobileOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">{fullContent}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  )
}
