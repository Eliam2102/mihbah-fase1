// Server Component — BM CORP Dashboard
// Layout per CLAUDE.md sección 7 / Indicadores BM CORP:
//   - Semáforo arriba
//   - 50/50 — Izquierda: KPI vendido + Ranking afiliados + Ranking proyectos
//   - 50/50 — Derecha: Repartos + Flujo semanal + Comisionamiento conciliado

import Link from 'next/link'
import {
  getKpisBmcorp,
  getRankingAfiliados,
  getRankingDesarrollos,
  getFlujoSemanal,
  getRepartosSplit,
  getRemanentesPorAfiliado,
  getComisionamientoConciliado,
  getUltimaSync,
} from '@/lib/services/dashboard-bmcorp.service'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { BmcorpRanking } from '@/components/dashboard/bmcorp-ranking'
import { BmcorpFlujoSemanal } from '@/components/dashboard/bmcorp-flujo-semanal'
import { BmcorpEmptyState } from '@/components/dashboard/bmcorp-empty-state'
import { BmcorpSemaforo } from '@/components/dashboard/bmcorp-semaforo'
import { BmcorpComisionamiento } from '@/components/dashboard/bmcorp-comisionamiento'
import { BmcorpRepartosCard } from '@/components/dashboard/bmcorp-repartos-card'
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

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

  const [
    kpis,
    afiliados,
    desarrollos,
    flujo,
    repartosSplit,
    remanentes,
    comisionamiento,
    ultimaSync,
  ] = await Promise.all([
    getKpisBmcorp(empresaId, tenantId, period),
    getRankingAfiliados(empresaId, tenantId, period, 10),
    getRankingDesarrollos(empresaId, tenantId, period, 10),
    getFlujoSemanal(empresaId, tenantId, 12),
    getRepartosSplit(empresaId, tenantId),
    getRemanentesPorAfiliado(empresaId, tenantId, 5),
    getComisionamientoConciliado(empresaId, tenantId),
    getUltimaSync(empresaId, tenantId),
  ])

  if (kpis.totalVentas === 0) {
    return <BmcorpEmptyState empresaId={empresaId} />
  }

  return (
    <div className="space-y-6">
      {/* Semáforo arriba — placeholder hasta criterios cliente */}
      <BmcorpSemaforo />

      {/* Sync banner */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          ultimaSync.stale
            ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3 text-sm">
          {ultimaSync.stale ? (
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

      {/* 50 / 50 layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <BmcorpRepartosCard data={repartosSplit} />

          {/* Flujo semanal */}
          <BmcorpFlujoSemanal data={flujo} />

          {/* Comisionamiento conciliado */}
          <BmcorpComisionamiento data={comisionamiento} />
        </div>
      </div>

      {/* Remanentes — full width abajo */}
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
