/**
 * Alta manual de ventas BM CORP.
 *
 * Captura interna (no Monday): el admin registra una venta en formato 2026
 * ligándola a una alianza ya configurada. Marca `editadoEnSistema=true` para
 * que la sincronización Monday NO la pise. Si la venta nace en una etapa con
 * comisión (FINALIZADA/LIBERADO/FINALIZADO_Y_LIQUIDADO) dispara el cálculo con
 * el mismo motor que usa `actualizarVentaAction`.
 *
 * Producto (TERRENO/ACCION): el motor lo deriva de la desarrolladora del
 * desarrollo; si no hay desarrollo, cae al fallback loteAcciones/paqueteAccion.
 * Por eso, cuando NO se elige desarrollo y el producto es ACCION, sembramos
 * `paqueteAccion` para que el motor resuelva ACCION.
 *
 * Estados que pagan comisión: FINALIZADA y FINALIZADO_Y_LIQUIDADO. LIBERADO NO
 * (indica que la venta se cayó / canceló).
 */

import { db } from '@/lib/db'
import { ventasBmcorp, auditLogs } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { calcularYPersistirComision } from '@/lib/services/comisiones/comisiones.service'

const ESTADOS_CON_COMISION = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'] as const

export type EstadoVentaStr =
  | 'EN_PROCESO'
  | 'APROBADO_JURIDICO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'APROBADO_VENTAS'
  | 'RECHAZADO'
  | 'ESPERANDO_AUTORIZACION'
  | 'LIBERADO'
  | 'FINALIZADO_Y_LIQUIDADO'

export interface CrearVentaData {
  cliente: string
  afiliadoId: string | null
  desarrolloId: string | null
  producto: 'TERRENO' | 'ACCION'
  asesor: string | null
  monto: number
  enganche: number | null
  financiamiento: string | null
  estadoVenta: EstadoVentaStr
  fecha: string // YYYY-MM-DD (columna NOT NULL)
  fechaApertura: string | null
  fechaCierre: string | null
  loteAcciones: string | null
  notasInternas: string | null
}

export async function crearVenta(
  tenantId: string,
  empresaId: string,
  userId: string,
  data: CrearVentaData,
): Promise<{ ventaId: string; calculada: boolean }> {
  // 1. Insert + audit, atómico. Hacemos commit ANTES de calcular: el motor
  //    (resolverParaVenta) abre su propia transacción/conexión y no vería la
  //    fila si siguiera sin commitear.
  const ventaId = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const esAccion = data.producto === 'ACCION'

    const [row] = await tx
      .insert(ventasBmcorp)
      .values({
        tenantId,
        empresaId,
        mondayItemId: null, // captura interna, no Monday
        cliente: data.cliente,
        afiliadoId: data.afiliadoId,
        desarrolloId: data.desarrolloId,
        asesor: data.asesor,
        monto: data.monto.toFixed(2),
        enganche: data.enganche != null ? data.enganche.toFixed(2) : '0',
        financiamiento: data.financiamiento,
        estadoVenta: data.estadoVenta,
        fecha: data.fecha,
        fechaApertura: data.fechaApertura,
        fechaCierre: data.fechaCierre,
        loteAcciones: data.loteAcciones,
        // Semilla para que el motor resuelva ACCION cuando no hay desarrollo.
        // Si se eligió desarrollo, la desarrolladora manda y esto es informativo.
        paqueteAccion: esAccion ? (data.loteAcciones ?? 'Acción') : null,
        notasInternas: data.notasInternas,
        editadoEnSistema: true,
        editadoPor: userId,
        editadoEn: new Date(),
      })
      .returning({ id: ventasBmcorp.id })

    if (!row) throw new Error('Insert de venta no retornó fila')

    await tx.insert(auditLogs).values({
      tenantId,
      userId,
      recursoTipo: 'venta_bmcorp',
      recursoId: row.id,
      accion: 'CREATE',
      cambios: {
        cliente: data.cliente,
        afiliadoId: data.afiliadoId,
        monto: data.monto,
        estadoVenta: data.estadoVenta,
        origen: 'CAPTURA_MANUAL',
      },
    })

    return row.id
  })

  // 2. Si la venta nace en etapa con comisión, calcular (transacción propia del motor).
  let calculada = false
  if ((ESTADOS_CON_COMISION as readonly string[]).includes(data.estadoVenta)) {
    try {
      await calcularYPersistirComision(tenantId, ventaId, { userId })
      calculada = true
    } catch (err) {
      // No abortar: la venta ya quedó guardada; el recálculo puede correrse después.
      console.error('[crearVenta] cálculo de comisión falló', err)
    }
  }

  return { ventaId, calculada }
}
