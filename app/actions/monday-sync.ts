'use server'

import { requireUser } from '@/lib/auth/helpers'
import { syncBoard } from '@/lib/services/monday.service'
import { listWorkspaceBoards } from '@/lib/monday/client'
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

export interface TriggerSyncAllResult {
  ok: boolean
  boards: {
    boardId: string
    boardName: string
    creados: number
    actualizados: number
    errores: number
    totalItems: number
    duration: number
    error?: string
  }[]
  totalCreados: number
  totalActualizados: number
  totalErrores: number
  error?: string
}

/**
 * Server Action: triggerSync
 * Triggers a Monday.com board sync for a SINGLE board.
 */
export async function triggerSync(empresaId: string, boardId?: string): Promise<TriggerSyncResult> {
  try {
    const user = await requireUser()
    const tenantId = user.tenantId!

    const stats = await syncBoard(empresaId, tenantId, user.id, boardId)

    revalidatePath(`/empresa/${empresaId}/monday`)
    revalidatePath(`/empresa/${empresaId}/ventas`)
    revalidatePath(`/empresa/${empresaId}/comisiones`)

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

/**
 * Server Action: triggerSyncMultiple
 * Syncs multiple Monday boards in sequence.
 * Each board is independent — an error in one does NOT abort the others.
 */
export async function triggerSyncMultiple(
  empresaId: string,
  boardIds: string[],
): Promise<TriggerSyncAllResult> {
  try {
    const user = await requireUser()
    const tenantId = user.tenantId!

    const results: TriggerSyncAllResult['boards'] = []
    let totalCreados = 0
    let totalActualizados = 0
    let totalErrores = 0

    for (const boardId of boardIds) {
      try {
        const stats = await syncBoard(empresaId, tenantId, user.id, boardId)
        results.push({
          boardId,
          boardName: stats.boardName,
          creados: stats.creados,
          actualizados: stats.actualizados,
          errores: stats.errores,
          totalItems: stats.totalItems,
          duration: stats.duration,
        })
        totalCreados += stats.creados
        totalActualizados += stats.actualizados
        totalErrores += stats.errores
      } catch (boardErr) {
        results.push({
          boardId,
          boardName: boardId,
          creados: 0,
          actualizados: 0,
          errores: 1,
          totalItems: 0,
          duration: 0,
          error: boardErr instanceof Error ? boardErr.message : String(boardErr),
        })
        totalErrores++
      }
    }

    revalidatePath(`/empresa/${empresaId}/monday`)
    revalidatePath(`/empresa/${empresaId}/ventas`)
    revalidatePath(`/empresa/${empresaId}/comisiones`)

    return { ok: true, boards: results, totalCreados, totalActualizados, totalErrores }
  } catch (err) {
    console.error('[triggerSyncMultiple] error:', err)
    return {
      ok: false,
      boards: [],
      totalCreados: 0,
      totalActualizados: 0,
      totalErrores: 0,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

/**
 * Server Action: getWorkspaceBoards
 * Returns all Monday boards in the workspace so the user can pick which to sync.
 */
export async function getWorkspaceBoardsAction() {
  try {
    await requireUser()
    const boards = await listWorkspaceBoards()
    return { ok: true as const, boards }
  } catch (err) {
    console.error('[getWorkspaceBoardsAction] error:', err)
    return {
      ok: false as const,
      boards: [],
      error: err instanceof Error ? err.message : 'Error al listar boards',
    }
  }
}
