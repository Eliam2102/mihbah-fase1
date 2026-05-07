'use server'

import { requireSuperAdminDev } from '@/lib/auth/helpers'
import { createTenantWithDefaults } from '@/lib/services/admin/tenant.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  orgName: z.string().min(2).max(100),
  empresaNombre: z.string().min(1).max(100),
  empresaTipo: z.enum(['CONSTRUCTORA', 'CAPITAL', 'COMERCIAL']),
  empresaFuente: z.enum(['EXCEL', 'MONDAY', 'MANUAL']),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
})

export interface AdminTenantResult {
  ok: boolean
  tenantId?: string
  error?: string
}

export async function actionCreateTenant(raw: unknown): Promise<AdminTenantResult> {
  try {
    await requireSuperAdminDev()
    const input = CreateTenantSchema.parse(raw)
    const result = await createTenantWithDefaults(input)
    revalidatePath('/super-admin')
    return { ok: true, tenantId: result.tenantId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
