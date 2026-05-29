'use server'

import { requireUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { npsRegistros } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const npsSchema = z.object({
  empresaEncuestada: z.enum(['YCDI', 'MIHBAH', 'BM CORP', 'XORX']),
  anio: z.number().int().min(2020).max(2100),
  trimestre: z.number().int().min(1).max(4),
  puntuacion: z.number().int().min(-100).max(100),
  respondientes: z.number().int().min(0),
  promotores: z.number().int().min(0),
  detractores: z.number().int().min(0),
  comentarios: z.string().nullable().optional(),
})

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[nps action]', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

export async function getRegistrosNps(tenantId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(npsRegistros)
      .where(eq(npsRegistros.tenantId, tenantId))
      .orderBy(desc(npsRegistros.anio), desc(npsRegistros.trimestre))
  })
}

export async function getNpsActual(tenantId: string, empresa: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(npsRegistros)
      .where(and(eq(npsRegistros.tenantId, tenantId), eq(npsRegistros.empresaEncuestada, empresa)))
      .orderBy(desc(npsRegistros.anio), desc(npsRegistros.trimestre))
      .limit(1)
    return row ?? null
  })
}

export async function capturarNpsAction(
  empresaId: string,
  input: z.input<typeof npsSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = npsSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Validación falló' }

    const tenantId = user.tenantId
    const data = parsed.data

    const inserted = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      const [row] = await tx
        .insert(npsRegistros)
        .values({
          tenantId,
          empresaEncuestada: data.empresaEncuestada,
          anio: data.anio,
          trimestre: data.trimestre,
          puntuacion: data.puntuacion,
          respondientes: data.respondientes,
          promotores: data.promotores,
          detractores: data.detractores,
          comentarios: data.comentarios ?? null,
          capturadoPor: user.id,
        })
        .onConflictDoUpdate({
          target: [
            npsRegistros.tenantId,
            npsRegistros.empresaEncuestada,
            npsRegistros.anio,
            npsRegistros.trimestre,
          ],
          set: {
            puntuacion: data.puntuacion,
            respondientes: data.respondientes,
            promotores: data.promotores,
            detractores: data.detractores,
            comentarios: data.comentarios ?? null,
            capturadoPor: user.id,
          },
        })
        .returning()
      if (!row) throw new Error('No se insertó NPS')
      return row
    })

    revalidatePath(`/empresa/${empresaId}/comisiones/nps`)
    revalidatePath(`/empresa/${empresaId}/dashboard`)
    return { ok: true, data: { id: inserted.id } }
  } catch (err) {
    return handleError(err)
  }
}
