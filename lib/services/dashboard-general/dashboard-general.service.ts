/**
 * lib/services/dashboard-general/dashboard-general.service.ts
 *
 * Dashboard General — resumen consolidado + correlación narrativa entre las 3 empresas.
 */

import { db } from '@/lib/db'
import { movimientos, ventasBmcorp } from '@/lib/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import {
  getEmpresasTenant,
  kpisConstructora,
  kpisCapitalYcdi,
  kpisComercialBmcorp,
  periodRange,
} from './dashboard-general.queries'
import type {
  EmpresaResumen,
  ResumenGeneral,
  CorrelacionFlow,
  PeriodFilter,
} from './dashboard-general.types'

// ─── 1. Resumen General ───────────────────────────────────────────────────────

export async function getResumenGeneral(
  tenantId: string,
  period?: PeriodFilter,
): Promise<ResumenGeneral> {
  const range = periodRange(period)
  const anio = period?.anio ?? new Date().getFullYear()

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const empresasRows = await getEmpresasTenant(tx, tenantId)
    const resumen: EmpresaResumen[] = []

    for (const e of empresasRows) {
      let kpis: Pick<EmpresaResumen, 'ingresos' | 'egresos' | 'neto' | 'cxc' | 'cxp'> & {
        parcial?: boolean
      }
      if (e.tipo === 'CONSTRUCTORA') {
        kpis = await kpisConstructora(tx, tenantId, e.id, range)
      } else if (e.tipo === 'CAPITAL') {
        kpis = await kpisCapitalYcdi(tx, tenantId, e.id, range)
      } else {
        kpis = await kpisComercialBmcorp(tx, tenantId, e.id, range)
      }

      resumen.push({ empresaId: e.id, nombre: e.name, tipo: e.tipo, ...kpis })
    }

    return {
      empresas: resumen,
      totalIngresos: resumen.reduce((s, r) => s + r.ingresos, 0),
      totalEgresos: resumen.reduce((s, r) => s + r.egresos, 0),
      totalNeto: resumen.reduce((s, r) => s + r.neto, 0),
      totalCxc: resumen.reduce((s, r) => s + r.cxc, 0),
      totalCxp: resumen.reduce((s, r) => s + r.cxp, 0),
      periodo: period?.mes ? { anio, mes: period.mes } : { anio },
    }
  })
}

// ─── 2. Correlación entre empresas ────────────────────────────────────────────

/**
 * Modelo narrativo (no transferencias bancarias reales):
 * YCDI levanta capital → financia obras de MIHBAH
 * BM CORP vende → genera comisiones que pueden financiar otros proyectos
 * YCDI tiene proyectos comerciales que vende BM CORP
 */
export async function getCorrelacionEmpresas(
  tenantId: string,
  period?: PeriodFilter,
): Promise<CorrelacionFlow[]> {
  const range = periodRange(period)

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const empresasRows = await getEmpresasTenant(tx, tenantId)
    const ycdi = empresasRows.find((e) => e.tipo === 'CAPITAL')
    const mihbah = empresasRows.find((e) => e.tipo === 'CONSTRUCTORA')
    const bmcorp = empresasRows.find((e) => e.tipo === 'COMERCIAL')

    const flows: CorrelacionFlow[] = []

    // Flow 1: YCDI funds MIHBAH construction — identified from Concentrado Maestro as
    // TIPO=SALIDA, GRUPO=CONSTRUCCIÓN, NOMBRE=Mihbah (case-insensitive)
    if (ycdi && mihbah) {
      const [ycdiToMihbahRow] = await tx
        .select({ total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text` })
        .from(movimientos)
        .where(
          and(
            eq(movimientos.tenantId, tenantId),
            eq(movimientos.empresaId, ycdi.id),
            eq(movimientos.tipo, 'SALIDA'),
            sql`LOWER(${movimientos.grupoNombre}) LIKE 'construc%'`,
            sql`LOWER(COALESCE(${movimientos.nombre}, '')) LIKE 'mihbah%'`,
            gte(movimientos.fecha, range.from),
            lte(movimientos.fecha, range.to),
          ),
        )
      flows.push({
        from: ycdi.name,
        to: mihbah.name,
        concepto: 'Pagos de YCDI a MIHBAH por servicios de construcción',
        monto: Number(ycdiToMihbahRow?.total ?? 0),
        tipo: 'CAPITAL_TO_OBRA',
      })
    }

    // Flow 2: BM Corp sells projects from the YCDI/MIHBAH ecosystem
    if (bmcorp && ycdi) {
      const [ventasRow] = await tx
        .select({ total: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text` })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, bmcorp.id),
            gte(ventasBmcorp.fechaApertura, range.from),
            lte(ventasBmcorp.fechaApertura, range.to),
          ),
        )
      flows.push({
        from: bmcorp.name,
        to: ycdi.name,
        concepto: 'Volumen de ventas comerciales (acciones YCDI y servicios MIHBAH)',
        monto: Number(ventasRow?.total ?? 0),
        tipo: 'VENTA_TO_CAPITAL',
      })
    }

    return flows
  })
}
