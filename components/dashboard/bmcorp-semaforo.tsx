import type { SemaforoBmcorpResult } from '@/lib/services/dashboard-bmcorp/dashboard-bmcorp.service'

function fmt(n: number) {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface Props {
  data: SemaforoBmcorpResult
}

export function BmcorpSemaforo({ data }: Props) {
  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {/* Indicador visual */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <span
            className={`absolute h-10 w-10 animate-ping rounded-full opacity-20 ${data.bgColor}`}
          />
          <span className={`h-6 w-6 rounded-full ${data.bgColor}`} />
        </div>

        <div>
          <p className="text-foreground text-sm font-semibold">
            Semáforo BM CORP — <span className={data.color}>{data.label}</span>
          </p>
          <p className="text-muted-foreground text-xs">{data.descripcion}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <p className={`text-lg font-bold tabular-nums ${data.color}`}>{fmt(data.comisionesMes)}</p>
        <p className="text-muted-foreground text-[10px]">comisión OP — {data.periodoLabel}</p>
        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> &gt;$500K
          <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-400" /> $300K–$500K
          <span className="ml-1.5 h-2 w-2 rounded-full bg-red-500" /> &lt;$300K
        </div>
      </div>
    </div>
  )
}
