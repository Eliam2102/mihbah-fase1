'use server'

import { db } from '@/lib/db'
import {
  comprobantesPago,
  dispersiones,
  metodoPagoLiderEnum,
  tipoBeneficiarioEnum,
} from '@/lib/db/schema'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { requireTesoreriaOrAdmin } from '@/lib/auth/helpers'
import { guardarComprobante } from '@/lib/storage/comprobantes'
import { auditLogs } from '@/lib/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { setTenant } from '@/lib/services/_shared/db.helpers'

type MetodoPagoLider = (typeof metodoPagoLiderEnum.enumValues)[number]
type TipoBeneficiario = (typeof tipoBeneficiarioEnum.enumValues)[number]

export async function marcarPagoBeneficiarioAction(formData: FormData) {
  const user = await requireTesoreriaOrAdmin()
  if (!user.tenantId) throw new Error('Usuario sin tenant')
  const tenantId = user.tenantId

  const corteId = formData.get('corteId') as string
  const beneficiarioKey = formData.get('beneficiarioKey') as string // 'lider_id:UUID' | 'asesor_id:UUID' | 'tipo:ENUM'
  const dispersionIdsRaw = formData.get('dispersionIds') as string | null
  const metodoPago = formData.get('metodoPago') as MetodoPagoLider
  const fechaPagoStr = formData.get('fechaPago') as string
  const file = formData.get('file') as File | null
  const empresaId = formData.get('empresaId') as string

  if (!corteId || !beneficiarioKey || !metodoPago || !fechaPagoStr || !file || !empresaId) {
    throw new Error('Faltan campos requeridos')
  }

  await requireEmpresaAccess(user, empresaId, 'comisiones')

  let liderId: string | null = null
  let asesorId: string | null = null
  let tipoBeneficiario: string | null = null

  if (beneficiarioKey.startsWith('lider_id:')) {
    liderId = beneficiarioKey.replace('lider_id:', '')
  } else if (beneficiarioKey.startsWith('asesor_id:')) {
    asesorId = beneficiarioKey.replace('asesor_id:', '')
  } else if (beneficiarioKey.startsWith('tipo:')) {
    tipoBeneficiario = beneficiarioKey.replace('tipo:', '')
  } else {
    throw new Error('Formato de beneficiarioKey inválido')
  }

  let dispersionIds: string[] = []
  if (dispersionIdsRaw) {
    const parsed: unknown = JSON.parse(dispersionIdsRaw)
    if (Array.isArray(parsed))
      dispersionIds = parsed.filter((id): id is string => typeof id === 'string')
  }

  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Obtener dispersiones: si vienen ids explícitos (caso normal desde
    // tesorería) se usan directamente — esto incluye dispersiones fusionadas
    // (p.ej. ASESOR interno de alianzas FLAMINGO_DIRECTO) que no comparten
    // liderId/asesorId/tipoBeneficiario con el resto del grupo. Si no, se cae
    // al filtro por beneficiarioKey (compatibilidad).
    const conds = [
      eq(dispersiones.corteId, corteId),
      inArray(dispersiones.estado, ['AUTORIZADA', 'PARCIAL']),
    ]
    if (dispersionIds.length > 0) conds.push(inArray(dispersiones.id, dispersionIds))
    else if (liderId) conds.push(eq(dispersiones.liderId, liderId))
    else if (asesorId) conds.push(eq(dispersiones.asesorId, asesorId))
    else if (tipoBeneficiario)
      conds.push(eq(dispersiones.tipoBeneficiario, tipoBeneficiario as TipoBeneficiario))

    const targetDispersiones = await tx
      .select()
      .from(dispersiones)
      .where(and(...conds))

    const primera = targetDispersiones[0]
    if (!primera) {
      throw new Error('No hay dispersiones AUTORIZADAS para este beneficiario en este corte.')
    }

    const beneficiarioNombre = primera.beneficiarioNombre
    const totalMonto = targetDispersiones.reduce((sum, d) => sum + Number(d.montoTotal), 0)

    const archivoGuardado = await guardarComprobante(file, tenantId)

    const [nuevoComprobante] = await tx
      .insert(comprobantesPago)
      .values({
        tenantId,
        corteId,
        liderId,
        asesorId,
        beneficiarioTipo: (tipoBeneficiario as TipoBeneficiario) || primera.tipoBeneficiario,
        beneficiarioNombre,
        metodoPago,
        montoPagado: totalMonto.toString(),
        fechaPago: fechaPagoStr,
        nombre: archivoGuardado.nombre,
        rutaArchivo: archivoGuardado.rutaArchivo,
        mimeType: archivoGuardado.mimeType,
        tamanioBytes: archivoGuardado.tamanioBytes,
        subidoPor: user.id,
      })
      .returning()

    if (!nuevoComprobante) throw new Error('No se pudo registrar el comprobante')

    const targetIds = targetDispersiones.map((d) => d.id)

    await tx
      .update(dispersiones)
      .set({
        estado: 'PAGADO',
        montoPagado: sql`${dispersiones.montoTotal}`,
        fechaPago: fechaPagoStr,
        comprobanteId: nuevoComprobante.id,
        pagadoPor: user.id,
      })
      .where(inArray(dispersiones.id, targetIds))

    await tx.insert(auditLogs).values({
      tenantId,
      userId: user.id,
      accion: 'DISPERSION_PAGADA_GRUPO',
      recursoTipo: 'corte_dispersion',
      recursoId: corteId,
      cambios: { beneficiarioKey, comprobanteId: nuevoComprobante.id, totalMonto },
    })
  })

  revalidatePath(`/empresa/${empresaId}/comisiones/tesoreria`)
  revalidatePath(`/empresa/${empresaId}/comisiones/dispersiones`)
  revalidatePath(`/empresa/${empresaId}/comisiones/cortes/${corteId}`)
}
