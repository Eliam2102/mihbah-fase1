/**
 * lib/services/dashboard-general/dashboard-general.service.ts
 *
 * Dashboard General — vista consolidada del tenant (las 3 empresas).
 * NO calcula "Margen" (decisión cliente). Foco: visibilidad + correlación.
 */

import { db } from '@/lib/db'
import {
  empresas,
  movimientos,
  cuentasPendientes,
  pagosAportacion,
  ventasBmcorp,
  acuerdosAportacion,
} from '@/lib/db/schema'
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm'
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
  CuentasConsolidado,
  MihbahEstimadoVsAvance,
  ResumenDelResumen,
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

      resumen.push({
        empresaId: e.id,
        nombre: e.name,
        tipo: e.tipo,
        ...kpis,
      })
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

    // YCDI → MIHBAH: capital levantado en periodo
    if (ycdi && mihbah) {
      const [capitalRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${pagosAportacion.montoPagado}), 0)::text`,
        })
        .from(pagosAportacion)
        .where(
          and(
            eq(pagosAportacion.tenantId, tenantId),
            sql`${pagosAportacion.fechaPago} IS NOT NULL`,
            gte(pagosAportacion.fechaPago, range.from),
            lte(pagosAportacion.fechaPago, range.to),
          ),
        )

      flows.push({
        from: ycdi.name,
        to: mihbah.name,
        concepto: 'Capital levantado disponible para obra',
        monto: Number(capitalRow?.total ?? 0),
        tipo: 'CAPITAL_TO_OBRA',
      })
    }

    // BM CORP → YCDI: ventas que pueden ser de proyectos YCDI
    if (bmcorp && ycdi) {
      const [ventasRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        })
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
        concepto: 'Ventas comerciales (parcialmente acciones YCDI)',
        monto: Number(ventasRow?.total ?? 0),
        tipo: 'VENTA_TO_CAPITAL',
      })
    }

    // BM CORP → MIHBAH: comisiones generadas pueden financiar obra
    if (bmcorp && mihbah) {
      const [comisionRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
        })
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
        to: mihbah.name,
        concepto: 'Comisión generada (15%) — flujo potencial a obra',
        monto: Number(comisionRow?.total ?? 0),
        tipo: 'COMISION_TO_OBRA',
      })
    }

    return flows
  })
}

// ─── 3. Cuentas consolidado ───────────────────────────────────────────────────

export async function getCuentasConsolidado(tenantId: string): Promise<CuentasConsolidado> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const empresasRows = await getEmpresasTenant(tx, tenantId)

    const cxcPorEmpresa: CuentasConsolidado['cxcPorEmpresa'] = []
    const cxpPorEmpresa: CuentasConsolidado['cxpPorEmpresa'] = []
    const today = new Date().toISOString().slice(0, 10)

    for (const e of empresasRows) {
      // CXC para CONSTRUCTORA y COMERCIAL → cuentas_pendientes
      if (e.tipo === 'CONSTRUCTORA' || e.tipo === 'COMERCIAL') {
        const [cxcRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto}), 0)::text`,
            vencidas: sql<string>`COALESCE(SUM(CASE WHEN ${cuentasPendientes.fechaVencimiento} < ${today} THEN ${cuentasPendientes.monto} ELSE 0 END), 0)::text`,
          })
          .from(cuentasPendientes)
          .where(
            and(
              eq(cuentasPendientes.tenantId, tenantId),
              eq(cuentasPendientes.empresaId, e.id),
              eq(cuentasPendientes.tipo, 'POR_COBRAR'),
              eq(cuentasPendientes.estado, 'PENDIENTE'),
            ),
          )

        const [cxpRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto}), 0)::text`,
            vencidas: sql<string>`COALESCE(SUM(CASE WHEN ${cuentasPendientes.fechaVencimiento} < ${today} THEN ${cuentasPendientes.monto} ELSE 0 END), 0)::text`,
          })
          .from(cuentasPendientes)
          .where(
            and(
              eq(cuentasPendientes.tenantId, tenantId),
              eq(cuentasPendientes.empresaId, e.id),
              eq(cuentasPendientes.tipo, 'POR_PAGAR'),
              eq(cuentasPendientes.estado, 'PENDIENTE'),
            ),
          )

        cxcPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: Number(cxcRow?.total ?? 0),
          vencidas: Number(cxcRow?.vencidas ?? 0),
        })
        cxpPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: Number(cxpRow?.total ?? 0),
          vencidas: Number(cxpRow?.vencidas ?? 0),
        })
      } else if (e.tipo === 'CAPITAL') {
        // CXC YCDI = saldo aportaciones pendientes (esperado − pagado)
        const [cxcRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(${pagosAportacion.montoEsperado} - ${pagosAportacion.montoPagado}), 0)::text`,
            vencidas: sql<string>`COALESCE(SUM(CASE WHEN ${pagosAportacion.estado} = 'VENCIDA' THEN ${pagosAportacion.montoEsperado} - ${pagosAportacion.montoPagado} ELSE 0 END), 0)::text`,
          })
          .from(pagosAportacion)
          .where(
            and(
              eq(pagosAportacion.tenantId, tenantId),
              inArray(pagosAportacion.estado, ['VENCIDA', 'PROXIMA']),
            ),
          )

        cxcPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: Number(cxcRow?.total ?? 0),
          vencidas: Number(cxcRow?.vencidas ?? 0),
        })
        cxpPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: 0,
          vencidas: 0,
        })
      }
    }

    return {
      cxcPorEmpresa,
      cxpPorEmpresa,
      totalCxc: cxcPorEmpresa.reduce((s, r) => s + r.total, 0),
      totalCxp: cxpPorEmpresa.reduce((s, r) => s + r.total, 0),
      totalCxcVencidas: cxcPorEmpresa.reduce((s, r) => s + r.vencidas, 0),
      totalCxpVencidas: cxpPorEmpresa.reduce((s, r) => s + r.vencidas, 0),
    }
  })
}

// ─── 4. MIHBAH estimado vs avance (mes) ───────────────────────────────────────

/**
 * MIHBAH específicamente: gasto del mes vs estimado.
 * Hoy "estimado" no se captura aún (Fase 2 — presupuesto por proyecto).
 * Fallback: estimado = promedio mensual del año hasta el mes actual.
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
      return {
        empresaId: null,
        estimadoMes: 0,
        gastadoMes: 0,
        porcentajeAvance: 0,
        sinDatos: true,
      }
    }

    // Gastado mes actual
    const lastDay = new Date(anio, mes, 0).getDate()
    const mesStr = String(mes).padStart(2, '0')
    const from = `${anio}-${mesStr}-01`
    const to = `${anio}-${mesStr}-${String(lastDay).padStart(2, '0')}`

    const [gastadoRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text`,
      })
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

    // Estimado = promedio mensual desde inicio de año hasta mes anterior
    const inicioAnio = `${anio}-01-01`
    const finMesAnterior =
      mes > 1
        ? `${anio}-${String(mes - 1).padStart(2, '0')}-${new Date(anio, mes - 1, 0).getDate()}`
        : null

    let estimadoMes = 0
    if (finMesAnterior) {
      const [historicoRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text`,
        })
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
      const totalHist = Number(historicoRow?.total ?? 0)
      estimadoMes = totalHist / (mes - 1)
    }

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

// ─── 5. Resumen del resumen — BM CORP ↔ YCDI ──────────────────────────────────

export async function getResumenDelResumen(tenantId: string): Promise<ResumenDelResumen> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const empresasRows = await getEmpresasTenant(tx, tenantId)
    const bmcorp = empresasRows.find((e) => e.tipo === 'COMERCIAL')

    let ventasBmcorpFinalizadas = 0
    let comisionGeneradaBmcorp = 0

    if (bmcorp) {
      const [ventasRow] = await tx
        .select({
          total: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
          comision: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
        })
        .from(ventasBmcorp)
        .where(
          and(
            eq(ventasBmcorp.tenantId, tenantId),
            eq(ventasBmcorp.empresaId, bmcorp.id),
            inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
          ),
        )
      ventasBmcorpFinalizadas = Number(ventasRow?.total ?? 0)
      comisionGeneradaBmcorp = Number(ventasRow?.comision ?? 0)
    }

    // YCDI — capital total levantado vs comprometido (todos los acuerdos)
    const [acuerdosRow] = await tx
      .select({
        comprometido: sql<string>`COALESCE(SUM(${acuerdosAportacion.montoTotal}), 0)::text`,
      })
      .from(acuerdosAportacion)
      .where(eq(acuerdosAportacion.tenantId, tenantId))

    const [pagadoRow] = await tx
      .select({
        total: sql<string>`COALESCE(SUM(${pagosAportacion.montoPagado}), 0)::text`,
      })
      .from(pagosAportacion)
      .where(eq(pagosAportacion.tenantId, tenantId))

    const capitalLevantadoYcdi = Number(pagadoRow?.total ?? 0)
    const capitalComprometido = Number(acuerdosRow?.comprometido ?? 0)
    const capitalPendienteYcdi = Math.max(0, capitalComprometido - capitalLevantadoYcdi)

    return {
      ventasBmcorpFinalizadas,
      comisionGeneradaBmcorp,
      capitalLevantadoYcdi,
      capitalPendienteYcdi,
      hipotesis:
        ventasBmcorpFinalizadas > 0 && capitalLevantadoYcdi > 0
          ? `BM CORP cerró ${ventasBmcorpFinalizadas.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })} en ventas mientras YCDI levantó ${capitalLevantadoYcdi.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })} de capital. Una porción de las ventas BM puede ser acciones YCDI — confirmar con cliente para correlación exacta.`
          : 'Sin suficientes datos de ambas empresas para correlacionar.',
    }
  })
}
