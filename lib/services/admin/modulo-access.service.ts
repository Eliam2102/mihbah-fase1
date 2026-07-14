import { db } from '@/lib/db'
import { userModuloAccess, empresas } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getModulosParaTipo, type ModuloKey } from '@/lib/modulos-config'

export interface ModuloPermiso {
  modulo: ModuloKey
  puedeVer: boolean
  puedeEditar: boolean
}

export interface EmpresaPermisos {
  empresaId: string
  empresaNombre: string
  empresaTipo: string
  modulos: ModuloPermiso[]
}

export async function getPermisosUsuario(
  userId: string,
  tenantId: string,
): Promise<EmpresaPermisos[]> {
  const empresasAcceso = await db
    .select({ id: empresas.id, name: empresas.name, tipo: empresas.tipo })
    .from(empresas)
    .where(eq(empresas.tenantId, tenantId))

  const rows = await db
    .select()
    .from(userModuloAccess)
    .where(and(eq(userModuloAccess.userId, userId), eq(userModuloAccess.tenantId, tenantId)))

  return empresasAcceso.map((emp) => {
    const modulosDisponibles = getModulosParaTipo(emp.tipo)
    const empRows = rows.filter((r) => r.empresaId === emp.id)

    const modulos: ModuloPermiso[] = modulosDisponibles.map((modulo) => {
      const row = empRows.find((r) => r.modulo === modulo)
      return {
        modulo,
        puedeVer: row?.puedeVer ?? true,
        puedeEditar: row?.puedeEditar ?? false,
      }
    })

    return { empresaId: emp.id, empresaNombre: emp.name, empresaTipo: emp.tipo, modulos }
  })
}

export async function upsertModuloPermiso(
  tenantId: string,
  userId: string,
  empresaId: string,
  modulo: ModuloKey,
  puedeVer: boolean,
  puedeEditar: boolean,
): Promise<void> {
  await db
    .insert(userModuloAccess)
    .values({ tenantId, userId, empresaId, modulo, puedeVer, puedeEditar })
    .onConflictDoUpdate({
      target: [userModuloAccess.userId, userModuloAccess.empresaId, userModuloAccess.modulo],
      set: { puedeVer, puedeEditar },
    })
}

export async function resetModulosToDefault(userId: string, empresaId: string): Promise<void> {
  await db
    .delete(userModuloAccess)
    .where(and(eq(userModuloAccess.userId, userId), eq(userModuloAccess.empresaId, empresaId)))
}

// Guard helper — used in page components
export async function canViewModulo(
  userId: string,
  empresaId: string,
  modulo: ModuloKey,
): Promise<boolean> {
  const rows = await db
    .select({ puedeVer: userModuloAccess.puedeVer })
    .from(userModuloAccess)
    .where(
      and(
        eq(userModuloAccess.userId, userId),
        eq(userModuloAccess.empresaId, empresaId),
        eq(userModuloAccess.modulo, modulo),
      ),
    )
    .limit(1)

  // No row = default (can view)
  if (rows.length === 0) return true
  return rows[0]!.puedeVer
}

export async function canEditModulo(
  userId: string,
  empresaId: string,
  modulo: ModuloKey,
): Promise<boolean> {
  const rows = await db
    .select({ puedeEditar: userModuloAccess.puedeEditar })
    .from(userModuloAccess)
    .where(
      and(
        eq(userModuloAccess.userId, userId),
        eq(userModuloAccess.empresaId, empresaId),
        eq(userModuloAccess.modulo, modulo),
      ),
    )
    .limit(1)

  if (rows.length === 0) return false
  return rows[0]!.puedeEditar
}
