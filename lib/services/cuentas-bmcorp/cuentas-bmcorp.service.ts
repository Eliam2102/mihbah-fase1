/**
 * lib/services/cuentas-bmcorp/cuentas-bmcorp.service.ts
 *
 * Cuentas por cobrar y pagar para BM CORP.
 */

import { db } from '@/lib/db'
import { ventasBmcorp, desarrollos } from '@/lib/db/schema'
import { eq, sql, desc, and, notInArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type {
  CuentaPorCobrar,
  CuentaPorPagarAsesor,
  CuentasBmcorpData,
} from './cuentas-bmcorp.types'

export async function getCuentasBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<CuentasBmcorpData> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const cxcRows = await tx
      .select({
        id: ventasBmcorp.id,
        cliente: ventasBmcorp.cliente,
        desarrollo: desarrollos.nombre,
        monto: ventasBmcorp.monto,
        enganche: ventasBmcorp.enganche,
        estadoVenta: ventasBmcorp.estadoVenta,
        fechaApertura: sql<string | null>`TO_CHAR(${ventasBmcorp.fechaApertura}, 'YYYY-MM-DD')`,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, [
            'FINALIZADA',
            'FINALIZADO_Y_LIQUIDADO',
            'CANCELADA',
          ]),
        ),
      )
      .orderBy(desc(ventasBmcorp.fechaApertura))

    const cxc: CuentaPorCobrar[] = cxcRows.map((r) => {
      const montoTotal = Number(r.monto ?? 0)
      const enganche = Number(r.enganche ?? 0)
      return {
        id: r.id,
        cliente: r.cliente,
        desarrollo: r.desarrollo,
        montoTotal,
        enganche,
        saldoPendiente: Math.max(0, montoTotal - enganche),
        estadoVenta: r.estadoVenta,
        fechaApertura: r.fechaApertura,
      }
    })

    const cxpRows = await tx
      .select({
        id: ventasBmcorp.id,
        asesor: ventasBmcorp.asesor,
        cliente: ventasBmcorp.cliente,
        desarrollo: desarrollos.nombre,
        comisionBmcorp: ventasBmcorp.comisionBmcorp,
        estadoVenta: ventasBmcorp.estadoVenta,
        // Suma de pagos COMISION_ASESOR ya realizados (PAGADO + PARCIAL)
        comisionPagada: sql<string>`COALESCE((
          SELECT SUM(r.monto) FROM repartos_bmcorp r
          WHERE r.venta_id = ${ventasBmcorp.id}
            AND r.tipo = 'COMISION_ASESOR'
            AND r.estado IN ('PAGADO','PARCIAL')
        ), 0)::text`,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, [
            'FINALIZADA',
            'FINALIZADO_Y_LIQUIDADO',
            'CANCELADA',
          ]),
        ),
      )
      .orderBy(desc(ventasBmcorp.fechaApertura))

    const cxpAsesores: CuentaPorPagarAsesor[] = cxpRows.map((r) => {
      const comisionTotal = Number(r.comisionBmcorp ?? 0)
      const comisionPagada = Number(r.comisionPagada ?? 0)
      return {
        id: r.id,
        asesor: r.asesor,
        cliente: r.cliente,
        desarrollo: r.desarrollo,
        comisionTotal,
        saldoPendiente: Math.max(0, comisionTotal - comisionPagada),
        estadoVenta: r.estadoVenta,
      }
    })

    return { cxc, cxpAsesores }
  })
}
