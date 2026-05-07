import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { userEmpresaAccess } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'

export type AuthUser = {
  id: string
  email: string
  name: string
  role?: string | null
  tenantId?: string | null
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('Sesión requerida')
    this.name = 'UnauthenticatedError'
  }
}

// ─── requireUser ─────────────────────────────────────────────────────────────

export async function requireUser(): Promise<AuthUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) throw new UnauthenticatedError()
  return session.user as AuthUser
}

// ─── requireTenant ────────────────────────────────────────────────────────────

export async function requireTenant(): Promise<string> {
  const user = await requireUser()
  if (!user.tenantId) throw new Error('Usuario sin tenant asignado')
  return user.tenantId
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function isSuperAdminDev(role?: string | null): boolean {
  return role === 'super_admin_dev'
}

export function isSuperAdminOrAbove(role?: string | null): boolean {
  return role === 'super_admin_dev' || role === 'super_admin'
}

export function isAdminOrAbove(role?: string | null): boolean {
  return role === 'super_admin_dev' || role === 'super_admin' || role === 'admin'
}

export async function requireSuperAdminDev(): Promise<AuthUser> {
  const user = await requireUser()
  if (!isSuperAdminDev(user.role)) throw new Error('Acceso denegado — se requiere super_admin_dev')
  return user
}

export async function requireSuperAdminOrAbove(): Promise<AuthUser> {
  const user = await requireUser()
  if (!isSuperAdminOrAbove(user.role)) throw new Error('Acceso denegado')
  return user
}

// ─── canAccessEmpresa ─────────────────────────────────────────────────────────

export async function canAccessEmpresa(userId: string, empresaId: string): Promise<boolean> {
  const rows = await db
    .select({ id: userEmpresaAccess.id })
    .from(userEmpresaAccess)
    .where(and(eq(userEmpresaAccess.userId, userId), eq(userEmpresaAccess.empresaId, empresaId)))
    .limit(1)

  return rows.length > 0
}
