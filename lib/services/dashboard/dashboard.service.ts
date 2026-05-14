import { db } from '@/lib/db'
import { movimientos, cuentasPendientes } from '@/lib/db/schema'
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import { MESES_LABEL } from '../_shared/date.helpers'
import type { AvanceProyecto, FlujoMensual, KpisMihbah } from './dashboard.types'

// ─── M1-M5: KPIs MIHBAH ──────────────────────────────────────────────────────
// M1: INGRESO | M2: SALIDA + EGRESO | M3: M1-M2  (INTERNO y PRESTAMO excluidos)
// M4: CXC desde cuentas_pendientes | M5: CXP desde cuentas_pendientes
// INTERNO excluido de ambos (solo movimiento interno de caja)

export async function getKpisMihbah(
  empresaId: string,
  tenantId: string,
  params: { anio: number; mes?: number },
): Promise<KpisMihbah> {
  const { anio, mes } = params

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const fechaInicio = mes ? `${anio}-${String(mes).padStart(2, '0')}-01` : `${anio}-01-01`
    const lastDay = mes ? new Date(anio, mes, 0).getDate() : 31
    const fechaFin = mes
      ? `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      : `${anio}-12-31`

    const movRows = await tx
      .select({
        tipo: movimientos.tipo,
        total: sql<string>`COALESCE(SUM(${movimientos.monto}), '0')`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          gte(movimientos.fecha, fechaInicio),
          lte(movimientos.fecha, fechaFin),
        ),
      )
      .groupBy(movimientos.tipo)

    let ingresos = 0
    let egresos = 0
    for (const r of movRows) {
      const v = Number(r.total)
      if (r.tipo === 'INGRESO') ingresos += v
      // M2: SALIDA + EGRESO; INTERNO y PRESTAMO excluidos
      else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA') egresos += v
    }

    const cxRows = await tx
      .select({
        tipo: cuentasPendientes.tipo,
        total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto} - ${cuentasPendientes.montoPagado}), '0')`,
      })
      .from(cuentasPendientes)
      .where(
        and(
          eq(cuentasPendientes.tenantId, tenantId),
          eq(cuentasPendientes.empresaId, empresaId),
          eq(cuentasPendientes.estado, 'PENDIENTE'),
        ),
      )
      .groupBy(cuentasPendientes.tipo)

    let cxc = 0
    let cxp = 0
    for (const r of cxRows) {
      const v = Number(r.total)
      if (r.tipo === 'POR_COBRAR') cxc += v
      else if (r.tipo === 'POR_PAGAR') cxp += v
    }

    return { ingresos, egresos, neto: ingresos - egresos, cxc, cxp }
  })
}

// ─── M7: Flujo mensual MIHBAH ─────────────────────────────────────────────────
// Egresos = SALIDA + EGRESO; INTERNO y PRESTAMO excluidos

export async function getFlujoMensual(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<FlujoMensual[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        mes: movimientos.mes,
        tipo: movimientos.tipo,
        total: sql<string>`COALESCE(SUM(${movimientos.monto}), '0')`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.anio, String(anio)),
        ),
      )
      .groupBy(movimientos.mes, movimientos.tipo)

    const byMes: { ingresos: number; egresos: number }[] = Array.from({ length: 12 }, () => ({
      ingresos: 0,
      egresos: 0,
    }))

    for (const r of rows) {
      const m = Number(r.mes)
      if (!m || m < 1 || m > 12) continue
      const v = Number(r.total)
      const entry = byMes[m - 1]!
      if (r.tipo === 'INGRESO') entry.ingresos += v
      else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA') entry.egresos += v
    }

    return byMes.map((entry, i) => ({
      mes: i + 1,
      mesLabel: MESES_LABEL[i]!,
      ingresos: entry.ingresos,
      egresos: entry.egresos,
      neto: entry.ingresos - entry.egresos,
    }))
  })
}

// ─── M8: Avance por proyecto ──────────────────────────────────────────────────
// Usa proyectoNombre (texto del Excel) — no FK a tabla proyectos
// Tipos egresos: SALIDA + EGRESO (PRESTAMO excluido de avance de obra)

export async function getAvancePorProyecto(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<AvanceProyecto[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        proyectoNombre: movimientos.proyectoNombre,
        gastado: sql<string>`COALESCE(SUM(${movimientos.monto}), '0')`,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), '0')`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.anio, String(anio)),
          isNotNull(movimientos.proyectoNombre),
          sql`${movimientos.tipo} IN ('EGRESO','SALIDA')`,
        ),
      )
      .groupBy(movimientos.proyectoNombre)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)

    return rows
      .filter((r) => r.proyectoNombre)
      .map((r) => ({
        id: r.proyectoNombre!,
        nombre: r.proyectoNombre!,
        gastado: Number(r.gastado),
        ingresos: Number(r.ingresos),
      }))
  })
}

// ─── M10: Avance por actividad dentro de un proyecto ─────────────────────────
// Agrupa por categoriaNombre (columna CATEGORÍA del Excel)
// Sub-detalle por grupoNombre (columna GRUPO del Excel)

export async function getAvancePorActividad(
  empresaId: string,
  tenantId: string,
  proyectoNombre: string,
): Promise<{ categoria: string; grupo: string | null; gastado: number }[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        categoria: movimientos.categoriaNombre,
        grupo: movimientos.grupoNombre,
        gastado: sql<string>`COALESCE(SUM(${movimientos.monto}), '0')`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.proyectoNombre, proyectoNombre),
          sql`${movimientos.tipo} IN ('EGRESO','SALIDA')`,
        ),
      )
      .groupBy(movimientos.categoriaNombre, movimientos.grupoNombre)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)

    return rows.map((r) => ({
      categoria: r.categoria ?? 'Sin categoría',
      grupo: r.grupo,
      gastado: Number(r.gastado),
    }))
  })
}
