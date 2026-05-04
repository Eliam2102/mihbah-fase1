'use client'

import { cn } from '@/lib/utils'

interface ProgressCardProps {
  label: string
  actual: number
  meta: number
  suffix?: string
  loading?: boolean
  variant?: 'default' | 'warning' | 'critical'
}

function formatMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export function ProgressCard({
  label,
  actual,
  meta,
  suffix,
  loading = false,
  variant = 'default',
}: ProgressCardProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse rounded-xl border p-5">
        <div className="bg-muted mb-3 h-3 w-28 rounded" />
        <div className="bg-muted mb-3 h-6 w-40 rounded" />
        <div className="bg-muted h-2 w-full rounded" />
      </div>
    )
  }

  const pct = meta > 0 ? Math.min(100, (actual / meta) * 100) : 0
  const barColor =
    variant === 'critical'
      ? 'bg-red-500'
      : variant === 'warning'
        ? 'bg-amber-400'
        : pct >= 80
          ? 'bg-emerald-500'
          : pct >= 50
            ? 'bg-blue-500'
            : 'bg-indigo-400'

  const pctColor =
    pct >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct >= 50
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-muted-foreground'

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
        {label}
      </p>

      <div className="mb-3 flex items-end justify-between">
        <p className="text-foreground text-2xl font-bold tabular-nums">
          {formatMXN(actual)}
          {suffix && (
            <span className="text-muted-foreground ml-1 text-sm font-medium">{suffix}</span>
          )}
        </p>
        <span className={cn('text-xl font-bold tabular-nums', pctColor)}>{pct.toFixed(1)}%</span>
      </div>

      {/* Progress bar */}
      <div className="bg-muted mb-2 h-2.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Recaudado</span>
        <span className="tabular-nums">Meta: {formatMXN(meta)}</span>
      </div>
    </div>
  )
}
