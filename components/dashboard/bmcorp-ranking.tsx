'use client'

import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

export interface RankingRow {
  id: string
  nombre: string
  monto: number
  ventas: number
  desarrolladora?: string | null
}

interface Props {
  title: string
  rows: RankingRow[]
  emptyLabel: string
  /** Optional href base — appends `/${row.id}` */
  hrefBase?: string
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

export function BmcorpRanking({ title, rows, emptyLabel }: Props) {
  const max = rows.reduce((acc, r) => Math.max(acc, r.monto), 0)

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="text-jade-600 h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</div>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, idx) => {
            const pct = max > 0 ? (r.monto / max) * 100 : 0
            return (
              <li key={r.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span
                      className={cn(
                        'shrink-0 text-xs font-bold tabular-nums',
                        idx === 0
                          ? 'text-amber-500'
                          : idx === 1
                            ? 'text-slate-400'
                            : idx === 2
                              ? 'text-amber-700'
                              : 'text-muted-foreground',
                      )}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-foreground truncate font-medium">{r.nombre}</span>
                    {r.desarrolladora && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · {r.desarrolladora}
                      </span>
                    )}
                  </div>
                  <div className="text-foreground shrink-0 font-semibold tabular-nums">
                    {formatMXN(r.monto)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-jade-600 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {r.ventas} {r.ventas === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
