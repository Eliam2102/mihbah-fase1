/**
 * lib/services/dashboard-general/dashboard-general.queries.ts
 *
 * Queries puras para el Dashboard General. Sin lógica de negocio.
 */

import { db } from '@/lib/db'
import {
  empresas,
  movimientos,
  cuentasPendientes,
  ventasBmcorp,
  pagosAportacion,
} from '@/lib/db/schema'
import { and, eq, gte, lte, sql, inArray, notInArray } from 'drizzle-orm'
import type { EmpresaResumen, PeriodFilter } from './dashboard-general.types'

// ─── Period helper ────────────────────────────────────────────────────────────

function periodRange(p?: PeriodFilter): { from: string; to: string } {
  const anio = p?.anio ?? new Date().getFullYear()
  if (p?.mes) {
    const mes = String(p.mes).padStart(2, '0')
    const lastDay = new Date(anio, p.mes, 0).getDate()
    return {
      from: `${anio}-${mes}-01`,
      to: `${anio}-${mes}-${String(lastDay).padStart(2, '0')}`,
    }
  }
  return { from: `${anio}-01-01`, to: `${anio}-12-31` }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function getEmpresasTenant(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
) {
  return tx
    .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
    .from(empresas)
    .where(eq(empresas.tenantId, tenantId))
}

async function kpisConstructora(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  empresaId: string,
  range: { from: string; to: string },
): Promise<Pick<EmpresaResumen, 'ingresos' | 'egresos' | 'neto' | 'cxc' | 'cxp'>> {
  // Movimientos
  const movs = await tx
    .select({
      tipo: movimientos.tipo,
      total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text`,
    })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.tenantId, tenantId),
        eq(movimientos.empresaId, empresaId),
        gte(movimientos.fecha, range.from),
        lte(movimientos.fecha, range.to),
      ),
    )
    .groupBy(movimientos.tipo)

  let ingresos = 0
  let egresos = 0
  for (const r of movs) {
    const monto = Number(r.total)
    if (r.tipo === 'INGRESO') ingresos += monto
    else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA' || r.tipo === 'PRESTAMO') egresos += monto
  }

  // CXC / CXP
  const pendientes = await tx
    .select({
      tipo: cuentasPendientes.tipo,
      total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto}), 0)::text`,
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
  for (const r of pendientes) {
    const monto = Number(r.total)
    if (r.tipo === 'POR_COBRAR') cxc = monto
    else if (r.tipo === 'POR_PAGAR') cxp = monto
  }

  return { ingresos, egresos, neto: ingresos - egresos, cxc, cxp }
}

async function kpisCapitalYcdi(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  empresaId: string,
  range: { from: string; to: string },
): Promise<Pick<EmpresaResumen, 'ingresos' | 'egresos' | 'neto' | 'cxc' | 'cxp'>> {
  // Movimientos
  const movs = await tx
    .select({
      tipo: movimientos.tipo,
      total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text`,
    })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.tenantId, tenantId),
        eq(movimientos.empresaId, empresaId),
        gte(movimientos.fecha, range.from),
        lte(movimientos.fecha, range.to),
      ),
    )
    .groupBy(movimientos.tipo)

  let ingresos = 0
  let egresos = 0
  for (const r of movs) {
    const monto = Number(r.total)
    if (r.tipo === 'INGRESO') ingresos += monto
    else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA' || r.tipo === 'PRESTAMO') egresos += monto
  }

  // CXC desde pagos_aportacion
  const [cxcRow] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${pagosAportacion.montoEsperado} - ${pagosAportacion.montoPagado}), 0)::text`,
    })
    .from(pagosAportacion)
    .where(
      and(
        eq(pagosAportacion.tenantId, tenantId),
        inArray(pagosAportacion.estado, ['VENCIDA', 'PROXIMA']),
      ),
    )

  // Fallback CXC: cuentas_pendientes
  const [cxcMovRow] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto}), 0)::text`,
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

  const [cxpRow] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${cuentasPendientes.monto}), 0)::text`,
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

  const cxc = Number(cxcRow?.total ?? 0) + Number(cxcMovRow?.total ?? 0)
  const cxp = Number(cxpRow?.total ?? 0)

  return { ingresos, egresos, neto: ingresos - egresos, cxc, cxp }
}

async function kpisComercialBmcorp(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  empresaId: string,
  range: { from: string; to: string },
): Promise<
  Pick<EmpresaResumen, 'ingresos' | 'egresos' | 'neto' | 'cxc' | 'cxp'> & { parcial: boolean }
> {
  const [ventasRow] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
    })
    .from(ventasBmcorp)
    .where(
      and(
        eq(ventasBmcorp.tenantId, tenantId),
        eq(ventasBmcorp.empresaId, empresaId),
        gte(ventasBmcorp.fechaApertura, range.from),
        lte(ventasBmcorp.fechaApertura, range.to),
      ),
    )

  const movs = await tx
    .select({
      tipo: movimientos.tipo,
      total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)::text`,
    })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.tenantId, tenantId),
        eq(movimientos.empresaId, empresaId),
        gte(movimientos.fecha, range.from),
        lte(movimientos.fecha, range.to),
      ),
    )
    .groupBy(movimientos.tipo)

  let ingresosMov = 0
  let egresos = 0
  for (const r of movs) {
    const monto = Number(r.total)
    if (r.tipo === 'INGRESO') ingresosMov += monto
    else if (r.tipo === 'EGRESO' || r.tipo === 'SALIDA' || r.tipo === 'PRESTAMO') egresos += monto
  }

  const ingresosVentas = Number(ventasRow?.total ?? 0)
  const ingresos = ingresosVentas + ingresosMov

  // G3: BM CORP CXC = SUM(monto - enganche) for non-finalized, non-cancelled ventas
  const [cxcRow] = await tx
    .select({
      total: sql<string>`COALESCE(SUM(${ventasBmcorp.monto} - ${ventasBmcorp.enganche}), 0)::text`,
    })
    .from(ventasBmcorp)
    .where(
      and(
        eq(ventasBmcorp.tenantId, tenantId),
        eq(ventasBmcorp.empresaId, empresaId),
        notInArray(ventasBmcorp.estadoVenta, [
          'FINALIZADA',
          'FINALIZADO_Y_LIQUIDADO',
          'CANCELADA',
          'RECHAZADO',
        ]),
      ),
    )

  return {
    ingresos,
    egresos,
    neto: ingresos - egresos,
    cxc: Number(cxcRow?.total ?? 0),
    cxp: 0,
    parcial: ingresosVentas === 0,
  }
}

export { getEmpresasTenant, kpisConstructora, kpisCapitalYcdi, kpisComercialBmcorp, periodRange }
