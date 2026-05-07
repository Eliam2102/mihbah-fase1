// Server Component — Vista trimestral de flujo de caja
import { getFlujoTrimestral } from '@/lib/services/flujo.service'
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export async function FlujoTrimestralView({ empresaId, tenantId, anio }: Props) {
  const trimestres = await getFlujoTrimestral(empresaId, tenantId, anio)
  const totalIngresos = trimestres.reduce((s, t) => s + t.ingresos, 0)
  const totalEgresos = trimestres.reduce((s, t) => s + t.egresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <div className="space-y-6">
      {/* KPIs globales */}
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

      {/* Cards por trimestre */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {trimestres.map((t) => {
          const pct = t.ingresos > 0 ? Math.round((t.egresos / t.ingresos) * 100) : 0
          return (
            <div
              key={t.trimestre}
              className="border-border bg-card rounded-xl border p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground font-semibold">{t.label}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.neto >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                >
                  {t.neto >= 0 ? '+' : ''}
                  {formatMXN(t.neto)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ingresos</span>
                  <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMXN(t.ingresos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Egresos</span>
                  <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
                    {formatMXN(t.egresos)}
                  </span>
                </div>
                {/* Progress bar egresos/ingresos */}
                <div className="mt-3">
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100 - pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{pct}% gastado de ingresos</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla comparativa */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Comparativa trimestral</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Trimestre', 'Ingresos', 'Egresos', 'Neto'].map((h) => (
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
              {trimestres.map((t) => (
                <tr
                  key={t.trimestre}
                  className="border-border hover:bg-muted/30 border-b last:border-0"
                >
                  <td className="text-foreground px-6 py-4 font-medium">{t.label}</td>
                  <td className="px-6 py-4 text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMXN(t.ingresos)}
                  </td>
                  <td className="px-6 py-4 text-red-600 tabular-nums dark:text-red-400">
                    {formatMXN(t.egresos)}
                  </td>
                  <td
                    className={`px-6 py-4 font-bold tabular-nums ${t.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatMXN(t.neto)}
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
