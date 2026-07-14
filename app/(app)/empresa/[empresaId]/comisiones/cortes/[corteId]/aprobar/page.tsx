import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  cortesDispersion,
  ventasPagoCorte,
  dispersiones,
  ventasBmcorp,
  desarrollos,
  lideresAlianza,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'
import CorteAprobacionView from '@/components/comisiones/corte-aprobacion-view'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Aprobar Corte · BM CORP' }

async function getCorteParaAprobacion(tenantId: string, empresaId: string, corteId: string) {
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

    // Pagos con datos de la venta
    const pagos = await tx
      .select({
        id: ventasPagoCorte.id,
        ventaId: ventasPagoCorte.ventaId,
        montoPagadoCliente: ventasPagoCorte.montoPagadoCliente,
        porcentajePagado: ventasPagoCorte.porcentajePagado,
        montoADispersar: ventasPagoCorte.montoADispersar,
        ventaNombreCliente: ventasBmcorp.cliente,
        ventaMonto: ventasBmcorp.monto,
        ventaLote: ventasBmcorp.loteAcciones,
        desarrolloNombre: desarrollos.nombre,
      })
      .from(ventasPagoCorte)
      .leftJoin(ventasBmcorp, eq(ventasPagoCorte.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, corteId)))

    // Dispersiones del corte con datos del lider
    const disps = await tx
      .select({
        id: dispersiones.id,
        liderId: dispersiones.liderId,
        beneficiarioNombre: dispersiones.beneficiarioNombre,
        tipoBeneficiario: dispersiones.tipoBeneficiario,
        montoTotal: dispersiones.montoTotal,
        metodoPago: dispersiones.metodoPago,
        estado: dispersiones.estado,
        acumulaMensual: dispersiones.acumulaMensual,
        liderNombre: lideresAlianza.nombre,
        liderMetodoPago: lideresAlianza.metodoPago,
      })
      .from(dispersiones)
      .leftJoin(lideresAlianza, eq(dispersiones.liderId, lideresAlianza.id))
      .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.corteId, corteId)))

    return { corte, pagos, dispersiones: disps }
  })
}

export default async function CorteAprobacionPage({
  params,
}: {
  params: Promise<{ empresaId: string; corteId: string }>
}) {
  const { empresaId, corteId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const data = await getCorteParaAprobacion(tenantId, empresaId, corteId)
  if (!data) notFound()

  return (
    <CorteAprobacionView
      empresaId={empresaId}
      corte={data.corte}
      pagos={data.pagos}
      dispersiones={data.dispersiones}
      userRole={user.role ?? 'admin'}
    />
  )
}
