/**
 * Listado de TODAS las ventas BM CORP con métricas asociadas.
 *
 * A diferencia del listing antiguo (que solo mostraba ventas con comisión
 * calculada), este servicio devuelve TODAS las ventas — incluyendo las que
 * aún no tienen esquema/comisión asignado. Permite a Joana ver el universo
 * completo desde el sistema (no solo Monday).
 *
 * Soporta filtros server-side:
 *   - tab/grupo de estado: por_cerrar | cerradas | en_proceso | canceladas | todas
 *   - año / mes (sobre fechaApertura por default, fechaCierre opcional)
 *   - alianza (afiliadoId)
 *   - desarrollo (desarrolloId)
 *   - búsqueda libre (cliente, mondayItemId, asesor)
 *   - paginación cursor-less (offset/limit)
 */

import { db } from '@/lib/db'
import {
  afiliados,
  comisionesCalculadas,
  desarrollos,
  dispersiones,
  ventasBmcorp,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'

export type EstadoVenta =
  | 'EN_PROCESO'
  | 'APROBADO_JURIDICO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'APROBADO_VENTAS'
  | 'RECHAZADO'
  | 'ESPERANDO_AUTORIZACION'
  | 'LIBERADO'
  | 'FINALIZADO_Y_LIQUIDADO'

export type GrupoEstado = 'todas' | 'por_cerrar' | 'cerradas' | 'en_proceso' | 'canceladas'

const GRUPOS_ESTADOS: Record<Exclude<GrupoEstado, 'todas'>, EstadoVenta[]> = {
  por_cerrar: ['EN_PROCESO', 'APROBADO_VENTAS', 'APROBADO_JURIDICO', 'ESPERANDO_AUTORIZACION'],
  // Solo estas pagan comisión / entran a corte. LIBERADO NO (venta caída).
  cerradas: ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'],
  en_proceso: ['RECHAZADO'],
  // LIBERADO = venta liberada/caída → se agrupa con canceladas (no se paga).
  canceladas: ['CANCELADA', 'LIBERADO'],
}

export interface VentaListItem {
  ventaId: string
  cliente: string
  mondayItemId: string | null
  alianzaId: string | null
  alianzaNombre: string | null
  asesor: string | null
  desarrolloId: string | null
  desarrolloNombre: string | null
  loteAcciones: string | null
  monto: number
  enganche: number
  porcentajeEnganchePagado: number // enganche/monto * 100 (clamped 0-100)
  estadoVenta: EstadoVenta
  fechaApertura: string | null
  fechaCierre: string | null
  diasEnPipeline: number | null
  diasParaCierre: number | null
  comisionId: string | null
  comisionBmEsperada: number // comisionBrutaTotal de comisionesCalculadas (0 si no hay) — total que paga el cliente
  comisionOpBmcorp: number // montoOpBmcorp (1% típico) — la rebanada operativa de BM
  comisionPagada: number // SUM dispersiones.montoPagado
  porcentajeAvancePago: number // pagada/esperada * 100 (clamped 0-100)
  sinEsquema: boolean // true si no tiene comision_calculada o sinConfig=true
}

export interface VentasListResult {
  rows: VentaListItem[]
  total: number
  stats: {
    totalVendido: number
    totalComisionGenerada: number
    totalComisionPagada: number
    porcentajeConciliado: number
    contadores: Record<GrupoEstado, number>
  }
}

export interface VentasFilter {
  grupo: GrupoEstado
  anio?: number
  mes?: number // 1-12
  fechaCampo?: 'apertura' | 'cierre' // default apertura
  afiliadoId?: string
  desarrolloId?: string
  asesor?: string // filtro libre por nombre de asesor
  query?: string
  page?: number
  pageSize?: number
}

export async function listarVentas(
  tenantId: string,
  empresaId: string,
  filter: VentasFilter,
): Promise<VentasListResult> {
  const pageSize = Math.min(filter.pageSize ?? 50, 200)
  const page = Math.max(1, filter.page ?? 1)
  const offset = (page - 1) * pageSize

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // ── Construir WHERE base ────────────────────────────────────────────────
    const conds = [
      eq(ventasBmcorp.tenantId, tenantId),
      eq(ventasBmcorp.empresaId, empresaId),
      inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
    ]

    // El filtro de grupo ya no aplica si forzamos a que solo sean FINALIZADAS,
    // pero lo dejamos por compatibilidad de tipos (siempre serán finalizadas).
    if (filter.grupo && filter.grupo !== 'todas' && filter.grupo === 'cerradas') {
      conds.push(inArray(ventasBmcorp.estadoVenta, GRUPOS_ESTADOS.cerradas))
    }

    if (filter.anio) {
      const campo =
        filter.fechaCampo === 'cierre' ? ventasBmcorp.fechaCierre : ventasBmcorp.fechaApertura
      if (filter.mes) {
        const mes = String(filter.mes).padStart(2, '0')
        const lastDay = new Date(filter.anio, filter.mes, 0).getDate()
        conds.push(gte(campo, `${filter.anio}-${mes}-01`))
        conds.push(lte(campo, `${filter.anio}-${mes}-${String(lastDay).padStart(2, '0')}`))
      } else {
        conds.push(gte(campo, `${filter.anio}-01-01`))
        conds.push(lte(campo, `${filter.anio}-12-31`))
      }
    }

    if (filter.afiliadoId) conds.push(eq(ventasBmcorp.afiliadoId, filter.afiliadoId))
    if (filter.desarrolloId) conds.push(eq(ventasBmcorp.desarrolloId, filter.desarrolloId))
    if (filter.asesor?.trim()) conds.push(ilike(ventasBmcorp.asesor, `%${filter.asesor.trim()}%`))

    if (filter.query?.trim()) {
      const q = `%${filter.query.trim()}%`
      conds.push(
        or(
          ilike(ventasBmcorp.cliente, q),
          ilike(ventasBmcorp.loteAcciones, q),
          ilike(ventasBmcorp.asesor, q),
        )!,
      )
    }

    const where = and(...conds)

    // ── Total + stats agregados (sin paginación) ────────────────────────────
    const [statsRow] = await tx
      .select({
        total: sql<number>`COUNT(*)::int`,
        totalVendido: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
      })
      .from(ventasBmcorp)
      .where(where)

    const total = statsRow?.total ?? 0
    const totalVendido = Number(statsRow?.totalVendido ?? 0)

    // ── Comisión total agregada (LEFT JOIN comisionesCalculadas) ────────────
    const [comisionStats] = await tx
      .select({
        totalComisionGenerada: sql<string>`COALESCE(SUM(${comisionesCalculadas.comisionBrutaTotal}), 0)::text`,
      })
      .from(ventasBmcorp)
      .leftJoin(comisionesCalculadas, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(where)

    const [pagosStats] = await tx
      .select({
        totalComisionPagada: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)::text`,
      })
      .from(ventasBmcorp)
      .innerJoin(comisionesCalculadas, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .innerJoin(dispersiones, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .where(where)

    const totalComisionGenerada = Number(comisionStats?.totalComisionGenerada ?? 0)
    const totalComisionPagada = Number(pagosStats?.totalComisionPagada ?? 0)
    const porcentajeConciliado =
      totalComisionGenerada > 0 ? (totalComisionPagada / totalComisionGenerada) * 100 : 0

    // ── Contadores por grupo (para tabs) — solo con filtros que NO son grupo ─
    const condsSinGrupo = [
      eq(ventasBmcorp.tenantId, tenantId),
      eq(ventasBmcorp.empresaId, empresaId),
      inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
    ]
    if (filter.anio) {
      const campo =
        filter.fechaCampo === 'cierre' ? ventasBmcorp.fechaCierre : ventasBmcorp.fechaApertura
      if (filter.mes) {
        const mes = String(filter.mes).padStart(2, '0')
        const lastDay = new Date(filter.anio, filter.mes, 0).getDate()
        condsSinGrupo.push(gte(campo, `${filter.anio}-${mes}-01`))
        condsSinGrupo.push(lte(campo, `${filter.anio}-${mes}-${String(lastDay).padStart(2, '0')}`))
      } else {
        condsSinGrupo.push(gte(campo, `${filter.anio}-01-01`))
        condsSinGrupo.push(lte(campo, `${filter.anio}-12-31`))
      }
    }
    if (filter.afiliadoId) condsSinGrupo.push(eq(ventasBmcorp.afiliadoId, filter.afiliadoId))
    if (filter.desarrolloId) condsSinGrupo.push(eq(ventasBmcorp.desarrolloId, filter.desarrolloId))
    if (filter.asesor?.trim())
      condsSinGrupo.push(ilike(ventasBmcorp.asesor, `%${filter.asesor.trim()}%`))
    if (filter.query?.trim()) {
      const q = `%${filter.query.trim()}%`
      condsSinGrupo.push(
        or(
          ilike(ventasBmcorp.cliente, q),
          ilike(ventasBmcorp.loteAcciones, q),
          ilike(ventasBmcorp.asesor, q),
        )!,
      )
    }

    const grupoCountRows = await tx
      .select({
        estado: ventasBmcorp.estadoVenta,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ventasBmcorp)
      .where(and(...condsSinGrupo))
      .groupBy(ventasBmcorp.estadoVenta)

    const contadores: Record<GrupoEstado, number> = {
      todas: 0,
      por_cerrar: 0,
      cerradas: 0,
      en_proceso: 0,
      canceladas: 0,
    }
    for (const r of grupoCountRows) {
      const count = Number(r.count)
      contadores.todas += count
      for (const [grupo, estados] of Object.entries(GRUPOS_ESTADOS)) {
        if (estados.includes(r.estado as EstadoVenta)) {
          contadores[grupo as Exclude<GrupoEstado, 'todas'>] += count
        }
      }
    }

    // ── Filas paginadas con métricas calculadas ────────────────────────────
    const rows = await tx
      .select({
        venta: ventasBmcorp,
        alianzaNombre: afiliados.nombre,
        desarrolloNombre: desarrollos.nombre,
        comisionId: comisionesCalculadas.id,
        comisionBruta: comisionesCalculadas.comisionBrutaTotal,
        comisionOpBmcorp: comisionesCalculadas.montoOpBmcorp,
        sinConfig: comisionesCalculadas.sinConfig,
        comisionPagada: sql<string>`COALESCE((
          SELECT SUM(${dispersiones.montoPagado})
          FROM ${dispersiones}
          WHERE ${dispersiones.comisionId} = ${comisionesCalculadas.id}
        ), 0)::text`,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
      .leftJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .leftJoin(comisionesCalculadas, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(where)
      .orderBy(desc(ventasBmcorp.fechaApertura), desc(ventasBmcorp.createdAt))
      .limit(pageSize)
      .offset(offset)

    const hoy = new Date()
    const items: VentaListItem[] = rows.map((r) => {
      const monto = Number(r.venta.monto)
      const enganche = Number(r.venta.enganche ?? 0)
      const comisionBmEsperada = Number(r.comisionBruta ?? 0)
      const comisionOpBmcorp = Number(r.comisionOpBmcorp ?? 0)
      const comisionPagada = Number(r.comisionPagada ?? 0)
      const porcentajeEnganchePagado = monto > 0 ? Math.min(100, (enganche / monto) * 100) : 0
      const porcentajeAvancePago =
        comisionBmEsperada > 0 ? Math.min(100, (comisionPagada / comisionBmEsperada) * 100) : 0

      const diasEnPipeline = r.venta.fechaApertura
        ? Math.floor(
            (hoy.getTime() - new Date(r.venta.fechaApertura).getTime()) / (1000 * 60 * 60 * 24),
          )
        : null
      const diasParaCierre = r.venta.fechaCierre
        ? Math.floor(
            (new Date(r.venta.fechaCierre).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null

      return {
        ventaId: r.venta.id,
        cliente: r.venta.cliente,
        mondayItemId: r.venta.mondayItemId,
        alianzaId: r.venta.afiliadoId,
        alianzaNombre: r.alianzaNombre,
        asesor: r.venta.asesor,
        desarrolloId: r.venta.desarrolloId,
        desarrolloNombre: r.desarrolloNombre,
        loteAcciones: r.venta.loteAcciones,
        monto,
        enganche,
        porcentajeEnganchePagado,
        estadoVenta: r.venta.estadoVenta as EstadoVenta,
        fechaApertura: r.venta.fechaApertura,
        fechaCierre: r.venta.fechaCierre,
        diasEnPipeline,
        diasParaCierre,
        comisionId: r.comisionId,
        comisionBmEsperada,
        comisionOpBmcorp,
        comisionPagada,
        porcentajeAvancePago,
        sinEsquema: !r.comisionId || (r.sinConfig ?? false),
      }
    })

    return {
      rows: items,
      total,
      stats: {
        totalVendido,
        totalComisionGenerada,
        totalComisionPagada,
        porcentajeConciliado,
        contadores,
      },
    }
  })
}

// ─── Helpers para filtros UI (catálogos) ────────────────────────────────────

export async function getAlianzasOptionsParaFiltro(tenantId: string, empresaId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .selectDistinct({
        id: afiliados.id,
        nombre: afiliados.nombre,
      })
      .from(ventasBmcorp)
      .innerJoin(afiliados, eq(afiliados.id, ventasBmcorp.afiliadoId))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .orderBy(afiliados.nombre)
    return rows
  })
}

export async function getDesarrollosOptionsParaFiltro(tenantId: string, empresaId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .selectDistinct({
        id: desarrollos.id,
        nombre: desarrollos.nombre,
      })
      .from(ventasBmcorp)
      .innerJoin(desarrollos, eq(desarrollos.id, ventasBmcorp.desarrolloId))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)))
      .orderBy(desarrollos.nombre)
    return rows
  })
}

export async function getAniosVentasDisponibles(tenantId: string, empresaId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({
        anio: sql<number>`EXTRACT(YEAR FROM ${ventasBmcorp.fechaApertura})::int`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          sql`${ventasBmcorp.fechaApertura} IS NOT NULL`,
        ),
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${ventasBmcorp.fechaApertura})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${ventasBmcorp.fechaApertura}) DESC`)
    return rows.map((r) => r.anio).filter((y): y is number => y !== null)
  })
}
