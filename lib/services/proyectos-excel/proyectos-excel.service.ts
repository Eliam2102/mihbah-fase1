import { db } from '@/lib/db'
import { movimientos } from '@/lib/db/schema'
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { MovimientoProyecto, ProyectoDetalle, ProyectoExcel } from './proyectos-excel.types'

// Y16 fix: query proyectoNombre text field (not FK to proyectos table)

export async function getProyectosExcel(
  empresaId: string,
  tenantId: string,
): Promise<ProyectoExcel[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        proyectoNombre: movimientos.proyectoNombre,
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA') THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        totalMovimientos: sql<number>`COUNT(${movimientos.id})::int`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          isNotNull(movimientos.proyectoNombre),
        ),
      )
      .groupBy(movimientos.proyectoNombre)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)

    return rows
      .filter((r) => r.proyectoNombre)
      .map((r) => {
        const totalIngresos = Number(r.totalIngresos)
        const totalEgresos = Number(r.totalEgresos)
        return {
          id: r.proyectoNombre!,
          name: r.proyectoNombre!,
          descripcion: null,
          activo: true,
          totalIngresos,
          totalEgresos,
          neto: totalIngresos - totalEgresos,
          totalMovimientos: Number(r.totalMovimientos),
        }
      })
  })
}

// proyectoId param = proyectoNombre text (URL-decoded by Next.js)
export async function getProyectoDetalle(
  proyectoId: string,
  empresaId: string,
  tenantId: string,
): Promise<ProyectoDetalle | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const movRows = await tx
      .select({
        id: movimientos.id,
        fecha: sql<string>`TO_CHAR(${movimientos.fecha}, 'YYYY-MM-DD')`,
        tipo: movimientos.tipo,
        monto: movimientos.monto,
        concepto: movimientos.concepto,
        nombre: movimientos.nombre,
        comentarios: movimientos.comentarios,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.proyectoNombre, proyectoId),
        ),
      )
      .orderBy(desc(movimientos.fecha))
      .limit(200)

    if (movRows.length === 0) return null

    const movList: MovimientoProyecto[] = movRows.map((r) => ({ ...r, monto: Number(r.monto) }))
    const totalIngresos = movList
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((s, m) => s + m.monto, 0)
    const totalEgresos = movList
      .filter((m) => ['EGRESO', 'SALIDA'].includes(m.tipo))
      .reduce((s, m) => s + m.monto, 0)

    return {
      id: proyectoId,
      name: proyectoId,
      descripcion: null,
      activo: true,
      totalIngresos,
      totalEgresos,
      neto: totalIngresos - totalEgresos,
      movimientos: movList,
    }
  })
}
