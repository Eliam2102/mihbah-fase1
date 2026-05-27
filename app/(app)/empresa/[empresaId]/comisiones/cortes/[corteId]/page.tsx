import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  cortesDispersion,
  ventasPagoCorte,
  dispersiones,
  ventasBmcorp,
  desarrollos,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, inArray } from 'drizzle-orm'
import CorteDetailView from '@/components/comisiones/corte-detail-view'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Detalle de Corte · BM CORP' }

async function getCorteData(tenantId: string, empresaId: string, corteId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [corte] = await tx
      .select()
      .from(cortesDispersion)
      .where(
        and(
          eq(cortesDispersion.tenantId, tenantId),
          eq(cortesDispersion.empresaId, empresaId),
          eq(cortesDispersion.id, corteId),
        ),
      )
      .limit(1)

    if (!corte) return null

    // Pagos del corte con datos de la venta
    const pagos = await tx
      .select({
        id: ventasPagoCorte.id,
        ventaId: ventasPagoCorte.ventaId,
        montoPagadoCliente: ventasPagoCorte.montoPagadoCliente,
        porcentajePagado: ventasPagoCorte.porcentajePagado,
        montoADispersar: ventasPagoCorte.montoADispersar,
        notasJoana: ventasPagoCorte.notasJoana,
        ventaNombreCliente: ventasBmcorp.cliente,

        ventaMonto: ventasBmcorp.monto,
        ventaLote: ventasBmcorp.loteAcciones,
        ventaAsesor: ventasBmcorp.asesor,
        desarrolloNombre: desarrollos.nombre,
      })
      .from(ventasPagoCorte)
      .leftJoin(ventasBmcorp, eq(ventasPagoCorte.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, corteId)))

    // Ventas finalizadas disponibles para agregar al corte (para evitar escribir UUIDs manualmente)
    const ventasDisponibles = await tx
      .select({
        id: ventasBmcorp.id,
        cliente: ventasBmcorp.cliente,
        loteAcciones: ventasBmcorp.loteAcciones,
        monto: ventasBmcorp.monto,
        desarrolloNombre: desarrollos.nombre,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'LIBERADO', 'FINALIZADO_Y_LIQUIDADO']),
        ),
      )

    // Dispersiones del corte
    const disps = await tx
      .select()
      .from(dispersiones)
      .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.corteId, corteId)))

    return { corte, pagos, dispersiones: disps, ventasDisponibles }
  })
}

export default async function CorteDetailPage({
  params,
}: {
  params: Promise<{ empresaId: string; corteId: string }>
}) {
  const { empresaId, corteId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const data = await getCorteData(tenantId, empresaId, corteId)
  if (!data) notFound()

  return (
    <CorteDetailView
      empresaId={empresaId}
      corte={data.corte}
      pagos={data.pagos}
      dispersiones={data.dispersiones}
      ventasDisponibles={data.ventasDisponibles}
      userRole={user.role ?? 'admin'}
    />
  )
}
