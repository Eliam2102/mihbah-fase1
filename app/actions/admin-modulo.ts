'use server'

import { requireSuperAdminOrAbove } from '@/lib/auth/helpers'
import {
  upsertModuloPermiso,
  resetModulosToDefault,
} from '@/lib/services/admin/modulo-access.service'
import type { ModuloKey } from '@/lib/modulos-config'
import { revalidatePath } from 'next/cache'

export interface ModuloActionResult {
  ok: boolean
  error?: string
}

export async function actionSetModuloPermiso(
  tenantId: string,
  userId: string,
  empresaId: string,
  modulo: ModuloKey,
  puedeVer: boolean,
  puedeEditar: boolean,
): Promise<ModuloActionResult> {
  try {
    await requireSuperAdminOrAbove()
    await upsertModuloPermiso(tenantId, userId, empresaId, modulo, puedeVer, puedeEditar)
    revalidatePath('/configuracion/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function actionResetModulos(
  userId: string,
  empresaId: string,
): Promise<ModuloActionResult> {
  try {
    await requireSuperAdminOrAbove()
    await resetModulosToDefault(userId, empresaId)
    revalidatePath('/configuracion/usuarios')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
