/**
 * aportaciones.service.ts
 *
 * YCDI dashboard service — lee desde `movimientos` (fuente de verdad del Excel MK1).
 * NOMBRE = accionista, CONCEPTO = tipo de aportación, TIPO = INGRESO/SALIDA/PRESTAMO/INTERNO
 */
import { db } from '@/lib/db'
import { movimientos } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpisYcdi {
  totalIngresos: number // SUM tipo=INGRESO
  totalEgresos: number // SUM tipo=SALIDA
  saldo: number // ingresos - egresos
  prestamos: number // SUM tipo=PRESTAMO
  totalCapitalAportado: number // SUM INGRESO donde concepto='Aportación a Capital'
  totalAcabadoGastar: number // SUM SALIDA
  porcentajeLevantamiento: number
  acuerdosActivos: number // accionistas únicos con aportaciones
  // Kept for compatibility
  totalRecaudado: number
  metaTotal: number
  totalAcciones: number
  precioPromedioAccion: number
  cxc: number
}

export interface FlujomensualYcdi {
  anio: number
  mes: number
  ingresos: number
  egresos: number
  saldo: number
}

export interface IngresadoVsFaltante {
  proyectoId: string
  proyectoNombre: string
  meta: number
  ingresado: number
  faltante: number
  porcentaje: number
}

export interface TablaConceptoProyecto {
  concepto: string
  proyectos: Record<string, number>
  total: number
}

// ─── Helper RLS ───────────────────────────────────────────────────────────────

async function setTenant(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
) {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}

// ─── KPIs YCDI (from movimientos) ─────────────────────────────────────────────

export async function getKpisYcdi(empresaId: string, tenantId: string): Promise<KpisYcdi> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [totals] = await tx
      .select({
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'SALIDA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        prestamos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'PRESTAMO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        capitalAportado: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' AND LOWER(${movimientos.concepto}) LIKE '%aportaci%' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        acuerdosActivos: sql<string>`COUNT(DISTINCT CASE WHEN ${movimientos.tipo} = 'INGRESO' AND LOWER(${movimientos.concepto}) LIKE '%aportaci%' THEN ${movimientos.nombre} END)`,
      })
      .from(movimientos)
      .where(eq(movimientos.empresaId, empresaId))

    const totalIngresos = Number(totals?.totalIngresos ?? 0)
    const totalEgresos = Number(totals?.totalEgresos ?? 0)
    const prestamos = Number(totals?.prestamos ?? 0)
    const totalCapitalAportado = Number(totals?.capitalAportado ?? 0)
    const acuerdosActivos = Number(totals?.acuerdosActivos ?? 0)

    // Meta estimada: capital aportado es lo levantado; saldo pendiente = egresos sin cubrir
    const saldo = totalIngresos - totalEgresos
    const porcentajeLevantamiento =
      totalEgresos > 0
        ? Math.min((totalIngresos / (totalIngresos + Math.abs(Math.min(saldo, 0)))) * 100, 100)
        : 100

    return {
      totalIngresos,
      totalEgresos,
      saldo,
      prestamos,
      totalCapitalAportado,
      totalAcabadoGastar: totalEgresos,
      porcentajeLevantamiento,
      acuerdosActivos,
      // Compat aliases
      totalRecaudado: totalCapitalAportado,
      metaTotal: totalIngresos,
      totalAcciones: acuerdosActivos,
      precioPromedioAccion: acuerdosActivos > 0 ? totalCapitalAportado / acuerdosActivos : 0,
      cxc: prestamos,
    }
  })
}

// ─── Flujo mensual YCDI ───────────────────────────────────────────────────────

export async function getFlujomensualYcdi(
  empresaId: string,
  tenantId: string,
): Promise<FlujomensualYcdi[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        anio: movimientos.anio,
        mes: movimientos.mes,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'SALIDA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(eq(movimientos.empresaId, empresaId))
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

// ─── Top accionistas (NOMBRE × capital aportado) ──────────────────────────────

export async function getTopAccionistas(
  empresaId: string,
  tenantId: string,
  limit = 15,
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
          eq(movimientos.empresaId, empresaId),
          sql`${movimientos.tipo} = 'INGRESO' AND LOWER(${movimientos.concepto}) LIKE '%aportaci%'`,
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

// ─── Tabla conceptos × nombres (pivot) ────────────────────────────────────────

export async function getIngresadoVsFaltante(
  empresaId: string,
  tenantId: string,
): Promise<IngresadoVsFaltante[]> {
  // YCDI has no "proyectos" linked in movimientos for now;
  // return top accionistas as "proyectos" substitute
  const accionistas = await getTopAccionistas(empresaId, tenantId, 10)
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
): Promise<{ filas: TablaConceptoProyecto[]; proyectosNames: string[]; grandTotal: number }> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Pivot: nombre (accionista) × concepto → monto
    const rows = await tx
      .select({
        nombre: movimientos.nombre,
        concepto: movimientos.concepto,
        monto: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)`,
      })
      .from(movimientos)
      .where(and(eq(movimientos.empresaId, empresaId), sql`${movimientos.tipo} = 'INGRESO'`))
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
