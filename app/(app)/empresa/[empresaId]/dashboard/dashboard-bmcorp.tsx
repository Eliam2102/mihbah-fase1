// Server Component — BM CORP Dashboard

import Link from 'next/link'
import {
  getKpisBmcorp,
  getRankingAfiliados,
  getRankingDesarrollos,
  getFlujoSemanal,
  getRepartosKpi,
  getRemanentesPorAfiliado,
  getUltimaSync,
} from '@/lib/services/dashboard-bmcorp.service'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { BmcorpRanking } from '@/components/dashboard/bmcorp-ranking'
import { BmcorpFlujoSemanal } from '@/components/dashboard/bmcorp-flujo-semanal'
import { BmcorpEmptyState } from '@/components/dashboard/bmcorp-empty-state'
import { Cloud, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mes?: number
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

function formatAbsoluteDate(iso: string | null): string {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function DashboardBmcorp({ empresaId, tenantId, anio, mes }: Props) {
  const period = mes ? { anio, mes } : { anio }

  const [kpis, afiliados, desarrollos, flujo, repartos, remanentes, ultimaSync] = await Promise.all(
    [
      getKpisBmcorp(empresaId, tenantId, period),
      getRankingAfiliados(empresaId, tenantId, period, 5),
      getRankingDesarrollos(empresaId, tenantId, period, 5),
      getFlujoSemanal(empresaId, tenantId, 12),
      getRepartosKpi(empresaId, tenantId),
      getRemanentesPorAfiliado(empresaId, tenantId, 5),
      getUltimaSync(empresaId, tenantId),
    ],
  )

  // Empty state — no ventas yet
  if (kpis.totalVentas === 0) {
    return <BmcorpEmptyState empresaId={empresaId} />
  }

  const stale = ultimaSync.stale

  return (
    <div className="space-y-6">
      {/* Sync banner */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          stale
            ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3 text-sm">
          {stale ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div>
            <p className="text-foreground font-medium">
              Última sincronización Monday: {formatAbsoluteDate(ultimaSync.fecha)}
            </p>
            <p className="text-muted-foreground text-xs">
              {ultimaSync.creados} creados · {ultimaSync.actualizados} actualizados ·{' '}
              {ultimaSync.errores} errores
            </p>
          </div>
        </div>
        <Link
          href={`/empresa/${empresaId}/monday`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sincronizar
        </Link>
      </div>

      {/* Row 1 — KPIs principales (4 cards) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total vendido"
          value={kpis.totalVendido}
          variant="success"
          comparison={`${kpis.totalVentas} ventas`}
        />
        <KpiCard
          label="En proceso"
          value={kpis.enProceso.monto}
          variant="warning"
          comparison={`${kpis.enProceso.count} ventas`}
        />
        <KpiCard
          label="Aprobado jurídico"
          value={kpis.aprobadoJuridico.monto}
          variant="default"
          comparison={`${kpis.aprobadoJuridico.count} ventas`}
        />
        <KpiCard
          label="Finalizadas"
          value={kpis.finalizada.monto}
          variant="success"
          comparison={`${kpis.finalizada.count} ventas`}
        />
      </div>

      {/* Row 2 — Lado izquierdo: rankings | Lado derecho: repartos + flujo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Izquierda: rankings ventas */}
        <div className="space-y-6">
          <BmcorpRanking
            title="Top alianzas (afiliados)"
            rows={afiliados}
            emptyLabel="Sin ventas asignadas a afiliados aún."
          />
          <BmcorpRanking
            title="Top desarrollos"
            rows={desarrollos}
            emptyLabel="Sin ventas asignadas a desarrollos aún."
          />
        </div>

        {/* Derecha: repartos + flujo */}
        <div className="space-y-6">
          <div className="border-border bg-card grid grid-cols-2 gap-4 rounded-xl border p-5">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Repartos realizados
              </p>
              <p className="text-foreground mt-2 text-2xl font-bold tabular-nums">
                {formatMXN(repartos.totalRealizado)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {repartos.cantidadRealizados} {repartos.cantidadRealizados === 1 ? 'pago' : 'pagos'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Último reparto
              </p>
              <p className="text-foreground mt-2 text-2xl font-bold tabular-nums">
                {repartos.ultimoReparto
                  ? new Date(repartos.ultimoReparto).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {repartos.ultimoReparto
                  ? new Date(repartos.ultimoReparto).getFullYear()
                  : 'sin registros'}
              </p>
            </div>
          </div>

          <BmcorpFlujoSemanal data={flujo} />
        </div>
      </div>

      {/* Row 3 — Remanentes por afiliado */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Cloud className="text-jade-600 h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">
            Remanentes por afiliado (vendido − repartos)
          </h3>
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
                  {['Afiliado', 'Vendido', 'Repartos', 'Remanente'].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {remanentes.map((r) => (
                  <tr key={r.afiliadoId} className="border-border border-b last:border-0">
                    <td className="text-foreground px-3 py-2.5 font-medium">{r.nombre}</td>
                    <td className="text-foreground px-3 py-2.5 tabular-nums">
                      {formatMXN(r.vendido)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 tabular-nums">
                      {formatMXN(r.repartos)}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-semibold tabular-nums ${
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
  )
}
