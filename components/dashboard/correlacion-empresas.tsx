import type { CorrelacionFlow } from '@/lib/services/dashboard-general.service'
import { ArrowRight, Building2, Banknote, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  flows: CorrelacionFlow[]
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}k`
  }
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function iconForName(name: string) {
  const upper = name.toUpperCase()
  if (upper.includes('YCDI')) return Banknote
  if (upper.includes('MIHBAH')) return Building2
  if (upper.includes('BM')) return ShoppingBag
  return Building2
}

function colorForName(name: string): string {
  const upper = name.toUpperCase()
  if (upper.includes('YCDI'))
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  if (upper.includes('MIHBAH'))
    return 'border-jade-200 bg-jade-50 text-jade-700 dark:border-jade-800 dark:bg-jade-900/30 dark:text-jade-300'
  if (upper.includes('BM'))
    return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  return 'border-border bg-muted text-foreground'
}

export function CorrelacionEmpresas({ flows }: Props) {
  if (flows.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
        Sin correlaciones suficientes en el periodo.
      </div>
    )
  }

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4">
        <h3 className="text-foreground text-sm font-semibold">Correlación entre empresas</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Flujos narrativos del periodo (no son transferencias bancarias reales).
        </p>
      </div>

      <div className="space-y-3">
        {flows.map((f, i) => {
          const FromIcon = iconForName(f.from)
          const ToIcon = iconForName(f.to)
          return (
            <div
              key={i}
              className="border-border bg-card grid grid-cols-1 items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_1fr]"
            >
              {/* Origen */}
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-2',
                  colorForName(f.from),
                )}
              >
                <FromIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold tracking-wide uppercase">{f.from}</p>
                </div>
              </div>

              {/* Flecha + monto */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-foreground text-sm font-bold tabular-nums">
                  {formatCompact(f.monto)}
                </span>
                <ArrowRight className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground hidden text-[10px] tracking-wide uppercase sm:block">
                  flujo
                </span>
              </div>

              {/* Destino */}
              <div
                className={cn('flex items-center gap-2 rounded-lg border p-2', colorForName(f.to))}
              >
                <ToIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold tracking-wide uppercase">{f.to}</p>
                </div>
              </div>

              {/* Concepto debajo */}
              <p className="text-muted-foreground col-span-1 text-xs sm:col-span-3">
                <span className="font-medium">Concepto:</span> {f.concepto}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
