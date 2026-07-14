/**
 * lib/services/flujo-bmcorp/flujo-bmcorp.service.ts
 *
 * Flujo de caja para BM CORP usando datos de Monday.
 */

import { db } from '@/lib/db'
import { ventasBmcorp, repartosBmcorp } from '@/lib/db/schema'
import { eq, gte, lte, sql, and } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import { MESES_LABEL } from '../_shared/date.helpers'
import type { FlujoSemanaBmcorp } from './flujo-bmcorp.types'
import type { FlujoMes } from '../flujo/flujo.types'

/** Años distintos con ventas registradas en BM CORP. Orden DESC. */
export async function getAñosConDatosBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<number[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .selectDistinct({ anio: sql<number>`EXTRACT(YEAR FROM ${ventasBmcorp.fechaApertura})::int` })
      .from(ventasBmcorp)
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
    return rows
      .map((r) => r.anio)
      .filter((a): a is number => a != null)
      .sort((a, b) => b - a)
  })
}

export async function getFlujoBmcorp(
  empresaId: string,
  tenantId: string,
  anio?: number,
): Promise<FlujoSemanaBmcorp[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const yearFilter = anio
      ? sql`EXTRACT(YEAR FROM ${ventasBmcorp.fechaApertura}) = ${anio}`
      : sql`TRUE`
    const yearFilterRepartos = anio
      ? sql`EXTRACT(YEAR FROM ${repartosBmcorp.fecha}) = ${anio}`
      : sql`TRUE`

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
          yearFilter,
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
          yearFilterRepartos,
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

export async function getFlujoBmcorpMensual(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<FlujoMes[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const ventasRows = await tx
      .select({
        mes: sql<number>`EXTRACT(MONTH FROM ${ventasBmcorp.fechaApertura})::int`,
        ingresos: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          sql`${ventasBmcorp.fechaApertura} IS NOT NULL`,
          gte(ventasBmcorp.fechaApertura, `${anio}-01-01`),
          lte(ventasBmcorp.fechaApertura, `${anio}-12-31`),
        ),
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${ventasBmcorp.fechaApertura})`)

    const repartosRows = await tx
      .select({
        mes: sql<number>`EXTRACT(MONTH FROM ${repartosBmcorp.fecha})::int`,
        egresos: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          sql`${repartosBmcorp.fecha} IS NOT NULL`,
          gte(repartosBmcorp.fecha, `${anio}-01-01`),
          lte(repartosBmcorp.fecha, `${anio}-12-31`),
        ),
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${repartosBmcorp.fecha})`)

    const result: FlujoMes[] = []
    let acumulado = 0
    for (let m = 1; m <= 12; m++) {
      const v = ventasRows.find((r) => Number(r.mes) === m)
      const r = repartosRows.find((x) => Number(x.mes) === m)
      const ingresos = Number(v?.ingresos ?? 0)
      const egresos = Number(r?.egresos ?? 0)
      const neto = ingresos - egresos
      acumulado += neto
      result.push({
        anio,
        mes: m,
        mesLabel: MESES_LABEL[m - 1]!,
        ingresos,
        egresos,
        neto,
        acumulado,
      })
    }
    return result
  })
}
