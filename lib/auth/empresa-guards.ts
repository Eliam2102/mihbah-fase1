import { redirect } from 'next/navigation'
import { getEmpresaById } from '@/lib/services/empresas'
import {
  canAccessEmpresa,
  isAdminOrAbove,
  isSuperAdminOrAbove,
  type AuthUser,
} from '@/lib/auth/helpers'
import { canViewModulo } from '@/lib/services/admin/modulo-access.service'
import { getModulosParaTipo, type ModuloKey } from '@/lib/modulos-config'
import type { EmpresaBasic } from '@/lib/services/empresas/empresas.types'

async function primerModuloAccesible(
  userId: string,
  empresaId: string,
  tipo: string,
): Promise<string> {
  const modulos = getModulosParaTipo(tipo)
  for (const m of modulos) {
    const ok = await canViewModulo(userId, empresaId, m)
    if (ok) return `/empresa/${empresaId}/${m}`
  }
  return '/dashboard'
}

/**
 * Validates:
 * 1. Empresa belongs to user's tenant
 * 2. User has empresa access (admins bypass)
 * 3. User can view the module (default allow if no explicit row)
 *
 * Returns the empresa or redirects. Never returns null.
 */
export async function requireEmpresaAccess(
  user: AuthUser,
  empresaId: string,
  modulo: ModuloKey,
): Promise<EmpresaBasic> {
  const tenantId = user.tenantId
  if (!tenantId) redirect('/dashboard')

  const empresa = await getEmpresaById(empresaId, tenantId)
  if (!empresa) redirect('/dashboard')

  // Super/Admin bypass directo. Viewer/tesorería deben tener acceso explícito por empresa.
  if (!isSuperAdminOrAbove(user.role)) {
    const hasAccess = await canAccessEmpresa(user.id, empresaId)
    if (!hasAccess) redirect('/dashboard')
  }

  const canView = await canViewModulo(user.id, empresaId, modulo)
  if (!canView) {
    const destino = await primerModuloAccesible(user.id, empresaId, empresa.tipo)
    redirect(destino)
  }

  return empresa
}
