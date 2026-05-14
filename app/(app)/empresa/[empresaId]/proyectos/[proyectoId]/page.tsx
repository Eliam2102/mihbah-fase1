import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getProyectoDetalle } from '@/lib/services/proyectos-excel.service'
import { getDesarrolloDetalle } from '@/lib/services/proyectos-bmcorp.service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatMXN } from '@/lib/utils'

const TIPO_COLOR: Record<string, string> = {
  INGRESO: 'text-emerald-600 dark:text-emerald-400',
  EGRESO: 'text-red-600 dark:text-red-400',
  SALIDA: 'text-red-600 dark:text-red-400',
  PRESTAMO: 'text-amber-600 dark:text-amber-400',
  INTERNO: 'text-muted-foreground',
}

function StatusBadge({ estado }: { estado: string }) {
  const activos = [
    'EN_PROCESO',
    'APROBADO_VENTAS',
    'ESPERANDO_AUTORIZACION',
    'APROBADO_JURIDICO',
    'LIBERADO',
  ]
  const finalizados = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']
  const cls = finalizados.includes(estado)
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    : activos.includes(estado)
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  const label = estado
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${cls}`}
    >
      {label}
    </span>
  )
}

export default async function ProyectoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string; proyectoId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { empresaId, proyectoId: rawProyectoId } = await params
  const proyectoId = decodeURIComponent(rawProyectoId)
  const { from } = await searchParams
  const user = await requireUser()
  const empresa = await requireEmpresaAccess(user, empresaId, 'proyectos')
  const tenantId = user.tenantId!
  const backHref = from === 'consolidated' ? '/proyectos' : `/empresa/${empresaId}/proyectos`

  if (empresa.tipo === 'COMERCIAL') {
    // BM CORP: proyectoId = desarrolloId
    const detalle = await getDesarrolloDetalle(proyectoId, empresaId, tenantId)
    if (!detalle) notFound()

    return (
      <section className="space-y-6 p-4 sm:p-6">
        <Breadcrumb
          items={
            from === 'consolidated'
              ? [
                  { label: 'Todas las empresas', href: '/proyectos' },
                  { label: empresa.name, href: `/empresa/${empresaId}/proyectos` },
                  { label: detalle.nombre },
                ]
              : [
                  { label: empresa.name, href: `/empresa/${empresaId}/proyectos` },
                  { label: detalle.nombre },
                ]
          }
        />

        <div>
          <h1 className="text-foreground text-2xl font-bold">{detalle.nombre}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {detalle.desarrolladora ?? 'Sin desarrolladora'}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            {
              label: 'Monto Total',
              value: formatMXN(detalle.montoTotal),
              icon: Wallet,
              cls: 'text-foreground',
            },
            {
              label: 'Comisiones',
              value: formatMXN(detalle.comisionesTotal),
              icon: ArrowUpRight,
              cls: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'En Proceso',
              value: String(detalle.ventasProceso),
              icon: Clock,
              cls: 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'Finalizadas',
              value: String(detalle.ventasFinalizadas),
              icon: CheckCircle,
              cls: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'Canceladas',
              value: String(detalle.ventasCanceladas),
              icon: XCircle,
              cls: 'text-red-600 dark:text-red-400',
            },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="border-border bg-card rounded-xl border p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className={`h-4 w-4 ${cls}`} />
                <p className="text-muted-foreground text-xs font-semibold uppercase">{label}</p>
              </div>
              <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Ventas table */}
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <Building2 className="text-muted-foreground h-4 w-4" />
              Ventas del desarrollo ({detalle.ventas.length})
            </h3>
          </div>
          {detalle.ventas.length === 0 ? (
            <p className="text-muted-foreground p-8 text-sm">Sin ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/50 border-b">
                    {[
                      'Cliente',
                      'Lote',
                      'Asesor',
                      'Monto',
                      'Comisión',
                      'Enganche',
                      'Apertura',
                      'Estado',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.ventas.map((v) => (
                    <tr
                      key={v.id}
                      className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground px-4 py-3 font-medium">{v.cliente}</td>
                      <td className="text-muted-foreground px-4 py-3">{v.lote || '—'}</td>
                      <td className="text-muted-foreground px-4 py-3">{v.asesor || '—'}</td>
                      <td className="text-foreground px-4 py-3 text-right font-semibold tabular-nums">
                        {formatMXN(v.monto)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                        {formatMXN(v.comision)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                        {formatMXN(v.enganche)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                        {v.fechaApertura || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge estado={v.estadoVenta} />
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

  // MIHBAH / YCDI: proyectoId = proyecto UUID from proyectos table
  const detalle = await getProyectoDetalle(proyectoId, empresaId, tenantId)
  if (!detalle) notFound()

  const pctGasto =
    detalle.totalIngresos > 0
      ? Math.min(Math.round((detalle.totalEgresos / detalle.totalIngresos) * 100), 100)
      : 0

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <Breadcrumb
        items={
          from === 'consolidated'
            ? [
                { label: 'Todas las empresas', href: '/proyectos' },
                { label: empresa.name, href: `/empresa/${empresaId}/proyectos` },
                { label: detalle.name },
              ]
            : [
                { label: empresa.name, href: `/empresa/${empresaId}/proyectos` },
                { label: detalle.name },
              ]
        }
      />

      <div>
        <h1 className="text-foreground text-2xl font-bold">{detalle.name}</h1>
        {detalle.descripcion && (
          <p className="text-muted-foreground mt-1 text-sm">{detalle.descripcion}</p>
        )}
        <p className="text-muted-foreground mt-0.5 text-xs">
          {empresa.name} · {detalle.movimientos.length} movimientos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Ingresos</p>
          </div>
          <p className="text-foreground text-2xl font-bold tabular-nums">
            {formatMXN(detalle.totalIngresos)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Egresos</p>
          </div>
          <p className="text-foreground text-2xl font-bold tabular-nums">
            {formatMXN(detalle.totalEgresos)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Neto</p>
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${detalle.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(detalle.neto)}
          </p>
        </div>
      </div>

      {/* Avance medido por gasto acumulado vs ingresos */}
      {empresa.tipo === 'CONSTRUCTORA' && (
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Avance de obra — medido por gasto
              </h3>
              <p className="text-muted-foreground text-[11px]">
                Proxy: egresos acumulados ÷ ingresos del proyecto
              </p>
            </div>
            <span className="text-foreground text-2xl font-bold tabular-nums">{pctGasto}%</span>
          </div>
          <div className="bg-muted mt-3 h-3 overflow-hidden rounded-full">
            <div
              className={`h-3 rounded-full transition-all ${pctGasto > 80 ? 'bg-red-500' : pctGasto > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pctGasto}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Gastado:{' '}
              <span className="text-foreground font-medium">{formatMXN(detalle.totalEgresos)}</span>
            </span>
            <span className="text-muted-foreground">
              Ingresado:{' '}
              <span className="text-foreground font-medium">
                {formatMXN(detalle.totalIngresos)}
              </span>
            </span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-[10px]">
            * Este indicador no mide avance físico de obra. Refleja qué porcentaje del dinero
            ingresado al proyecto ya se gastó.
          </p>
        </div>
      )}

      {/* Movimientos */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-6 py-4">
          <h3 className="text-foreground text-sm font-semibold">Movimientos del proyecto</h3>
        </div>
        {detalle.movimientos.length === 0 ? (
          <p className="text-muted-foreground p-8 text-sm">
            Sin movimientos asignados a este proyecto.
          </p>
        ) : (
          <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-border bg-muted/80 border-b backdrop-blur-sm">
                  {['Fecha', 'Tipo', 'Concepto / Nombre', 'Monto', 'Comentarios'].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detalle.movimientos.map((m) => (
                  <tr
                    key={m.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {m.fecha}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold uppercase ${TIPO_COLOR[m.tipo] ?? 'text-muted-foreground'}`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.concepto && <p className="text-foreground">{m.concepto}</p>}
                      {m.nombre && <p className="text-muted-foreground text-xs">{m.nombre}</p>}
                      {!m.concepto && !m.nombre && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums ${TIPO_COLOR[m.tipo] ?? 'text-foreground'}`}
                    >
                      {formatMXN(m.monto)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {m.comentarios || '—'}
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
