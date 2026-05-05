import { db } from '@/lib/db'
import { desarrollos, ventasBmcorp } from '@/lib/db/schema'
import { eq, sql, desc, and } from 'drizzle-orm'

export interface ProyectoStats {
  id: string
  nombre: string
  desarrolladora: string | null
  ventasProceso: number
  ventasFinalizadas: number
  ventasTotal: number
  montoTotal: number
  comisionesTotal: number
}

export async function getProyectosBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<ProyectoStats[]> {
  return db.transaction(async (tx) => {
    // RLS context
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    const rows = await tx
      .select({
        id: desarrollos.id,
        nombre: desarrollos.nombre,
        desarrolladora: desarrollos.desarrolladora,
        ventasProceso: sql<number>`SUM(CASE WHEN ${ventasBmcorp.estadoVenta} IN ('EN_PROCESO', 'APROBADO_VENTAS', 'ESPERANDO_AUTORIZACION', 'APROBADO_JURIDICO', 'LIBERADO') THEN 1 ELSE 0 END)::int`,
        ventasFinalizadas: sql<number>`SUM(CASE WHEN ${ventasBmcorp.estadoVenta} IN ('FINALIZADA', 'FINALIZADO_Y_LIQUIDADO') THEN 1 ELSE 0 END)::int`,
        ventasTotal: sql<number>`COUNT(${ventasBmcorp.id})::int`,
        montoTotal: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        comisionesTotal: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
      })
      .from(ventasBmcorp)
      .innerJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .groupBy(desarrollos.id, desarrollos.nombre, desarrollos.desarrolladora)
      .orderBy(desc(sql`SUM(${ventasBmcorp.monto})`))

    return rows.map((r) => ({
      ...r,
      montoTotal: Number(r.montoTotal),
      comisionesTotal: Number(r.comisionesTotal),
    }))
  })
}
