/**
 * lib/services/dashboard-bmcorp/dashboard-bmcorp.service.ts
 *
 * KPIs y agregaciones para el Dashboard de BM CORP.
 * Datos vienen de ventas_bmcorp (sincronizadas desde Monday.com).
 *
 * Todas las queries van envueltas en db.transaction() con set_config para
 * que RLS aplique correctamente.
 */

import { db } from '@/lib/db'
import {
  ventasBmcorp,
  repartosBmcorp,
  afiliados,
  desarrollos,
  sincronizacionesMonday,
} from '@/lib/db/schema'
import { and, eq, gte, lte, sql, desc, notInArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type {
  BmcorpKpis,
  RankingItem,
  FlujoSemana,
  RepartosKpi,
  RemanenteItem,
  UltimaSyncInfo,
  RepartosSplit,
  ComisionamientoConciliado,
  PeriodFilter,
} from './dashboard-bmcorp.types'

// ─── Periodo helper ───────────────────────────────────────────────────────────

function periodRange(p?: PeriodFilter): { from: string; to: string } | null {
  if (!p?.anio) return null
  const anio = p.anio
  if (p.mes) {
    const mes = String(p.mes).padStart(2, '0')
    const lastDay = new Date(anio, p.mes, 0).getDate()
    return { from: `${anio}-${mes}-01`, to: `${anio}-${mes}-${String(lastDay).padStart(2, '0')}` }
  }
  return { from: `${anio}-01-01`, to: `${anio}-12-31` }
}

// ─── KPIs principales ─────────────────────────────────────────────────────────

export async function getKpisBmcorp(
  empresaId: string,
  tenantId: string,
  period?: PeriodFilter,
): Promise<BmcorpKpis> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const range = periodRange(period)
    const fecha = ventasBmcorp.fecha
    const where = range
      ? and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          gte(fecha, range.from),
          lte(fecha, range.to),
        )
      : and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId))

    const rows = await tx
      .select({
        estado: ventasBmcorp.estadoVenta,
        count: sql<number>`COUNT(*)::int`,
        monto: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(where)
      .groupBy(ventasBmcorp.estadoVenta)

    const result: BmcorpKpis = {
      totalVendido: 0,
      totalVentas: 0,
      enProceso: { count: 0, monto: 0 },
      aprobadoJuridico: { count: 0, monto: 0 },
      finalizada: { count: 0, monto: 0 },
      cancelada: { count: 0, monto: 0 },
    }

    for (const r of rows) {
      const monto = Number(r.monto)
      const count = Number(r.count)

      // B1: exclude CANCELADA/RECHAZADO from totalVendido
      if (r.estado !== 'CANCELADA' && r.estado !== 'RECHAZADO') {
        result.totalVendido += monto
        result.totalVentas += count
      }

      switch (r.estado) {
        case 'EN_PROCESO':
        case 'APROBADO_VENTAS':
        case 'ESPERANDO_AUTORIZACION':
          result.enProceso.count += count
          result.enProceso.monto += monto
          break
        case 'APROBADO_JURIDICO':
        case 'LIBERADO':
          result.aprobadoJuridico.count += count
          result.aprobadoJuridico.monto += monto
          break
        case 'FINALIZADA':
        case 'FINALIZADO_Y_LIQUIDADO':
          result.finalizada.count += count
          result.finalizada.monto += monto
          break
        case 'CANCELADA':
        case 'RECHAZADO':
          result.cancelada.count += count
          result.cancelada.monto += monto
          break
      }
    }
    return result
  })
}

// ─── Ranking de afiliados ─────────────────────────────────────────────────────

export async function getRankingAfiliados(
  empresaId: string,
  tenantId: string,
  period?: PeriodFilter,
  limit = 10,
): Promise<RankingItem[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const range = periodRange(period)
    const fecha = ventasBmcorp.fecha

    const where = range
      ? and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          gte(fecha, range.from),
          lte(fecha, range.to),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA', 'RECHAZADO']),
        )
      : and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA', 'RECHAZADO']),
        )

    const rows = await tx
      .select({
        id: afiliados.id,
        nombre: afiliados.nombre,
        monto: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        ventas: sql<number>`COUNT(${ventasBmcorp.id})::int`,
      })
      .from(ventasBmcorp)
      .innerJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
      .where(where)
      .groupBy(afiliados.id, afiliados.nombre)
      .orderBy(desc(sql`SUM(${ventasBmcorp.monto})`))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      monto: Number(r.monto),
      ventas: Number(r.ventas),
    }))
  })
}

// ─── Ranking de desarrollos ───────────────────────────────────────────────────

export async function getRankingDesarrollos(
  empresaId: string,
  tenantId: string,
  period?: PeriodFilter,
  limit = 10,
): Promise<RankingItem[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const range = periodRange(period)
    const fecha = ventasBmcorp.fecha

    const where = range
      ? and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          gte(fecha, range.from),
          lte(fecha, range.to),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA', 'RECHAZADO']),
        )
      : and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA', 'RECHAZADO']),
        )

    const rows = await tx
      .select({
        id: desarrollos.id,
        nombre: desarrollos.nombre,
        desarrolladora: desarrollos.desarrolladora,
        monto: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        ventas: sql<number>`COUNT(${ventasBmcorp.id})::int`,
      })
      .from(ventasBmcorp)
      .innerJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(where)
      .groupBy(desarrollos.id, desarrollos.nombre, desarrollos.desarrolladora)
      .orderBy(desc(sql`SUM(${ventasBmcorp.monto})`))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      desarrolladora: r.desarrolladora,
      monto: Number(r.monto),
      ventas: Number(r.ventas),
    }))
  })
}

// ─── Flujo semanal ────────────────────────────────────────────────────────────

export async function getFlujoSemanal(
  empresaId: string,
  tenantId: string,
  weeks = 12,
): Promise<FlujoSemana[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Ingresos: ventas con fechaCierre dentro del periodo, agrupadas por semana ISO
    const ingresoRows = await tx
      .select({
        semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${ventasBmcorp.fechaCierre}), 'YYYY-MM-DD')`,
        monto: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          sql`${ventasBmcorp.fechaCierre} IS NOT NULL`,
          sql`${ventasBmcorp.fechaCierre} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)
      .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)

    // Egresos = repartos pagados a alianzas
    const egresoRows = await tx
      .select({
        semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${repartosBmcorp.fecha}), 'YYYY-MM-DD')`,
        monto: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          sql`${repartosBmcorp.fecha} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('week', ${repartosBmcorp.fecha})`)
      .orderBy(sql`DATE_TRUNC('week', ${repartosBmcorp.fecha})`)

    const map = new Map<string, FlujoSemana>()
    for (const r of ingresoRows) {
      const monto = Number(r.monto)
      map.set(r.semana, { semana: r.semana, ingresos: monto, egresos: 0, neto: monto })
    }
    for (const r of egresoRows) {
      const monto = Number(r.monto)
      const existing = map.get(r.semana)
      if (existing) {
        existing.egresos = monto
        existing.neto = existing.ingresos - monto
      } else {
        map.set(r.semana, { semana: r.semana, ingresos: 0, egresos: monto, neto: -monto })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.semana.localeCompare(b.semana))
  })
}

// ─── Repartos ─────────────────────────────────────────────────────────────────

export async function getRepartosKpi(empresaId: string, tenantId: string): Promise<RepartosKpi> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [agg] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
        count: sql<number>`COUNT(*)::int`,
        ultimo: sql<string | null>`MAX(${repartosBmcorp.fecha})::text`,
      })
      .from(repartosBmcorp)
      .where(and(eq(repartosBmcorp.tenantId, tenantId), eq(repartosBmcorp.empresaId, empresaId)))

    return {
      totalRealizado: Number(agg?.total ?? 0),
      cantidadRealizados: Number(agg?.count ?? 0),
      ultimoReparto: agg?.ultimo ?? null,
    }
  })
}

// ─── Remanentes por afiliado ──────────────────────────────────────────────────

export async function getRemanentesPorAfiliado(
  empresaId: string,
  tenantId: string,
  limit = 10,
): Promise<RemanenteItem[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Total vendido por afiliado
    const ventasRows = await tx
      .select({
        afiliadoId: afiliados.id,
        nombre: afiliados.nombre,
        vendido: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .innerJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .groupBy(afiliados.id, afiliados.nombre)
      .orderBy(desc(sql`SUM(${ventasBmcorp.monto})`))
      .limit(limit)

    // Repartos por beneficiario
    const repartosRows = await tx
      .select({
        beneficiario: repartosBmcorp.beneficiario,
        monto: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(and(eq(repartosBmcorp.tenantId, tenantId), eq(repartosBmcorp.empresaId, empresaId)))
      .groupBy(repartosBmcorp.beneficiario)

    const repartosMap = new Map(
      repartosRows.map((r) => [r.beneficiario.trim().toLowerCase(), Number(r.monto)]),
    )

    return ventasRows.map((v) => {
      const vendido = Number(v.vendido)
      const repartos = repartosMap.get(v.nombre.trim().toLowerCase()) ?? 0
      return {
        afiliadoId: v.afiliadoId,
        nombre: v.nombre,
        vendido,
        repartos,
        remanente: vendido - repartos,
      }
    })
  })
}

// ─── Última sincronización Monday ─────────────────────────────────────────────

export async function getUltimaSync(empresaId: string, tenantId: string): Promise<UltimaSyncInfo> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [row] = await tx
      .select({
        finalizadaEn: sincronizacionesMonday.finalizadaEn,
        creados: sincronizacionesMonday.registrosCreados,
        actualizados: sincronizacionesMonday.registrosActualizados,
        errores: sincronizacionesMonday.registrosErrores,
      })
      .from(sincronizacionesMonday)
      .where(
        and(
          eq(sincronizacionesMonday.tenantId, tenantId),
          eq(sincronizacionesMonday.empresaId, empresaId),
          eq(sincronizacionesMonday.estado, 'COMPLETADO'),
        ),
      )
      .orderBy(desc(sincronizacionesMonday.finalizadaEn))
      .limit(1)

    const fecha = row?.finalizadaEn ? row.finalizadaEn.toISOString() : null
    const STALE_MS = 24 * 60 * 60 * 1000
    const stale = !fecha || Date.now() - new Date(fecha).getTime() > STALE_MS

    return {
      fecha,
      creados: row?.creados ?? 0,
      actualizados: row?.actualizados ?? 0,
      errores: row?.errores ?? 0,
      stale,
    }
  })
}

// ─── Repartos split (realizado / parcial / pendiente) ─────────────────────────

export async function getRepartosSplit(
  empresaId: string,
  tenantId: string,
): Promise<RepartosSplit> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        estado: repartosBmcorp.estado,
        count: sql<number>`COUNT(*)::int`,
        monto: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          eq(repartosBmcorp.tipo, 'REPARTO_ALIANZA'),
        ),
      )
      .groupBy(repartosBmcorp.estado)

    const [ultimoRow] = await tx
      .select({ ultimo: sql<string | null>`MAX(${repartosBmcorp.fecha})::text` })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          eq(repartosBmcorp.tipo, 'REPARTO_ALIANZA'),
          eq(repartosBmcorp.estado, 'PAGADO'),
        ),
      )

    const result: RepartosSplit = {
      realizado: { count: 0, monto: 0 },
      parcial: { count: 0, monto: 0 },
      pendiente: { count: 0, monto: 0 },
      totalMonto: 0,
      ultimoReparto: ultimoRow?.ultimo ?? null,
      sinDatos: rows.length === 0,
    }
    for (const r of rows) {
      const monto = Number(r.monto)
      const count = Number(r.count)
      result.totalMonto += monto
      if (r.estado === 'PAGADO') result.realizado = { count, monto }
      else if (r.estado === 'PARCIAL') result.parcial = { count, monto }
      else result.pendiente = { count, monto }
    }
    return result
  })
}

// ─── Total ventas sin filtro de período (para empty state inteligente) ───────

export async function countVentasTotal(empresaId: string, tenantId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(ventasBmcorp)
    .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
  return Number(row?.count ?? 0)
}

// ─── Comisionamiento conciliado ───────────────────────────────────────────────

export async function getComisionamientoConciliado(
  empresaId: string,
  tenantId: string,
): Promise<ComisionamientoConciliado> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Total comisión generada
    const [genRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))

    // Pagos tipo COMISION_ASESOR agrupados por estado
    const pagoRows = await tx
      .select({
        estado: repartosBmcorp.estado,
        monto: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
      })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, tenantId),
          eq(repartosBmcorp.empresaId, empresaId),
          eq(repartosBmcorp.tipo, 'COMISION_ASESOR'),
        ),
      )
      .groupBy(repartosBmcorp.estado)

    const totalGenerado = Number(genRow?.total ?? 0)
    let pagado = 0
    let parcial = 0
    for (const r of pagoRows) {
      const monto = Number(r.monto)
      if (r.estado === 'PAGADO') pagado = monto
      else if (r.estado === 'PARCIAL') parcial = monto
    }
    const pendiente = Math.max(0, totalGenerado - pagado - parcial)
    const porcentajeConciliado =
      totalGenerado > 0 ? Math.round(((pagado + parcial) / totalGenerado) * 100) : 0

    return {
      totalGenerado,
      pagado,
      parcial,
      pendiente,
      porcentajeConciliado,
      sinDatos: pagoRows.length === 0,
    }
  })
}
