'use server'

import { z } from 'zod'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  cortesDispersion,
  ventasPagoCorte,
  dispersiones,
  ventasBmcorp,
  comisionesCalculadas,
  lideresAlianza,
  auditLogs,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { requireUser, isAdminOrAbove, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { deltaCascadaAbono, type TipoBeneficiarioCascada } from '@/lib/services/comisiones/cascada'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

// ─── Estados válidos para generar dispersión en un corte ──────────────────────
// LIBERADO NO cuenta: indica que la venta se cayó (cancelada) — no se paga comisión.
const ESTADOS_CON_COMISION = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[cortes action] error:', err)
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: Error }).cause
    const detail = cause instanceof Error ? ` — ${cause.message}` : ''
    // postgres driver puts code + detail on the error directly
    const pg = err as Error & { code?: string; detail?: string; constraint?: string }
    if (pg.constraint === 'ventas_pago_corte_unique') {
      return { ok: false, error: 'Esta venta ya está incluida en el corte' }
    }
    const pgDetail = pg.detail ? ` (${pg.detail})` : detail
    return { ok: false, error: `${err.message}${pgDetail}` }
  }
  return { ok: false, error: 'Error desconocido' }
}

function revalidateCortes(empresaId: string, corteId?: string) {
  revalidatePath(`/empresa/${empresaId}/comisiones/cortes`)
  revalidatePath(`/empresa/${empresaId}/comisiones`)
  // El avance de cobro/comisión de la venta depende del estado del corte.
  revalidatePath(`/empresa/${empresaId}/ventas`)
  revalidatePath(`/empresa/${empresaId}/ventas/[ventaId]`, 'page')
  if (corteId) {
    revalidatePath(`/empresa/${empresaId}/comisiones/cortes/${corteId}`)
    revalidatePath(`/empresa/${empresaId}/comisiones/cortes/${corteId}/aprobar`)
  }
}

// ─── Calcular próximos días de corte (Lunes y Jueves) ─────────────────────────

export async function getProximosDiasCorte(): Promise<{
  lunes: string
  jueves: string
}> {
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

  const toISO = (d: Date): string => d.toISOString().split('T')[0] ?? ''

  // Próximo lunes
  const diasHastaLunes = (8 - diaSemana) % 7 || 7
  const proximoLunes = new Date(hoy)
  proximoLunes.setDate(hoy.getDate() + (diaSemana === 1 ? 0 : diasHastaLunes))

  // Próximo jueves
  const diasHastaJueves = (4 - diaSemana + 7) % 7 || 7
  const proximoJueves = new Date(hoy)
  proximoJueves.setDate(hoy.getDate() + (diaSemana === 4 ? 0 : diasHastaJueves))

  return {
    lunes: toISO(proximoLunes),
    jueves: toISO(proximoJueves),
  }
}

// ─── 1. Crear corte ───────────────────────────────────────────────────────────

const crearCorteSchema = z.object({
  empresaId: z.string().uuid(),
  fechaCorte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  tipoDia: z.enum(['LUNES', 'JUEVES']),
  notasJoana: z.string().nullable().optional(),
})

export async function crearCorteAction(
  input: z.input<typeof crearCorteSchema>,
): Promise<ActionResult<{ corteId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = crearCorteSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }

    const { empresaId, fechaCorte, tipoDia, notasJoana } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    const [corte] = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return tx
        .insert(cortesDispersion)
        .values({
          tenantId,
          empresaId,
          fechaCorte,
          tipoDia,
          estado: 'BORRADOR',
          notasJoana: notasJoana ?? null,
          creadoPor: user.id,
        })
        .returning({ id: cortesDispersion.id })
    })

    revalidateCortes(empresaId, corte!.id)
    return { ok: true, data: { corteId: corte!.id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 2. Agregar venta al corte + registrar pago del cliente ──────────────────
// Calcula las dispersiones proporcionales al % que pagó el cliente.

const METODOS_PAGO = ['EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA', 'OTRO'] as const
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

const agregarVentaSchema = z.object({
  empresaId: z.string().uuid(),
  corteId: z.string().uuid(),
  ventaId: z.string().uuid(),
  montoPagadoCliente: z.number().positive('El monto pagado debe ser positivo'),
  metodoPagoCliente: z.enum(METODOS_PAGO).nullable().optional(),
  fechaPagoCliente: z.string().regex(FECHA_RE, 'Formato YYYY-MM-DD').nullable().optional(),
  notasJoana: z.string().nullable().optional(),
})

type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

interface AgregarVentaParams {
  corteId: string
  ventaId: string
  montoPagadoCliente: number
  metodoPagoCliente?: (typeof METODOS_PAGO)[number] | null | undefined
  fechaPagoCliente?: string | null | undefined
  notasJoana?: string | null | undefined
}

// Núcleo compartido: registra el abono del cliente en un corte BORRADOR y genera
// las dispersiones proporcionales al % pagado. Lo usan agregarVentaAlCorteAction
// (desde el corte) y registrarAbonoVentaAction (desde la venta).
async function agregarVentaACorteTx(
  tx: DrizzleTx,
  tenantId: string,
  p: AgregarVentaParams,
): Promise<{ pagoCorteId: string; dispersionesCreadas: number }> {
  // Validar corte existe y está en BORRADOR
  const [corte] = await tx
    .select()
    .from(cortesDispersion)
    .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, p.corteId)))
    .limit(1)
  if (!corte) throw new Error('Corte no encontrado')
  if (corte.estado !== 'BORRADOR')
    throw new Error('El corte ya no está en borrador — no se pueden agregar ventas')

  // Validar venta está finalizada
  const [venta] = await tx
    .select({
      id: ventasBmcorp.id,
      monto: ventasBmcorp.monto,
      estadoVenta: ventasBmcorp.estadoVenta,
      descuentoDesarrolladoraPct: ventasBmcorp.descuentoDesarrolladoraPct,
    })
    .from(ventasBmcorp)
    .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, p.ventaId)))
    .limit(1)
  if (!venta) throw new Error('Venta no encontrada')
  if (!(ESTADOS_CON_COMISION as readonly string[]).includes(venta.estadoVenta)) {
    throw new Error(
      `La venta está en estado "${venta.estadoVenta}". Solo ventas FINALIZADAS pueden incluirse en un corte.`,
    )
  }

  const montoVenta = Number(venta.monto ?? 0)
  if (montoVenta <= 0) throw new Error('La venta no tiene monto registrado')
  if (p.montoPagadoCliente > montoVenta)
    throw new Error('El monto pagado no puede superar el monto total de la venta')

  // Calcular % pagado
  const porcentajePagado = (p.montoPagadoCliente / montoVenta) * 100

  // Obtener comisión calculada de la venta
  const [comision] = await tx
    .select()
    .from(comisionesCalculadas)
    .where(
      and(eq(comisionesCalculadas.tenantId, tenantId), eq(comisionesCalculadas.ventaId, p.ventaId)),
    )
    .limit(1)
  if (!comision)
    throw new Error(
      'Esta venta no tiene comisión calculada. Sincroniza Monday o recalcula primero.',
    )

  // Plantilla = dispersiones "padre" (sin corte ni pago), líneas completas de comisión.
  const dispPadre = await tx
    .select()
    .from(dispersiones)
    .where(
      and(
        eq(dispersiones.tenantId, tenantId),
        eq(dispersiones.comisionId, comision.id),
        isNull(dispersiones.corteId),
        isNull(dispersiones.pagoCorteId),
      ),
    )
  if (dispPadre.length === 0) {
    throw new Error(
      'No hay dispersiones calculadas para esta comisión. Recalcula la comisión primero.',
    )
  }

  // Acumulado pagado por el cliente ANTES de este abono (otros cortes de la venta).
  const [prevAgg] = await tx
    .select({ suma: sql<string>`COALESCE(SUM(${ventasPagoCorte.montoPagadoCliente}), 0)` })
    .from(ventasPagoCorte)
    .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.ventaId, p.ventaId)))
  const cumPrevio = Number(prevAgg?.suma ?? 0)
  const cumNuevo = cumPrevio + p.montoPagadoCliente

  // Descuento desarrolladora (default 0). Si > 0, reduce el monto DISPONIBLE para
  // dispersar (lo que BM Corp recibe en caja del cliente), no los techos de cada
  // línea. Regla Joana: cada línea cobra su % bruto sobre venta total.
  const descuentoPct = Number(venta.descuentoDesarrolladoraPct ?? 0)
  const factor = 1 - descuentoPct / 100

  // CASCADA DE PRIORIDAD: lo que se libera con ESTE abono =
  // cascada(acumulado nuevo) − cascada(acumulado previo). Master §4.
  const lineasCascada = dispPadre.map((d) => ({
    id: d.id,
    tipoBeneficiario: d.tipoBeneficiario as TipoBeneficiarioCascada,
    montoTotal: Number(d.montoTotal),
  }))
  const delta = deltaCascadaAbono(lineasCascada, cumPrevio * factor, cumNuevo * factor)
  const montoADispersar = [...delta.values()].reduce((s, v) => s + v, 0)

  // Registrar pago del cliente
  const [pagoCorte] = await tx
    .insert(ventasPagoCorte)
    .values({
      tenantId,
      corteId: p.corteId,
      ventaId: p.ventaId,
      montoPagadoCliente: p.montoPagadoCliente.toFixed(2),
      porcentajePagado: porcentajePagado.toFixed(4),
      montoADispersar: montoADispersar.toFixed(2),
      metodoPagoCliente: p.metodoPagoCliente ?? null,
      fechaPagoCliente: p.fechaPagoCliente ?? null,
      notasJoana: p.notasJoana ?? null,
    })
    .returning({ id: ventasPagoCorte.id })
  if (!pagoCorte) throw new Error('No se pudo registrar el abono')

  // Dispersiones "hija" = delta de cascada por línea (solo las que liberaron > 0).
  const nuevasDispersiones = dispPadre
    .filter((d) => (delta.get(d.id) ?? 0) > 0)
    .map((d) => ({
      tenantId,
      comisionId: comision.id,
      corteId: p.corteId,
      pagoCorteId: pagoCorte.id,
      liderId: d.liderId,
      asesorId: d.asesorId,
      tipoBeneficiario: d.tipoBeneficiario,
      beneficiarioNombre: d.beneficiarioNombre,
      montoTotal: (delta.get(d.id) ?? 0).toFixed(2),
      montoPagado: '0',
      montoDiferido: '0',
      estado: 'PENDIENTE' as const,
      acumulaMensual: d.acumulaMensual,
    }))

  if (nuevasDispersiones.length > 0) {
    await tx.insert(dispersiones).values(nuevasDispersiones)
  }

  // Actualizar total del corte
  const [totalActual] = await tx
    .select({ suma: sql<string>`COALESCE(SUM(${ventasPagoCorte.montoADispersar}), 0)` })
    .from(ventasPagoCorte)
    .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, p.corteId)))
  await tx
    .update(cortesDispersion)
    .set({ totalADispersar: totalActual?.suma ?? '0', updatedAt: new Date() })
    .where(eq(cortesDispersion.id, p.corteId))

  return { pagoCorteId: pagoCorte.id, dispersionesCreadas: nuevasDispersiones.length }
}

export async function agregarVentaAlCorteAction(
  input: z.input<typeof agregarVentaSchema>,
): Promise<ActionResult<{ pagoCorteId: string; dispersionesCreadas: number }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = agregarVentaSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }

    const {
      empresaId,
      corteId,
      ventaId,
      montoPagadoCliente,
      metodoPagoCliente,
      fechaPagoCliente,
      notasJoana,
    } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    const result = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return agregarVentaACorteTx(tx, tenantId, {
        corteId,
        ventaId,
        montoPagadoCliente,
        metodoPagoCliente,
        fechaPagoCliente,
        notasJoana,
      })
    })

    revalidateCortes(empresaId, corteId)
    return { ok: true, data: result }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 2b. Registrar abono desde la VENTA (crea corte si no se elige uno) ──────

const registrarAbonoSchema = z
  .object({
    empresaId: z.string().uuid(),
    ventaId: z.string().uuid(),
    montoPagadoCliente: z.number().positive('El monto abonado debe ser positivo'),
    metodoPagoCliente: z.enum(METODOS_PAGO).nullable().optional(),
    fechaPagoCliente: z.string().regex(FECHA_RE, 'Formato YYYY-MM-DD').nullable().optional(),
    // O eliges un corte BORRADOR existente, o creas uno nuevo:
    corteId: z.string().uuid().nullable().optional(),
    nuevoCorteFecha: z.string().regex(FECHA_RE, 'Formato YYYY-MM-DD').nullable().optional(),
    nuevoCorteTipo: z.enum(['LUNES', 'JUEVES']).nullable().optional(),
    notasJoana: z.string().nullable().optional(),
  })
  .refine((d) => d.corteId || (d.nuevoCorteFecha && d.nuevoCorteTipo), {
    message: 'Elige un corte existente o crea uno nuevo (fecha + día)',
  })

export async function registrarAbonoVentaAction(
  input: z.input<typeof registrarAbonoSchema>,
): Promise<ActionResult<{ corteId: string; pagoCorteId: string; dispersionesCreadas: number }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = registrarAbonoSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }

    const d = parsed.data
    await requireEmpresaAccess(user, d.empresaId, 'comisiones')
    const tenantId = user.tenantId

    let corteId = d.corteId ?? ''
    const result = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      // Crear corte BORRADOR si no se eligió uno existente
      if (!corteId) {
        const [nuevo] = await tx
          .insert(cortesDispersion)
          .values({
            tenantId,
            empresaId: d.empresaId,
            fechaCorte: d.nuevoCorteFecha!,
            tipoDia: d.nuevoCorteTipo!,
            estado: 'BORRADOR',
            creadoPor: user.id,
          })
          .returning({ id: cortesDispersion.id })
        if (!nuevo) throw new Error('No se pudo crear el corte')
        corteId = nuevo.id
      }

      return agregarVentaACorteTx(tx, tenantId, {
        corteId,
        ventaId: d.ventaId,
        montoPagadoCliente: d.montoPagadoCliente,
        metodoPagoCliente: d.metodoPagoCliente,
        fechaPagoCliente: d.fechaPagoCliente,
        notasJoana: d.notasJoana,
      })
    })

    revalidateCortes(d.empresaId, corteId)
    return { ok: true, data: { corteId, ...result } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 2c. Cortes en BORRADOR de la empresa (para el selector de abono) ─────────

export async function getCortesBorradorAction(
  empresaId: string,
): Promise<ActionResult<{ id: string; fechaCorte: string; tipoDia: string }[]>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    const rows = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return tx
        .select({
          id: cortesDispersion.id,
          fechaCorte: cortesDispersion.fechaCorte,
          tipoDia: cortesDispersion.tipoDia,
        })
        .from(cortesDispersion)
        .where(
          and(
            eq(cortesDispersion.tenantId, tenantId),
            eq(cortesDispersion.empresaId, empresaId),
            eq(cortesDispersion.estado, 'BORRADOR'),
            isNull(cortesDispersion.deletedAt),
          ),
        )
        .orderBy(cortesDispersion.fechaCorte)
    })

    return { ok: true, data: rows }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 3. Ajustar monto de una dispersión en el corte ──────────────────────────

const ajustarDispersionSchema = z.object({
  empresaId: z.string().uuid(),
  dispersionId: z.string().uuid(),
  nuevoMonto: z.number().min(0),
  notaAjuste: z.string().nullable().optional(),
})

export async function ajustarDispersionEnCorteAction(
  input: z.input<typeof ajustarDispersionSchema>,
): Promise<ActionResult<{ dispersionId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    const parsed = ajustarDispersionSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }

    const { empresaId, dispersionId, nuevoMonto } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      // Verificar que la dispersión pertenece a un corte en BORRADOR
      const [disp] = await tx
        .select({ id: dispersiones.id, corteId: dispersiones.corteId })
        .from(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
        .limit(1)
      if (!disp) throw new Error('Dispersión no encontrada')
      if (!disp.corteId) throw new Error('Esta dispersión no pertenece a ningún corte')

      const [corte] = await tx
        .select({ estado: cortesDispersion.estado })
        .from(cortesDispersion)
        .where(eq(cortesDispersion.id, disp.corteId))
        .limit(1)
      if (corte?.estado !== 'BORRADOR')
        throw new Error('Solo se pueden ajustar dispersiones de cortes en BORRADOR')

      await tx
        .update(dispersiones)
        .set({ montoTotal: nuevoMonto.toFixed(2), updatedAt: new Date() })
        .where(eq(dispersiones.id, dispersionId))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'dispersion',
        recursoId: dispersionId,
        accion: 'AJUSTE_CORTE',
        cambios: { nuevoMonto },
      })
    })

    return { ok: true, data: { dispersionId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 4. Enviar corte a aprobación ────────────────────────────────────────────

export async function enviarCorteAAprobacionAction(
  empresaId: string,
  corteId: string,
  mensaje?: string | null,
): Promise<ActionResult<{ corteId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [corte] = await tx
        .select()
        .from(cortesDispersion)
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
        .limit(1)
      if (!corte) throw new Error('Corte no encontrado')
      if (corte.estado !== 'BORRADOR') throw new Error('El corte ya no está en borrador')

      // Verificar que tiene al menos una venta/dispersión
      const result = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(ventasPagoCorte)
        .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, corteId)))
      const count = result[0]?.count ?? 0
      if (count === 0)
        throw new Error(
          'El corte no tiene ventas. Agrega al menos una venta antes de enviar a aprobación.',
        )

      // Cambiar estado del corte y de sus dispersiones a EN_REVISION
      await tx
        .update(cortesDispersion)
        .set({
          estado: 'EN_REVISION',
          notasJoana: mensaje?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(cortesDispersion.id, corteId))

      await tx
        .update(dispersiones)
        .set({ estado: 'EN_REVISION', updatedAt: new Date() })
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.corteId, corteId)))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'corte_dispersion',
        recursoId: corteId,
        accion: 'ENVIAR_A_REVISION',
        cambios: { estadoAnterior: 'BORRADOR', estadoNuevo: 'EN_REVISION' },
      })
    })

    revalidateCortes(empresaId, corteId)
    return { ok: true, data: { corteId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 5. Aprobar corte (Jorge o Carla) ────────────────────────────────────────

const aprobarCorteSchema = z.object({
  empresaId: z.string().uuid(),
  corteId: z.string().uuid(),
  notas: z.string().nullable().optional(),
})

export async function aprobarCorteAction(
  input: z.input<typeof aprobarCorteSchema>,
): Promise<ActionResult<{ corteId: string; dispersionesAutorizadas: number }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    // Solo super_admin puede aprobar cortes (Carla Barrera / Jorge Juárez).
    // admin (Joana) NO puede autoaprobar — separación de funciones financieras.
    if (!isSuperAdminOrAbove(user.role)) {
      return {
        ok: false,
        error: 'Solo super_admin puede aprobar cortes de dispersión. Joana no puede autoaprobar.',
      }
    }

    const parsed = aprobarCorteSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validación falló' }

    const { empresaId, corteId, notas } = parsed.data
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId
    const ahora = new Date()

    const result = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [corte] = await tx
        .select()
        .from(cortesDispersion)
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
        .limit(1)
      if (!corte) throw new Error('Corte no encontrado')
      if (corte.estado !== 'EN_REVISION') throw new Error('El corte no está en revisión')

      // Validación de no-autoaprobación: quien envió el corte no puede aprobarlo.
      // Si el corte fue creado por el mismo usuario que intenta aprobar → rechazar.
      if (corte.creadoPor === user.id) {
        throw new Error(
          'El usuario que envió este corte no puede aprobarlo. Debe aprobarlo otro super_admin.',
        )
      }

      // Aprobar el corte
      await tx
        .update(cortesDispersion)
        .set({
          estado: 'APROBADO',
          aprobadoPor: user.id,
          fechaAprobacion: ahora,
          notasAprobador: notas ?? null,
          updatedAt: ahora,
        })
        .where(eq(cortesDispersion.id, corteId))

      // Obtener dispersiones del corte + método de pago del perfil del líder.
      // El método NO lo elige el aprobador: viene fijo del perfil (lideresAlianza.metodoPago).
      const dispsDelCorte = await tx
        .select({
          id: dispersiones.id,
          liderMetodoPago: lideresAlianza.metodoPago,
        })
        .from(dispersiones)
        .leftJoin(lideresAlianza, eq(dispersiones.liderId, lideresAlianza.id))
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.corteId, corteId)))

      // Actualizar cada dispersión a AUTORIZADA con el método del perfil del líder.
      // Sin líder (asesor/socio fijo/bolsa) → EFECTIVO por defecto.
      for (const disp of dispsDelCorte) {
        await tx
          .update(dispersiones)
          .set({
            estado: 'AUTORIZADA',
            aprobadoPor: user.id,
            fechaAprobacion: ahora,
            metodoPago: disp.liderMetodoPago ?? 'EFECTIVO',
            updatedAt: ahora,
          })
          .where(eq(dispersiones.id, disp.id))
      }

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'corte_dispersion',
        recursoId: corteId,
        accion: 'APROBAR',
        cambios: { dispersionesAutorizadas: dispsDelCorte.length },
      })

      return { dispersionesAutorizadas: dispsDelCorte.length }
    })

    revalidateCortes(empresaId, corteId)
    return { ok: true, data: { corteId, ...result } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 6. Rechazar corte ────────────────────────────────────────────────────────

export async function rechazarCorteAction(
  empresaId: string,
  corteId: string,
  notas: string,
): Promise<ActionResult<{ corteId: string }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    if (!isAdminOrAbove(user.role)) {
      return { ok: false, error: 'Solo administradores pueden rechazar cortes' }
    }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId
    const ahora = new Date()

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [corte] = await tx
        .select({ estado: cortesDispersion.estado })
        .from(cortesDispersion)
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
        .limit(1)
      if (!corte) throw new Error('Corte no encontrado')
      if (corte.estado !== 'EN_REVISION')
        throw new Error('Solo se puede rechazar un corte en revisión')

      // Rechazar = regresar el corte a BORRADOR para que Joana ajuste y reenvíe.
      // El motivo queda en notasAprobador; no es estado terminal.
      await tx
        .update(cortesDispersion)
        .set({
          estado: 'BORRADOR',
          aprobadoPor: null,
          fechaAprobacion: null,
          notasAprobador: notas,
          updatedAt: ahora,
        })
        .where(eq(cortesDispersion.id, corteId))

      // Regresar dispersiones a PENDIENTE (editables de nuevo en borrador)
      await tx
        .update(dispersiones)
        .set({ estado: 'PENDIENTE', aprobadoPor: null, fechaAprobacion: null, updatedAt: ahora })
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.corteId, corteId)))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        recursoTipo: 'corte_dispersion',
        recursoId: corteId,
        accion: 'RECHAZAR',
        cambios: { notas },
      })
    })

    revalidateCortes(empresaId, corteId)
    return { ok: true, data: { corteId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 7. Obtener resumen del corte para administración ─────────────────────────

export async function getResumenCorteAction(
  empresaId: string,
  corteId: string,
): Promise<
  ActionResult<{
    totalEfectivo: number
    totalDeposito: number
    totalTransferencia: number
    totalADispersar: number
    desglosePorLider: {
      liderId: string | null
      nombreLider: string
      monto: number
      metodoPago: string
    }[]
  }>
> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
    })

    const disps = await db
      .select({
        liderId: dispersiones.liderId,
        beneficiarioNombre: dispersiones.beneficiarioNombre,
        montoTotal: dispersiones.montoTotal,
        metodoPago: dispersiones.metodoPago,
        estado: dispersiones.estado,
      })
      .from(dispersiones)
      .where(
        and(
          eq(dispersiones.tenantId, tenantId),
          eq(dispersiones.corteId, corteId),
          inArray(dispersiones.estado, ['AUTORIZADA', 'EN_REVISION', 'PENDIENTE']),
        ),
      )

    const desglosePorLider = Object.values(
      disps.reduce(
        (acc, d) => {
          const key = d.liderId ?? d.beneficiarioNombre
          if (!acc[key]) {
            acc[key] = {
              liderId: d.liderId,
              nombreLider: d.beneficiarioNombre,
              monto: 0,
              metodoPago: d.metodoPago ?? 'EFECTIVO',
            }
          }
          acc[key].monto += Number(d.montoTotal)
          return acc
        },
        {} as Record<
          string,
          { liderId: string | null; nombreLider: string; monto: number; metodoPago: string }
        >,
      ),
    )

    const totalEfectivo = desglosePorLider
      .filter((d) => d.metodoPago === 'EFECTIVO')
      .reduce((s, d) => s + d.monto, 0)
    const totalDeposito = desglosePorLider
      .filter((d) => ['DEPOSITO', 'TRANSFERENCIA'].includes(d.metodoPago))
      .reduce((s, d) => s + d.monto, 0)
    const totalTransferencia = desglosePorLider
      .filter((d) => d.metodoPago === 'TRANSFERENCIA')
      .reduce((s, d) => s + d.monto, 0)
    const totalADispersar = desglosePorLider.reduce((s, d) => s + d.monto, 0)

    return {
      ok: true,
      data: { totalEfectivo, totalDeposito, totalTransferencia, totalADispersar, desglosePorLider },
    }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 8. Listar cortes ─────────────────────────────────────────────────────────

export async function listarCortesAction(
  empresaId: string,
  estado?: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO',
): Promise<
  ActionResult<
    {
      id: string
      fechaCorte: string
      tipoDia: string
      estado: string
      totalADispersar: string | null
      notasJoana: string | null
      creadoPor: string
      aprobadoPor: string | null
      fechaAprobacion: Date | null
      createdAt: Date
    }[]
  >
> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    const conditions = [
      eq(cortesDispersion.tenantId, tenantId),
      eq(cortesDispersion.empresaId, empresaId),
    ]
    if (estado) conditions.push(eq(cortesDispersion.estado, estado))

    const rows = await db
      .select()
      .from(cortesDispersion)
      .where(and(...conditions))
      .orderBy(cortesDispersion.fechaCorte)

    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        fechaCorte: r.fechaCorte,
        tipoDia: r.tipoDia,
        estado: r.estado,
        totalADispersar: r.totalADispersar,
        notasJoana: r.notasJoana,
        creadoPor: r.creadoPor,
        aprobadoPor: r.aprobadoPor,
        fechaAprobacion: r.fechaAprobacion,
        createdAt: r.createdAt,
      })),
    }
  } catch (err) {
    return handleError(err)
  }
}

// ─── 9. Eliminar venta de un corte (solo BORRADOR) ───────────────────────────

export async function eliminarVentaDelCorteAction(
  empresaId: string,
  pagoCorteId: string,
): Promise<ActionResult<{ eliminado: true }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [pago] = await tx
        .select()
        .from(ventasPagoCorte)
        .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.id, pagoCorteId)))
        .limit(1)
      if (!pago) throw new Error('Pago no encontrado')

      const [corte] = await tx
        .select({ estado: cortesDispersion.estado })
        .from(cortesDispersion)
        .where(eq(cortesDispersion.id, pago.corteId))
        .limit(1)
      if (corte?.estado !== 'BORRADOR')
        throw new Error('Solo se pueden eliminar ventas de cortes en BORRADOR')

      // Eliminar dispersiones de este corte que vienen de este pago
      await tx
        .delete(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.pagoCorteId, pagoCorteId)))

      // Eliminar el pago
      await tx.delete(ventasPagoCorte).where(eq(ventasPagoCorte.id, pagoCorteId))

      // Recalcular total del corte
      const [totalRes] = await tx
        .select({ suma: sql<string>`COALESCE(SUM(${ventasPagoCorte.montoADispersar}), 0)` })
        .from(ventasPagoCorte)
        .where(
          and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.corteId, pago.corteId)),
        )
      await tx
        .update(cortesDispersion)
        .set({ totalADispersar: totalRes?.suma ?? '0', updatedAt: new Date() })
        .where(eq(cortesDispersion.id, pago.corteId))
    })

    return { ok: true, data: { eliminado: true } }
  } catch (err) {
    return handleError(err)
  }
}

export async function eliminarCorteAction(
  empresaId: string,
  corteId: string,
): Promise<ActionResult<{ eliminado: boolean }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [corte] = await tx
        .select({ estado: cortesDispersion.estado })
        .from(cortesDispersion)
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
        .limit(1)
      if (!corte) throw new Error('Corte no encontrado')
      if (corte.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar cortes en BORRADOR')

      // Eliminar hija dispersiones → pagos del corte → corte
      await tx.delete(dispersiones).where(eq(dispersiones.corteId, corteId))
      await tx.delete(ventasPagoCorte).where(eq(ventasPagoCorte.corteId, corteId))
      await tx.delete(cortesDispersion).where(eq(cortesDispersion.id, corteId))
    })

    revalidatePath(`/empresa/${empresaId}/comisiones/cortes`)
    return { ok: true, data: { eliminado: true } }
  } catch (err) {
    return handleError(err)
  }
}

export async function actualizarNotasCorteAction(
  empresaId: string,
  corteId: string,
  notas: string | null,
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [corte] = await tx
        .select({ estado: cortesDispersion.estado })
        .from(cortesDispersion)
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
        .limit(1)
      if (!corte) throw new Error('Corte no encontrado')
      if (corte.estado !== 'BORRADOR')
        throw new Error('Solo se pueden editar notas en cortes en BORRADOR')

      await tx
        .update(cortesDispersion)
        .set({ notasJoana: notas ?? null, updatedAt: new Date() })
        .where(and(eq(cortesDispersion.tenantId, tenantId), eq(cortesDispersion.id, corteId)))
    })

    revalidateCortes(empresaId, corteId)
    return { ok: true, data: { updated: true } }
  } catch (err) {
    return handleError(err)
  }
}

export async function reasignarLiderDispersionAction(
  empresaId: string,
  dispersionId: string,
  nuevoLiderId: string,
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Usuario sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    let corteIdParaRevalidar: string | null = null

    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [disp] = await tx
        .select({
          id: dispersiones.id,
          tipoBeneficiario: dispersiones.tipoBeneficiario,
          corteId: dispersiones.corteId,
        })
        .from(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
        .limit(1)
      if (!disp) throw new Error('Dispersión no encontrada')
      if (disp.tipoBeneficiario !== 'LIDER_SALDO')
        throw new Error('Solo dispersiones tipo LIDER_SALDO pueden reasignarse')

      if (disp.corteId) {
        corteIdParaRevalidar = disp.corteId
        const [corte] = await tx
          .select({ estado: cortesDispersion.estado })
          .from(cortesDispersion)
          .where(eq(cortesDispersion.id, disp.corteId))
          .limit(1)
        if (corte && corte.estado !== 'BORRADOR')
          throw new Error('Solo se puede reasignar en cortes en BORRADOR')
      }

      const [lider] = await tx
        .select({ nombre: lideresAlianza.nombre })
        .from(lideresAlianza)
        .where(and(eq(lideresAlianza.tenantId, tenantId), eq(lideresAlianza.id, nuevoLiderId)))
        .limit(1)
      if (!lider) throw new Error('Líder no encontrado')

      await tx
        .update(dispersiones)
        .set({ liderId: nuevoLiderId, beneficiarioNombre: lider.nombre, updatedAt: new Date() })
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
    })

    revalidateCortes(empresaId, corteIdParaRevalidar ?? undefined)

    return { ok: true, data: { updated: true } }
  } catch (err) {
    return handleError(err)
  }
}
