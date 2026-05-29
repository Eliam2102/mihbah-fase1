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
  dispersiones,
  comisionesCalculadas,
} from '@/lib/db/schema'
import { and, eq, gte, isNotNull, lte, sql, desc, notInArray, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'

/**
 * Helper: detecta si ya hay datos en la tabla dispersiones (módulo nuevo).
 * Si hay, los dashboards usan dispersiones. Si no, fallback a repartosBmcorp viejo.
 */
async function usarDispersionesNuevas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  tenantId: string,
  empresaId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(dispersiones)
    .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
    .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
    .where(
      and(
        eq(dispersiones.tenantId, tenantId),
        eq(ventasBmcorp.empresaId, empresaId),
        isNotNull(dispersiones.corteId),
      ),
    )
  return Number(row?.n ?? 0) > 0
}
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

      // Excluir ventas caídas: CANCELADA y LIBERADO (liberada = se cayó).
      // RECHAZADO = error admin subsanable, sigue en proceso → se incluye.
      if (r.estado !== 'CANCELADA' && r.estado !== 'LIBERADO') {
        result.totalVendido += monto
        result.totalVentas += count
      }

      switch (r.estado) {
        case 'EN_PROCESO':
        case 'APROBADO_VENTAS':
        case 'ESPERANDO_AUTORIZACION':
        case 'RECHAZADO': // error admin subsanable, sigue en proceso
          result.enProceso.count += count
          result.enProceso.monto += monto
          break
        case 'APROBADO_JURIDICO':
          result.aprobadoJuridico.count += count
          result.aprobadoJuridico.monto += monto
          break
        case 'FINALIZADA':
        case 'FINALIZADO_Y_LIQUIDADO':
          result.finalizada.count += count
          result.finalizada.monto += monto
          break
        case 'CANCELADA':
        case 'LIBERADO': // venta liberada = caída, cuenta como cancelada
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
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
        )
      : and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
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
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
        )
      : and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
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
    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)

    let ingresoRows: { semana: string; monto: string }[] = []
    let proyectadoRows: { semana: string; monto: string }[] = []

    if (useDispersiones) {
      // Ingresos confirmados reales (comisión bruta local)
      ingresoRows = await tx
        .select({
          semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${ventasBmcorp.fechaCierre}), 'YYYY-MM-DD')`,
          monto: sql<string>`COALESCE(SUM(${comisionesCalculadas.comisionBrutaTotal}), 0)::text`,
        })
        .from(comisionesCalculadas)
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(comisionesCalculadas.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            sql`${ventasBmcorp.fechaCierre} IS NOT NULL`,
            sql`${ventasBmcorp.fechaCierre} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
            notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
          ),
        )
        .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)
        .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)

      // Ingresos proyectados reales (comisión bruta local)
      proyectadoRows = await tx
        .select({
          semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${ventasBmcorp.fechaApertura}), 'YYYY-MM-DD')`,
          monto: sql<string>`COALESCE(SUM(${comisionesCalculadas.comisionBrutaTotal}), 0)::text`,
        })
        .from(comisionesCalculadas)
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(comisionesCalculadas.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            sql`${ventasBmcorp.fechaCierre} IS NULL`,
            sql`${ventasBmcorp.fechaApertura} IS NOT NULL`,
            sql`${ventasBmcorp.fechaApertura} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
            notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
          ),
        )
        .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)
        .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)
    } else {
      // Fallback legacy (comisión bruta de Monday)
      ingresoRows = await tx
        .select({
          semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${ventasBmcorp.fechaCierre}), 'YYYY-MM-DD')`,
          monto: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
        })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            sql`${ventasBmcorp.fechaCierre} IS NOT NULL`,
            sql`${ventasBmcorp.fechaCierre} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
            notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
          ),
        )
        .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)
        .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaCierre})`)

      proyectadoRows = await tx
        .select({
          semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${ventasBmcorp.fechaApertura}), 'YYYY-MM-DD')`,
          monto: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
        })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            sql`${ventasBmcorp.fechaCierre} IS NULL`,
            sql`${ventasBmcorp.fechaApertura} IS NOT NULL`,
            sql`${ventasBmcorp.fechaApertura} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
            notInArray(ventasBmcorp.estadoVenta, ['CANCELADA']),
          ),
        )
        .groupBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)
        .orderBy(sql`DATE_TRUNC('week', ${ventasBmcorp.fechaApertura})`)
    }

    // Egresos: nuevo módulo usa dispersiones.fechaPago (solo PAGADO/PARCIAL)
    const egresoRows = useDispersiones
      ? await tx
          .select({
            semana: sql<string>`TO_CHAR(DATE_TRUNC('week', ${dispersiones.fechaPago}), 'YYYY-MM-DD')`,
            monto: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
          })
          .from(dispersiones)
          .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
          .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
          .where(
            and(
              eq(dispersiones.tenantId, tenantId),
              eq(ventasBmcorp.empresaId, empresaId),
              isNotNull(dispersiones.corteId),
              sql`${dispersiones.fechaPago} IS NOT NULL`,
              sql`${dispersiones.fechaPago} >= CURRENT_DATE - (${weeks} * INTERVAL '1 week')`,
            ),
          )
          .groupBy(sql`DATE_TRUNC('week', ${dispersiones.fechaPago})`)
          .orderBy(sql`DATE_TRUNC('week', ${dispersiones.fechaPago})`)
      : await tx
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
      map.set(r.semana, {
        semana: r.semana,
        ingresos: monto,
        ingresosProyectados: 0,
        egresos: 0,
        neto: monto,
      })
    }
    for (const r of proyectadoRows) {
      const monto = Number(r.monto)
      const existing = map.get(r.semana)
      if (existing) {
        existing.ingresosProyectados = monto
      } else {
        map.set(r.semana, {
          semana: r.semana,
          ingresos: 0,
          ingresosProyectados: monto,
          egresos: 0,
          neto: 0,
        })
      }
    }
    for (const r of egresoRows) {
      const monto = Number(r.monto)
      const existing = map.get(r.semana)
      if (existing) {
        existing.egresos = monto
        existing.neto = existing.ingresos - monto
      } else {
        map.set(r.semana, {
          semana: r.semana,
          ingresos: 0,
          ingresosProyectados: 0,
          egresos: monto,
          neto: -monto,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.semana.localeCompare(b.semana))
  })
}

// ─── Repartos ─────────────────────────────────────────────────────────────────

export async function getRepartosKpi(empresaId: string, tenantId: string): Promise<RepartosKpi> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)

    if (useDispersiones) {
      const [agg] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
          count: sql<number>`COUNT(*) FILTER (WHERE ${dispersiones.estado} = 'PAGADO')::int`,
          ultimo: sql<string | null>`MAX(${dispersiones.fechaPago})::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
          ),
        )
      return {
        totalRealizado: Number(agg?.total ?? 0),
        cantidadRealizados: Number(agg?.count ?? 0),
        ultimoReparto: agg?.ultimo ?? null,
      }
    }

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
  limit = 50,
  period?: PeriodFilter,
): Promise<RemanenteItem[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const range = periodRange(period)

    // Todas las alianzas activas con su vendido (LEFT JOIN — incluye las que no tienen ventas)
    const ventasRows = await tx
      .select({
        afiliadoId: afiliados.id,
        nombre: afiliados.nombre,
        vendido: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(afiliados)
      .leftJoin(
        ventasBmcorp,
        and(
          eq(ventasBmcorp.afiliadoId, afiliados.id),
          eq(ventasBmcorp.empresaId, empresaId),
          eq(ventasBmcorp.tenantId, tenantId),
        ),
      )
      .where(and(eq(afiliados.tenantId, tenantId), eq(afiliados.activo, true)))
      .groupBy(afiliados.id, afiliados.nombre)
      .orderBy(desc(sql`COALESCE(SUM(${ventasBmcorp.monto}), 0)`))
      .limit(limit)

    // Vendido en período (filtrado por fecha de venta)
    const vendidoPeriodoMap = new Map<string, number>()
    if (range) {
      const periodoRows = await tx
        .select({
          afiliadoId: ventasBmcorp.afiliadoId,
          monto: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            gte(ventasBmcorp.fecha, range.from),
            lte(ventasBmcorp.fecha, range.to),
          ),
        )
        .groupBy(ventasBmcorp.afiliadoId)
      for (const r of periodoRows) {
        if (r.afiliadoId) vendidoPeriodoMap.set(r.afiliadoId, Number(r.monto))
      }
    }

    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)

    // Dispersiones pagadas por alianza (vía join ventas → comisiones → dispersiones)
    const repartosMap = new Map<string, number>()
    if (useDispersiones) {
      const dispRows = await tx
        .select({
          afiliadoId: afiliados.id,
          monto: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .innerJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
          ),
        )
        .groupBy(afiliados.id)
      for (const r of dispRows) {
        repartosMap.set(r.afiliadoId, Number(r.monto))
      }
    } else {
      const repartosRows = await tx
        .select({
          beneficiario: repartosBmcorp.beneficiario,
          monto: sql<string>`COALESCE(SUM(${repartosBmcorp.monto}), 0)::text`,
        })
        .from(repartosBmcorp)
        .where(and(eq(repartosBmcorp.tenantId, tenantId), eq(repartosBmcorp.empresaId, empresaId)))
        .groupBy(repartosBmcorp.beneficiario)
      // Match por nombre (legacy)
      for (const v of ventasRows) {
        const match = repartosRows.find(
          (r) => r.beneficiario.trim().toLowerCase() === v.nombre.trim().toLowerCase(),
        )
        if (match) repartosMap.set(v.afiliadoId, Number(match.monto))
      }
    }

    return ventasRows.map((v) => {
      const vendido = Number(v.vendido)
      const repartos = repartosMap.get(v.afiliadoId) ?? 0
      const vendidoPeriodo = vendidoPeriodoMap.get(v.afiliadoId) ?? 0
      return {
        afiliadoId: v.afiliadoId,
        nombre: v.nombre,
        vendido,
        vendidoPeriodo,
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
  period?: PeriodFilter,
): Promise<RepartosSplit> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)
    const range = periodRange(period)

    if (useDispersiones) {
      // Realizado/parcial filtran por fechaPago en período (transaccional).
      // Pendiente queda sin filtro: deuda viva histórica.
      const periodoWhere = range
        ? and(gte(dispersiones.fechaPago, range.from), lte(dispersiones.fechaPago, range.to))
        : undefined

      const pagadosRows = await tx
        .select({
          estado: dispersiones.estado,
          count: sql<number>`COUNT(*)::int`,
          monto: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
            inArray(dispersiones.tipoBeneficiario, ['LIDER_SALDO', 'ASESOR']),
            inArray(dispersiones.estado, ['PAGADO', 'PARCIAL']),
            periodoWhere,
          ),
        )
        .groupBy(dispersiones.estado)

      // Pendiente: sin filtro de período (histórico vivo). Solo hija.
      const [pendienteRow] = await tx
        .select({
          count: sql<number>`COUNT(*)::int`,
          monto: sql<string>`COALESCE(SUM(${dispersiones.montoTotal} - ${dispersiones.montoPagado}), 0)::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
            inArray(dispersiones.tipoBeneficiario, ['LIDER_SALDO', 'ASESOR']),
            notInArray(dispersiones.estado, ['PAGADO']),
          ),
        )

      const [ultimoRow] = await tx
        .select({ ultimo: sql<string | null>`MAX(${dispersiones.fechaPago})::text` })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
            eq(dispersiones.estado, 'PAGADO'),
          ),
        )

      const result: RepartosSplit = {
        realizado: { count: 0, monto: 0 },
        parcial: { count: 0, monto: 0 },
        pendiente: {
          count: Number(pendienteRow?.count ?? 0),
          monto: Number(pendienteRow?.monto ?? 0),
        },
        totalMonto: 0,
        ultimoReparto: ultimoRow?.ultimo ?? null,
        sinDatos: pagadosRows.length === 0 && Number(pendienteRow?.count ?? 0) === 0,
      }
      for (const r of pagadosRows) {
        const monto = Number(r.monto)
        const count = Number(r.count)
        result.totalMonto += monto
        if (r.estado === 'PAGADO') result.realizado = { count, monto }
        else if (r.estado === 'PARCIAL') result.parcial = { count, monto }
      }
      result.totalMonto += result.pendiente.monto
      return result
    }

    // Fallback legacy: repartos_bmcorp
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
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ventasBmcorp)
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
    return Number(row?.count ?? 0)
  })
}

// ─── Comisionamiento conciliado ───────────────────────────────────────────────

export async function getComisionamientoConciliado(
  empresaId: string,
  tenantId: string,
  period?: PeriodFilter,
): Promise<ComisionamientoConciliado> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)
    const range = periodRange(period)

    if (useDispersiones) {
      // Total generado del período: comisión bruta de ventas con fecha en período
      const genWhere = range
        ? and(
            eq(comisionesCalculadas.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            gte(ventasBmcorp.fecha, range.from),
            lte(ventasBmcorp.fecha, range.to),
          )
        : and(eq(comisionesCalculadas.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId))

      const [genRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${comisionesCalculadas.comisionBrutaTotal}), 0)::text`,
        })
        .from(comisionesCalculadas)
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(genWhere)

      // Pagado/parcial del período: dispersiones con fechaPago en período
      const pagoWhere = range
        ? and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
            gte(dispersiones.fechaPago, range.from),
            lte(dispersiones.fechaPago, range.to),
          )
        : and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
          )

      const pagoRows = await tx
        .select({
          estado: dispersiones.estado,
          monto: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(pagoWhere)
        .groupBy(dispersiones.estado)

      // Pendiente: deuda viva histórica = SUM(montoTotal - montoPagado) de todas las dispersiones no pagadas
      const [pendienteRow] = await tx
        .select({
          monto: sql<string>`COALESCE(SUM(${dispersiones.montoTotal} - ${dispersiones.montoPagado}), 0)::text`,
        })
        .from(dispersiones)
        .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(dispersiones.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            isNotNull(dispersiones.corteId),
            notInArray(dispersiones.estado, ['PAGADO']),
          ),
        )

      const totalGenerado = Number(genRow?.total ?? 0)
      let pagado = 0
      let parcial = 0
      for (const r of pagoRows) {
        const monto = Number(r.monto)
        if (r.estado === 'PAGADO') pagado += monto
        else if (r.estado === 'PARCIAL') parcial += monto
      }
      const pendiente = Number(pendienteRow?.monto ?? 0)
      const porcentajeConciliado =
        totalGenerado > 0 ? Math.round(((pagado + parcial) / totalGenerado) * 100) : 0
      return {
        totalGenerado,
        pagado,
        parcial,
        pendiente,
        porcentajeConciliado,
        sinDatos: totalGenerado === 0 && pendiente === 0,
      }
    }

    // Fallback legacy
    const [genRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))

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

// ─── Semáforo BM CORP — comisión generada mes actual ──────────────────────────
// Umbral definido por cliente (PDF Semáforos V1, may-2026):
//   Verde  > $500,000 MXN/mes
//   Amarillo $300,000–$500,000
//   Rojo   < $300,000

export type SemaforoBmcorpEstado = 'VERDE' | 'AMARILLO' | 'ROJO'

export interface SemaforoBmcorpResult {
  estado: SemaforoBmcorpEstado
  comisionesMes: number
  label: string
  descripcion: string
  color: string
  bgColor: string
}

export async function getSemaforoBmcorp(
  empresaId: string,
  tenantId: string,
): Promise<SemaforoBmcorpResult> {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1
  const mesStr = String(mes).padStart(2, '0')
  const lastDay = new Date(anio, mes, 0).getDate()
  const from = `${anio}-${mesStr}-01`
  const to = `${anio}-${mesStr}-${String(lastDay).padStart(2, '0')}`

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const useDispersiones = await usarDispersionesNuevas(tx, tenantId, empresaId)

    let comisionesMes = 0

    if (useDispersiones) {
      // Acumulado de la casa = OP BM Corp (1%) + OP Yesyucan (1%). Solo ventas
      // que pagan comisión (FINALIZADA/FINALIZADO_Y_LIQUIDADO).
      const [row] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${comisionesCalculadas.montoOpBmcorp} + ${comisionesCalculadas.montoOpYesyucan}), 0)::text`,
        })
        .from(comisionesCalculadas)
        .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
        .where(
          and(
            eq(comisionesCalculadas.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
            gte(ventasBmcorp.fecha, from),
            lte(ventasBmcorp.fecha, to),
          ),
        )
      comisionesMes = Number(row?.total ?? 0)
    } else {
      // Fallback legacy (Monday puro)
      const [row] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
        })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, empresaId),
            gte(ventasBmcorp.fecha, from),
            lte(ventasBmcorp.fecha, to),
          ),
        )
      comisionesMes = Number(row?.total ?? 0)
    }

    if (comisionesMes > 500_000) {
      return {
        estado: 'VERDE',
        comisionesMes,
        label: 'Saludable',
        descripcion: 'Comisión OP (BM Corp + Yesyucan) supera la meta mensual de $500K.',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500',
      }
    }
    if (comisionesMes >= 300_000) {
      return {
        estado: 'AMARILLO',
        comisionesMes,
        label: 'Alerta',
        descripcion: 'Comisión OP (BM Corp + Yesyucan) entre $300K y $500K. Por debajo de la meta.',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-400',
      }
    }
    return {
      estado: 'ROJO',
      comisionesMes,
      label: 'Crítico',
      descripcion: 'Comisión OP (BM Corp + Yesyucan) por debajo de $300K. Revisar pipeline.',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500',
    }
  })
}
