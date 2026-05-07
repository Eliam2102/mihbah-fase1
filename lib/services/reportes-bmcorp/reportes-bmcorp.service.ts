/**
 * lib/services/reportes-bmcorp/reportes-bmcorp.service.ts
 *
 * Reportes BM CORP service.
 */

import { db } from '@/lib/db'
import { ventasBmcorp, afiliados, desarrollos } from '@/lib/db/schema'
import { eq, sql, desc, and } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { VentaReporteItem } from './reportes-bmcorp.types'

export async function getVentasReporteBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<VentaReporteItem[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        id: ventasBmcorp.id,
        cliente: ventasBmcorp.cliente,
        afiliado: afiliados.nombre,
        desarrollo: desarrollos.nombre,
        asesor: ventasBmcorp.asesor,
        monto: ventasBmcorp.monto,
        enganche: ventasBmcorp.enganche,
        comision: ventasBmcorp.comisionBmcorp,
        estadoVenta: ventasBmcorp.estadoVenta,
        fechaApertura: sql<string | null>`TO_CHAR(${ventasBmcorp.fechaApertura}, 'YYYY-MM-DD')`,
        fechaCierre: sql<string | null>`TO_CHAR(${ventasBmcorp.fechaCierre}, 'YYYY-MM-DD')`,
        lote: ventasBmcorp.loteAcciones,
        paquete: ventasBmcorp.paqueteAccion,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
      .leftJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .orderBy(desc(ventasBmcorp.fechaApertura))

    return rows.map((r) => ({
      ...r,
      monto: Number(r.monto ?? 0),
      enganche: Number(r.enganche ?? 0),
      comision: Number(r.comision ?? 0),
    }))
  })
}
