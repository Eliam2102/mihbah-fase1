// Server Component — Vista anual (year-over-year) de flujo de caja
import { getFlujoAnual } from '@/lib/services/flujo.service'
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export async function FlujoAnualView({ empresaId, tenantId }: Props) {
  const anios = await getFlujoAnual(empresaId, tenantId)

  if (anios.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border p-12 text-center">
        <Wallet className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="text-foreground text-lg font-medium">Sin datos históricos</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Carga movimientos con fechas para ver comparativa anual.
        </p>
      </div>
    )
  }

  const maxIngresos = Math.max(...anios.map((a) => a.ingresos), 1)

  return (
    <div className="space-y-6">
      {/* Cards por año */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {anios.map((a) => (
          <div key={a.anio} className="border-border bg-card rounded-xl border p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground text-lg font-bold">{a.anio}</h3>
              <span
                className={`text-xs font-bold ${a.neto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {a.neto >= 0 ? '▲' : '▼'} {formatMXN(Math.abs(a.neto))}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  Ingresos
                </span>
                <span className="text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatMXN(a.ingresos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  Egresos
                </span>
                <span className="text-red-600 tabular-nums dark:text-red-400">
                  {formatMXN(a.egresos)}
                </span>
              </div>
            </div>
            {/* Bar comparativa */}
            <div className="mt-3 space-y-1">
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.round((a.ingresos / maxIngresos) * 100)}%` }}
                />
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{ width: `${Math.round((a.egresos / maxIngresos) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Comparativa year-over-year</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Año', 'Ingresos', 'Egresos', 'Neto', 'Acumulado'].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anios.map((a) => (
                <tr key={a.anio} className="border-border hover:bg-muted/30 border-b last:border-0">
                  <td className="text-foreground px-6 py-4 font-bold">{a.anio}</td>
                  <td className="px-6 py-4 text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMXN(a.ingresos)}
                  </td>
                  <td className="px-6 py-4 text-red-600 tabular-nums dark:text-red-400">
                    {formatMXN(a.egresos)}
                  </td>
                  <td
                    className={`px-6 py-4 font-bold tabular-nums ${a.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatMXN(a.neto)}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 tabular-nums">
                    {formatMXN(a.acumulado)}
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
