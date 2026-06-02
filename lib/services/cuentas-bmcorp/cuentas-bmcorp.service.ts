/**
 * lib/services/cuentas-bmcorp/cuentas-bmcorp.service.ts
 *
 * Cuentas por cobrar y pagar para BM CORP.
 * CXC: ventas abiertas (saldo cliente → BM CORP).
 * CXP: dispersiones calculadas no pagadas (comisiones que BM CORP debe a líderes/asesores).
 */

import { db } from '@/lib/db'
import { ventasBmcorp, desarrollos, dispersiones, comisionesCalculadas } from '@/lib/db/schema'
import { eq, sql, desc, and, notInArray, isNull, not, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type {
  CuentaPorCobrar,
  DispersionPendiente,
  CuentasBmcorpData,
} from './cuentas-bmcorp.types'

export async function getCuentasBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<CuentasBmcorpData> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // ── CXC: ventas abiertas — lo que los clientes deben a BM CORP ─────────
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

    // ── CXP: dispersiones calculadas no pagadas — lo que BM CORP debe ──────
    // Fuente: módulo de comisiones (dispersiones) no en estado PAGADO.
    // Incluye PENDIENTE, EN_REVISION, AUTORIZADA, PARCIAL, DIFERIDO.
    const cxpRows = await tx
      .select({
        id: dispersiones.id,
        beneficiarioNombre: dispersiones.beneficiarioNombre,
        tipoBeneficiario: dispersiones.tipoBeneficiario,
        cliente: ventasBmcorp.cliente,
        montoTotal: dispersiones.montoTotal,
        montoPagado: dispersiones.montoPagado,
        estado: dispersiones.estado,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(
        and(
          eq(dispersiones.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          not(eq(dispersiones.estado, 'PAGADO')),
          isNull(dispersiones.deletedAt),
        ),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))

    const cxpAsesores: DispersionPendiente[] = cxpRows.map((r) => {
      const montoTotal = Number(r.montoTotal ?? 0)
      const montoPagado = Number(r.montoPagado ?? 0)
      return {
        id: r.id,
        beneficiarioNombre: r.beneficiarioNombre,
        tipoBeneficiario: r.tipoBeneficiario,
        cliente: r.cliente,
        montoTotal,
        montoPagado,
        saldoPendiente: Math.max(0, montoTotal - montoPagado),
        estado: r.estado,
      }
    })

    return { cxc, cxpAsesores }
  })
}
