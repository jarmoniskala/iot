import type { SeverityLevel } from '@/lib/types'

const SEVERITY_STYLES: Record<
  SeverityLevel,
  { dot: string; text: string; bg: string; label: string }
> = {
  healthy: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/15',
    label: 'Healthy',
  },
  warning: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/15',
    label: 'Warning',
  },
  critical: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-500/15',
    label: 'Critical',
  },
}

interface SeverityBadgeProps {
  severity: SeverityLevel
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const style = SEVERITY_STYLES[severity]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
