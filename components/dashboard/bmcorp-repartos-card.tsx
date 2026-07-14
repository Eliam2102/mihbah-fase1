import type { RepartosSplit } from '@/lib/services/dashboard-bmcorp.service'
import { Coins, AlertCircle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Props {
  data: RepartosSplit
  periodLabel?: string
}

export function BmcorpRepartosCard({ data, periodLabel }: Props) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Coins className="text-jade-600 h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Repartos a alianzas</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Realizados
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatMXN(data.realizado.monto)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {data.realizado.count} {data.realizado.count === 1 ? 'pago' : 'pagos'}
            {periodLabel ? ` · ${periodLabel}` : ''}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Parcial
          </p>
          <p className="mt-1 text-xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
            {formatMXN(data.parcial.monto)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {data.parcial.count} {data.parcial.count === 1 ? 'pago' : 'pagos'}
            {periodLabel ? ` · ${periodLabel}` : ''}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Pendiente
          </p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums dark:text-red-400">
            {formatMXN(data.pendiente.monto)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {data.pendiente.count} {data.pendiente.count === 1 ? 'reparto' : 'repartos'} · saldo
            vivo
          </p>
        </div>
      </div>
    </div>
  )
}
