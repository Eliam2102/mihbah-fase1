import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  cortesDispersion,
  ventasPagoCorte,
  dispersiones,
  ventasBmcorp,
  desarrollos,
  afiliados,
  matrizAlianzaProducto,
  lideresAlianza,
  comisionesCalculadas,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, gt, inArray, isNotNull, notInArray } from 'drizzle-orm'
import CorteDetailView from '@/components/comisiones/corte-detail-view'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Detalle de Corte · BM CORP' }

// Alias para evitar colisión con el join de lideresAlianza para el socio de la matriz
const lideresMatriz = lideresAlianza

// Conceptos diferidos por la cascada (tier 3-4) que pueden incluirse manualmente en un corte
const TIPOS_DIFERIDOS = [
  'SOCIO_BOLSA_JORGE',
  'SOCIO_BOLSA_KASS',
  'SOCIO_BOLSA_DIANA',
  'SOCIO_FIJO_JORGE',
  'SOCIO_FIJO_KASS',
] as const

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

    // Pagos del corte con datos de la venta + contexto de alianza y matriz
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
        afiliadoId: ventasBmcorp.afiliadoId,
        alianzaNombre: afiliados.nombre,
        socioNombre: lideresMatriz.nombre,
        pctAfiliacion: matrizAlianzaProducto.porcentajeAfiliacion,
        pctJorge: matrizAlianzaProducto.porcentajeJorgeBolsa,
        pctKass: matrizAlianzaProducto.porcentajeKassBolsa,
        pctDiana: matrizAlianzaProducto.porcentajeDianaBolsa,
        // Snapshot del motor de cálculo — montos totales de conceptos diferidos
        // (bolsa comercial y socios fijos). Se muestran como placeholder editable.
        comisionId: comisionesCalculadas.id,
        montoSocioFijoJorge: comisionesCalculadas.montoSocioFijoJorge,
        montoSocioFijoKass: comisionesCalculadas.montoSocioFijoKass,
        montoSocioBolsaJorge: comisionesCalculadas.montoSocioBolsaJorge,
        montoSocioBolsaKass: comisionesCalculadas.montoSocioBolsaKass,
        montoSocioBolsaDiana: comisionesCalculadas.montoSocioBolsaDiana,
      })
      .from(ventasPagoCorte)
      .leftJoin(ventasBmcorp, eq(ventasPagoCorte.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(
        matrizAlianzaProducto,
        and(
          eq(matrizAlianzaProducto.afiliadoId, afiliados.id),
          eq(matrizAlianzaProducto.tipoProducto, 'TERRENO'),
        ),
      )
      .leftJoin(lideresMatriz, eq(matrizAlianzaProducto.liderId, lideresMatriz.id))
      // Join a comisiones calculadas para obtener los montos de socios fijos (snapshot)
      .leftJoin(
        comisionesCalculadas,
        and(
          eq(comisionesCalculadas.tenantId, tenantId),
          eq(comisionesCalculadas.ventaId, ventasPagoCorte.ventaId),
        ),
      )
      .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, corteId)))

    // Ventas finalizadas disponibles para agregar al corte (excluye las ya incluidas)
    const ventasYaEnCorte = pagos.map((p) => p.ventaId).filter(Boolean) as string[]
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
          inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
          ventasYaEnCorte.length > 0 ? notInArray(ventasBmcorp.id, ventasYaEnCorte) : undefined,
        ),
      )

    // Dispersiones del corte — solo las que tienen monto > 0
    const disps = await tx
      .select()
      .from(dispersiones)
      .where(
        and(
          eq(dispersiones.tenantId, tenantId),
          eq(dispersiones.corteId, corteId),
          gt(dispersiones.montoTotal, '0'),
        ),
      )

    // Conceptos diferidos ya incluidos en algún corte (corteId no nulo) — para no
    // mostrar el placeholder de "incluir" más de una vez por comisión+concepto.
    const comisionIds = [...new Set(pagos.map((p) => p.comisionId).filter(Boolean))] as string[]
    const diferidosIncluidosRows =
      comisionIds.length > 0
        ? await tx
            .select({
              comisionId: dispersiones.comisionId,
              tipoBeneficiario: dispersiones.tipoBeneficiario,
            })
            .from(dispersiones)
            .where(
              and(
                eq(dispersiones.tenantId, tenantId),
                inArray(dispersiones.comisionId, comisionIds),
                inArray(dispersiones.tipoBeneficiario, TIPOS_DIFERIDOS),
                isNotNull(dispersiones.corteId),
              ),
            )
        : []
    const diferidosIncluidos = diferidosIncluidosRows.map(
      (r) => `${r.comisionId}:${r.tipoBeneficiario}`,
    )

    // Líderes por afiliado — solo los configurados en la matriz de cada alianza
    const lideresRows = await tx
      .select({
        afiliadoId: matrizAlianzaProducto.afiliadoId,
        liderId: lideresAlianza.id,
        liderNombre: lideresAlianza.nombre,
      })
      .from(matrizAlianzaProducto)
      .innerJoin(lideresAlianza, eq(matrizAlianzaProducto.liderId, lideresAlianza.id))
      .where(and(eq(matrizAlianzaProducto.tenantId, tenantId), eq(lideresAlianza.activo, true)))

    // Agrupar: { [afiliadoId]: [{id, nombre}] }
    const lideresPorAfiliado = lideresRows.reduce<Record<string, { id: string; nombre: string }[]>>(
      (acc, r) => {
        if (!r.afiliadoId) return acc
        if (!acc[r.afiliadoId]) acc[r.afiliadoId] = []
        const ya = acc[r.afiliadoId]!.some((l) => l.id === r.liderId)
        if (!ya) acc[r.afiliadoId]!.push({ id: r.liderId, nombre: r.liderNombre })
        return acc
      },
      {},
    )

    return {
      corte,
      pagos,
      dispersiones: disps,
      ventasDisponibles,
      lideresPorAfiliado,
      diferidosIncluidos,
    }
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
      lideresPorAfiliado={data.lideresPorAfiliado}
      diferidosIncluidos={data.diferidosIncluidos}
      userRole={user.role ?? 'admin'}
    />
  )
}
