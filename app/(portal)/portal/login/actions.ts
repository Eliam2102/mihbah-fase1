'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { checkRateLimit } from '@/lib/auth/rate-limiter'
import { db } from '@/lib/db'
import { usuariosPortal } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (result.user as any)?.role
  const PORTAL_ROLES = ['lider_alianza', 'asesor', 'administrativo']

  // Admins que también son líderes/asesores tienen registro en usuariosPortal
  // con el mismo userId → redirigir al portal aunque su role sea super_admin/admin
  let destino = PORTAL_ROLES.includes(role) ? '/portal/dashboard' : '/dashboard'
  if (destino === '/dashboard') {
    const [perfilPortal] = await db
      .select({ id: usuariosPortal.id })
      .from(usuariosPortal)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(usuariosPortal.userId, (result.user as any).id))
      .limit(1)
    if (perfilPortal) destino = '/portal/dashboard'
  }
  redirect(destino)
}
