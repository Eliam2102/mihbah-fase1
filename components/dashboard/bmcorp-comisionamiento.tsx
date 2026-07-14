import type { ComisionamientoConciliado } from '@/lib/services/dashboard-bmcorp.service'
import { Wallet, AlertCircle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Props {
  data: ComisionamientoConciliado
  periodLabel?: string
}

export function BmcorpComisionamiento({ data, periodLabel }: Props) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="text-jade-600 h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Comisionamiento conciliado</h3>
      </div>

      <div className="space-y-3">
        {/* Total generado */}
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-xs">
            Comisión generada{periodLabel ? ` · ${periodLabel}` : ''}
          </span>
          <span className="text-foreground text-lg font-bold tabular-nums">
            {formatMXN(data.totalGenerado)}
          </span>
        </div>

        {data.sinDatos ? (
          <div className="border-border flex items-start gap-2 rounded-lg border border-dashed p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <p className="text-foreground font-medium">Sin comisiones calculadas</p>
              <p className="text-muted-foreground mt-0.5">
                Sincroniza Monday y ejecuta un precálculo en Comisiones → Cortes.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Pagado vs pendiente */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                  Pagado
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                  {formatMXN(data.pagado)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                  Parcial
                </p>
                <p className="mt-1 text-sm font-bold text-amber-700 tabular-nums dark:text-amber-300">
                  {formatMXN(data.parcial)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                <p className="text-xs font-semibold tracking-wide text-red-700 uppercase dark:text-red-400">
                  Pendiente
                </p>
                <p className="mt-1 text-sm font-bold text-red-700 tabular-nums dark:text-red-300">
                  {formatMXN(data.pendiente)}
                </p>
                <p className="mt-0.5 text-[10px] text-red-600/80 dark:text-red-400/80">
                  saldo vivo
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">
                  Conciliado{periodLabel ? ` · ${periodLabel}` : ''}
                </span>
                <span className="text-foreground font-semibold tabular-nums">
                  {data.porcentajeConciliado}%
                </span>
              </div>
              <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${data.porcentajeConciliado}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
