import Link from 'next/link'
import { cn, formatMXN } from '@/lib/utils'
import { Trophy, Medal, ChevronRight } from 'lucide-react'

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
  /** Base para drill-down. Cuando se da, cada fila linkea a `${href}/${row.id}`. */
  drillDownHref?: string
  /** Cuando se da, prefija la primera letra del nombre como avatar. */
  showAvatar?: boolean
}

function avatarColor(name: string): string {
  // Color determinístico por hash simple del nombre
  const colors = [
    'bg-jade-100 text-jade-700 dark:bg-jade-900/40 dark:text-jade-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return colors[hash % colors.length]!
}

export function BmcorpRanking({
  title,
  rows,
  emptyLabel,
  drillDownHref,
  showAvatar = true,
}: Props) {
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
            const inicial = r.nombre.charAt(0).toUpperCase()
            const isLink = Boolean(drillDownHref)

            const inner = (
              <>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* Posición */}
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
                      {idx <= 2 ? <Medal className="h-3.5 w-3.5" /> : `#${idx + 1}`}
                    </span>
                    {/* Avatar */}
                    {showAvatar && (
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          avatarColor(r.nombre),
                        )}
                      >
                        {inicial}
                      </span>
                    )}
                    <span className="text-foreground truncate font-medium">{r.nombre}</span>
                    {r.desarrolladora && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · {r.desarrolladora}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground shrink-0 font-semibold tabular-nums">
                      {formatMXN(r.monto)}
                    </span>
                    {isLink && (
                      <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    )}
                  </div>
                </div>
                <div className="ml-9 flex items-center gap-2">
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
              </>
            )

            return (
              <li key={r.id} className="space-y-1">
                {isLink ? (
                  <Link
                    href={`${drillDownHref}/${r.id}`}
                    className="hover:bg-muted/40 -mx-2 block rounded-lg px-2 py-1 transition-colors"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
