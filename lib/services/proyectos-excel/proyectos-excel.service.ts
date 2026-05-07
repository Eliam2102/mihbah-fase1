import { db } from '@/lib/db'
import { proyectos, movimientos } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { MovimientoProyecto, ProyectoDetalle, ProyectoExcel } from './proyectos-excel.types'

export async function getProyectosExcel(
  empresaId: string,
  tenantId: string,
): Promise<ProyectoExcel[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        id: proyectos.id,
        name: proyectos.name,
        descripcion: proyectos.descripcion,
        activo: proyectos.activo,
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA','PRESTAMO') THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        totalMovimientos: sql<number>`COUNT(${movimientos.id})::int`,
      })
      .from(proyectos)
      .leftJoin(
        movimientos,
        and(eq(movimientos.proyectoId, proyectos.id), eq(movimientos.tenantId, tenantId)),
      )
      .where(and(eq(proyectos.empresaId, empresaId), eq(proyectos.tenantId, tenantId)))
      .groupBy(proyectos.id, proyectos.name, proyectos.descripcion, proyectos.activo)
      .orderBy(proyectos.name)

    return rows.map((r) => {
      const totalIngresos = Number(r.totalIngresos)
      const totalEgresos = Number(r.totalEgresos)
      return {
        id: r.id,
        name: r.name,
        descripcion: r.descripcion,
        activo: r.activo,
        totalIngresos,
        totalEgresos,
        neto: totalIngresos - totalEgresos,
        totalMovimientos: Number(r.totalMovimientos),
      }
    })
  })
}

export async function getProyectoDetalle(
  proyectoId: string,
  empresaId: string,
  tenantId: string,
): Promise<ProyectoDetalle | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [proyecto] = await tx
      .select({
        id: proyectos.id,
        name: proyectos.name,
        descripcion: proyectos.descripcion,
        activo: proyectos.activo,
      })
      .from(proyectos)
      .where(
        and(
          eq(proyectos.id, proyectoId),
          eq(proyectos.empresaId, empresaId),
          eq(proyectos.tenantId, tenantId),
        ),
      )
      .limit(1)

    if (!proyecto) return null

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
          eq(movimientos.proyectoId, proyectoId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.tenantId, tenantId),
        ),
      )
      .orderBy(desc(movimientos.fecha))
      .limit(200)

    const movList: MovimientoProyecto[] = movRows.map((r) => ({ ...r, monto: Number(r.monto) }))
    const totalIngresos = movList
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((s, m) => s + m.monto, 0)
    const totalEgresos = movList
      .filter((m) => ['EGRESO', 'SALIDA', 'PRESTAMO'].includes(m.tipo))
      .reduce((s, m) => s + m.monto, 0)

    return {
      ...proyecto,
      totalIngresos,
      totalEgresos,
      neto: totalIngresos - totalEgresos,
      movimientos: movList,
    }
  })
}
