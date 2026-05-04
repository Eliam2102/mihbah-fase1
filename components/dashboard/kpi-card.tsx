'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type KpiVariant = 'default' | 'success' | 'warning' | 'critical'

interface KpiCardProps {
  label: string
  value: number | string
  prefix?: string
  suffix?: string
  trend?: number // percentage change vs previous period
  comparison?: string // e.g. "vs mes anterior"
  variant?: KpiVariant
  loading?: boolean
  onClick?: () => void
  formatCurrency?: boolean
}

const VARIANT_STYLES: Record<KpiVariant, string> = {
  default: 'border-border',
  success: 'border-emerald-200 dark:border-emerald-800',
  warning: 'border-amber-200 dark:border-amber-800',
  critical: 'border-red-200 dark:border-red-800',
}

const VARIANT_VALUE: Record<KpiVariant, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export function KpiCard({
  label,
  value,
  prefix,
  suffix,
  trend,
  comparison = 'vs periodo anterior',
  variant = 'default',
  loading = false,
  onClick,
  formatCurrency = true,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse rounded-xl border p-5">
        <div className="bg-muted mb-3 h-3 w-24 rounded" />
        <div className="bg-muted mb-2 h-8 w-32 rounded" />
        <div className="bg-muted h-3 w-20 rounded" />
      </div>
    )
  }

  const numericValue = typeof value === 'number' ? value : Number(value)
  const displayValue =
    formatCurrency && typeof value === 'number'
      ? formatMXN(numericValue)
      : typeof value === 'number'
        ? numericValue.toLocaleString('es-MX')
        : value

  const hasTrend = trend !== undefined && trend !== null
  const trendUp = hasTrend && trend! > 0
  const trendDown = hasTrend && trend! < 0
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cn(
        'group bg-card rounded-xl border p-5 transition-all',
        VARIANT_STYLES[variant],
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
      )}
    >
      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {label}
      </p>

      <p className={cn('mt-2 text-3xl font-bold tabular-nums', VARIANT_VALUE[variant])}>
        {prefix && <span className="mr-0.5 text-lg">{prefix}</span>}
        {displayValue}
        {suffix && <span className="ml-0.5 text-lg">{suffix}</span>}
      </p>

      {hasTrend && (
        <div className="mt-2 flex items-center gap-1.5">
          <TrendIcon
            className={cn(
              'h-3.5 w-3.5',
              trendUp ? 'text-emerald-500' : trendDown ? 'text-red-500' : 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              trendUp ? 'text-emerald-600' : trendDown ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {trend! > 0 ? '+' : ''}
            {trend!.toFixed(1)}%
          </span>
          <span className="text-muted-foreground text-xs">{comparison}</span>
        </div>
      )}
    </div>
  )
}
