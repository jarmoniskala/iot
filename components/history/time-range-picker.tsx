'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { TimeRangePreset } from '@/lib/types'
import type { DateRange } from 'react-day-picker'

const PRESETS: { value: TimeRangePreset; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '3h', label: '3h' },
  { value: '6h', label: '6h' },
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
]

interface TimeRangePickerProps {
  timeRange: TimeRangePreset
  onTimeRangeChange: (range: TimeRangePreset) => void
  customRange: { from: string; to: string } | null
  onCustomRangeChange: (range: { from: string; to: string } | null) => void
}

export function TimeRangePicker({
  timeRange,
  onTimeRangeChange,
  customRange,
  onCustomRangeChange,
}: TimeRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    customRange
      ? { from: new Date(customRange.from), to: new Date(customRange.to) }
      : undefined
  )

  const handlePresetClick = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setCalendarOpen(true)
    }
    onTimeRangeChange(preset)
  }

  const handleConfirmCustom = () => {
    if (pendingRange?.from && pendingRange?.to) {
      onCustomRangeChange({
        from: pendingRange.from.toISOString(),
        to: pendingRange.to.toISOString(),
      })
      setCalendarOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((preset) => {
        if (preset.value === 'custom') {
          return (
            <Popover key="custom" open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={timeRange === 'custom' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 rounded-full text-xs',
                    timeRange === 'custom' && 'shadow-sm'
                  )}
                  onClick={() => handlePresetClick('custom')}
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {timeRange === 'custom' && customRange
                    ? `${format(new Date(customRange.from), 'MMM d')} - ${format(new Date(customRange.to), 'MMM d')}`
                    : 'Custom'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={pendingRange}
                  onSelect={setPendingRange}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                />
                <div className="border-t p-3 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!pendingRange?.from || !pendingRange?.to}
                    onClick={handleConfirmCustom}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )
        }

        return (
          <Button
            key={preset.value}
            variant={timeRange === preset.value ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 rounded-full text-xs',
              timeRange === preset.value && 'shadow-sm'
            )}
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </Button>
        )
      })}
    </div>
  )
}
