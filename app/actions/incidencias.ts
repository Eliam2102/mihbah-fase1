'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { incidencias } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireUser, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { requirePortalUser } from '@/lib/auth/portal-helpers'
import { setTenant } from '@/lib/services/_shared/db.helpers'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const crearSchema = z.object({
  titulo: z.string().min(5).max(200),
  descripcion: z.string().min(10).max(2000),
  empresaId: z.string().uuid().nullable().optional(),
  ventaId: z.string().uuid().nullable().optional(),
})

// ─── ERP (admin/viewer pueden abrir) ─────────────────────────────────────────

export async function crearIncidenciaAction(
  input: z.input<typeof crearSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Sin tenant' }
    const parsed = crearSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Error' }

    const [row] = await db.transaction(async (tx) => {
      await setTenant(tx, user.tenantId!)
      return tx
        .insert(incidencias)
        .values({
          tenantId: user.tenantId!,
          creadoPor: user.id,
          creadoPorNombre: user.name,
          titulo: parsed.data.titulo,
          descripcion: parsed.data.descripcion,
          empresaId: parsed.data.empresaId ?? null,
          ventaId: parsed.data.ventaId ?? null,
        })
        .returning({ id: incidencias.id })
    })
    revalidatePath('/configuracion/incidencias')
    return { ok: true, data: { id: row!.id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function actualizarEstadoIncidenciaAction(
  id: string,
  estado: 'ABIERTA' | 'EN_PROCESO' | 'RESUELTA' | 'CERRADA',
  resolucion?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Sin tenant' }
    if (!isSuperAdminOrAbove(user.role))
      return { ok: false, error: 'Solo super_admin puede gestionar incidencias' }

    await db.transaction(async (tx) => {
      await setTenant(tx, user.tenantId!)
      await tx
        .update(incidencias)
        .set({ estado, resolucion: resolucion ?? null, asignadaA: user.id, updatedAt: new Date() })
        .where(and(eq(incidencias.tenantId, user.tenantId!), eq(incidencias.id, id)))
    })
    revalidatePath('/configuracion/incidencias')
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

// ─── Portal (líderes, asesores, administrativos) ──────────────────────────────

export async function crearIncidenciaPortalAction(
  input: z.input<typeof crearSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, perfil } = await requirePortalUser()
    const parsed = crearSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Error' }

    const [row] = await db.transaction(async (tx) => {
      await setTenant(tx, perfil.tenantId)
      return tx
        .insert(incidencias)
        .values({
          tenantId: perfil.tenantId,
          creadoPor: user.id,
          creadoPorNombre: user.name,
          titulo: parsed.data.titulo,
          descripcion: parsed.data.descripcion,
        })
        .returning({ id: incidencias.id })
    })
    revalidatePath('/portal/incidencias')
    return { ok: true, data: { id: row!.id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' }
  }
}
