'use server'

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { auditLogs, ventasBmcorp } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { calcularYPersistirComision } from '@/lib/services/comisiones/comisiones.service'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const ESTADOS_VALIDOS = [
  'EN_PROCESO',
  'APROBADO_JURIDICO',
  'FINALIZADA',
  'CANCELADA',
  'APROBADO_VENTAS',
  'RECHAZADO',
  'ESPERANDO_AUTORIZACION',
  'LIBERADO',
  'FINALIZADO_Y_LIQUIDADO',
] as const

// Solo estas etapas de pipeline tienen comisiones reales.
// Ventas en proceso (EN_PROCESO, APROBADO_VENTAS, etc.) NO generan dispersiones.
const ESTADOS_CON_COMISION = ['FINALIZADA', 'LIBERADO', 'FINALIZADO_Y_LIQUIDADO'] as const

const updateSchema = z.object({
  ventaId: z.string().uuid(),
  empresaId: z.string().uuid(),
  // Campos editables
  estadoVenta: z.enum(ESTADOS_VALIDOS).optional(),
  fechaApertura: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
    .nullable()
    .optional(),
  fechaCierre: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
    .nullable()
    .optional(),
  monto: z.number().min(0).optional(),
  enganche: z.number().min(0).optional(),
  loteAcciones: z.string().nullable().optional(),
  asesor: z.string().nullable().optional(),
  notasInternas: z.string().nullable().optional(),
})

export async function actualizarVentaAction(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<{ ventaId: string; recalculada: boolean }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }

    const parsed = updateSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    }
    const { ventaId, empresaId, ...campos } = parsed.data

    await requireEmpresaAccess(user, empresaId, 'ventas')
    const tenantId = user.tenantId

    return await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      // Cargar venta antes para audit (snapshot)
      const [antes] = await tx
        .select()
        .from(ventasBmcorp)
        .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
        .limit(1)
      if (!antes) return { ok: false as const, error: 'Venta no encontrada' }

      // Construir patch dinámicamente (solo campos provistos)
      const patch: Record<string, unknown> = {
        updatedAt: new Date(),
        editadoEnSistema: true,
        editadoPor: user.id,
        editadoEn: new Date(),
      }
      const cambios: Record<string, { antes: unknown; despues: unknown }> = {}

      const setIfChanged = (key: keyof typeof antes, value: unknown) => {
        if (value !== undefined && value !== antes[key]) {
          patch[key] = value
          cambios[key as string] = { antes: antes[key], despues: value }
        }
      }
      if (campos.estadoVenta !== undefined) setIfChanged('estadoVenta', campos.estadoVenta)
      if (campos.fechaApertura !== undefined) setIfChanged('fechaApertura', campos.fechaApertura)
      if (campos.fechaCierre !== undefined) setIfChanged('fechaCierre', campos.fechaCierre)
      if (campos.monto !== undefined) setIfChanged('monto', campos.monto.toFixed(2))
      if (campos.enganche !== undefined) setIfChanged('enganche', campos.enganche.toFixed(2))
      if (campos.loteAcciones !== undefined) setIfChanged('loteAcciones', campos.loteAcciones)
      if (campos.asesor !== undefined) setIfChanged('asesor', campos.asesor)
      if (campos.notasInternas !== undefined) setIfChanged('notasInternas', campos.notasInternas)

      if (Object.keys(cambios).length === 0) {
        return { ok: true as const, data: { ventaId, recalculada: false } }
      }

      await tx
        .update(ventasBmcorp)
        .set(patch)
        .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))

      // Audit log
      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'venta_bmcorp',
        recursoId: ventaId,
        accion: 'UPDATE',
        cambios,
      })

      // Si cambió monto o enganche → recalcular comisión SOLO si la venta ya está finalizada
      const requiereRecalculo = 'monto' in cambios || 'enganche' in cambios
      const estadoActual = (campos.estadoVenta ?? antes.estadoVenta) as string
      const esVentaFinalizada = (ESTADOS_CON_COMISION as readonly string[]).includes(estadoActual)
      let recalculada = false
      if (requiereRecalculo && esVentaFinalizada) {
        try {
          // calcularYPersistirComision lee enganche/monto actualizado de DB (ya guardado arriba)
          await calcularYPersistirComision(tenantId, ventaId, { userId: user.id })
          recalculada = true
        } catch (err) {
          console.error('[actualizarVentaAction] recalc failed', err)
          // No abortar — venta ya se guardó, recalc puede correrse manual después
        }
      }

      revalidatePath(`/empresa/${empresaId}/ventas`)
      revalidatePath(`/empresa/${empresaId}/ventas/${ventaId}`)

      return { ok: true as const, data: { ventaId, recalculada } }
    })
  } catch (err) {
    console.error('[actualizarVentaAction]', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

// ─── Resync venta desde Monday ──────────────────────────────────────────────
// Limpia editadoEnSistema=false para que la próxima sincronización Monday
// sobreescriba los campos editables. NO ejecuta sync ahora; solo destraba el
// flag sticky. Joana corre "Sincronizar Monday" desde su módulo si quiere
// el cambio inmediato.

export async function resyncVentaFromMondayAction(
  empresaId: string,
  ventaId: string,
): Promise<ActionResult<{ ventaId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'ventas')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      const [actual] = await tx
        .select()
        .from(ventasBmcorp)
        .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
        .limit(1)
      if (!actual) throw new Error('Venta no encontrada')
      if (!actual.editadoEnSistema) return // idempotente

      await tx
        .update(ventasBmcorp)
        .set({
          editadoEnSistema: false,
          editadoPor: null,
          editadoEn: null,
          updatedAt: new Date(),
        })
        .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'venta_bmcorp',
        recursoId: ventaId,
        accion: 'RESYNC_MONDAY',
        cambios: {
          editadoPorAnterior: actual.editadoPor,
          editadoEnAnterior: actual.editadoEn,
        },
      })
    })

    revalidatePath(`/empresa/${empresaId}/ventas`)
    revalidatePath(`/empresa/${empresaId}/ventas/${ventaId}`)
    return { ok: true, data: { ventaId } }
  } catch (err) {
    console.error('[resyncVentaFromMondayAction]', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
