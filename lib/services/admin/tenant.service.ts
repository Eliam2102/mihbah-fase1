import { db } from '@/lib/db'
import {
  tenants,
  organizaciones,
  empresas,
  users,
  accounts,
  userEmpresaAccess,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'

export type TipoEmpresa = 'CONSTRUCTORA' | 'CAPITAL' | 'COMERCIAL'
export type FuenteDatos = 'EXCEL' | 'MONDAY' | 'MANUAL'

export interface CreateTenantInput {
  tenantName: string
  slug: string
  orgName: string
  empresaNombre: string
  empresaTipo: TipoEmpresa
  empresaFuente: FuenteDatos
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface CreateTenantResult {
  tenantId: string
  orgId: string
  empresaId: string
  userId: string
}

export async function createTenantWithDefaults(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const passwordHash = await hash(input.adminPassword, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })

  return db.transaction(async (trx) => {
    const [tenant] = await trx
      .insert(tenants)
      .values({ name: input.tenantName, slug: input.slug })
      .returning({ id: tenants.id })
    const tenantId = tenant!.id

    const [org] = await trx
      .insert(organizaciones)
      .values({ tenantId, name: input.orgName })
      .returning({ id: organizaciones.id })
    const orgId = org!.id

    const [empresa] = await trx
      .insert(empresas)
      .values({
        tenantId,
        organizacionId: orgId,
        name: input.empresaNombre,
        tipo: input.empresaTipo,
        fuenteDatos: input.empresaFuente,
      })
      .returning({ id: empresas.id })
    const empresaId = empresa!.id

    const userId = randomUUID()
    await trx.insert(users).values({
      id: userId,
      name: input.adminName,
      email: input.adminEmail,
      emailVerified: true,
      role: 'super_admin',
      tenantId,
    })

    const accountId = randomUUID()
    await trx.insert(accounts).values({
      id: accountId,
      userId,
      accountId: userId,
      providerId: 'credential',
      password: passwordHash,
    })

    await trx.insert(userEmpresaAccess).values({
      tenantId,
      userId,
      empresaId,
      rol: 'ADMIN',
    })

    return { tenantId, orgId, empresaId, userId }
  })
}

export interface TenantRow {
  id: string
  name: string
  slug: string
  createdAt: Date
  totalEmpresas: number
  totalUsers: number
}

export async function listAllTenants(): Promise<TenantRow[]> {
  const rows = await db.select().from(tenants).orderBy(tenants.createdAt)

  const result: TenantRow[] = []
  for (const t of rows) {
    const [empCount] = await db
      .select({ count: db.$count(empresas) })
      .from(empresas)
      .where(eq(empresas.tenantId, t.id))
    const [userCount] = await db
      .select({ count: db.$count(users) })
      .from(users)
      .where(eq(users.tenantId, t.id))

    result.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      totalEmpresas: Number(empCount?.count ?? 0),
      totalUsers: Number(userCount?.count ?? 0),
    })
  }
  return result
}
