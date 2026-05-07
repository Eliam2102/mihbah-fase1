import { db } from '@/lib/db'
import { movimientos, proyectos } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { MovimientoReporte } from './reportes-excel.types'

export async function getMovimientosReporte(
  empresaId: string,
  tenantId: string,
  limit = 200,
): Promise<MovimientoReporte[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        id: movimientos.id,
        fecha: sql<string>`TO_CHAR(${movimientos.fecha}, 'YYYY-MM-DD')`,
        tipo: movimientos.tipo,
        monto: movimientos.monto,
        concepto: movimientos.concepto,
        nombre: movimientos.nombre,
        proyectoNombre: proyectos.name,
        comentarios: movimientos.comentarios,
      })
      .from(movimientos)
      .leftJoin(proyectos, eq(movimientos.proyectoId, proyectos.id))
      .where(and(eq(movimientos.empresaId, empresaId), eq(movimientos.tenantId, tenantId)))
      .orderBy(desc(movimientos.fecha))
      .limit(limit)

    return rows.map((r) => ({ ...r, monto: Number(r.monto) }))
  })
}
