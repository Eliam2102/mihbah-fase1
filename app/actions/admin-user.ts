'use server'

import { requireSuperAdminOrAbove, requireAdminOrAbove } from '@/lib/auth/helpers'
import {
  createUser,
  updateUserRole,
  grantEmpresaAccess,
  revokeEmpresaAccess,
} from '@/lib/services/admin/user.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['super_admin', 'admin', 'user']),
  empresaIds: z.array(z.string().uuid()),
})

export interface AdminUserResult {
  ok: boolean
  userId?: string
  error?: string
}

export async function actionCreateUser(raw: unknown): Promise<AdminUserResult> {
  try {
    const user = await requireAdminOrAbove()
    if (!user.tenantId) throw new Error('Usuario sin tenant')

    const input = CreateUserSchema.parse(raw)
    const userId = await createUser({ tenantId: user.tenantId, ...input })
    revalidatePath('/configuracion/usuarios')
    return { ok: true, userId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// Wrapper para Server Actions con <form action={...}> + useActionState.
// FormData → objeto tipado → actionCreateUser.
export async function actionCreateUserFromForm(
  _prev: AdminUserResult | null,
  formData: FormData,
): Promise<AdminUserResult> {
  return actionCreateUser({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    empresaIds: formData.getAll('empresaIds'),
  })
}

export async function actionUpdateUserRole(
  userId: string,
  role: 'super_admin' | 'admin' | 'tesoreria' | 'viewer' | 'user',
): Promise<AdminUserResult> {
  try {
    await requireAdminOrAbove()
    await updateUserRole(userId, role)
    revalidatePath('/configuracion/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function actionGrantAccess(
  tenantId: string,
  userId: string,
  empresaId: string,
  rol: 'ADMIN' | 'VIEWER',
): Promise<AdminUserResult> {
  try {
    await requireAdminOrAbove()
    await grantEmpresaAccess(tenantId, userId, empresaId, rol)
    revalidatePath('/configuracion/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function actionBanUser(
  targetUserId: string,
  ban: boolean,
  razon?: string,
): Promise<AdminUserResult> {
  try {
    const actor = await requireSuperAdminOrAbove()
    if (actor.id === targetUserId) return { ok: false, error: 'No puedes bloquearte a ti mismo' }
    await db
      .update(users)
      .set({
        banned: ban,
        banReason: ban ? (razon ?? 'Bloqueado por administrador') : null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
    revalidatePath('/configuracion/usuarios')
    revalidatePath(`/configuracion/usuarios/${targetUserId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function actionRevokeAccess(
  userId: string,
  empresaId: string,
): Promise<AdminUserResult> {
  try {
    await requireAdminOrAbove()
    await revokeEmpresaAccess(userId, empresaId)
    revalidatePath('/configuracion/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
