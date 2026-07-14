import { db } from '@/lib/db'
import { users, accounts, userEmpresaAccess, userModuloAccess, empresas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'
import { getModulosParaTipo } from '@/lib/modulos-config'
import type { ModuloKey } from '@/lib/modulos-config'

// Permisos por defecto según el rol — spec §2.
// viewer solo puede ver (no editar). admin puede ver y editar todo.
function defaultModuloPermisos(
  role: string,
  modulo: ModuloKey,
): { puedeVer: boolean; puedeEditar: boolean } {
  if (role === 'viewer' || role === 'user') {
    // Dirección/Consulta Global: solo lectura, sin acceso a cargas ni monday ni comisiones
    const soloLectura = ['dashboard', 'flujo', 'proyectos', 'cuentas', 'reportes'] as ModuloKey[]
    const bloqueado = ['cargas', 'monday', 'comisiones', 'ventas'] as ModuloKey[]
    if (soloLectura.includes(modulo)) return { puedeVer: true, puedeEditar: false }
    if (bloqueado.includes(modulo)) return { puedeVer: false, puedeEditar: false }
  }
  if (role === 'tesoreria') {
    // Tesorería: ve comisiones/ventas pero no puede editar ni cargar
    if (modulo === 'cargas' || modulo === 'monday') return { puedeVer: false, puedeEditar: false }
    if (modulo === 'comisiones' || modulo === 'ventas')
      return { puedeVer: true, puedeEditar: false }
  }
  // super_admin y admin: acceso total
  return { puedeVer: true, puedeEditar: true }
}

export type UserRolTenant = 'super_admin' | 'admin' | 'tesoreria' | 'viewer' | 'user'

export interface CreateUserInput {
  tenantId: string
  name: string
  email: string
  password: string
  role: UserRolTenant
  empresaIds: string[]
}

export async function createUser(input: CreateUserInput): Promise<string> {
  const passwordHash = await hash(input.password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })

  return db.transaction(async (trx) => {
    const userId = randomUUID()
    await trx.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      tenantId: input.tenantId,
    })

    await trx.insert(accounts).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: passwordHash,
    })

    for (const empresaId of input.empresaIds) {
      await trx.insert(userEmpresaAccess).values({
        tenantId: input.tenantId,
        userId,
        empresaId,
        rol:
          input.role === 'user' || input.role === 'viewer' || input.role === 'tesoreria'
            ? 'VIEWER'
            : 'ADMIN',
      })

      // Obtener tipo de empresa para saber qué módulos aplican
      const [emp] = await trx
        .select({ tipo: empresas.tipo })
        .from(empresas)
        .where(eq(empresas.id, empresaId))
        .limit(1)
      if (!emp) continue

      const modulos = getModulosParaTipo(emp.tipo)
      for (const modulo of modulos) {
        const perms = defaultModuloPermisos(input.role, modulo)
        // Solo insertar si difiere del default universal (puedeVer=true) para no saturar la tabla
        if (!perms.puedeVer || perms.puedeEditar) {
          await trx
            .insert(userModuloAccess)
            .values({
              tenantId: input.tenantId,
              userId,
              empresaId,
              modulo,
              puedeVer: perms.puedeVer,
              puedeEditar: perms.puedeEditar,
            })
            .onConflictDoNothing()
        }
      }
    }

    return userId
  })
}

export interface UserAdminRow {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  createdAt: Date
  accesos: { empresaId: string; empresaNombre: string; rol: string }[]
}

export async function listUsersForTenant(tenantId: string): Promise<UserAdminRow[]> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .orderBy(users.createdAt)

  const result: UserAdminRow[] = []
  for (const u of rows) {
    const accesos = await db
      .select({
        empresaId: userEmpresaAccess.empresaId,
        rol: userEmpresaAccess.rol,
        empresaNombre: empresas.name,
      })
      .from(userEmpresaAccess)
      .leftJoin(empresas, eq(userEmpresaAccess.empresaId, empresas.id))
      .where(and(eq(userEmpresaAccess.userId, u.id), eq(userEmpresaAccess.tenantId, tenantId)))

    result.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      banned: u.banned,
      banReason: u.banReason,
      createdAt: u.createdAt,
      accesos: accesos.map((a) => ({
        empresaId: a.empresaId,
        empresaNombre: a.empresaNombre ?? '—',
        rol: a.rol,
      })),
    })
  }
  return result
}

export async function getUserById(userId: string, tenantId: string): Promise<UserAdminRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1)

  if (rows.length === 0) return null
  const u = rows[0]!

  const accesos = await db
    .select({
      empresaId: userEmpresaAccess.empresaId,
      rol: userEmpresaAccess.rol,
      empresaNombre: empresas.name,
    })
    .from(userEmpresaAccess)
    .leftJoin(empresas, eq(userEmpresaAccess.empresaId, empresas.id))
    .where(and(eq(userEmpresaAccess.userId, u.id), eq(userEmpresaAccess.tenantId, tenantId)))

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    banned: u.banned,
    banReason: u.banReason,
    createdAt: u.createdAt,
    accesos: accesos.map((a) => ({
      empresaId: a.empresaId,
      empresaNombre: a.empresaNombre ?? '—',
      rol: a.rol,
    })),
  }
}

export async function updateUserRole(userId: string, role: UserRolTenant): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId))
}

export async function grantEmpresaAccess(
  tenantId: string,
  userId: string,
  empresaId: string,
  rol: 'ADMIN' | 'VIEWER',
): Promise<void> {
  await db
    .insert(userEmpresaAccess)
    .values({ tenantId, userId, empresaId, rol })
    .onConflictDoUpdate({
      target: [userEmpresaAccess.userId, userEmpresaAccess.empresaId],
      set: { rol },
    })
}

export async function revokeEmpresaAccess(userId: string, empresaId: string): Promise<void> {
  await db
    .delete(userEmpresaAccess)
    .where(and(eq(userEmpresaAccess.userId, userId), eq(userEmpresaAccess.empresaId, empresaId)))
}

export async function deleteUser(targetUserId: string, actorId: string): Promise<void> {
  if (targetUserId === actorId) throw new Error('No puedes eliminarte a ti mismo')

  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)
  if (!target) throw new Error('Usuario no encontrado')
  if (target.role === 'super_admin_dev') throw new Error('No se puede eliminar un super_admin_dev')

  // FK restrict en cortes (creado_por) y comprobantes (subido_por) bloquearán si hay registros.
  // Postgres lanzará error — lo capturamos en la action y mostramos mensaje claro.
  await db.delete(users).where(eq(users.id, targetUserId))
}
