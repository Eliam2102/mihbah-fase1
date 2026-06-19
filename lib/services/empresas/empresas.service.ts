import { db } from '@/lib/db'
import { empresas, userEmpresaAccess, tenants } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { EmpresaBasic } from './empresas.types'

export async function getEmpresasForUser(
  userId: string,
  tenantId: string,
  userRole?: string | null,
): Promise<EmpresaBasic[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
      .from(userEmpresaAccess)
      .innerJoin(empresas, eq(userEmpresaAccess.empresaId, empresas.id))
      .where(eq(userEmpresaAccess.userId, userId))

    if (rows.length > 0) return rows

    // Fallback: SOLO super_admin sin acceso explícito → todas las empresas del tenant.
    // Otros roles (tesorería, viewer, admin) deben tener acceso explícito por empresa;
    // devolverles todas sin restricción causaría un loop con empresa-guards.ts.
    if (userRole === 'super_admin' || userRole === 'super_admin_dev') {
      return tx
        .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
        .from(empresas)
        .where(eq(empresas.tenantId, tenantId))
    }

    return []
  })
}

export async function getTenantName(tenantId: string): Promise<string> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
    return rows[0]?.name ?? 'SIG Jade'
  })
}

export async function getEmpresaById(
  empresaId: string,
  tenantId: string,
): Promise<EmpresaBasic | null> {
  if (!empresaId || empresaId === 'undefined') return null
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
      .from(empresas)
      .where(and(eq(empresas.id, empresaId), eq(empresas.tenantId, tenantId)))
      .limit(1)
    return rows[0] ?? null
  })
}
