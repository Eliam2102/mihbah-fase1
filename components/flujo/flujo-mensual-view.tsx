// Server Component — Vista mensual de flujo de caja para MIHBAH/YCDI
import { getFlujoMensual } from '@/lib/services/flujo.service'
import { FlowChart } from '@/components/dashboard/flow-chart'
import { ArrowUpRight, ArrowDownRight, Wallet, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mesSel?: number | null
}

export async function FlujoMensualView({ empresaId, tenantId, anio, mesSel }: Props) {
  const flujo = await getFlujoMensual(empresaId, tenantId, anio)
  const totalIngresos = flujo.reduce((s, m) => s + m.ingresos, 0)
  const totalEgresos = flujo.reduce((s, m) => s + m.egresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Ingresos {anio}
            </h3>
          </div>
          <p className="text-foreground text-3xl font-bold tabular-nums">
            {formatMXN(totalIngresos)}
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Egresos {anio}
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
              Neto {anio}
            </h3>
          </div>
          <p
            className={`text-3xl font-bold tabular-nums ${totalNeto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(totalNeto)}
          </p>
        </div>
      </div>

      {/* Gráfica */}
      <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
        <h2 className="text-foreground mb-4 text-sm font-semibold">
          Comportamiento mensual {anio}
        </h2>
        <FlowChart data={flujo} />
      </div>

      {/* Tabla detallada */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">
            Detalle por mes — click en fila para ver movimientos
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Mes', 'Ingresos', 'Egresos', 'Neto', 'Acumulado', ''].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flujo.map((m) => {
                const isActive = mesSel === m.mes
                return (
                  <tr
                    key={m.mes}
                    className={`border-border border-b transition-colors last:border-0 ${isActive ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                  >
                    <td className="text-foreground px-4 py-3 font-medium">{m.mesLabel}</td>
                    <td className="px-4 py-3 text-emerald-600 tabular-nums dark:text-emerald-400">
                      {formatMXN(m.ingresos)}
                    </td>
                    <td className="px-4 py-3 text-red-600 tabular-nums dark:text-red-400">
                      {formatMXN(m.egresos)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${m.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {formatMXN(m.neto)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 tabular-nums">
                      {formatMXN(m.acumulado)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`?anio=${anio}&vista=mensual${isActive ? '' : `&mes=${m.mes}`}`}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {isActive ? 'Cerrar' : 'Ver'}
                        {!isActive && <ChevronRight className="h-3 w-3" />}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
