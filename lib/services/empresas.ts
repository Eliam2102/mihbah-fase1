import { db } from '@/lib/db'
import { empresas, userEmpresaAccess } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export interface EmpresaBasic {
  id: string
  name: string
  tipo: string
}

/**
 * Returns all empresas the user has access to.
 *
 * Wraps in a transaction so SET LOCAL app.current_tenant_id and the SELECT
 * run on the same connection (drizzle's pool would otherwise route them
 * to different connections, defeating RLS context).
 */
export async function getEmpresasForUser(
  userId: string,
  tenantId: string,
): Promise<EmpresaBasic[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    const rows = await tx
      .select({
        id: empresas.id,
        name: empresas.name,
        tipo: empresas.tipo,
      })
      .from(userEmpresaAccess)
      .innerJoin(empresas, eq(userEmpresaAccess.empresaId, empresas.id))
      .where(eq(userEmpresaAccess.userId, userId))

    if (rows.length > 0) return rows

    // Fallback: no access rows (super_admin without explicit access) → all tenant empresas
    return tx
      .select({
        id: empresas.id,
        name: empresas.name,
        tipo: empresas.tipo,
      })
      .from(empresas)
      .where(eq(empresas.tenantId, tenantId))
  })
}
