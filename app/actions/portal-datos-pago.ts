'use server'

import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { lideresAlianza, auditLogs } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { requireUser } from '@/lib/auth/helpers'
import { getPerfilPortal } from '@/lib/services/comisiones/portal.service'
import { encryptField } from '@/lib/crypto/field-encryption'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

// Self-service del líder: edita su método de pago + datos bancarios desde el portal.
// Aplica a TODOS sus registros lideres_alianza (un líder puede tener N alianzas, misma cuenta).
// clabe y numeroCuenta se cifran (AES-256-GCM); banco queda en claro (convención del proyecto).

const datosPagoSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA', 'OTRO']),
  clabe: z.string().trim().max(40).nullable().optional(),
  banco: z.string().trim().max(80).nullable().optional(),
  numeroCuenta: z.string().trim().max(40).nullable().optional(),
})

export async function actualizarDatosPagoLiderAction(
  input: z.input<typeof datosPagoSchema>,
): Promise<ActionResult<{ actualizados: number }>> {
  try {
    const user = await requireUser()
    const parsed = datosPagoSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    }

    const perfil = await getPerfilPortal(user.id)
    if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA') {
      return { ok: false, error: 'Solo líderes de alianza pueden editar sus datos de pago' }
    }
    if (perfil.liderIds.length === 0) {
      return { ok: false, error: 'No se encontraron registros de líder asociados a tu cuenta' }
    }

    const { metodoPago } = parsed.data
    const requiereBanco = metodoPago === 'DEPOSITO' || metodoPago === 'TRANSFERENCIA'
    // Si el método no requiere banco, limpiar datos bancarios.
    const clabe = requiereBanco ? parsed.data.clabe?.trim() || null : null
    const banco = requiereBanco ? parsed.data.banco?.trim() || null : null
    const numeroCuenta = requiereBanco ? parsed.data.numeroCuenta?.trim() || null : null

    const tenantId = perfil.tenantId
    const liderIds = perfil.liderIds

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      await tx
        .update(lideresAlianza)
        .set({
          metodoPago,
          clabe: clabe ? encryptField(clabe) : null,
          banco,
          numeroCuenta: numeroCuenta ? encryptField(numeroCuenta) : null,
          updatedAt: new Date(),
        })
        .where(and(eq(lideresAlianza.tenantId, tenantId), inArray(lideresAlianza.id, liderIds)))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'lider_alianza',
        recursoId: liderIds[0]!,
        accion: 'DATOS_PAGO_ACTUALIZADOS',
        cambios: { metodoPago, registros: liderIds.length },
      })
    })

    revalidatePath('/portal/datos-pago')
    revalidatePath('/portal/dashboard')
    return { ok: true, data: { actualizados: liderIds.length } }
  } catch (err) {
    console.error('[portal-datos-pago] error:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
