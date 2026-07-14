import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import { comisionesCalculadas, ventasBmcorp, afiliados, dispersiones } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Receipt } from 'lucide-react'

export const metadata = { title: 'Ventas con comisión · BM CORP' }

const PAGE_SIZE = 50

export default async function VentasComisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ page?: string; tipo?: string }>
}) {
  const { empresaId } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1'))
  const tipoFiltro = sp.tipo === 'TERRENO' || sp.tipo === 'ACCION' ? sp.tipo : null

  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const { rows, total } = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [
      eq(comisionesCalculadas.tenantId, tenantId),
      eq(ventasBmcorp.empresaId, empresaId),
    ]
    if (tipoFiltro) filters.push(eq(comisionesCalculadas.tipoProducto, tipoFiltro))

    const totalRow = await tx
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(comisionesCalculadas)
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(and(...filters))
    const total = totalRow[0]?.total ?? 0

    const rows = await tx
      .select({
        comision: comisionesCalculadas,
        venta: ventasBmcorp,
        afiliadoNombre: afiliados.nombre,
        dispersionesTotal: sql<number>`(
          SELECT COUNT(*) FROM ${dispersiones}
          WHERE ${dispersiones.comisionId} = ${comisionesCalculadas.id}
        )::int`,
        dispersionesPagadas: sql<number>`(
          SELECT COUNT(*) FROM ${dispersiones}
          WHERE ${dispersiones.comisionId} = ${comisionesCalculadas.id}
          AND ${dispersiones.estado} = 'PAGADO'
        )::int`,
      })
      .from(comisionesCalculadas)
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .where(and(...filters))
      .orderBy(desc(comisionesCalculadas.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)

    return { rows, total }
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const fmt = (v: string | number) =>
    Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Ventas con comisión</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total} venta{total === 1 ? '' : 's'} con comisión calculada. Click una fila para ver
          detalle de dispersión.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <FilterPill href={`?`} active={tipoFiltro === null}>
          Todas
        </FilterPill>
        <FilterPill href={`?tipo=TERRENO`} active={tipoFiltro === 'TERRENO'}>
          Terrenos (20%)
        </FilterPill>
        <FilterPill href={`?tipo=ACCION`} active={tipoFiltro === 'ACCION'}>
          YCD (15%)
        </FilterPill>
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left font-medium sm:px-3">Cliente</th>
              <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Alianza</th>
              <th className="hidden px-3 py-2 text-center font-medium sm:table-cell">Tipo</th>
              <th className="px-2 py-2 text-right font-medium sm:px-3">Venta</th>
              <th className="px-2 py-2 text-right font-medium sm:px-3">Comisión</th>
              <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Liberable</th>
              <th className="hidden px-3 py-2 text-center font-medium sm:table-cell">Disp.</th>
              <th className="px-2 py-2 sm:px-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground px-3 py-8 text-center">
                  <Receipt className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Sin ventas con comisión. Corre la sincronización Monday primero.
                </td>
              </tr>
            ) : (
              rows.map(
                ({
                  comision: c,
                  venta: v,
                  afiliadoNombre,
                  dispersionesTotal,
                  dispersionesPagadas,
                }) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-2 py-2 sm:px-3">
                      <Link
                        href={`/empresa/${empresaId}/comisiones/ventas/${v.id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{v.cliente}</div>
                        <div className="text-muted-foreground text-xs md:hidden">
                          {afiliadoNombre ?? '—'} · {c.tipoProducto}
                        </div>
                      </Link>
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-2 text-xs md:table-cell">
                      {afiliadoNombre ?? '—'}
                    </td>
                    <td className="hidden px-3 py-2 text-center text-xs sm:table-cell">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          c.tipoProducto === 'TERRENO'
                            ? 'bg-jade-100 text-jade-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.tipoProducto}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                      {fmt(c.montoVenta)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums sm:px-3">
                      {fmt(c.comisionBrutaTotal)}
                    </td>
                    <td className="text-success hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                      {fmt(c.montoLiberable)}
                    </td>
                    <td className="hidden px-3 py-2 text-center text-xs sm:table-cell">
                      {c.sinConfig ? (
                        <span className="text-warning inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Sin config
                        </span>
                      ) : (
                        `${dispersionesPagadas}/${dispersionesTotal}`
                      )}
                    </td>
                    <td className="px-2 py-2 sm:px-3">
                      <Link
                        href={`/empresa/${empresaId}/comisiones/ventas/${v.id}`}
                        className="text-muted-foreground hover:text-foreground inline-block"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <PageLink page={page - 1} disabled={page <= 1} tipo={tipoFiltro}>
            Anterior
          </PageLink>
          <span className="text-muted-foreground self-center text-xs">
            {page} / {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} tipo={tipoFiltro}>
            Siguiente
          </PageLink>
        </div>
      )}
    </section>
  )
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </Link>
  )
}

function PageLink({
  page,
  disabled,
  tipo,
  children,
}: {
  page: number
  disabled: boolean
  tipo: string | null
  children: React.ReactNode
}) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (tipo) params.set('tipo', tipo)
  const href = '?' + params.toString()
  if (disabled) {
    return (
      <span className="bg-muted text-muted-foreground cursor-not-allowed rounded-md px-3 py-1.5 text-xs">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-xs"
    >
      {children}
    </Link>
  )
}
