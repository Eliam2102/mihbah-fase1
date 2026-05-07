// Server Component — Vista semanal BM CORP
// Extraído de app/(app)/empresa/[empresaId]/flujo-caja/page.tsx para reutilizar
// desde el router transversal por tipo de empresa.

import { getFlujoBmcorp } from '@/lib/services/flujo-bmcorp.service'
import { LineChart, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

export async function FlujoBmcorpView({ empresaId, tenantId }: Props) {
  const flujo = await getFlujoBmcorp(empresaId, tenantId)
  const totalIngresos = flujo.reduce((acc, f) => acc + f.ingresos, 0)
  const totalEgresos = flujo.reduce((acc, f) => acc + f.egresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <section className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            BM CORP · Histórico semanal de ingresos y egresos (comisiones/repartos).
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Ingresos Totales
            </h3>
          </div>
          <p className="text-foreground text-3xl font-bold tabular-nums">
            {formatMXN(totalIngresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Volumen de ventas cerrado</p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Egresos Totales
            </h3>
          </div>
          <p className="text-foreground text-3xl font-bold tabular-nums">
            {formatMXN(totalEgresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Comisiones y repartos</p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Neto Acumulado
            </h3>
          </div>
          <p
            className={`text-3xl font-bold tabular-nums ${totalNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(totalNeto)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Ingresos menos egresos</p>
        </div>
      </div>

      <div className="border-border bg-card rounded-xl border shadow-sm">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <LineChart className="text-muted-foreground h-5 w-5" />
            <h3 className="text-foreground font-semibold">Detalle Semanal</h3>
          </div>
        </div>

        {flujo.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <LineChart className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="text-foreground text-lg font-medium">Sin datos de flujo</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              No hay ventas registradas con fecha para generar el flujo de caja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {['Semana', 'Ingresos', 'Egresos', 'Neto', 'Acumulado'].map((h) => (
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
                {flujo.map((f) => (
                  <tr
                    key={f.semana}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="text-foreground px-6 py-4 font-medium">{f.semana}</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      {formatMXN(f.ingresos)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600 tabular-nums dark:text-red-400">
                      {formatMXN(f.egresos)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold tabular-nums ${f.neto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {formatMXN(f.neto)}
                    </td>
                    <td className="text-foreground px-6 py-4 text-right font-semibold tabular-nums">
                      {formatMXN(f.acumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
