import { db } from '@/lib/db'
import { acuerdosAportacion, pagosAportacion, ventasBmcorp } from '@/lib/db/schema'
import { and, eq, sql, inArray } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import { getEmpresasTenant } from './dashboard-general.queries'
import type { ResumenDelResumen } from './dashboard-general.types'

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

    const [acuerdosRow] = await tx
      .select({
        comprometido: sql<string>`COALESCE(SUM(${acuerdosAportacion.montoTotal}), 0)::text`,
      })
      .from(acuerdosAportacion)
      .where(eq(acuerdosAportacion.tenantId, tenantId))

    const [pagadoRow] = await tx
      .select({ total: sql<string>`COALESCE(SUM(${pagosAportacion.montoPagado}), 0)::text` })
      .from(pagosAportacion)
      .where(eq(pagosAportacion.tenantId, tenantId))

    const capitalLevantadoYcdi = Number(pagadoRow?.total ?? 0)
    const capitalComprometido = Number(acuerdosRow?.comprometido ?? 0)
    const capitalPendienteYcdi = Math.max(0, capitalComprometido - capitalLevantadoYcdi)

    const fmt = (n: number) =>
      n.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

    return {
      ventasBmcorpFinalizadas,
      comisionGeneradaBmcorp,
      capitalLevantadoYcdi,
      capitalPendienteYcdi,
      hipotesis:
        ventasBmcorpFinalizadas > 0 && capitalLevantadoYcdi > 0
          ? `BM CORP cerró ${fmt(ventasBmcorpFinalizadas)} en ventas mientras YCDI levantó ${fmt(capitalLevantadoYcdi)} de capital. Una porción de las ventas BM puede ser acciones YCDI — confirmar con cliente para correlación exacta.`
          : 'Sin suficientes datos de ambas empresas para correlacionar.',
    }
  })
}
