'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { checkRateLimit } from '@/lib/auth/rate-limiter'

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginState = { error: string } | null

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const hdrs = await headers()

  // Rate limit by IP
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown'

  const { allowed, remaining } = checkRateLimit(ip)
  if (!allowed) {
    return { error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' }
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  // nextCookies() plugin handles Set-Cookie automatically in server actions
  const result = await auth.api
    .signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: hdrs,
    })
    .catch(() => null)

  if (!result) {
    const hint =
      remaining > 0
        ? ` (${remaining} intento${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'})`
        : ''
    return { error: `Correo o contraseña incorrectos.${hint}` }
  }

  redirect('/dashboard')
}
