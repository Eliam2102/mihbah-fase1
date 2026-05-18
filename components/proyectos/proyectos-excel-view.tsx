import { getProyectosExcel } from '@/lib/services/proyectos-excel.service'
import { FolderOpen, ArrowUpRight, ArrowDownRight, Wallet, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
  empresaNombre: string
}

export async function ProyectosExcelView({ empresaId, tenantId, empresaNombre }: Props) {
  const proyectos = await getProyectosExcel(empresaId, tenantId)

  if (proyectos.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border p-12 text-center">
        <FolderOpen className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-foreground text-lg font-medium">Sin proyectos registrados</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Carga un Excel con movimientos asignados a proyectos para verlos aquí.
        </p>
      </div>
    )
  }

  const totalIngresos = proyectos.reduce((s, p) => s + p.totalIngresos, 0)
  const totalEgresos = proyectos.reduce((s, p) => s + p.totalEgresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Ingresos Totales
            </h3>
          </div>
          <p className="text-foreground text-3xl font-bold tabular-nums">
            {formatMXN(totalIngresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {empresaNombre} · todos los proyectos
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Egresos Totales
            </h3>
          </div>
          <p className="text-foreground text-3xl font-bold tabular-nums">
            {formatMXN(totalEgresos)}
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Neto Acumulado
            </h3>
          </div>
          <p
            className={`text-3xl font-bold tabular-nums ${totalNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(totalNeto)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-muted-foreground h-5 w-5" />
            <h3 className="text-foreground font-semibold">Proyectos ({proyectos.length})</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {(
                  [
                    { label: 'Proyecto', align: 'text-left' },
                    { label: 'Ingresos', align: 'text-right' },
                    { label: 'Egresos', align: 'text-right' },
                    { label: 'Neto', align: 'text-right' },
                    { label: 'Movimientos', align: 'text-right' },
                    { label: '', align: 'text-right' },
                  ] as const
                ).map((col) => (
                  <th
                    key={col.label}
                    className={`text-muted-foreground px-6 py-3 text-xs font-semibold tracking-wider whitespace-nowrap uppercase ${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr
                  key={p.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-6 py-4">
                    <p className="text-foreground font-medium">{p.name}</p>
                    {p.descripcion && (
                      <p className="text-muted-foreground mt-0.5 text-xs">{p.descripcion}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMXN(p.totalIngresos)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-red-600 tabular-nums dark:text-red-400">
                    {formatMXN(p.totalEgresos)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-bold tabular-nums ${p.neto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatMXN(p.neto)}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-right tabular-nums">
                    {p.totalMovimientos}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/empresa/${empresaId}/proyectos/${p.id}`}
                      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                      Ver <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
