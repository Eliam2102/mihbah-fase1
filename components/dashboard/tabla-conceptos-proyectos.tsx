'use client'

import { cn, formatMXN } from '@/lib/utils'
import type { TablaConceptoProyecto } from '@/lib/services/aportaciones.service'

interface TablaConceptosProyectosProps {
  filas: TablaConceptoProyecto[]
  proyectosNames: string[]
  grandTotal: number
  loading?: boolean
}

function cellColor(n: number, max: number) {
  if (n === 0 || max === 0) return ''
  const ratio = n / max
  if (ratio >= 0.7)
    return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (ratio >= 0.3) return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
}

export function TablaConceptosProyectos({
  filas,
  proyectosNames,
  grandTotal,
  loading = false,
}: TablaConceptosProyectosProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse rounded-xl border p-5">
        <div className="bg-muted mb-4 h-4 w-48 rounded" />
        <div className="bg-muted h-40 rounded" />
      </div>
    )
  }

  const maxCell = Math.max(...filas.flatMap((f) => proyectosNames.map((p) => f.proyectos[p] ?? 0)))

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="px-5 pt-4 pb-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Aportaciones por accionista y proyecto
        </p>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-border border-b">
              {/* Sticky first column header */}
              <th className="bg-card text-muted-foreground sticky left-0 z-10 px-5 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                Accionista / Paquete
              </th>
              {proyectosNames.map((p) => (
                <th
                  key={p}
                  className="text-muted-foreground px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap"
                >
                  {p}
                </th>
              ))}
              <th className="text-foreground px-5 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i} className="border-border/50 hover:bg-muted/30 border-b transition-colors">
                <td className="bg-card text-foreground sticky left-0 z-10 max-w-[200px] truncate px-5 py-2.5 font-medium whitespace-nowrap">
                  {fila.concepto}
                </td>
                {proyectosNames.map((p) => {
                  const v = fila.proyectos[p] ?? 0
                  return (
                    <td
                      key={p}
                      className={cn(
                        'rounded px-4 py-2.5 text-right whitespace-nowrap tabular-nums',
                        cellColor(v, maxCell),
                      )}
                    >
                      {formatMXN(v)}
                    </td>
                  )
                })}
                <td className="text-foreground px-5 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatMXN(fila.total)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-border bg-muted/30 border-t-2">
              <td className="bg-muted/30 text-foreground sticky left-0 z-10 px-5 py-3 text-xs font-bold tracking-wide uppercase">
                TOTAL
              </td>
              {proyectosNames.map((p) => {
                const colTotal = filas.reduce((s, f) => s + (f.proyectos[p] ?? 0), 0)
                return (
                  <td
                    key={p}
                    className="text-foreground px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums"
                  >
                    {formatMXN(colTotal)}
                  </td>
                )
              })}
              <td className="text-foreground px-5 py-3 text-right font-bold whitespace-nowrap tabular-nums">
                {formatMXN(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
