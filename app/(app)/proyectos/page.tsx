import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { getProyectosExcel } from '@/lib/services/proyectos-excel.service'
import { getProyectosBmcorp } from '@/lib/services/proyectos-bmcorp.service'
import { Building2, FolderOpen, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

function fmt(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default async function ProyectosConsolidadoPage() {
  const user = await requireUser()
  const tenantId = user.tenantId!

  const allEmpresas = await getEmpresasForUser(user.id, tenantId, user.role)

  const empresasProyectos = await Promise.all(
    allEmpresas.map(async (e) => {
      if (e.tipo === 'COMERCIAL') {
        const proyectos = await getProyectosBmcorp(e.id, tenantId)
        return {
          empresa: e,
          tipo: 'bmcorp' as const,
          proyectos: proyectos.map((p) => ({
            id: p.id,
            name: p.nombre,
            totalIngresos: p.montoTotal,
            totalEgresos: p.comisionesTotal,
            neto: p.montoTotal - p.comisionesTotal,
            extra: `${p.ventasTotal} ventas · ${p.ventasProceso} en proceso`,
          })),
        }
      }
      const proyectos = await getProyectosExcel(e.id, tenantId)
      return {
        empresa: e,
        tipo: 'excel' as const,
        proyectos: proyectos.map((p) => ({
          id: p.id,
          name: p.name,
          totalIngresos: p.totalIngresos,
          totalEgresos: p.totalEgresos,
          neto: p.neto,
          extra: `${p.totalMovimientos} movimientos`,
        })),
      }
    }),
  )

  const totalProyectos = empresasProyectos.reduce((s, e) => s + e.proyectos.length, 0)

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Proyectos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vista consolidada — {totalProyectos} proyectos en {allEmpresas.length} empresas
        </p>
      </div>

      {empresasProyectos.map(({ empresa, proyectos, tipo }) => (
        <div key={empresa.id} className="space-y-3">
          {/* Empresa header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="text-muted-foreground h-4 w-4" />
              <h2 className="text-foreground font-semibold">{empresa.name}</h2>
              <span className="text-muted-foreground text-xs">
                ({proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''})
              </span>
            </div>
            <Link
              href={`/empresa/${empresa.id}/proyectos`}
              className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
            >
              Ver detalle →
            </Link>
          </div>

          {proyectos.length === 0 ? (
            <div className="border-border bg-card rounded-xl border p-6 text-center">
              <FolderOpen className="text-muted-foreground mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-muted-foreground text-sm">Sin proyectos registrados</p>
            </div>
          ) : (
            <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border bg-muted/50 border-b">
                      <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Proyecto
                      </th>
                      <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                        {tipo === 'bmcorp' ? 'Monto Ventas' : 'Ingresos'}
                      </th>
                      <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                        {tipo === 'bmcorp' ? 'Comisión BM' : 'Egresos'}
                      </th>
                      <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                        Neto
                      </th>
                      <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proyectos.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-border hover:bg-muted/20 border-b transition-colors last:border-0 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/empresa/${empresa.id}/proyectos/${p.id}?from=consolidated`}
                            className="text-foreground hover:text-primary font-medium transition-colors"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                          {p.totalIngresos > 0 ? fmt(p.totalIngresos) : '—'}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-red-600 tabular-nums dark:text-red-400">
                          {p.totalEgresos > 0 ? fmt(p.totalEgresos) : '—'}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-bold tabular-nums ${
                            p.neto > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : p.neto < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {p.neto !== 0 ? fmt(p.neto) : '—'}
                        </td>
                        <td className="text-muted-foreground px-6 py-3 text-xs">{p.extra}</td>
                      </tr>
                    ))}
                    {/* Subtotal */}
                    <tr className="bg-muted/40 border-border border-t font-bold">
                      <td className="px-6 py-3 text-xs">Subtotal {empresa.name}</td>
                      <td className="px-6 py-3 text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                        {fmt(proyectos.reduce((s, p) => s + p.totalIngresos, 0))}
                      </td>
                      <td className="px-6 py-3 text-right text-red-600 tabular-nums dark:text-red-400">
                        {fmt(proyectos.reduce((s, p) => s + p.totalEgresos, 0))}
                      </td>
                      <td
                        className={`px-6 py-3 text-right tabular-nums ${
                          proyectos.reduce((s, p) => s + p.neto, 0) >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {fmt(proyectos.reduce((s, p) => s + p.neto, 0))}
                      </td>
                      <td className="px-6 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Grand total */}
      {totalProyectos > 0 && (
        <div className="border-border bg-card rounded-xl border p-5">
          <h3 className="text-foreground mb-3 text-sm font-semibold">Resumen consolidado</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Total ingresos
                </p>
              </div>
              <p className="text-foreground font-bold tabular-nums">
                {fmt(
                  empresasProyectos.reduce(
                    (s, e) => s + e.proyectos.reduce((ss, p) => ss + p.totalIngresos, 0),
                    0,
                  ),
                )}
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Total egresos
                </p>
              </div>
              <p className="text-foreground font-bold tabular-nums">
                {fmt(
                  empresasProyectos.reduce(
                    (s, e) => s + e.proyectos.reduce((ss, p) => ss + p.totalEgresos, 0),
                    0,
                  ),
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
                Neto total
              </p>
              <p
                className={`font-bold tabular-nums ${
                  empresasProyectos.reduce(
                    (s, e) => s + e.proyectos.reduce((ss, p) => ss + p.neto, 0),
                    0,
                  ) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {fmt(
                  empresasProyectos.reduce(
                    (s, e) => s + e.proyectos.reduce((ss, p) => ss + p.neto, 0),
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
