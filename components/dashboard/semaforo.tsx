'use client'

import { cn } from '@/lib/utils'
import {
  type SemaforoResult,
  SEMAFORO_ORDER,
  type SemaforoEstado,
} from '@/lib/services/semaforo.service'

interface SemaforoProps {
  result: SemaforoResult
  loading?: boolean
}

const CIRCLE_COLORS: Record<SemaforoEstado, string> = {
  SALUDABLE: 'bg-emerald-500',
  PRECAUCION: 'bg-amber-400',
  EN_RIESGO: 'bg-orange-500',
  CRITICO: 'bg-red-600',
}

const INACTIVE_COLORS: Record<SemaforoEstado, string> = {
  SALUDABLE: 'bg-emerald-200 dark:bg-emerald-900/40',
  PRECAUCION: 'bg-amber-200 dark:bg-amber-900/40',
  EN_RIESGO: 'bg-orange-200 dark:bg-orange-900/40',
  CRITICO: 'bg-red-200 dark:bg-red-900/40',
}

const LABELS: Record<SemaforoEstado, string> = {
  SALUDABLE: 'Saludable',
  PRECAUCION: 'Precaución',
  EN_RIESGO: 'En riesgo',
  CRITICO: 'Crítico',
}

export function Semaforo({ result, loading = false }: SemaforoProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse rounded-xl border p-5">
        <div className="bg-muted mb-4 h-4 w-24 rounded" />
        <div className="mb-4 flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-10 w-10 rounded-full" />
          ))}
        </div>
        <div className="bg-muted h-3 w-48 rounded" />
      </div>
    )
  }

  const activeIndex = SEMAFORO_ORDER.indexOf(result.estado)

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-widest uppercase">
        Semáforo financiero
      </p>

      {/* 4 circles */}
      <div className="mb-4 flex items-center gap-3">
        {SEMAFORO_ORDER.map((estado, idx) => {
          const isActive = idx === activeIndex
          return (
            <div key={estado} className="flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                      result.pulseColor,
                    )}
                  />
                )}
                <span
                  className={cn(
                    'relative inline-flex h-10 w-10 rounded-full transition-all',
                    isActive
                      ? cn(CIRCLE_COLORS[estado], 'scale-110 shadow-lg')
                      : INACTIVE_COLORS[estado],
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive ? result.color : 'text-muted-foreground',
                )}
              >
                {LABELS[estado]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Active state label */}
      <div className={cn('mb-1 text-sm font-semibold', result.color)}>Estado: {result.label}</div>
      <p className="text-muted-foreground text-xs leading-relaxed">{result.descripcion}</p>
    </div>
  )
}
