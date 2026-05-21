'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { checkRateLimit } from '@/lib/auth/rate-limiter'

const portalLoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type PortalLoginState = { error: string } | null

export async function portalLoginAction(
  _prev: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const hdrs = await headers()

  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown'

  const { allowed, remaining } = checkRateLimit(ip)
  if (!allowed) {
    return { error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' }
  }

  const parsed = portalLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const result = await auth.api
    .signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
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

  // Portal solo para roles portal — admin sigue al dashboard admin (guard rebota)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (result.user as any)?.role
  const destino = role === 'lider_alianza' || role === 'asesor' ? '/portal/dashboard' : '/dashboard'
  redirect(destino)
}
