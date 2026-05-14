import React from 'react'
import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { getFlujoMensual, getAñosConDatos } from '@/lib/services/flujo.service'
import { getFlujoBmcorpMensual, getAñosConDatosBmcorp } from '@/lib/services/flujo-bmcorp.service'
import { FlujoFiltros } from '@/components/flujo/flujo-filtros'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { FlujoMes } from '@/lib/services/flujo/flujo.types'

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

function fmt(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface EmpresaFlujo {
  id: string
  name: string
  tipo: string
  flujo: FlujoMes[]
}

export default async function FlujoConsolidadoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>
}) {
  const sp = await searchParams
  const user = await requireUser()
  const tenantId = user.tenantId!

  const allEmpresas = await getEmpresasForUser(user.id, tenantId)

  // Años con datos: unión de todas las empresas
  const añosSets = await Promise.all(
    allEmpresas.map((e) =>
      e.tipo === 'COMERCIAL'
        ? getAñosConDatosBmcorp(e.id, tenantId)
        : getAñosConDatos(e.id, tenantId),
    ),
  )
  const currentYear = new Date().getFullYear()
  const añosUnion = [...new Set(añosSets.flat())].sort((a, b) => b - a)
  const años = añosUnion.length > 0 ? añosUnion : [currentYear]
  const defaultAnio = años[0]!
  const anio = sp.anio ? Number(sp.anio) : defaultAnio

  const empresasFlujo: EmpresaFlujo[] = await Promise.all(
    allEmpresas.map(async (e) => {
      const flujo =
        e.tipo === 'COMERCIAL'
          ? await getFlujoBmcorpMensual(e.id, tenantId, anio)
          : await getFlujoMensual(e.id, tenantId, anio)
      return { id: e.id, name: e.name, tipo: e.tipo, flujo }
    }),
  )

  const mesesConsolidados = Array.from({ length: 12 }, (_, i) => {
    const porEmpresa = empresasFlujo.map((e) => ({ ...e, mes: e.flujo[i]! }))
    const totalIngresos = porEmpresa.reduce((s, e) => s + e.mes.ingresos, 0)
    const totalEgresos = porEmpresa.reduce((s, e) => s + e.mes.egresos, 0)
    return {
      mesLabel: MESES[i]!,
      porEmpresa,
      totalIngresos,
      totalEgresos,
      totalNeto: totalIngresos - totalEgresos,
    }
  })

  const totalIngresos = mesesConsolidados.reduce((s, m) => s + m.totalIngresos, 0)
  const totalEgresos = mesesConsolidados.reduce((s, m) => s + m.totalEgresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground mt-1 text-sm">Vista consolidada — Año {anio}</p>
        </div>
        <FlujoFiltros showVista={false} años={años} defaultAnio={defaultAnio} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-5">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Ingresos totales
            </span>
          </div>
          <p className="text-foreground text-2xl font-bold tabular-nums">{fmt(totalIngresos)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            consolidado {allEmpresas.length} empresas
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-5">
          <div className="mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Egresos totales
            </span>
          </div>
          <p className="text-foreground text-2xl font-bold tabular-nums">{fmt(totalEgresos)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            consolidado {allEmpresas.length} empresas
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-5">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="text-primary h-4 w-4" />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Neto acumulado
            </span>
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${totalNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {fmt(totalNeto)}
          </p>
        </div>
      </div>

      {/* Tabla mensual cross-empresa */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-6 py-4">
          <h2 className="text-foreground font-semibold">Detalle mensual por empresa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                  Mes
                </th>
                {empresasFlujo.map((e) => (
                  <th
                    key={e.id}
                    colSpan={2}
                    className="border-border text-muted-foreground border-l px-6 py-3 text-center text-xs font-semibold tracking-wider uppercase"
                  >
                    {e.name}
                  </th>
                ))}
                <th className="border-border text-muted-foreground border-l px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                  Total neto
                </th>
              </tr>
              <tr className="border-border bg-muted/30 border-b">
                <th className="px-6 py-2" />
                {empresasFlujo.map((e) => (
                  <React.Fragment key={e.id}>
                    <th className="border-border border-l px-4 py-2 text-right text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Ing.
                    </th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold text-red-600 dark:text-red-400">
                      Egr.
                    </th>
                  </React.Fragment>
                ))}
                <th className="border-border border-l px-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {mesesConsolidados.map((m, i) => (
                <tr
                  key={i}
                  className={`border-border hover:bg-muted/20 border-b transition-colors last:border-0 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                >
                  <td className="text-foreground px-6 py-3 font-medium">{m.mesLabel}</td>
                  {m.porEmpresa.map((e) => (
                    <React.Fragment key={e.id}>
                      <td className="border-border border-l px-4 py-3 text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                        {e.mes.ingresos > 0 ? fmt(e.mes.ingresos) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums dark:text-red-400">
                        {e.mes.egresos > 0 ? fmt(e.mes.egresos) : '—'}
                      </td>
                    </React.Fragment>
                  ))}
                  <td
                    className={`border-border border-l px-6 py-3 text-right font-bold tabular-nums ${
                      m.totalNeto > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : m.totalNeto < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {m.totalNeto !== 0 ? fmt(m.totalNeto) : '—'}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-muted/40 border-border border-t font-bold">
                <td className="px-6 py-3 text-sm">TOTAL AÑO</td>
                {empresasFlujo.map((e) => {
                  const ing = e.flujo.reduce((s, m) => s + m.ingresos, 0)
                  const egr = e.flujo.reduce((s, m) => s + m.egresos, 0)
                  return (
                    <React.Fragment key={e.id}>
                      <td className="border-border border-l px-4 py-3 text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                        {fmt(ing)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums dark:text-red-400">
                        {fmt(egr)}
                      </td>
                    </React.Fragment>
                  )
                })}
                <td
                  className={`border-border border-l px-6 py-3 text-right tabular-nums ${
                    totalNeto >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {fmt(totalNeto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
