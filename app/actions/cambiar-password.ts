'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth/config'
import { requireUser } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(128),
})

const NombreSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
})

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function cambiarPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser()
    const parsed = PasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
    })
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }

    const hdrs = await headers()
    const result = await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: false,
      },
      headers: hdrs,
    })

    if (!result) return { ok: false, error: 'No se pudo cambiar la contraseña' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function actualizarNombreAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser()
    const parsed = NombreSchema.safeParse({ name: formData.get('name') })
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }

    const hdrs = await headers()
    await auth.api.updateUser({ body: { name: parsed.data.name }, headers: hdrs } as never)
    revalidatePath('/configuracion/mi-cuenta')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
