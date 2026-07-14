import { db } from '@/lib/db'
import { cuentasPendientes } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { CuentaPendienteExcel, CuentasExcel } from './cuentas-excel.types'

export async function getCuentasExcel(empresaId: string, tenantId: string): Promise<CuentasExcel> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({
        id: cuentasPendientes.id,
        tipo: cuentasPendientes.tipo,
        tercero: cuentasPendientes.tercero,
        monto: cuentasPendientes.monto,
        montoPagado: cuentasPendientes.montoPagado,
        fechaVencimiento: cuentasPendientes.fechaVencimiento,
        descripcion: cuentasPendientes.descripcion,
        estado: cuentasPendientes.estado,
      })
      .from(cuentasPendientes)
      .where(
        and(eq(cuentasPendientes.empresaId, empresaId), eq(cuentasPendientes.tenantId, tenantId)),
      )
      .orderBy(cuentasPendientes.fechaVencimiento, cuentasPendientes.tercero)

    const today = new Date()
    const mapped: CuentaPendienteExcel[] = rows.map((r) => {
      const monto = Number(r.monto)
      const montoPagado = Number(r.montoPagado)
      let diasVencido: number | null = null
      if (r.fechaVencimiento && r.estado !== 'LIQUIDADA') {
        const venc = new Date(r.fechaVencimiento)
        const diff = Math.floor((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
        if (diff > 0) diasVencido = diff
      }
      return {
        id: r.id,
        tipo: r.tipo as 'POR_COBRAR' | 'POR_PAGAR',
        tercero: r.tercero,
        monto,
        montoPagado,
        saldoPendiente: monto - montoPagado,
        fechaVencimiento: r.fechaVencimiento,
        descripcion: r.descripcion,
        estado: r.estado,
        diasVencido,
      }
    })

    const cxc = mapped.filter((c) => c.tipo === 'POR_COBRAR')
    const cxp = mapped.filter((c) => c.tipo === 'POR_PAGAR')

    return {
      cxc,
      cxp,
      totalCxc: cxc
        .filter((c) => c.estado !== 'LIQUIDADA')
        .reduce((s, c) => s + c.saldoPendiente, 0),
      totalCxp: cxp
        .filter((c) => c.estado !== 'LIQUIDADA')
        .reduce((s, c) => s + c.saldoPendiente, 0),
    }
  })
}
