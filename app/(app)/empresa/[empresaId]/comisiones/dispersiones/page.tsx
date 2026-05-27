import { requireUser, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  dispersiones,
  comisionesCalculadas,
  ventasBmcorp,
  users,
  desarrollos,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'
import {
  DispersionesTable,
  type DispersionTableRow,
} from '@/components/comisiones/dispersiones-table'

export const metadata = { title: 'Dispersiones · BM CORP' }

export default async function DispersionesPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!
  const canModify = isSuperAdminOrAbove(user.role)

  const raw = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select({
        d: dispersiones,
        venta: ventasBmcorp,
        desarrolloNombre: desarrollos.nombre,
        aprobadoPorNombre: users.name,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(users, eq(dispersiones.aprobadoPor, users.id))
      .where(and(eq(dispersiones.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .orderBy(dispersiones.tipoBeneficiario, dispersiones.estado)
  })

  const rows: DispersionTableRow[] = raw.map((r) => ({
    d: r.d,
    ventaCliente: r.venta.cliente,
    ventaId: r.venta.id,
    ventaDesarrolloNombre: r.desarrolloNombre ?? null,
    ventaLoteAcciones: r.venta.loteAcciones ?? null,
    aprobadoPorNombre: r.aprobadoPorNombre,
  }))

  const totalGeneral = rows.reduce((s, r) => s + Number(r.d.montoTotal), 0)
  const totalPagadoGen = rows.reduce((s, r) => s + Number(r.d.montoPagado), 0)
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Dispersiones</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pagos a beneficiarios — agrupado por tipo según cascada §4 del doc.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Total a dispersar" value={fmt(totalGeneral)} />
        <KPI label="Ya pagado" value={fmt(totalPagadoGen)} accent="success" />
        <KPI label="Pendiente" value={fmt(totalGeneral - totalPagadoGen)} accent="warning" />
      </div>

      <DispersionesTable empresaId={empresaId} rows={rows} canModify={canModify} />
    </section>
  )
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'success' | 'warning'
}) {
  const color =
    accent === 'success'
      ? 'text-success'
      : accent === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
