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
import { crearVenta } from '@/lib/services/ventas/ventas-create.service'

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
// LIBERADO NO cuenta: indica venta caída (cancelada). Solo finalizadas pagan.
const ESTADOS_CON_COMISION = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'] as const

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

// ─── Alta manual de venta ────────────────────────────────────────────────────
// Captura interna en formato 2026, ligada a una alianza configurada. La venta
// nace con editadoEnSistema=true (sync Monday no la pisa). Si nace finalizada,
// dispara el cálculo de comisión.

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/

const createSchema = z.object({
  empresaId: z.string().uuid(),
  cliente: z.string().trim().min(1, 'Cliente requerido'),
  // Forzar liga a alianza: el objetivo de la captura es homologar la venta.
  afiliadoId: z.string().uuid('Selecciona una alianza'),
  desarrolloId: z.string().uuid().nullable().optional(),
  producto: z.enum(['TERRENO', 'ACCION']),
  asesor: z.string().trim().nullable().optional(),
  monto: z.number().min(0),
  enganche: z.number().min(0).nullable().optional(),
  financiamiento: z.string().trim().nullable().optional(),
  estadoVenta: z.enum(ESTADOS_VALIDOS),
  fecha: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD'),
  fechaApertura: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD').nullable().optional(),
  fechaCierre: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD').nullable().optional(),
  loteAcciones: z.string().trim().nullable().optional(),
  notasInternas: z.string().trim().nullable().optional(),
})

export async function crearVentaAction(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ ventaId: string; calculada: boolean }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }

    const parsed = createSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    }
    const d = parsed.data
    await requireEmpresaAccess(user, d.empresaId, 'ventas')

    const { ventaId, calculada } = await crearVenta(user.tenantId, d.empresaId, user.id, {
      cliente: d.cliente,
      afiliadoId: d.afiliadoId,
      desarrolloId: d.desarrolloId ?? null,
      producto: d.producto,
      asesor: d.asesor ?? null,
      monto: d.monto,
      enganche: d.enganche ?? null,
      financiamiento: d.financiamiento ?? null,
      estadoVenta: d.estadoVenta,
      fecha: d.fecha,
      fechaApertura: d.fechaApertura ?? null,
      fechaCierre: d.fechaCierre ?? null,
      loteAcciones: d.loteAcciones ?? null,
      notasInternas: d.notasInternas ?? null,
    })

    revalidatePath(`/empresa/${d.empresaId}/ventas`)
    revalidatePath(`/empresa/${d.empresaId}/ventas/${ventaId}`)
    return { ok: true, data: { ventaId, calculada } }
  } catch (err) {
    console.error('[crearVentaAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
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
