import { db } from '@/lib/db'
import { empresas, organizaciones, userEmpresaAccess } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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
    .select()
    .from(empresas)
    .where(eq(empresas.tenantId, tenantId))
    .orderBy(empresas.createdAt)

  const result: EmpresaAdminRow[] = []
  for (const e of rows) {
    const [accCount] = await db
      .select({ count: db.$count(userEmpresaAccess) })
      .from(userEmpresaAccess)
      .where(and(eq(userEmpresaAccess.empresaId, e.id), eq(userEmpresaAccess.tenantId, tenantId)))
    result.push({
      id: e.id,
      name: e.name,
      tipo: e.tipo,
      fuenteDatos: e.fuenteDatos,
      rfc: e.rfc,
      createdAt: e.createdAt,
      totalAccesos: Number(accCount?.count ?? 0),
    })
  }
  return result
}
