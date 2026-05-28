'use server'

import { requireUser } from '@/lib/auth/helpers'
import * as service from '@/lib/services/comisiones/esquemas.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const pct = z
  .number()
  .min(0)
  .max(100)
  .transform((v) => v.toFixed(2))

const esquemaSchema = z.object({
  nombre: z.string().min(2),
  tipoEsquema: z.enum(['ALIADOS_DEL_UNIVERSO', 'YUCAN_PARTNERS']),
  tipoProducto: z.enum(['TERRENO', 'ACCION']),
  porcentajeTotalCliente: pct,
  porcentajeOpBmcorp: pct.optional(),
  porcentajeOpYesyucan: pct.optional(),
  porcentajeSocioFijoJorge: pct.optional(),
  porcentajeSocioFijoKass: pct.optional(),
  porcentajeBolsaComercial: pct,
  porcentajeAsesorEstandar: pct,
  porcentajeLiderTope: pct.optional(),
  razonSocial: z.string().nullable().optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  observaciones: z.string().nullable().optional(),
})

const matrizSchema = z.object({
  afiliadoId: z.string().uuid(),
  tipoProducto: z.enum(['TERRENO', 'ACCION']),
  liderId: z.string().uuid().nullable().optional(),
  porcentajeAfiliacion: pct,
  porcentajeJorgeBolsa: pct.optional(),
  porcentajeKassBolsa: pct.optional(),
  porcentajeDianaBolsa: pct.optional(),
  reglaEspecial: z.enum(['NINGUNA', 'FLAMINGO_DIRECTO', 'LGI_YCD_ACUMULA']).optional(),
  requiereConfig: z.boolean().optional(),
})

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[comisiones/esquemas action] error:', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

// Strip undefined keys to satisfy `exactOptionalPropertyTypes`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T extends Record<string, unknown>>(obj: T): any {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function revalidateComisiones(empresaId?: string) {
  if (empresaId) {
    revalidatePath(`/empresa/${empresaId}/comisiones`)
    revalidatePath(`/empresa/${empresaId}/comisiones/esquemas`)
    revalidatePath(`/empresa/${empresaId}/comisiones/alianzas`)
  }
}

// ─── Esquemas ────────────────────────────────────────────────────────────────

export async function crearEsquemaAction(
  empresaId: string,
  input: z.input<typeof esquemaSchema>,
): Promise<ActionResult<service.Esquema>> {
  try {
    const user = await requireUser()
    const parsed = esquemaSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    const row = await service.crearEsquema(user.tenantId!, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: row }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarEsquemaAction(
  empresaId: string,
  id: string,
  input: Partial<z.input<typeof esquemaSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = esquemaSchema.partial().safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    await service.actualizarEsquema(user.tenantId!, id, stripUndefined(parsed.data))
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarEsquemaAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.desactivarEsquema(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Matriz Alianza × Producto ───────────────────────────────────────────────

export async function crearMatrizAction(
  empresaId: string,
  input: z.input<typeof matrizSchema>,
): Promise<ActionResult<service.Matriz>> {
  try {
    const user = await requireUser()
    const parsed = matrizSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    const row = await service.crearMatriz(user.tenantId!, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: row }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarMatrizAction(
  empresaId: string,
  id: string,
  input: Partial<z.input<typeof matrizSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = matrizSchema.partial().safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    await service.actualizarMatriz(user.tenantId!, id, stripUndefined(parsed.data))
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarMatrizAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.desactivarMatriz(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Nivel Override (bono por meta) ──────────────────────────────────────────

const nivelOverrideSchema = z.object({
  porcentajeAfiliacion: z.number().min(0).max(100),
  porcentajeJorgeBolsa: z.number().min(0).max(100),
  porcentajeKassBolsa: z.number().min(0).max(100),
  porcentajeDianaBolsa: z.number().min(0).max(100),
})

export async function getNivelOverridesAction(
  matrizId: string,
): Promise<ActionResult<service.NivelOverride[]>> {
  try {
    const user = await requireUser()
    const rows = await service.getNivelOverrides(user.tenantId!, matrizId)
    return { ok: true, data: rows }
  } catch (err) {
    return handleError(err)
  }
}

export async function upsertNivelOverrideAction(
  empresaId: string,
  matrizId: string,
  nivel: 'ONIX_NEGRO' | 'TURQUESA' | 'JADE',
  input: z.input<typeof nivelOverrideSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = nivelOverrideSchema.safeParse(input)
    if (!parsed.success)
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    const suma =
      parsed.data.porcentajeAfiliacion +
      parsed.data.porcentajeJorgeBolsa +
      parsed.data.porcentajeKassBolsa +
      parsed.data.porcentajeDianaBolsa
    if (Math.abs(suma - 15) > 0.01)
      return {
        ok: false,
        error: `Los porcentajes deben sumar 15% (bolsa comercial). Suma actual: ${suma.toFixed(2)}%`,
      }
    const row = await service.upsertNivelOverride(user.tenantId!, matrizId, nivel, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function eliminarNivelOverrideAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.eliminarNivelOverride(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}
