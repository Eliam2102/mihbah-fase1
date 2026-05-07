'use server'

import { requireUser } from '@/lib/auth/helpers'
import { syncBoard } from '@/lib/services/monday.service'
import { revalidatePath } from 'next/cache'

export interface TriggerSyncResult {
  ok: boolean
  creados?: number
  actualizados?: number
  errores?: number
  totalItems?: number
  boardName?: string
  duration?: number
  error?: string
}

/**
 * Server Action: triggerSync
 * Triggers a Monday.com board sync for BM CORP.
 * Returns stats or error info.
 */
export async function triggerSync(empresaId: string): Promise<TriggerSyncResult> {
  try {
    const user = await requireUser()
    const tenantId = user.tenantId!

    const stats = await syncBoard(empresaId, tenantId, user.id)

    // Revalidate all paths that read ventas_bmcorp / repartos_bmcorp data
    revalidatePath(`/empresa/${empresaId}/monday`)
    revalidatePath(`/empresa/${empresaId}/dashboard`)
    revalidatePath(`/empresa/${empresaId}/cuentas`)
    revalidatePath(`/empresa/${empresaId}/flujo-caja`)
    revalidatePath(`/empresa/${empresaId}/proyectos`)
    revalidatePath(`/empresa/${empresaId}/reportes`)
    revalidatePath('/dashboard')
    revalidatePath('/cuentas')
    revalidatePath('/proyectos')
    revalidatePath('/flujo')

    return {
      ok: true,
      creados: stats.creados,
      actualizados: stats.actualizados,
      errores: stats.errores,
      totalItems: stats.totalItems,
      boardName: stats.boardName,
      duration: stats.duration,
    }
  } catch (err) {
    console.error('[triggerSync] error:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido durante la sincronización',
    }
  }
}
