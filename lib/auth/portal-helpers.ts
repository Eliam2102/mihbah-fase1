/**
 * Helpers de auth para el portal externo (líderes y asesores).
 *
 * Diferentes a los de admin: estos usan rolPortal y validan contra usuariosPortal
 * en lugar de userEmpresaAccess.
 */

import { redirect } from 'next/navigation'
import { requireUser, type AuthUser } from './helpers'
import { getPerfilPortal, type PerfilPortal } from '@/lib/services/comisiones/portal.service'

export interface SesionPortal {
  user: AuthUser
  perfil: PerfilPortal
}

/**
 * Garantiza sesión + usuario portal activo. Si falla, redirige a /portal/login.
 */
export async function requirePortalUser(): Promise<SesionPortal> {
  let user: AuthUser
  try {
    user = await requireUser()
  } catch {
    redirect('/portal/login')
  }
  const perfil = await getPerfilPortal(user.id)
  if (!perfil) {
    // Sesión válida pero el usuario no es portal user (puede ser admin).
    redirect('/portal/login?error=no-portal-account')
  }
  return { user, perfil }
}

export async function requirePortalRol(rol: 'LIDER_ALIANZA' | 'ASESOR'): Promise<SesionPortal> {
  const sesion = await requirePortalUser()
  if (sesion.perfil.rolPortal !== rol) {
    redirect('/portal/dashboard')
  }
  return sesion
}
