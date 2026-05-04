'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/config'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type State = { error: string } | { success: true } | null

export async function nuevaPasswordAction(
  paramsPromise: Promise<{ token: string }>,
  _prev: State,
  formData: FormData,
): Promise<State> {
  const { token } = await paramsPromise

  if (!token) {
    return { error: 'Token inválido o expirado.' }
  }

  const parsed = schema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const result = await auth.api
    .resetPassword({
      body: {
        token,
        newPassword: parsed.data.password,
      },
      headers: await headers(),
    })
    .catch(() => null)

  if (!result) {
    return { error: 'El enlace de recuperación es inválido o ya expiró. Solicita uno nuevo.' }
  }

  return { success: true }
}
