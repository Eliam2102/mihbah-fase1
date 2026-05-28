'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import {
  actualizarBonoConfig,
  calcularYPersistirBonosMes,
  crearBonoConfig,
  eliminarBonoConfig,
  marcarPagoBono,
  vincularBonoCorte,
  type BonoConfigInput,
  type BonoMesResultado,
} from '@/lib/services/comisiones/bonos-umbral.service'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const grupoEnum = z.enum(['YCD', 'ARKA', 'RH', 'OTRO'])
const fuenteEnum = z.enum(['PROPIA', 'OVERRIDE_AFILIADO'])
const formulaEnum = z.enum(['EXCEDENTE', 'TOTAL_GRUPOS_APLICA', 'EXCEDENTE_CAP_GRUPOS'])

const configSchema = z.object({
  empresaId: z.string().uuid(),
  nombre: z.string().min(1).max(160),
  afiliadoDestinatarioId: z.string().uuid(),
  tipoFuente: fuenteEnum,
  afiliadoOrigenId: z.string().uuid().nullable(),
  overridePct: z.number().min(0).max(100).nullable(),
  umbralAcumuladoMensual: z.number().min(0),
  bonoPct: z.number().min(0).max(100),
  gruposAcumulan: z.array(grupoEnum).min(1),
  gruposAplicaBono: z.array(grupoEnum).min(1),
  formulaCalculo: formulaEnum,
  activo: z.boolean(),
  vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vigenteHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notas: z.string().max(2000).nullable(),
})

function toServiceInput(p: z.infer<typeof configSchema>): BonoConfigInput {
  return {
    nombre: p.nombre,
    afiliadoDestinatarioId: p.afiliadoDestinatarioId,
    tipoFuente: p.tipoFuente,
    afiliadoOrigenId: p.afiliadoOrigenId,
    overridePct: p.overridePct,
    umbralAcumuladoMensual: p.umbralAcumuladoMensual,
    bonoPct: p.bonoPct,
    gruposAcumulan: p.gruposAcumulan,
    gruposAplicaBono: p.gruposAplicaBono,
    formulaCalculo: p.formulaCalculo,
    activo: p.activo,
    vigenteDesde: p.vigenteDesde,
    vigenteHasta: p.vigenteHasta,
    notas: p.notas,
  }
}

export async function crearBonoConfigAction(
  input: z.input<typeof configSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = configSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, ...rest } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const row = await crearBonoConfig(user.tenantId, toServiceInput(parsed.data))
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    void rest
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

const updateSchema = configSchema.extend({ id: z.string().uuid() })

export async function actualizarBonoConfigAction(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, id } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    await actualizarBonoConfig(user.tenantId, id, toServiceInput(parsed.data))
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function eliminarBonoConfigAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    await eliminarBonoConfig(user.tenantId, id)
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

const calcularSchema = z.object({
  empresaId: z.string().uuid(),
  anio: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
})

const vincularSchema = z.object({
  empresaId: z.string().uuid(),
  bonoId: z.string().uuid(),
  corteId: z.string().uuid(),
})

export async function vincularBonoCorteMesAction(
  input: z.input<typeof vincularSchema>,
): Promise<ActionResult<{ bonoId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = vincularSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, bonoId, corteId } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    await vincularBonoCorte(user.tenantId, bonoId, corteId)
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    revalidatePath(`/empresa/${empresaId}/comisiones/tesoreria`)
    return { ok: true, data: { bonoId } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function marcarPagoBonoAction(
  formData: FormData,
): Promise<ActionResult<{ bonoId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const empresaId = formData.get('empresaId') as string
    const bonoId = formData.get('bonoId') as string
    const metodoPago = formData.get('metodoPago') as string
    const fechaPago = formData.get('fechaPago') as string
    const file = formData.get('file') as File | null
    const beneficiarioNombre = formData.get('beneficiarioNombre') as string
    if (!empresaId || !bonoId || !metodoPago || !fechaPago || !file || !beneficiarioNombre) {
      return { ok: false, error: 'Faltan campos requeridos' }
    }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    await marcarPagoBono(user.tenantId, {
      bonoId,
      file,
      fechaPago,
      metodoPago: metodoPago as 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO',
      beneficiarioNombre,
      userId: user.id,
    })
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    revalidatePath(`/empresa/${empresaId}/comisiones/tesoreria`)
    return { ok: true, data: { bonoId } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

const grupoDesarrolloSchema = z.object({
  empresaId: z.string().uuid(),
  desarrolloId: z.string().uuid(),
  grupo: z.enum(['YCD', 'ARKA', 'RH', 'OTRO']),
})

export async function actualizarGrupoDesarrolloAction(
  input: z.input<typeof grupoDesarrolloSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { db } = await import('@/lib/db')
    const { desarrollos } = await import('@/lib/db/schema')
    const { setTenant } = await import('@/lib/services/_shared/db.helpers')
    const { and, eq } = await import('drizzle-orm')

    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = grupoDesarrolloSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, desarrolloId, grupo } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')

    await db.transaction(async (tx) => {
      await setTenant(tx, user.tenantId!)
      await tx
        .update(desarrollos)
        .set({ grupoDesarrolladora: grupo })
        .where(and(eq(desarrollos.tenantId, user.tenantId!), eq(desarrollos.id, desarrolloId)))
    })
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    return { ok: true, data: { id: desarrolloId } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function calcularBonosMesAction(
  input: z.input<typeof calcularSchema>,
): Promise<ActionResult<{ count: number; resumen: BonoMesResultado[] }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = calcularSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }
    const { empresaId, anio, mes } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const resumen = await calcularYPersistirBonosMes(user.tenantId, anio, mes, user.id)
    revalidatePath(`/empresa/${empresaId}/comisiones/bonos`)
    return { ok: true, data: { count: resumen.length, resumen } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
