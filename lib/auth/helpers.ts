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

export function isViewer(role?: string | null): boolean {
  return role === 'viewer' || role === 'user'
}

// Cualquier rol ERP autenticado puede ver dashboards/reportes de solo lectura.
export function isViewerOrAbove(role?: string | null): boolean {
  return isViewer(role) || isAdminOrAbove(role) || role === 'tesoreria'
}

export function isTesoreria(role?: string | null): boolean {
  return role === 'tesoreria'
}

// Tesorería o cualquier admin pueden ejecutar/marcar pagos del corte.
export function isTesoreriaOrAdmin(role?: string | null): boolean {
  return isTesoreria(role) || isAdminOrAbove(role)
}

export async function requireAdminOrAbove(): Promise<AuthUser> {
  const user = await requireUser()
  if (!isAdminOrAbove(user.role)) throw new Error('Acceso denegado')
  return user
}

export async function requireTesoreriaOrAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (!isTesoreriaOrAdmin(user.role)) throw new Error('Acceso denegado — solo Tesorería o admin')
  return user
}

export async function requireSuperAdminDev(): Promise<AuthUser> {
  const user = await requireUser()
  if (!isSuperAdminDev(user.role)) throw new Error('Acceso denegado — permisos insuficientes')
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
