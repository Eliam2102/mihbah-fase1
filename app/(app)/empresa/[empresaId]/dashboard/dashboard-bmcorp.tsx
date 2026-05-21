// Server Component — BM CORP Dashboard
// Layout per CLAUDE.md sección 7 / Indicadores BM CORP:
//   - Semáforo arriba
//   - 50/50 — Izquierda: KPI vendido + Ranking afiliados + Ranking proyectos
//   - 50/50 — Derecha: Repartos + Flujo semanal + Comisionamiento conciliado

import {
  getKpisBmcorp,
  getRankingAfiliados,
  getRankingDesarrollos,
  getFlujoSemanal,
  getRepartosSplit,
  getRemanentesPorAfiliado,
  getComisionamientoConciliado,
  getUltimaSync,
  countVentasTotal,
  getSemaforoBmcorp,
} from '@/lib/services/dashboard-bmcorp.service'
import { BmcorpRanking } from '@/components/dashboard/bmcorp-ranking'
import { BmcorpFlujoSemanal } from '@/components/dashboard/bmcorp-flujo-semanal'
import { BmcorpEmptyState } from '@/components/dashboard/bmcorp-empty-state'
import { BmcorpSemaforo } from '@/components/dashboard/bmcorp-semaforo'
import { BmcorpComisionamiento } from '@/components/dashboard/bmcorp-comisionamiento'
import { BmcorpRepartosCard } from '@/components/dashboard/bmcorp-repartos-card'
import { BmcorpSyncProvider } from '@/components/dashboard/bmcorp-sync-provider'
import { Cloud, TrendingUp } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mes?: number
}

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export async function DashboardBmcorp({ empresaId, tenantId, anio, mes }: Props) {
  const period = mes ? { anio, mes } : { anio }
  const periodLabel = mes ? `${MESES_ES[mes - 1]} ${anio}` : `${anio}`

  const [
    kpis,
    afiliados,
    desarrollos,
    flujo,
    repartosSplit,
    remanentes,
    comisionamiento,
    ultimaSync,
    totalSinFiltro,
    semaforo,
  ] = await Promise.all([
    getKpisBmcorp(empresaId, tenantId, period),
    getRankingAfiliados(empresaId, tenantId, period, 10),
    getRankingDesarrollos(empresaId, tenantId, period, 10),
    getFlujoSemanal(empresaId, tenantId, 12),
    getRepartosSplit(empresaId, tenantId, period),
    getRemanentesPorAfiliado(empresaId, tenantId, 50, period),
    getComisionamientoConciliado(empresaId, tenantId, period),
    getUltimaSync(empresaId, tenantId),
    countVentasTotal(empresaId, tenantId),
    getSemaforoBmcorp(empresaId, tenantId),
  ])

  // Sin datos en DB → pedir sincronización
  if (totalSinFiltro === 0) {
    return <BmcorpEmptyState empresaId={empresaId} />
  }

  return (
    <div className="space-y-6">
      {/* Inyecta sync status al topbar via store */}
      <BmcorpSyncProvider fecha={ultimaSync.fecha} stale={ultimaSync.stale} empresaId={empresaId} />

      {/* Banner cuando hay datos pero el período no tiene ventas */}
      {kpis.totalVentas === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Sin ventas en el período seleccionado. Hay {totalSinFiltro} registros sincronizados en
          otros períodos — cambia el filtro de año.
        </div>
      )}

      {/* Semáforo — comisión generada mes actual vs umbrales PDF V1 */}
      <BmcorpSemaforo data={semaforo} />

      {/* 50 / 50 layout — items-start asegura top alineado entre columnas */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* IZQUIERDA — Ventas */}
        <div className="space-y-6">
          {/* KPI total vendido */}
          <div className="border-border bg-card rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-jade-600 h-4 w-4" />
              <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Total vendido — periodo
              </span>
            </div>
            <p className="text-foreground mt-3 text-3xl font-bold tabular-nums">
              {formatMXN(kpis.totalVendido)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {kpis.totalVentas} {kpis.totalVentas === 1 ? 'venta' : 'ventas'}
            </p>
            <div className="border-border mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  En proceso
                </p>
                <p className="mt-0.5 text-sm font-bold text-amber-600 tabular-nums dark:text-amber-400">
                  {kpis.enProceso.count}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Aprobado jurídico
                </p>
                <p className="mt-0.5 text-sm font-bold text-blue-600 tabular-nums dark:text-blue-400">
                  {kpis.aprobadoJuridico.count}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Finalizadas
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {kpis.finalizada.count}
                </p>
              </div>
            </div>
          </div>

          {/* Ranking afiliados con drill-down */}
          <BmcorpRanking
            title="Top alianzas (afiliados)"
            rows={afiliados}
            emptyLabel="Sin ventas asignadas a afiliados aún."
            drillDownHref={`/empresa/${empresaId}/cuentas?afiliado`}
          />

          {/* Ranking desarrollos con drill-down */}
          <BmcorpRanking
            title="Top desarrollos"
            rows={desarrollos}
            emptyLabel="Sin ventas asignadas a desarrollos aún."
            drillDownHref={`/empresa/${empresaId}/proyectos`}
          />
        </div>

        {/* DERECHA — Pagos y flujo */}
        <div className="space-y-6">
          {/* Repartos card con split */}
          <BmcorpRepartosCard data={repartosSplit} periodLabel={periodLabel} />

          {/* Flujo semanal */}
          <BmcorpFlujoSemanal data={flujo} />

          {/* Comisionamiento conciliado */}
          <BmcorpComisionamiento data={comisionamiento} periodLabel={periodLabel} />

          {/* Remanentes por afiliado — debajo de Comisionamiento */}
          <div className="border-border bg-card rounded-xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <Cloud className="text-jade-600 h-4 w-4" />
              <h3 className="text-foreground text-sm font-semibold">Remanentes por afiliado</h3>
              <span className="text-muted-foreground text-xs">
                (saldo vivo — histórico, todos los años)
              </span>
            </div>

            {remanentes.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                Sin afiliados registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                        Afiliado
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                        Generado · {periodLabel}
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                        Vendido histórico
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                        Repartos
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
                        Remanente
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {remanentes.map((r) => (
                      <tr key={r.afiliadoId} className="border-border border-b last:border-0">
                        <td className="text-foreground px-3 py-2.5 font-medium">{r.nombre}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                          {formatMXN(r.vendidoPeriodo)}
                        </td>
                        <td className="text-foreground px-3 py-2.5 text-right tabular-nums">
                          {formatMXN(r.vendido)}
                        </td>
                        <td className="text-muted-foreground px-3 py-2.5 text-right tabular-nums">
                          {formatMXN(r.repartos)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                            r.remanente >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatMXN(r.remanente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
