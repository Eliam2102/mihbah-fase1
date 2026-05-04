import { db } from '@/lib/db'
import { movimientos, proyectos, cuentasPendientes } from '@/lib/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KpisMihbah {
  ingresos: number
  egresos: number
  neto: number
  cxc: number
  cxp: number
}

export interface FlujoMensual {
  mes: number
  mesLabel: string
  ingresos: number
  egresos: number
  neto: number
}

export interface AvanceProyecto {
  id: string
  nombre: string
  gastado: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

async function setTenant(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
) {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}

// ─── KPIs MIHBAH ─────────────────────────────────────────────────────────────

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
      else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA') egresos += v
    }

    const cxRows = await tx
      .select({
        tipo: cuentasPendientes.tipo,
        total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto} - ${cuentasPendientes.montoPagado}), '0')`,
      })
      .from(cuentasPendientes)
      .where(
        and(eq(cuentasPendientes.empresaId, empresaId), eq(cuentasPendientes.estado, 'PENDIENTE')),
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

// ─── Flujo Mensual ────────────────────────────────────────────────────────────

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
      .where(and(eq(movimientos.empresaId, empresaId), eq(movimientos.anio, String(anio))))
      .groupBy(movimientos.mes, movimientos.tipo)

    // Initialize all 12 months
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
      mesLabel: MESES[i]!,
      ingresos: entry.ingresos,
      egresos: entry.egresos,
      neto: entry.ingresos - entry.egresos,
    }))
  })
}

// ─── Avance por proyecto ──────────────────────────────────────────────────────

export async function getAvancePorProyecto(
  empresaId: string,
  tenantId: string,
  anio: number,
): Promise<AvanceProyecto[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const proyRows = await tx
      .select({ id: proyectos.id, name: proyectos.name })
      .from(proyectos)
      .where(and(eq(proyectos.empresaId, empresaId), eq(proyectos.activo, true)))

    if (proyRows.length === 0) return []

    const gastadoRows = await tx
      .select({
        proyectoId: movimientos.proyectoId,
        total: sql<string>`COALESCE(SUM(${movimientos.monto}), '0')`,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.empresaId, empresaId),
          eq(movimientos.anio, String(anio)),
          eq(movimientos.tipo, 'EGRESO'),
        ),
      )
      .groupBy(movimientos.proyectoId)

    const gastadoMap = new Map(gastadoRows.map((r) => [r.proyectoId, Number(r.total)]))

    return proyRows.map((p) => ({
      id: p.id,
      nombre: p.name,
      gastado: gastadoMap.get(p.id) ?? 0,
    }))
  })
}
