import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getFlujoMensual, getAñosConDatos } from '@/lib/services/flujo.service'
import { getFlujoBmcorpMensual, getAñosConDatosBmcorp } from '@/lib/services/flujo-bmcorp.service'
import { getMovimientosReporte } from '@/lib/services/reportes-excel.service'
import { getProyectosExcel } from '@/lib/services/proyectos-excel.service'
import { getCuentasExcel } from '@/lib/services/cuentas-excel.service'
import { getVentasReporteBmcorp } from '@/lib/services/reportes-bmcorp.service'
import { getComisionamientoConciliado } from '@/lib/services/dashboard-bmcorp.service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FlujoFiltros } from '@/components/flujo/flujo-filtros'
import { formatMXN } from '@/lib/utils'

const TIPOS: Record<string, string> = {
  flujo: 'Flujo de Caja',
  proyectos: 'Proyectos',
  cuentas: 'Cuentas Pendientes',
  movimientos: 'Movimientos Detallados',
  ventas: 'Reporte de Ventas',
  comisiones: 'Comisiones',
}

export default async function ReporteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string; tipo: string }>
  searchParams: Promise<{ anio?: string; from?: string }>
}) {
  const { empresaId, tipo } = await params
  const { anio: anioStr, from } = await searchParams

  const user = await requireUser()
  const empresa = await requireEmpresaAccess(user, empresaId, 'reportes')
  const tenantId = user.tenantId!

  if (!TIPOS[tipo]) notFound()

  const backHref = from === 'consolidated' ? '/reportes' : `/empresa/${empresaId}/reportes`

  const anio = Number(anioStr) || new Date().getFullYear()
  const titulo = TIPOS[tipo]!
  const esBmcorp = empresa.tipo === 'COMERCIAL'
  const pdfDisponible = !esBmcorp && tipo === 'flujo'

  // Fetch years only for flujo report (the only type that filters by year)
  let años: number[] | null = null
  let defaultAnio = anio
  if (tipo === 'flujo') {
    const currentYear = new Date().getFullYear()
    const añosRaw = esBmcorp
      ? await getAñosConDatosBmcorp(empresaId, tenantId)
      : await getAñosConDatos(empresaId, tenantId)
    años = añosRaw.length > 0 ? añosRaw : [currentYear]
    defaultAnio = años[0]!
  }

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2">
            <Breadcrumb
              items={
                from === 'consolidated'
                  ? [
                      { label: 'Todas las empresas', href: '/reportes' },
                      { label: empresa.name, href: `/empresa/${empresaId}/reportes` },
                      { label: titulo },
                    ]
                  : [
                      { label: empresa.name, href: `/empresa/${empresaId}/reportes` },
                      { label: titulo },
                    ]
              }
            />
          </div>
          <h1 className="text-foreground text-2xl font-bold">{titulo}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {empresa.name} · {anio}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {años && <FlujoFiltros showVista={false} años={años} defaultAnio={defaultAnio} />}
          {pdfDisponible && (
            <a
              href={`/empresa/${empresaId}/reportes/${tipo}/pdf?anio=${anio}`}
              download
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </a>
          )}
        </div>
      </div>

      {/* Contenido por tipo */}
      {/* Excel empresas (MIHBAH / YCDI) */}
      {tipo === 'flujo' && !esBmcorp && (
        <FlujoContent empresaId={empresaId} tenantId={tenantId} anio={anio} />
      )}
      {tipo === 'proyectos' && !esBmcorp && (
        <ProyectosContent empresaId={empresaId} tenantId={tenantId} />
      )}
      {tipo === 'cuentas' && !esBmcorp && (
        <CuentasContent empresaId={empresaId} tenantId={tenantId} />
      )}
      {tipo === 'movimientos' && !esBmcorp && (
        <MovimientosContent empresaId={empresaId} tenantId={tenantId} />
      )}
      {/* BM CORP */}
      {tipo === 'ventas' && esBmcorp && <VentasContent empresaId={empresaId} tenantId={tenantId} />}
      {tipo === 'comisiones' && esBmcorp && (
        <ComisionesContent empresaId={empresaId} tenantId={tenantId} />
      )}
      {tipo === 'flujo' && esBmcorp && (
        <FlujoBmcorpContent empresaId={empresaId} tenantId={tenantId} anio={anio} />
      )}
    </section>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

async function FlujoContent({
  empresaId,
  tenantId,
  anio,
}: {
  empresaId: string
  tenantId: string
  anio: number
}) {
  const flujo = await getFlujoMensual(empresaId, tenantId, anio)
  const totalIngresos = flujo.reduce((s, m) => s + m.ingresos, 0)
  const totalEgresos = flujo.reduce((s, m) => s + m.egresos, 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Ingresos</p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {formatMXN(totalIngresos)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Egresos</p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {formatMXN(totalEgresos)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Neto</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${totalIngresos - totalEgresos >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(totalIngresos - totalEgresos)}
          </p>
        </div>
      </div>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/50 border-b">
              {['Mes', 'Ingresos', 'Egresos', 'Neto', 'Acumulado'].map((h) => (
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
            {flujo.map((m) => (
              <tr key={m.mes} className="border-border hover:bg-muted/30 border-b last:border-0">
                <td className="text-foreground px-6 py-3 font-medium">{m.mesLabel}</td>
                <td className="px-6 py-3 text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatMXN(m.ingresos)}
                </td>
                <td className="px-6 py-3 text-red-600 tabular-nums dark:text-red-400">
                  {formatMXN(m.egresos)}
                </td>
                <td
                  className={`px-6 py-3 font-semibold tabular-nums ${m.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
                >
                  {formatMXN(m.neto)}
                </td>
                <td className="text-muted-foreground px-6 py-3 tabular-nums">
                  {formatMXN(m.acumulado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function ProyectosContent({ empresaId, tenantId }: { empresaId: string; tenantId: string }) {
  const proyectos = await getProyectosExcel(empresaId, tenantId)
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border bg-muted/50 border-b">
            {['Proyecto', 'Ingresos', 'Egresos', 'Neto', 'Movimientos', 'Estado'].map((h) => (
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
          {proyectos.map((p) => (
            <tr key={p.id} className="border-border hover:bg-muted/30 border-b last:border-0">
              <td className="px-6 py-3">
                <p className="text-foreground font-medium">{p.name}</p>
                {p.descripcion && <p className="text-muted-foreground text-xs">{p.descripcion}</p>}
              </td>
              <td className="px-6 py-3 text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatMXN(p.totalIngresos)}
              </td>
              <td className="px-6 py-3 text-red-600 tabular-nums dark:text-red-400">
                {formatMXN(p.totalEgresos)}
              </td>
              <td
                className={`px-6 py-3 font-bold tabular-nums ${p.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
              >
                {formatMXN(p.neto)}
              </td>
              <td className="text-muted-foreground px-6 py-3 tabular-nums">{p.totalMovimientos}</td>
              <td className="px-6 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.activo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function CuentasContent({ empresaId, tenantId }: { empresaId: string; tenantId: string }) {
  const { cxc, cxp, totalCxc, totalCxp } = await getCuentasExcel(empresaId, tenantId)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXC</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatMXN(totalCxc)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXP</p>
          <p className="mt-1 text-2xl font-bold text-red-600 tabular-nums dark:text-red-400">
            {formatMXN(totalCxp)}
          </p>
        </div>
      </div>
      {[
        {
          rows: cxc,
          title: 'Por Cobrar (CXC)',
          colorCls: 'text-emerald-600 dark:text-emerald-400',
        },
        { rows: cxp, title: 'Por Pagar (CXP)', colorCls: 'text-red-600 dark:text-red-400' },
      ].map(({ rows, title, colorCls }) => (
        <div
          key={title}
          className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
        >
          <div className="border-border border-b px-6 py-3">
            <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Tercero', 'Monto', 'Pagado', 'Saldo', 'Vencimiento', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-border hover:bg-muted/30 border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{c.tercero}</td>
                  <td className="text-foreground px-4 py-3 tabular-nums">{formatMXN(c.monto)}</td>
                  <td className="text-muted-foreground px-4 py-3 tabular-nums">
                    {formatMXN(c.montoPagado)}
                  </td>
                  <td className={`px-4 py-3 font-bold tabular-nums ${colorCls}`}>
                    {formatMXN(c.saldoPendiente)}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{c.fechaVencimiento ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

async function MovimientosContent({
  empresaId,
  tenantId,
}: {
  empresaId: string
  tenantId: string
}) {
  const movimientos = await getMovimientosReporte(empresaId, tenantId, 500)
  const TIPO_COLOR: Record<string, string> = {
    INGRESO: 'text-emerald-600 dark:text-emerald-400',
    EGRESO: 'text-red-600 dark:text-red-400',
    SALIDA: 'text-red-600 dark:text-red-400',
    PRESTAMO: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border border-b px-6 py-3">
        <p className="text-muted-foreground text-sm">{movimientos.length} movimientos (máx. 500)</p>
      </div>
      <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="border-border bg-muted/80 border-b backdrop-blur-sm">
              {['Fecha', 'Tipo', 'Concepto', 'Proyecto', 'Monto'].map((h) => (
                <th
                  key={h}
                  className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id} className="border-border hover:bg-muted/30 border-b last:border-0">
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
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {m.proyectoNombre ?? '—'}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold tabular-nums ${TIPO_COLOR[m.tipo] ?? 'text-foreground'}`}
                >
                  {formatMXN(m.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function FlujoBmcorpContent({
  empresaId,
  tenantId,
  anio,
}: {
  empresaId: string
  tenantId: string
  anio: number
}) {
  const flujo = await getFlujoBmcorpMensual(empresaId, tenantId, anio)
  const totalIngresos = flujo.reduce((s, m) => s + m.ingresos, 0)
  const totalEgresos = flujo.reduce((s, m) => s + m.egresos, 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Ingresos (ventas)</p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {formatMXN(totalIngresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-[10px]">
            Monto de ventas por fechaApertura
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            Egresos (repartos)
          </p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {formatMXN(totalEgresos)}
          </p>
          <p className="text-muted-foreground mt-1 text-[10px]">Repartos pagados a alianzas</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Neto</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${totalIngresos - totalEgresos >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatMXN(totalIngresos - totalEgresos)}
          </p>
        </div>
      </div>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/50 border-b">
              {['Mes', 'Ingresos (ventas)', 'Egresos (repartos)', 'Neto', 'Acumulado'].map((h) => (
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
            {flujo.map((m) => (
              <tr key={m.mes} className="border-border hover:bg-muted/30 border-b last:border-0">
                <td className="text-foreground px-6 py-3 font-medium">{m.mesLabel}</td>
                <td className="px-6 py-3 text-emerald-600 tabular-nums dark:text-emerald-400">
                  {m.ingresos > 0 ? formatMXN(m.ingresos) : '—'}
                </td>
                <td className="px-6 py-3 text-red-600 tabular-nums dark:text-red-400">
                  {m.egresos > 0 ? formatMXN(m.egresos) : '—'}
                </td>
                <td
                  className={`px-6 py-3 font-semibold tabular-nums ${m.neto >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}
                >
                  {m.neto !== 0 ? formatMXN(m.neto) : '—'}
                </td>
                <td className="text-muted-foreground px-6 py-3 tabular-nums">
                  {formatMXN(m.acumulado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function ComisionesContent({ empresaId, tenantId }: { empresaId: string; tenantId: string }) {
  const [ventas, conciliado] = await Promise.all([
    getVentasReporteBmcorp(empresaId, tenantId),
    getComisionamientoConciliado(empresaId, tenantId),
  ])
  return (
    <div className="space-y-6">
      {/* Resumen conciliado */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total generado', value: conciliado.totalGenerado, color: 'text-foreground' },
          {
            label: 'Pagado',
            value: conciliado.pagado,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Parcial',
            value: conciliado.parcial,
            color: 'text-amber-600 dark:text-amber-400',
          },
          {
            label: 'Pendiente',
            value: conciliado.pendiente,
            color: 'text-red-600 dark:text-red-400',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="border-border bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-semibold uppercase">{label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{formatMXN(value)}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        % conciliado:{' '}
        <span className="text-foreground font-semibold">{conciliado.porcentajeConciliado}%</span> ·
        Comisión calculada al 15% del monto de cada venta.
      </p>
      {/* Detalle por venta */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-6 py-3">
          <h3 className="text-foreground text-sm font-semibold">
            Comisión por venta ({ventas.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {[
                  'Cliente',
                  'Desarrollo',
                  'Asesor',
                  'Alianza',
                  'Monto venta',
                  'Comisión (15%)',
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
              {ventas.map((v) => (
                <tr key={v.id} className="border-border hover:bg-muted/30 border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{v.cliente}</td>
                  <td className="text-muted-foreground px-4 py-3">{v.desarrollo ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{v.asesor ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{v.afiliado ?? '—'}</td>
                  <td className="text-foreground px-4 py-3 tabular-nums">{formatMXN(v.monto)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatMXN(v.comision)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                      {v.estadoVenta}
                    </span>
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

async function VentasContent({ empresaId, tenantId }: { empresaId: string; tenantId: string }) {
  const ventas = await getVentasReporteBmcorp(empresaId, tenantId)
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/50 border-b">
              {[
                'Cliente',
                'Lote',
                'Desarrollo',
                'Alianza',
                'Monto',
                'Comisión',
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
            {ventas.map((v) => (
              <tr key={v.id} className="border-border hover:bg-muted/30 border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="text-foreground font-medium">{v.cliente}</p>
                  {v.asesor && <p className="text-muted-foreground text-xs">Asesor: {v.asesor}</p>}
                </td>
                <td className="text-muted-foreground px-4 py-3">{v.lote ?? '—'}</td>
                <td className="text-foreground px-4 py-3 font-medium">{v.desarrollo ?? '—'}</td>
                <td className="text-muted-foreground px-4 py-3">{v.afiliado ?? '—'}</td>
                <td className="text-foreground px-4 py-3 font-semibold tabular-nums">
                  {formatMXN(v.monto)}
                </td>
                <td className="px-4 py-3 text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatMXN(v.comision)}
                </td>
                <td className="text-muted-foreground px-4 py-3">{v.fechaApertura ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                    {v.estadoVenta}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
