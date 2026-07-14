/**
 * lib/services/aportaciones/aportaciones.service.ts
 *
 * YCDI dashboard service. Lee desde `movimientos` (Excel MK1).
 */

import { db } from '@/lib/db'
import { movimientos, cuentasPendientes } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type {
  KpisYcdi,
  FlujomensualYcdi,
  IngresadoVsFaltante,
  TablaConceptoProyecto,
} from './aportaciones.types'

// Accionista filter: grupoNombre codes OR concepto contains 'aportaci'
const ACCIONISTA_GRUPOS =
  "'T224','T006','T112','T124','T012','T024','ACCIONISTA','T106','T212','T018','T118','APORTACIONES','T000','T100','T324','T306','T200','T312','NIVEL 1','NIVEL 2','NIVEL 3'"

const accionistaFilter = (m: typeof movimientos) =>
  sql`(${m.grupoNombre} IN (${sql.raw(ACCIONISTA_GRUPOS)}) OR LOWER(${m.concepto}) LIKE '%aportaci%')`

// ─── KPIs YCDI ─────────────────────────────────────────────────────────────────

export async function getKpisYcdi(
  empresaId: string,
  tenantId: string,
  anio?: number,
  mes?: number,
): Promise<KpisYcdi> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [totals] = await tx
      .select({
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA') THEN ${movimientos.monto} ELSE 0 END), 0)`,
        prestamos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'PRESTAMO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        capitalAportado: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' AND (${movimientos.grupoNombre} IN (${sql.raw(ACCIONISTA_GRUPOS)}) OR LOWER(${movimientos.concepto}) LIKE '%aportaci%') THEN ${movimientos.monto} ELSE 0 END), 0)`,
        acuerdosActivos: sql<string>`COUNT(DISTINCT CASE WHEN ${movimientos.tipo} = 'INGRESO' AND (${movimientos.grupoNombre} IN (${sql.raw(ACCIONISTA_GRUPOS)}) OR LOWER(${movimientos.concepto}) LIKE '%aportaci%') THEN ${movimientos.nombre} END)`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          anio ? eq(movimientos.anio, String(anio)) : undefined,
          mes ? eq(movimientos.mes, String(mes)) : undefined,
        ),
      )

    // Y4: CXC from cuentas_pendientes POR_COBRAR PENDIENTE (siempre acumulado — no filtra por periodo)
    const [cxcRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto} - ${cuentasPendientes.montoPagado}), '0')`,
      })
      .from(cuentasPendientes)
      .where(
        and(
          eq(cuentasPendientes.tenantId, tenantId),
          eq(cuentasPendientes.empresaId, empresaId),
          eq(cuentasPendientes.tipo, 'POR_COBRAR'),
          eq(cuentasPendientes.estado, 'PENDIENTE'),
        ),
      )

    // Y5: CXP from cuentas_pendientes POR_PAGAR PENDIENTE (siempre acumulado)
    const [cxpRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto} - ${cuentasPendientes.montoPagado}), '0')`,
      })
      .from(cuentasPendientes)
      .where(
        and(
          eq(cuentasPendientes.tenantId, tenantId),
          eq(cuentasPendientes.empresaId, empresaId),
          eq(cuentasPendientes.tipo, 'POR_PAGAR'),
          eq(cuentasPendientes.estado, 'PENDIENTE'),
        ),
      )

    const totalIngresos = Number(totals?.totalIngresos ?? 0)
    const totalEgresos = Number(totals?.totalEgresos ?? 0)
    const prestamos = Number(totals?.prestamos ?? 0)
    const totalCapitalAportado = Number(totals?.capitalAportado ?? 0)
    const acuerdosActivos = Number(totals?.acuerdosActivos ?? 0)
    const cxc = Number(cxcRow?.total ?? 0)
    const cxp = Number(cxpRow?.total ?? 0)

    const saldo = totalIngresos - totalEgresos

    // Y9: no meta en DB → porcentajeLevantamiento = 0 hasta que se defina
    const porcentajeLevantamiento = 0

    return {
      totalIngresos,
      totalEgresos,
      saldo,
      prestamos,
      totalCapitalAportado,
      totalAcabadoGastar: totalEgresos,
      porcentajeLevantamiento,
      acuerdosActivos,
      totalRecaudado: totalCapitalAportado,
      metaTotal: totalIngresos,
      totalAcciones: acuerdosActivos,
      precioPromedioAccion: acuerdosActivos > 0 ? totalCapitalAportado / acuerdosActivos : 0,
      cxc,
      cxp,
    }
  })
}

// ─── Flujo mensual YCDI ─────────────────────────────────────────────────────────

export async function getFlujomensualYcdi(
  empresaId: string,
  tenantId: string,
  anio?: number,
): Promise<FlujomensualYcdi[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        anio: movimientos.anio,
        mes: movimientos.mes,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} IN ('EGRESO','SALIDA') THEN ${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          anio ? eq(movimientos.anio, String(anio)) : undefined,
        ),
      )
      .groupBy(movimientos.anio, movimientos.mes)
      .orderBy(movimientos.anio, movimientos.mes)

    return rows.map((r) => {
      const ingresos = Number(r.ingresos)
      const egresos = Number(r.egresos)
      return {
        anio: Number(r.anio ?? 0),
        mes: Number(r.mes ?? 0),
        ingresos,
        egresos,
        saldo: ingresos - egresos,
      }
    })
  })
}

// ─── Top accionistas ─────────────────────────────────────────────────────────────

export async function getTopAccionistas(
  empresaId: string,
  tenantId: string,
  limit = 15,
  anio?: number,
  mes?: number,
): Promise<{ nombre: string; aportado: number; movimientos: number }[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        nombre: movimientos.nombre,
        aportado: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.tipo, 'INGRESO'),
          accionistaFilter(movimientos),
          anio ? eq(movimientos.anio, String(anio)) : undefined,
          mes ? eq(movimientos.mes, String(mes)) : undefined,
        ),
      )
      .groupBy(movimientos.nombre)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)
      .limit(limit)

    return rows.map((r) => ({
      nombre: r.nombre ?? '—',
      aportado: Number(r.aportado),
      movimientos: Number(r.count),
    }))
  })
}

// ─── Tablas ──────────────────────────────────────────────────────────────────────

export async function getIngresadoVsFaltante(
  empresaId: string,
  tenantId: string,
  anio?: number,
  mes?: number,
): Promise<IngresadoVsFaltante[]> {
  const accionistas = await getTopAccionistas(empresaId, tenantId, 10, anio, mes)
  const total = accionistas.reduce((s, a) => s + a.aportado, 0)

  return accionistas.map((a, i) => ({
    proyectoId: String(i),
    proyectoNombre: a.nombre,
    meta: total > 0 ? total / accionistas.length : 0,
    ingresado: a.aportado,
    faltante: 0,
    porcentaje: total > 0 ? (a.aportado / total) * 100 : 0,
  }))
}

export async function getTablaConceptosProyectos(
  empresaId: string,
  tenantId: string,
  anio?: number,
  mes?: number,
): Promise<{ filas: TablaConceptoProyecto[]; proyectosNames: string[]; grandTotal: number }> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        nombre: movimientos.nombre,
        concepto: movimientos.concepto,
        monto: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.tipo, 'INGRESO'),
          anio ? eq(movimientos.anio, String(anio)) : undefined,
          mes ? eq(movimientos.mes, String(mes)) : undefined,
        ),
      )
      .groupBy(movimientos.nombre, movimientos.concepto)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)

    const conceptosSet = new Set<string>()
    const filaMap = new Map<string, TablaConceptoProyecto>()

    for (const r of rows) {
      const concepto = r.concepto ?? 'Sin concepto'
      conceptosSet.add(concepto)
      const nombre = r.nombre ?? '—'
      if (!filaMap.has(nombre)) {
        filaMap.set(nombre, { concepto: nombre, proyectos: {}, total: 0 })
      }
      const fila = filaMap.get(nombre)!
      const v = Number(r.monto)
      fila.proyectos[concepto] = (fila.proyectos[concepto] ?? 0) + v
      fila.total += v
    }

    const proyectosNames = Array.from(conceptosSet).sort()
    const filas = Array.from(filaMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
    const grandTotal = filas.reduce((s, f) => s + f.total, 0)

    return { filas, proyectosNames, grandTotal }
  })
}
