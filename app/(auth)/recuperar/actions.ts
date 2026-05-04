'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { headers } from 'next/headers'

const schema = z.object({
  email: z.string().email('Correo electrónico inválido'),
})

type State = { error: string } | { success: true } | null

export async function recuperarAction(_prev: State, formData: FormData): Promise<State> {
  const parsed = schema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Correo inválido' }
  }

  // better-auth generates a reset token and stores it in the verifications table.
  // The sendResetPassword callback in auth config logs the URL (email in Fase 2).
  await auth.api
    .requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: '/nueva-password' },
      headers: await headers(),
    })
    .catch(() => {
      // swallow — don't reveal if email exists (security: no email enumeration)
    })

  // Always show success to prevent email enumeration
  return { success: true }
}
