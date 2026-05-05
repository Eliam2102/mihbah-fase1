import { db } from '@/lib/db'
import { ventasBmcorp, desarrollos, afiliados } from '@/lib/db/schema'
import { eq, sql, desc, and, notInArray } from 'drizzle-orm'

export interface CuentaPorCobrar {
  id: string
  cliente: string
  desarrollo: string | null
  montoTotal: number
  enganche: number
  saldoPendiente: number // monto - enganche
  estadoVenta: string
  fechaApertura: string | null
}

export interface CuentaPorPagarAsesor {
  id: string
  asesor: string | null
  cliente: string
  desarrollo: string | null
  comisionTotal: number
  // as per phase 1 constraints, we don't have partial payments in monday yet
  // so we assume total pending until marked FINISHED/LIQUIDADO
  saldoPendiente: number
  estadoVenta: string
}

export interface CuentasBmcorpData {
  cxc: CuentaPorCobrar[]
  cxpAsesores: CuentaPorPagarAsesor[]
}

export async function getCuentasBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<CuentasBmcorpData> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    // CXC: Ventas that are not "FINALIZADO_Y_LIQUIDADO" or "CANCELADA"
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
            'FINALIZADO_Y_LIQUIDADO',
            'CANCELADA',
            'RECHAZADO',
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

    // CXP: Comisiones a asesores
    const cxpRows = await tx
      .select({
        id: ventasBmcorp.id,
        asesor: ventasBmcorp.asesor,
        cliente: ventasBmcorp.cliente,
        desarrollo: desarrollos.nombre,
        comisionBmcorp: ventasBmcorp.comisionBmcorp,
        estadoVenta: ventasBmcorp.estadoVenta,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, [
            'FINALIZADO_Y_LIQUIDADO',
            'CANCELADA',
            'RECHAZADO',
          ]),
        ),
      )
      .orderBy(desc(ventasBmcorp.fechaApertura))

    const cxpAsesores: CuentaPorPagarAsesor[] = cxpRows.map((r) => {
      const comisionTotal = Number(r.comisionBmcorp ?? 0)
      return {
        id: r.id,
        asesor: r.asesor,
        cliente: r.cliente,
        desarrollo: r.desarrollo,
        comisionTotal,
        saldoPendiente: comisionTotal, // Assuming full amount pending
        estadoVenta: r.estadoVenta,
      }
    })

    return { cxc, cxpAsesores }
  })
}
