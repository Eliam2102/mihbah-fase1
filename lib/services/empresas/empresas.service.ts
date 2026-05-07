import { db } from '@/lib/db'
import { empresas, userEmpresaAccess } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { EmpresaBasic } from './empresas.types'

export async function getEmpresasForUser(
  userId: string,
  tenantId: string,
): Promise<EmpresaBasic[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const rows = await tx
      .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
      .from(userEmpresaAccess)
      .innerJoin(empresas, eq(userEmpresaAccess.empresaId, empresas.id))
      .where(eq(userEmpresaAccess.userId, userId))

    if (rows.length > 0) return rows

    // Fallback: super_admin sin acceso explícito → todas las empresas del tenant
    return tx
      .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
      .from(empresas)
      .where(eq(empresas.tenantId, tenantId))
  })
}

export async function getEmpresaById(
  empresaId: string,
  tenantId: string,
): Promise<EmpresaBasic | null> {
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
