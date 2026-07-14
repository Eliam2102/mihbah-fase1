'use server'

import { requireSuperAdminDev } from '@/lib/auth/helpers'
import { createEmpresa } from '@/lib/services/admin/empresa.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateEmpresaSchema = z.object({
  name: z.string().min(1).max(100),
  tipo: z.enum(['CONSTRUCTORA', 'CAPITAL', 'COMERCIAL']),
  fuenteDatos: z.enum(['EXCEL', 'MONDAY', 'MANUAL']),
  rfc: z.string().max(13).optional(),
})

export interface AdminEmpresaResult {
  ok: boolean
  empresaId?: string
  error?: string
}

export async function actionCreateEmpresa(raw: unknown): Promise<AdminEmpresaResult> {
  try {
    const user = await requireSuperAdminDev()
    if (!user.tenantId) throw new Error('Usuario sin tenant')

    const input = CreateEmpresaSchema.parse(raw)
    const empresaId = await createEmpresa({
      tenantId: user.tenantId,
      ...input,
    })
    revalidatePath('/configuracion')
    return { ok: true, empresaId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
