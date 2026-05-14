'use client'

import { cn } from '@/lib/utils'
import type {
  SemaforoResult,
  SubIndicador,
  SubIndicadorEstado,
} from '@/lib/services/semaforo.service'

interface SemaforoProps {
  result: SemaforoResult
  loading?: boolean
}

const SUB_COLORS: Record<
  SubIndicadorEstado,
  { dot: string; text: string; bg: string; label: string }
> = {
  VERDE: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'Verde',
  },
  AMARILLO: {
    dot: 'bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Amarillo',
  },
  ROJO: {
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    label: 'Rojo',
  },
  SIN_DATOS: {
    dot: 'bg-muted-foreground/30',
    text: 'text-muted-foreground',
    bg: 'bg-muted/40',
    label: 'Sin datos',
  },
}

function SubCard({ sub }: { sub: SubIndicador }) {
  const ui = SUB_COLORS[sub.estado]
  return (
    <div className={cn('border-border rounded-xl border p-4', ui.bg)}>
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
        {sub.label}
      </p>
      <div className="flex items-center gap-2.5">
        <span className={cn('h-3 w-3 shrink-0 rounded-full', ui.dot)} />
        <span className={cn('text-sm font-semibold', ui.text)}>{ui.label}</span>
      </div>
      <p className={cn('mt-2 text-lg font-bold tabular-nums', ui.text)}>{sub.valor ?? '—'}</p>
    </div>
  )
}

export function Semaforo({ result, loading = false }: SemaforoProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-border bg-muted/40 h-28 animate-pulse rounded-xl border p-4"
          />
        ))}
      </div>
    )
  }

  const { subIndicadores } = result

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SubCard sub={subIndicadores.flujoNeto} />
      <SubCard sub={subIndicadores.cobranza} />
      <SubCard sub={subIndicadores.avanceFisico} />
      <SubCard sub={subIndicadores.pipeline} />
    </div>
  )
}
