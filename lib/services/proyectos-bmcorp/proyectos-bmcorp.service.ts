/**
 * lib/services/proyectos-bmcorp/proyectos-bmcorp.service.ts
 *
 * Proyectos BM CORP service.
 */

import { db } from '@/lib/db'
import { desarrollos, ventasBmcorp } from '@/lib/db/schema'
import { count, eq, sql, sum, desc, and } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { ProyectoStats } from './proyectos-bmcorp.types'
import type { VentaDetalle, DesarrolloDetalle } from './detalles.types'

export async function getProyectosBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<ProyectoStats[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        id: desarrollos.id,
        nombre: desarrollos.nombre,
        desarrolladora: desarrollos.desarrolladora,
        ventasTotal: count(ventasBmcorp.id),
        montoTotal: sum(ventasBmcorp.monto),
        comisionesTotal: sum(ventasBmcorp.comisionBmcorp),
        ventasProceso: sql<number>`COUNT(*) FILTER (WHERE ${ventasBmcorp.estadoVenta} IN ('EN_PROCESO','APROBADO_VENTAS','ESPERANDO_AUTORIZACION','APROBADO_JURIDICO'))`,
        ventasFinalizadas: sql<number>`COUNT(*) FILTER (WHERE ${ventasBmcorp.estadoVenta} IN ('FINALIZADA','FINALIZADO_Y_LIQUIDADO'))`,
      })
      .from(desarrollos)
      .leftJoin(
        ventasBmcorp,
        and(eq(ventasBmcorp.desarrolloId, desarrollos.id), eq(ventasBmcorp.empresaId, empresaId)),
      )
      .where(and(eq(desarrollos.tenantId, tenantId)))
      .groupBy(desarrollos.id, desarrollos.nombre, desarrollos.desarrolladora)
      .orderBy(desc(sql`SUM(${ventasBmcorp.monto})`))

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      desarrolladora: r.desarrolladora,
      ventasTotal: Number(r.ventasTotal ?? 0),
      montoTotal: Number(r.montoTotal ?? 0),
      comisionesTotal: Number(r.comisionesTotal ?? 0),
      ventasProceso: Number(r.ventasProceso ?? 0),
      ventasFinalizadas: Number(r.ventasFinalizadas ?? 0),
    }))
  })
}

export async function getDesarrolloDetalle(
  desarrolloId: string,
  empresaId: string,
  tenantId: string,
): Promise<DesarrolloDetalle | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [dev] = await tx
      .select({
        id: desarrollos.id,
        nombre: desarrollos.nombre,
        desarrolladora: desarrollos.desarrolladora,
      })
      .from(desarrollos)
      .where(and(eq(desarrollos.id, desarrolloId), eq(desarrollos.tenantId, tenantId)))
      .limit(1)

    if (!dev) return null

    const ventas = await tx
      .select({
        id: ventasBmcorp.id,
        cliente: ventasBmcorp.cliente,
        asesor: ventasBmcorp.asesor,
        monto: ventasBmcorp.monto,
        comision: ventasBmcorp.comisionBmcorp,
        enganche: ventasBmcorp.enganche,
        estadoVenta: ventasBmcorp.estadoVenta,
        fechaApertura: sql<string | null>`TO_CHAR(${ventasBmcorp.fechaApertura}, 'YYYY-MM-DD')`,
        lote: ventasBmcorp.loteAcciones,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.desarrolloId, desarrolloId),
          eq(ventasBmcorp.empresaId, empresaId),
          eq(ventasBmcorp.tenantId, tenantId),
        ),
      )

    const ventaList: VentaDetalle[] = ventas.map((v) => ({
      id: v.id,
      cliente: v.cliente,
      asesor: v.asesor,
      monto: Number(v.monto ?? 0),
      comision: Number(v.comision ?? 0),
      enganche: Number(v.enganche ?? 0),
      estadoVenta: v.estadoVenta,
      fechaApertura: v.fechaApertura,
      lote: v.lote,
    }))

    const activos = ['EN_PROCESO', 'APROBADO_VENTAS', 'ESPERANDO_AUTORIZACION', 'APROBADO_JURIDICO']
    const finalizados = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']
    const cancelados = ['CANCELADA', 'LIBERADO'] // LIBERADO = venta caída

    return {
      ...dev,
      ventasProceso: ventaList.filter((v) => activos.includes(v.estadoVenta)).length,
      ventasFinalizadas: ventaList.filter((v) => finalizados.includes(v.estadoVenta)).length,
      ventasCanceladas: ventaList.filter((v) => cancelados.includes(v.estadoVenta)).length,
      montoTotal: ventaList.reduce((s, v) => s + v.monto, 0),
      comisionesTotal: ventaList.reduce((s, v) => s + v.comision, 0),
      ventas: ventaList,
    }
  })
}
