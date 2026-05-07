import { db } from '@/lib/db'
import { users, accounts, userEmpresaAccess, empresas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'

export type UserRolTenant = 'super_admin' | 'admin' | 'user'

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
        rol: input.role === 'user' ? 'VIEWER' : 'ADMIN',
      })
    }

    return userId
  })
}

export interface UserAdminRow {
  id: string
  name: string
  email: string
  role: string | null
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
