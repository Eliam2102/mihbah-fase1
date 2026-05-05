import { db } from '@/lib/db'
import { ventasBmcorp, repartosBmcorp } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'

export interface FlujoSemanaBmcorp {
  semana: string // ISO week start (YYYY-MM-DD)
  ingresos: number // From ventas (monto or enganche? Let's use monto as requested for phase 1 visual)
  egresos: number // From repartos
  neto: number
  acumulado: number
}

export async function getFlujoBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<FlujoSemanaBmcorp[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    // Group ventas by week (using fechaApertura)
    const ventas = await tx
      .select({
        semana: sql<string>`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})::date::text`,
        ingresos: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          sql`${ventasBmcorp.fechaApertura} IS NOT NULL`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)
      .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)

    // Group repartos by week
    const repartos = await tx
      .select({
        semana: sql<string>`DATE_TRUNC('week', ${repartosBmcorp.fecha})::date::text`,
        egresos: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          sql`${repartosBmcorp.fecha} IS NOT NULL`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('week', ${repartosBmcorp.fecha})`)
      .orderBy(sql`DATE_TRUNC('week', ${repartosBmcorp.fecha})`)

    // Merge by week
    const map = new Map<string, { ingresos: number; egresos: number }>()

    for (const v of ventas) {
      if (!v.semana) continue
      map.set(v.semana, { ingresos: Number(v.ingresos), egresos: 0 })
    }

    for (const r of repartos) {
      if (!r.semana) continue
      const existing = map.get(r.semana) || { ingresos: 0, egresos: 0 }
      existing.egresos = Number(r.egresos)
      map.set(r.semana, existing)
    }

    const sortedWeeks = Array.from(map.keys()).sort()

    let acumulado = 0
    const result: FlujoSemanaBmcorp[] = []

    for (const sem of sortedWeeks) {
      const data = map.get(sem)!
      const neto = data.ingresos - data.egresos
      acumulado += neto
      result.push({
        semana: sem,
        ingresos: data.ingresos,
        egresos: data.egresos,
        neto,
        acumulado,
      })
    }

    return result
  })
}
