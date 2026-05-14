import { db } from '@/lib/db'
import { empresas, cuentasPendientes, pagosAportacion, ventasBmcorp } from '@/lib/db/schema'
import { and, eq, sql, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import { getEmpresasTenant } from './dashboard-general.queries'
import type { CuentasConsolidado } from './dashboard-general.types'

export async function getCuentasConsolidado(tenantId: string): Promise<CuentasConsolidado> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const empresasRows = await getEmpresasTenant(tx, tenantId)

    const cxcPorEmpresa: CuentasConsolidado['cxcPorEmpresa'] = []
    const cxpPorEmpresa: CuentasConsolidado['cxpPorEmpresa'] = []
    const today = new Date().toISOString().slice(0, 10)

    for (const e of empresasRows) {
      if (e.tipo === 'CONSTRUCTORA') {
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
      } else if (e.tipo === 'COMERCIAL') {
        const ESTADOS_CERRADOS = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO', 'CANCELADA']
        const [cxcRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(${ventasBmcorp.monto} - COALESCE(${ventasBmcorp.enganche}, 0)), 0)::text`,
          })
          .from(ventasBmcorp)
          .where(
            and(
              eq(ventasBmcorp.tenantId, tenantId),
              eq(ventasBmcorp.empresaId, e.id),
              sql`${ventasBmcorp.estadoVenta} NOT IN (${sql.join(
                ESTADOS_CERRADOS.map((s) => sql`${s}`),
                sql`, `,
              )})`,
            ),
          )

        const [cxpRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(${ventasBmcorp.comisionBmcorp}), 0)::text`,
          })
          .from(ventasBmcorp)
          .where(
            and(
              eq(ventasBmcorp.tenantId, tenantId),
              eq(ventasBmcorp.empresaId, e.id),
              sql`${ventasBmcorp.estadoVenta} NOT IN (${sql.join(
                ESTADOS_CERRADOS.map((s) => sql`${s}`),
                sql`, `,
              )})`,
            ),
          )

        cxcPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: Math.max(0, Number(cxcRow?.total ?? 0)),
          vencidas: 0,
        })
        cxpPorEmpresa.push({
          empresaId: e.id,
          nombre: e.name,
          total: Math.max(0, Number(cxpRow?.total ?? 0)),
          vencidas: 0,
        })
      } else if (e.tipo === 'CAPITAL') {
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
        cxpPorEmpresa.push({ empresaId: e.id, nombre: e.name, total: 0, vencidas: 0 })
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
