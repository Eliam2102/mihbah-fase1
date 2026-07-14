'use server'

/**
 * DashboardYcdi — Fase 1
 *
 * KPIs desde movimientos del Excel MK1:
 * - Total ingresos / egresos / saldo
 * - Capital levantado (concepto "Aportación a Capital")
 * - Accionistas únicos
 * - Flujo mensual
 * - Tabla pivot: accionista × concepto
 */

import {
  getKpisYcdi,
  getFlujomensualYcdi,
  getTopAccionistas,
  getTablaConceptosProyectos,
} from '@/lib/services/aportaciones.service'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { TablaConceptosProyectos } from '@/components/dashboard/tabla-conceptos-proyectos'
import { Users } from 'lucide-react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmt(n: number) {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mes?: number
}

export async function DashboardYcdi({ empresaId, tenantId, anio, mes }: Props) {
  const [kpis, flujoMensual, accionistas, tabla] = await Promise.all([
    getKpisYcdi(empresaId, tenantId, anio, mes),
    getFlujomensualYcdi(empresaId, tenantId, anio),
    getTopAccionistas(empresaId, tenantId, 10, anio, mes),
    getTablaConceptosProyectos(empresaId, tenantId, anio, mes),
  ])

  const saldoPositivo = kpis.saldo >= 0

  return (
    <div className="space-y-6">
      {/* ── Row 1: KPIs principales ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total ingresos" value={kpis.totalIngresos} variant="success" />
        <KpiCard label="Total egresos" value={kpis.totalEgresos} variant="critical" />
        <KpiCard
          label="Saldo neto"
          value={Math.abs(kpis.saldo)}
          variant={saldoPositivo ? 'success' : 'critical'}
        />
        <KpiCard label="Préstamos" value={kpis.prestamos} variant="warning" />
      </div>

      {/* ── Row 2: Capital / Acciones ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Levantamiento de capital */}
        <div className="border-border bg-card space-y-3 rounded-xl border p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-foreground text-sm font-semibold">Capital levantado</p>
            <span className="text-muted-foreground text-xs">
              {kpis.porcentajeLevantamiento.toFixed(1)}%
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${Math.min(kpis.porcentajeLevantamiento, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Aportado</p>
              <p className="text-sm font-bold whitespace-nowrap text-green-600">
                {fmt(kpis.totalCapitalAportado)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Gastado</p>
              <p className="text-destructive text-sm font-bold whitespace-nowrap">
                {fmt(kpis.totalAcabadoGastar)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Diferencia</p>
              <p
                className={`text-sm font-bold whitespace-nowrap ${saldoPositivo ? 'text-green-600' : 'text-destructive'}`}
              >
                {saldoPositivo ? '+' : ''}
                {fmt(kpis.saldo)}
              </p>
            </div>
          </div>
        </div>

        {/* Accionistas activos */}
        <div className="border-border bg-card flex flex-col justify-between rounded-xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Users className="text-primary h-4 w-4" />
            </div>
            <p className="text-foreground text-sm font-semibold">Accionistas</p>
          </div>
          <p className="text-foreground text-4xl font-bold tabular-nums">{kpis.acuerdosActivos}</p>
          <p className="text-muted-foreground mt-1 text-xs">aportadores únicos</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Precio prom. por accionista:{' '}
            <span className="text-foreground font-semibold">{fmt(kpis.precioPromedioAccion)}</span>
          </p>
        </div>
      </div>

      {/* ── Row 3: Flujo mensual ──────────────────────────────────────────────── */}
      <div className="border-border bg-card rounded-xl border p-5">
        <p className="text-foreground mb-4 text-sm font-semibold">Flujo mensual</p>
        {flujoMensual.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Sin datos de flujo mensual
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground pb-2 text-left text-xs font-semibold">
                    Período
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold text-green-600">Ingresos</th>
                  <th className="text-destructive pb-2 text-right text-xs font-semibold">
                    Egresos
                  </th>
                  <th className="text-muted-foreground pb-2 text-right text-xs font-semibold">
                    Saldo
                  </th>
                  <th className="text-muted-foreground w-32 pb-2 text-right text-xs font-semibold">
                    Barra
                  </th>
                </tr>
              </thead>
              <tbody>
                {flujoMensual.slice(-12).map((f) => {
                  const maxVal = Math.max(
                    ...flujoMensual.map((x) => Math.max(x.ingresos, x.egresos)),
                  )
                  const pctI = maxVal > 0 ? (f.ingresos / maxVal) * 100 : 0
                  const pctE = maxVal > 0 ? (f.egresos / maxVal) * 100 : 0
                  return (
                    <tr key={`${f.anio}-${f.mes}`} className="border-border border-b last:border-0">
                      <td className="text-muted-foreground py-2.5">
                        {MESES[(f.mes - 1) % 12]} {f.anio}
                      </td>
                      <td className="py-2.5 text-right text-green-600 tabular-nums">
                        {fmt(f.ingresos)}
                      </td>
                      <td className="text-destructive py-2.5 text-right tabular-nums">
                        {fmt(f.egresos)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-medium tabular-nums ${f.saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}
                      >
                        {f.saldo >= 0 ? '+' : ''}
                        {fmt(f.saldo)}
                      </td>
                      <td className="py-2.5 pl-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all"
                              style={{ width: `${pctI}%` }}
                            />
                          </div>
                          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                            <div
                              className="bg-destructive/70 h-full rounded-full transition-all"
                              style={{ width: `${pctE}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row 4: Top accionistas ────────────────────────────────────────────── */}
      {accionistas.length > 0 && (
        <div className="border-border bg-card rounded-xl border p-5">
          <p className="text-foreground mb-4 text-sm font-semibold">
            Top accionistas — Capital aportado
          </p>
          <div className="space-y-2">
            {accionistas.map((a, i) => {
              const maxAportado = accionistas[0]?.aportado ?? 1
              const pct = (a.aportado / maxAportado) * 100
              return (
                <div key={a.nombre} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-foreground truncate text-xs font-medium">
                        {a.nombre}
                      </span>
                      <span className="text-muted-foreground ml-2 shrink-0 text-xs tabular-nums">
                        {fmt(a.aportado)}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary/70 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Row 5: Tabla pivot accionista × concepto ─────────────────────────── */}
      <TablaConceptosProyectos
        filas={tabla.filas}
        proyectosNames={tabla.proyectosNames}
        grandTotal={tabla.grandTotal}
      />
    </div>
  )
}
