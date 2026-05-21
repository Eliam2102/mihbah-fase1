'use server'

import { requireUser } from '@/lib/auth/helpers'
import * as service from '@/lib/services/comisiones/alianzas.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

const afiliadoSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  contacto: z.string().nullable().optional(),
  mondayLabel: z.string().nullable().optional(),
  tipoEsquemaDefault: z.enum(['ALIADOS_DEL_UNIVERSO', 'YUCAN_PARTNERS']).nullable().optional(),
})

const liderSchema = z.object({
  afiliadoId: z.string().uuid('afiliadoId debe ser UUID válido'),
  nombre: z.string().min(2),
  email: z.string().email().nullable().optional().or(z.literal('')),
  emailAlterno: z.string().email().nullable().optional().or(z.literal('')),
  telefono: z.string().nullable().optional(),
  metodoPago: z.enum(['EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA', 'OTRO']).optional(),
  clabe: z.string().nullable().optional(),
  banco: z.string().nullable().optional(),
  numeroCuenta: z.string().nullable().optional(),
  nivel: z.enum(['JADE', 'TURQUESA', 'ONIX_NEGRO']).nullable().optional(),
  coordinaPago: z.string().nullable().optional(),
  presupuestoPautasMensual: z
    .number()
    .nonnegative()
    .transform((v) => v.toString())
    .optional(),
})

const asesorSchema = z.object({
  afiliadoId: z.string().uuid(),
  liderId: z.string().uuid().nullable().optional(),
  nombre: z.string().min(2),
  email: z.string().email().nullable().optional().or(z.literal('')),
  telefono: z.string().nullable().optional(),
  mondayNombre: z.string().nullable().optional(),
})

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[comisiones/alianzas action] error:', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

// Strip undefined keys to satisfy `exactOptionalPropertyTypes`.
// Returns `any` intentionally because Drizzle's Insert types don't allow `T | undefined`
// while Zod's `.partial()` produces them — runtime drop is the practical bridge.
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
    revalidatePath(`/empresa/${empresaId}/comisiones/alianzas`)
  }
}

// ─── Afiliados (alianzas) ────────────────────────────────────────────────────

export async function crearAfiliadoAction(
  empresaId: string,
  input: z.input<typeof afiliadoSchema>,
): Promise<ActionResult<service.Afiliado>> {
  try {
    const user = await requireUser()
    const parsed = afiliadoSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    const row = await service.crearAfiliado(user.tenantId!, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: row }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarAfiliadoAction(
  empresaId: string,
  id: string,
  input: Partial<z.input<typeof afiliadoSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = afiliadoSchema.partial().safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    await service.actualizarAfiliado(user.tenantId!, id, stripUndefined(parsed.data))
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarAfiliadoAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.desactivarAfiliado(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Líderes ─────────────────────────────────────────────────────────────────

export async function crearLiderAction(
  empresaId: string,
  input: z.input<typeof liderSchema>,
): Promise<ActionResult<service.Lider>> {
  try {
    const user = await requireUser()
    const parsed = liderSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    const row = await service.crearLider(user.tenantId!, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: row }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarLiderAction(
  empresaId: string,
  id: string,
  input: Partial<z.input<typeof liderSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = liderSchema.partial().safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    await service.actualizarLider(user.tenantId!, id, stripUndefined(parsed.data))
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarLiderAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.desactivarLider(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Asesores ────────────────────────────────────────────────────────────────

export async function crearAsesorAction(
  empresaId: string,
  input: z.input<typeof asesorSchema>,
): Promise<ActionResult<service.Asesor>> {
  try {
    const user = await requireUser()
    const parsed = asesorSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    const row = await service.crearAsesor(user.tenantId!, parsed.data)
    revalidateComisiones(empresaId)
    return { ok: true, data: row }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarAsesorAction(
  empresaId: string,
  id: string,
  input: Partial<z.input<typeof asesorSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const parsed = asesorSchema.partial().safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Validación falló',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }
    await service.actualizarAsesor(user.tenantId!, id, stripUndefined(parsed.data))
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarAsesorAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await service.desactivarAsesor(user.tenantId!, id)
    revalidateComisiones(empresaId)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}
