/**
 * lib/services/flujo-bmcorp/flujo-bmcorp.service.ts
 *
 * Flujo de caja para BM CORP usando datos de Monday.
 */

import { db } from '@/lib/db'
import { ventasBmcorp, repartosBmcorp } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { FlujoSemanaBmcorp } from './flujo-bmcorp.types'

export async function getFlujoBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<FlujoSemanaBmcorp[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

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
