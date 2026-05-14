import { db } from '@/lib/db'
import { empresas, organizaciones, userEmpresaAccess } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { TipoEmpresa, FuenteDatos } from './tenant.service'

export interface CreateEmpresaInput {
  tenantId: string
  name: string
  tipo: TipoEmpresa
  fuenteDatos: FuenteDatos
  rfc?: string | undefined
}

export async function createEmpresa(input: CreateEmpresaInput): Promise<string> {
  const [org] = await db
    .select({ id: organizaciones.id })
    .from(organizaciones)
    .where(eq(organizaciones.tenantId, input.tenantId))
    .limit(1)

  if (!org) throw new Error('No existe organización para este tenant')

  const [empresa] = await db
    .insert(empresas)
    .values({
      tenantId: input.tenantId,
      organizacionId: org.id,
      name: input.name,
      tipo: input.tipo,
      fuenteDatos: input.fuenteDatos,
      rfc: input.rfc ?? null,
    })
    .returning({ id: empresas.id })

  return empresa!.id
}

export interface EmpresaAdminRow {
  id: string
  name: string
  tipo: string
  fuenteDatos: string
  rfc: string | null
  createdAt: Date
  totalAccesos: number
}

export async function listEmpresasForAdmin(tenantId: string): Promise<EmpresaAdminRow[]> {
  const rows = await db
    .select({
      id: empresas.id,
      name: empresas.name,
      tipo: empresas.tipo,
      fuenteDatos: empresas.fuenteDatos,
      rfc: empresas.rfc,
      createdAt: empresas.createdAt,
      totalAccesos: sql<number>`COUNT(${userEmpresaAccess.id})::int`,
    })
    .from(empresas)
    .leftJoin(
      userEmpresaAccess,
      and(eq(userEmpresaAccess.empresaId, empresas.id), eq(userEmpresaAccess.tenantId, tenantId)),
    )
    .where(eq(empresas.tenantId, tenantId))
    .groupBy(
      empresas.id,
      empresas.name,
      empresas.tipo,
      empresas.fuenteDatos,
      empresas.rfc,
      empresas.createdAt,
    )
    .orderBy(empresas.createdAt)

  return rows
}
