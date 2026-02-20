'use client'

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
  Navigation,
  AlertTriangle,
  Thermometer,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  weatherConditionFromCode,
  weatherConditionFromCloudCover,
  precipitationLabel,
  windDirectionToCompass,
} from '@/lib/weather'
import { isWeatherStale, useNow } from '@/lib/staleness'
import type { WeatherObservation } from '@/lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>> = {
  Sun, CloudSun, Cloud, CloudRain, CloudDrizzle, CloudLightning,
  CloudFog, Snowflake, Wind, Zap, HelpCircle, CloudHail, Haze,
}

interface WeatherHeroProps {
  weather: WeatherObservation | null
}

export function WeatherHero({ weather }: WeatherHeroProps) {
  const now = useNow()

  if (!weather) {
    return (
      <section className="bg-background px-5 py-10 text-center">
        <p className="text-muted-foreground text-sm">Waiting for weather data...</p>
      </section>
    )
  }

  const stale = isWeatherStale(weather.observed_at, now)

  const condition =
    weather.weather_code !== null && !isNaN(weather.weather_code)
      ? weatherConditionFromCode(weather.weather_code)
      : weatherConditionFromCloudCover(weather.cloud_cover, weather.precipitation_1h)

  const ConditionIcon = ICON_MAP[condition.icon] ?? HelpCircle
  const compassDir = windDirectionToCompass(weather.wind_direction)
  const windRotation = weather.wind_direction !== null ? weather.wind_direction : 0

  const precipFull = precipitationLabel(weather.precipitation_1h)
  const precipMatch = precipFull.match(/^(.+?)\s*(\(.+\))$/)
  const precipValue = precipMatch ? precipMatch[1] : precipFull

  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-5 pt-6 pb-5">
        {/* Section heading — never dims */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-[1.728rem] font-semibold leading-tight tracking-tight text-foreground">Weather</h2>
            <p className="text-[1.44rem] font-light text-muted-foreground mt-1">Data provided by FMI</p>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            {stale && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" strokeWidth={1.5} />}
            <span className="text-[0.833rem] text-muted-foreground/60">
              {stale ? 'Last updated ' : 'Updated '}
              {formatDistanceToNow(new Date(weather.observed_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Primary metric cards (5 columns on lg) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Weather condition card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2">
              <ConditionIcon className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
              <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Condition</span>
            </div>
            <div className={`mt-5 ${stale ? 'opacity-50' : ''}`}>
              <span className="text-[1.728rem] font-light leading-tight text-foreground dark:text-white">
                {condition.label}
              </span>
            </div>
            <p className={`mt-3 text-muted-foreground/60 dark:text-white/40 text-[0.833rem] ${stale ? 'opacity-50' : ''}`}>
              {precipValue}
            </p>
          </div>

          {/* Temperature card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Thermometer className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
              <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Temp</span>
            </div>
            <div className={`mt-5 flex items-baseline gap-0.5 ${stale ? 'opacity-50' : ''}`}>
              <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
                {weather.temperature !== null ? weather.temperature.toFixed(1) : '--'}
              </span>
              <span className="text-sm text-muted-foreground/70 dark:text-white/60 font-light">°C</span>
            </div>
          </div>

          {/* Wind card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Wind className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
              <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Wind</span>
            </div>
            <div className={`mt-5 flex items-baseline gap-0.5 ${stale ? 'opacity-50' : ''}`}>
              <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
                {weather.wind_speed !== null ? weather.wind_speed.toFixed(1) : '--'}
              </span>
              <span className="text-sm text-muted-foreground/70 dark:text-white/60 font-light">m/s</span>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-muted-foreground/70 dark:text-white/50 text-[0.833rem] ${stale ? 'opacity-50' : ''}`}>
              <Navigation
                className="h-3 w-3 shrink-0"
                strokeWidth={1.5}
                style={{ transform: `rotate(${windRotation}deg)` }}
              />
              <span>{compassDir}</span>
              {weather.wind_gust !== null && (
                <span className="text-muted-foreground/50 dark:text-white/40">({weather.wind_gust.toFixed(1)})</span>
              )}
            </div>
          </div>

          {/* Humidity card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Droplets className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
              <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Humidity</span>
            </div>
            <div className={`mt-5 flex items-baseline gap-0.5 ${stale ? 'opacity-50' : ''}`}>
              <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
                {weather.humidity !== null ? weather.humidity.toFixed(0) : '--'}
              </span>
              <span className="text-sm text-muted-foreground/70 dark:text-white/60 font-light">%</span>
            </div>
            {weather.dew_point !== null && (
              <p className={`mt-3 text-muted-foreground/60 dark:text-white/40 text-[0.833rem] ${stale ? 'opacity-50' : ''}`}>
                Dew pt {weather.dew_point.toFixed(1)}°
              </p>
            )}
          </div>

          {/* Pressure card */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-6 w-6 text-foreground dark:text-white shrink-0" strokeWidth={1.2} />
              <span className="text-[1.2rem] font-medium text-foreground dark:text-white">Pressure</span>
            </div>
            <div className={`mt-5 flex items-baseline gap-0.5 ${stale ? 'opacity-50' : ''}`}>
              <span className="text-[1.728rem] font-light leading-none tabular-nums text-foreground dark:text-white">
                {weather.pressure !== null ? weather.pressure.toFixed(0) : '--'}
              </span>
              <span className="text-sm text-muted-foreground/70 dark:text-white/60 font-light">hPa</span>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-muted-foreground/60 dark:text-white/40 text-[0.833rem] ${stale ? 'opacity-50' : ''}`}>
              {weather.cloud_cover !== null && <span>{weather.cloud_cover}% cloud</span>}
              {weather.visibility !== null && (
                <span>
                  {weather.visibility >= 1000
                    ? `${(weather.visibility / 1000).toFixed(0)} km vis`
                    : `${weather.visibility.toFixed(0)} m vis`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
