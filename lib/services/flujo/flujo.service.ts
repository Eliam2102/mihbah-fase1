/**
 * lib/services/flujo/flujo.service.ts
 *
 * Servicio de Flujo de Caja para empresas que usan `movimientos`
 * (MIHBAH y YCDI). BM CORP tiene su propio servicio porque sus datos
 * vienen de Monday.
 */

import { db } from '@/lib/db'
import { movimientos } from '@/lib/db/schema'
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import { MESES_LABEL } from '../_shared/date.helpers'
import type { FlujoMes, FlujoTrimestre, MovimientoDetalle } from './flujo.types'

/** Años distintos con datos en movimientos para una empresa. Orden DESC. */
export async function getAñosConDatos(empresaId: string, tenantId: string): Promise<number[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .selectDistinct({ anio: sql<number>`EXTRACT(YEAR FROM ${movimientos.fecha})::int` })
      .from(movimientos)
      .where(and(eq(movimientos.tenantId, tenantId), eq(movimientos.empresaId, empresaId)))
    return rows
      .map((r) => r.anio)
      .filter((a): a is number => a != null)
      .sort((a, b) => b - a)
  })
}

// ─── Flujo mensual ────────────────────────────────────────────────────────────

/**
 * Flujo mensual del año. Devuelve 12 meses (rellena ceros donde no hay datos).
 */
export async function getFlujoMensual(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<FlujoMes[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        mes: sql<number>`EXTRACT(MONTH FROM ${movimientos.fecha})::int`,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA') THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          gte(movimientos.fecha, `${anio}-01-01`),
          lte(movimientos.fecha, `${anio}-12-31`),
        ),
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${movimientos.fecha})`)

    // Llenar 12 meses con ceros
    const result: FlujoMes[] = []
    let acumulado = 0
    for (let m = 1; m <= 12; m++) {
      const r = rows.find((x) => Number(x.mes) === m)
      const ingresos = Number(r?.ingresos ?? 0)
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

// ─── Flujo trimestral ─────────────────────────────────────────────────────────

export async function getFlujoTrimestral(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<FlujoTrimestre[]> {
  const meses = await getFlujoMensual(empresaId, tenantId, anio)
  const result: FlujoTrimestre[] = []
  for (let q = 1; q <= 4; q++) {
    const desde = (q - 1) * 3 + 1
    const hasta = q * 3
    const slice = meses.filter((m) => m.mes >= desde && m.mes <= hasta)
    const ingresos = slice.reduce((s, m) => s + m.ingresos, 0)
    const egresos = slice.reduce((s, m) => s + m.egresos, 0)
    result.push({
      anio,
      trimestre: q,
      label: `Q${q} ${anio}`,
      ingresos,
      egresos,
      neto: ingresos - egresos,
    })
  }
  return result
}

// ─── Flujo anual ──────────────────────────────────────────────────────────────

export async function getFlujoAnual(
  empresaId: string,
  tenantId: string,
  anioDesde = new Date().getFullYear() - 4,
  anioHasta = new Date().getFullYear(),
): Promise<FlujoMes[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        anio: sql<number>`EXTRACT(YEAR FROM ${movimientos.fecha})::int`,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA') THEN ${movimientos.monto} ELSE 0 END), 0)::text`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          gte(movimientos.fecha, `${anioDesde}-01-01`),
          lte(movimientos.fecha, `${anioHasta}-12-31`),
        ),
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${movimientos.fecha})`)

    let acumulado = 0
    return rows.map((r) => {
      const ingresos = Number(r.ingresos)
      const egresos = Number(r.egresos)
      const neto = ingresos - egresos
      acumulado += neto
      return {
        anio: Number(r.anio),
        mes: 0,
        mesLabel: String(r.anio),
        ingresos,
        egresos,
        neto,
        acumulado,
      }
    })
  })
}

// ─── Drill-down: movimientos de un mes ────────────────────────────────────────

export async function getMovimientosMes(
  empresaId: string,
  tenantId: string,
  anio: number,
  mes: number,
  limit = 100,
): Promise<MovimientoDetalle[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const lastDay = new Date(anio, mes, 0).getDate()
    const mesStr = String(mes).padStart(2, '0')
    const from = `${anio}-${mesStr}-01`
    const to = `${anio}-${mesStr}-${String(lastDay).padStart(2, '0')}`

    const rows = await tx
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
          gte(movimientos.fecha, from),
          lte(movimientos.fecha, to),
          inArray(movimientos.tipo, ['INGRESO', 'EGRESO', 'SALIDA', 'PRESTAMO']),
        ),
      )
      .orderBy(sql`${movimientos.fecha} DESC, ${movimientos.monto} DESC`)
      .limit(limit)

    return rows.map((r) => ({
      ...r,
      monto: Number(r.monto),
    }))
  })
}
