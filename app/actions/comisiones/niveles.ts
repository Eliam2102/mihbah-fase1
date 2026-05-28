'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import {
  actualizarNivelConfig,
  seedNivelesDefault,
} from '@/lib/services/comisiones/niveles.service'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

export async function seedNivelesConfigAction(
  empresaId: string,
): Promise<ActionResult<{ creados: number }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const creados = await seedNivelesDefault(user.tenantId)
    revalidatePath(`/empresa/${empresaId}/comisiones/niveles`)
    return { ok: true, data: { creados } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

const updateSchema = z.object({
  empresaId: z.string().uuid(),
  id: z.string().uuid(),
  umbralMin: z.number().min(0).optional(),
  umbralMax: z.number().min(0).nullable().optional(),
  porcentajeBono: z.number().min(0).max(100).optional(),
  activo: z.boolean().optional(),
})

export async function actualizarNivelConfigAction(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, id, ...data } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')

    if (data.umbralMax != null && data.umbralMin != null && data.umbralMax < data.umbralMin) {
      return { ok: false, error: 'El umbral máximo no puede ser menor que el mínimo' }
    }

    await actualizarNivelConfig(user.tenantId, id, data)
    revalidatePath(`/empresa/${empresaId}/comisiones/niveles`)
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
