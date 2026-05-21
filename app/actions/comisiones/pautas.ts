'use server'

import { requireUser } from '@/lib/auth/helpers'
import { upsertPautaEjecutada } from '@/lib/services/comisiones/pautas.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const guardarPautaSchema = z.object({
  liderId: z.string().uuid(),
  anio: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  montoEjecutado: z.number().nonnegative(),
  observaciones: z.string().nullable().optional(),
})

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[comisiones/pautas action] error:', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

export async function guardarPautaAction(
  empresaId: string,
  input: z.input<typeof guardarPautaSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = guardarPautaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Validación falló' }
    const tenantId = user.tenantId!

    const { liderId, anio, mes, montoEjecutado, observaciones } = parsed.data
    const row = await upsertPautaEjecutada(
      tenantId,
      {
        liderId,
        anio,
        mes,
        montoEjecutado,
        observaciones: observaciones ?? null,
      },
      user.id,
    )

    revalidatePath(`/empresa/${empresaId}/comisiones/pautas`)
    revalidatePath(`/empresa/${empresaId}/comisiones`)
    revalidatePath(`/portal/dashboard`)
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    return handleError(err)
  }
}
