import { db } from '@/lib/db'
import { empresas, movimientos } from '@/lib/db/schema'
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { MihbahEstimadoVsAvance } from './dashboard-general.types'

/**
 * MIHBAH: gasto real del mes vs estimado.
 * Estimado = promedio mensual del año hasta el mes anterior (sin presupuesto capturado aún).
 */
export async function getMihbahEstimadoVsAvance(
  tenantId: string,
  anio: number,
  mes: number,
): Promise<MihbahEstimadoVsAvance> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [mihbah] = await tx
      .select({ id: empresas.id })
      .from(empresas)
      .where(and(eq(empresas.tenantId, tenantId), eq(empresas.tipo, 'CONSTRUCTORA')))
      .limit(1)

    if (!mihbah) {
      return { empresaId: null, estimadoMes: 0, gastadoMes: 0, porcentajeAvance: 0, sinDatos: true }
    }

    const lastDay = new Date(anio, mes, 0).getDate()
    const mesStr = String(mes).padStart(2, '0')
    const from = `${anio}-${mesStr}-01`
    const to = `${anio}-${mesStr}-${String(lastDay).padStart(2, '0')}`

    const [gastadoRow] = await tx
      .select({ total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text` })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, mihbah.id),
          inArray(movimientos.tipo, ['EGRESO', 'SALIDA']),
          gte(movimientos.fecha, from),
          lte(movimientos.fecha, to),
        ),
      )

    if (mes === 1) {
      return {
        empresaId: mihbah.id,
        estimadoMes: 0,
        gastadoMes: Number(gastadoRow?.total ?? 0),
        porcentajeAvance: 0,
        sinDatos: true,
      }
    }

    const inicioAnio = `${anio}-01-01`
    const finMesAnterior = `${anio}-${String(mes - 1).padStart(2, '0')}-${new Date(anio, mes - 1, 0).getDate()}`

    const [historicoRow] = await tx
      .select({ total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text` })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.tenantId, tenantId),
          eq(movimientos.empresaId, mihbah.id),
          inArray(movimientos.tipo, ['EGRESO', 'SALIDA']),
          gte(movimientos.fecha, inicioAnio),
          lte(movimientos.fecha, finMesAnterior),
        ),
      )

    const estimadoMes = Number(historicoRow?.total ?? 0) / (mes - 1)
    const gastadoMes = Number(gastadoRow?.total ?? 0)
    const porcentajeAvance = estimadoMes > 0 ? Math.round((gastadoMes / estimadoMes) * 100) : 0

    return {
      empresaId: mihbah.id,
      estimadoMes,
      gastadoMes,
      porcentajeAvance,
      sinDatos: gastadoMes === 0 && estimadoMes === 0,
    }
  })
}
