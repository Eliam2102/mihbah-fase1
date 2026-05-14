// Server Component — Dashboard General (vista TODAS, consolidada del tenant)
//
// Layout per CLAUDE.md sección 7:
//   - Resumen general (sin "Margen")
//   - Correlación entre las 3 empresas
//   - Cuentas cobradas vs pendientes (consolidado)
//   - MIHBAH: estimado vs avance del mes
//   - Resumen del resumen — BM correlacionado con YCDI

import { requireUser } from '@/lib/auth/helpers'
import {
  getResumenGeneral,
  getCorrelacionEmpresas,
  getCuentasConsolidado,
  getMihbahEstimadoVsAvance,
  getResumenDelResumen,
} from '@/lib/services/dashboard-general.service'
import { EmpresaResumenCard } from '@/components/dashboard/empresa-resumen-card'
import { CorrelacionEmpresas } from '@/components/dashboard/correlacion-empresas'
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Target, Sparkles } from 'lucide-react'
import { formatMXN, formatMXNCompact } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ anio?: string; mes?: string }>
}

const MESES = [
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

export default async function DashboardGeneralPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const user = await requireUser()
  const tenantId = user.tenantId!

  const anio = Number(sp.anio ?? new Date().getFullYear())
  const mesActual = sp.mes ? Number(sp.mes) : new Date().getMonth() + 1
  const period = sp.mes ? { anio, mes: Number(sp.mes) } : { anio }

  const [resumen, correlacion, cuentas, mihbahAvance, resumenDelResumen] = await Promise.all([
    getResumenGeneral(tenantId, period),
    getCorrelacionEmpresas(tenantId, period),
    getCuentasConsolidado(tenantId),
    getMihbahEstimadoVsAvance(tenantId, anio, mesActual),
    getResumenDelResumen(tenantId),
  ])

  const periodoLabel = sp.mes ? `${MESES[mesActual - 1]} ${anio}` : `Año ${anio} — Acumulado`

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Dashboard General — Universo Jade</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {periodoLabel} · Vista consolidada de las {resumen.empresas.length} empresas
        </p>
      </div>

      {/* KPIs consolidados — sin Margen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Total ingresos
            </span>
          </div>
          <p className="text-foreground mt-2 text-sm font-bold tabular-nums sm:text-base lg:text-lg">
            {formatMXN(resumen.totalIngresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">consolidado 3 empresas</p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Total egresos
            </span>
          </div>
          <p className="text-foreground mt-2 text-sm font-bold tabular-nums sm:text-base lg:text-lg">
            {formatMXN(resumen.totalEgresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">consolidado 3 empresas</p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <Wallet className="text-jade-600 h-4 w-4" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Por cobrar (CXC)
            </span>
          </div>
          <p className="text-foreground mt-2 text-sm font-bold tabular-nums sm:text-base lg:text-lg">
            {formatMXN(cuentas.totalCxc)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatMXN(cuentas.totalCxcVencidas)} vencidas
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Por pagar (CXP)
            </span>
          </div>
          <p className="text-foreground mt-2 text-sm font-bold tabular-nums sm:text-base lg:text-lg">
            {formatMXN(cuentas.totalCxp)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatMXN(cuentas.totalCxpVencidas)} vencidas
          </p>
        </div>
      </div>

      {/* Cards por empresa */}
      <div>
        <h2 className="text-foreground mb-3 text-lg font-semibold">Por empresa</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {resumen.empresas.map((e) => (
            <EmpresaResumenCard key={e.empresaId} empresa={e} />
          ))}
        </div>
      </div>

      {/* Correlación entre empresas */}
      <CorrelacionEmpresas flows={correlacion} />

      {/* MIHBAH estimado vs avance */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Target className="text-jade-600 h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">
            MIHBAH — Estimado vs avance del mes ({MESES[mesActual - 1]})
          </h3>
        </div>

        {mihbahAvance.sinDatos ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Sin movimientos suficientes para calcular avance.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Estimado
                </p>
                <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
                  {formatMXN(mihbahAvance.estimadoMes)}
                </p>
                <p className="text-muted-foreground text-[10px]">promedio últimos meses</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Gastado
                </p>
                <p className="text-jade-700 dark:text-jade-300 mt-1 text-xl font-bold tabular-nums">
                  {formatMXN(mihbahAvance.gastadoMes)}
                </p>
                <p className="text-muted-foreground text-[10px]">a la fecha</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Avance
                </p>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums ${
                    mihbahAvance.porcentajeAvance > 100
                      ? 'text-red-600 dark:text-red-400'
                      : mihbahAvance.porcentajeAvance > 80
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {mihbahAvance.porcentajeAvance}%
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {mihbahAvance.porcentajeAvance > 100 ? 'Sobre estimado' : 'Dentro del estimado'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  mihbahAvance.porcentajeAvance > 100
                    ? 'bg-red-500'
                    : mihbahAvance.porcentajeAvance > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, mihbahAvance.porcentajeAvance)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Resumen del resumen — BM ↔ YCDI */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="text-jade-600 h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">
            Resumen del resumen — BM CORP ↔ YCDI
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Ventas BM finalizadas
            </p>
            <p className="mt-1 text-lg font-bold text-purple-700 tabular-nums dark:text-purple-300">
              {formatMXN(resumenDelResumen.ventasBmcorpFinalizadas)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Comisión generada (15%)
            </p>
            <p className="mt-1 text-lg font-bold text-purple-700 tabular-nums dark:text-purple-300">
              {formatMXN(resumenDelResumen.comisionGeneradaBmcorp)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Capital levantado YCDI
            </p>
            <p className="mt-1 text-lg font-bold text-blue-700 tabular-nums dark:text-blue-300">
              {formatMXN(resumenDelResumen.capitalLevantadoYcdi)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Capital pendiente YCDI
            </p>
            <p className="mt-1 text-lg font-bold text-amber-700 tabular-nums dark:text-amber-300">
              {formatMXN(resumenDelResumen.capitalPendienteYcdi)}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground border-border mt-4 border-t pt-3 text-xs italic">
          {resumenDelResumen.hipotesis}
        </p>
      </div>

      {/* Cuentas consolidado — detalle por empresa */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h3 className="text-foreground mb-4 text-sm font-semibold">
          Cuentas consolidado — detalle
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* CXC */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Por cobrar (CXC)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {cuentas.cxcPorEmpresa.map((c) => (
                    <tr key={c.empresaId} className="border-border border-b last:border-0">
                      <td className="py-2 font-medium">{c.nombre}</td>
                      <td className="text-foreground py-2 text-right tabular-nums">
                        {formatMXN(c.total)}
                      </td>
                      <td className="py-2 pl-3 text-right text-xs text-red-600 tabular-nums dark:text-red-400">
                        {c.vencidas > 0 ? `${formatMXN(c.vencidas)} venc.` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2">TOTAL</td>
                    <td className="text-foreground py-2 text-right tabular-nums">
                      {formatMXN(cuentas.totalCxc)}
                    </td>
                    <td className="py-2 pl-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CXP */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Por pagar (CXP)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {cuentas.cxpPorEmpresa.map((c) => (
                    <tr key={c.empresaId} className="border-border border-b last:border-0">
                      <td className="py-2 font-medium">{c.nombre}</td>
                      <td className="text-foreground py-2 text-right tabular-nums">
                        {formatMXN(c.total)}
                      </td>
                      <td className="py-2 pl-3 text-right text-xs text-red-600 tabular-nums dark:text-red-400">
                        {c.vencidas > 0 ? `${formatMXN(c.vencidas)} venc.` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2">TOTAL</td>
                    <td className="text-foreground py-2 text-right tabular-nums">
                      {formatMXN(cuentas.totalCxp)}
                    </td>
                    <td className="py-2 pl-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
