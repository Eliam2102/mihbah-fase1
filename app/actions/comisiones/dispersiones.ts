'use server'

import { requireUser, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import { dispersiones, auditLogs, notifications, users } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { calcularYPersistirComision } from '@/lib/services/comisiones/comisiones.service'
import { recalcularComision } from '@/lib/services/comisiones/comisiones.service'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[comisiones/dispersiones action] error:', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

function revalidate(empresaId: string) {
  revalidatePath(`/empresa/${empresaId}/comisiones`)
  revalidatePath(`/empresa/${empresaId}/ventas`)
  revalidatePath(`/empresa/${empresaId}/comisiones/dispersiones`)
  revalidatePath(`/empresa/${empresaId}/dashboard`)
}

// ─── Marcar dispersión como pagada (parcial o total) ─────────────────────────

const marcarPagadoSchema = z.object({
  dispersionId: z.string().uuid(),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  montoPagado: z.number().positive().optional(),
})

export async function marcarPagadoAction(
  empresaId: string,
  input: z.input<typeof marcarPagadoSchema>,
): Promise<ActionResult<{ id: string; estado: string }>> {
  try {
    const user = await requireUser()
    if (!isSuperAdminOrAbove(user.role)) {
      return { ok: false, error: 'Solo super_admin puede marcar pagos.' }
    }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const parsed = marcarPagadoSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Validación falló' }
    }
    const { dispersionId, fechaPago, montoPagado } = parsed.data
    const tenantId = user.tenantId!

    const updated = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      const [actual] = await tx
        .select()
        .from(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
        .limit(1)
      if (!actual) throw new Error('Dispersión no encontrada')

      if (actual.estado !== 'AUTORIZADA' && actual.estado !== 'PARCIAL') {
        throw new Error('Solo se pueden pagar dispersiones en estado AUTORIZADA o PARCIAL')
      }

      const total = Number(actual.montoTotal)
      const pago = montoPagado ?? total
      const yaPagado = Number(actual.montoPagado) + pago
      const estado = yaPagado >= total - 0.01 ? 'PAGADO' : yaPagado > 0 ? 'PARCIAL' : 'PENDIENTE'

      const [row] = await tx
        .update(dispersiones)
        .set({
          montoPagado: yaPagado.toFixed(2),
          estado,
          fechaPago,
          updatedAt: new Date(),
        })
        .where(eq(dispersiones.id, dispersionId))
        .returning()

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        accion: 'DISPERSION_PAGADA',
        recursoTipo: 'dispersiones',
        recursoId: dispersionId,
        cambios: { montoPagado: pago, fechaPago, estado },
      })

      return row!
    })

    revalidate(empresaId)
    return { ok: true, data: { id: updated.id, estado: updated.estado } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Revertir pago de dispersión (super_admin) ──────────────────────────────
// Resetea montoPagado=0, estado=PENDIENTE, fechaPago=null. Útil cuando se
// marcó pagada por error.

export async function revertirPagoDispersionAction(
  empresaId: string,
  dispersionId: string,
): Promise<ActionResult<{ id: string; estado: string }>> {
  try {
    const user = await requireUser()
    if (!isSuperAdminOrAbove(user.role)) {
      return { ok: false, error: 'Solo super_admin puede revertir pagos.' }
    }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId!

    const updated = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      const [actual] = await tx
        .select()
        .from(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
        .limit(1)
      if (!actual) throw new Error('Dispersión no encontrada')

      const [row] = await tx
        .update(dispersiones)
        .set({
          montoPagado: '0',
          estado: 'PENDIENTE',
          fechaPago: null,
          updatedAt: new Date(),
        })
        .where(eq(dispersiones.id, dispersionId))
        .returning()

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        accion: 'DISPERSION_REVERTIDA',
        recursoTipo: 'dispersiones',
        recursoId: dispersionId,
        cambios: {
          montoPagadoAnterior: actual.montoPagado,
          estadoAnterior: actual.estado,
          fechaPagoAnterior: actual.fechaPago,
        },
      })

      return row!
    })

    revalidate(empresaId)
    return { ok: true, data: { id: updated.id, estado: updated.estado } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Aprobar dispersión (Jorge Juárez aprueba antes de pagar) ───────────────

export async function aprobarDispersionAction(
  empresaId: string,
  dispersionId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!isSuperAdminOrAbove(user.role)) {
      return { ok: false, error: 'Solo super_admin puede aprobar dispersiones.' }
    }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId!
    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      // Cargar dispersión para calcular monto a retirar
      const [disp] = await tx
        .select()
        .from(dispersiones)
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))
        .limit(1)
      if (!disp) throw new Error('Dispersión no encontrada')

      await tx
        .update(dispersiones)
        .set({
          aprobadoPor: user.id,
          fechaAprobacion: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.id, dispersionId)))

      await tx.insert(auditLogs).values({
        tenantId,
        userId: user.id,
        accion: 'DISPERSION_APROBADA',
        recursoTipo: 'dispersiones',
        recursoId: dispersionId,
      })

      // Notificación a admins: caja a retirar
      const restante = Number(disp.montoTotal) - Number(disp.montoPagado)
      if (restante > 0) {
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              inArray(users.role, ['admin', 'super_admin', 'super_admin_dev']),
            ),
          )
        const fmtMonto = restante.toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        const valores = admins.map((a) => ({
          tenantId,
          userId: a.id,
          tipo: 'DISPERSION_APROBADA',
          titulo: 'Retiro de caja pendiente',
          mensaje: `Pendiente retirar ${fmtMonto} de caja para pagar a ${disp.beneficiarioNombre}`,
          link: `/empresa/${empresaId}/comisiones/dispersiones`,
        }))
        if (valores.length > 0) {
          await tx.insert(notifications).values(valores)
        }
      }
    })
    revalidate(empresaId)
    return { ok: true, data: { id: dispersionId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Recalcular comisión manualmente (cuando cliente paga más enganche) ─────

const recalcularSchema = z.object({
  ventaId: z.string().uuid(),
  nuevoEnganche: z.number().nonnegative(),
})

export async function recalcularComisionAction(
  empresaId: string,
  input: z.input<typeof recalcularSchema>,
): Promise<ActionResult<{ ventaId: string }>> {
  try {
    const user = await requireUser()
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const parsed = recalcularSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Validación falló' }
    const tenantId = user.tenantId!
    await recalcularComision(tenantId, parsed.data.ventaId, parsed.data.nuevoEnganche, {
      userId: user.id,
    })
    revalidate(empresaId)
    return { ok: true, data: { ventaId: parsed.data.ventaId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Forzar recálculo de una venta (sin cambiar enganche) ───────────────────
// Solo permitido si la venta ya está en etapa finalizada.

// LIBERADO NO: venta caída (cancelada), no genera comisión.
const ESTADOS_CON_COMISION_DISPERSIONES = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'] as const

export async function recalcularVentaAction(
  empresaId: string,
  ventaId: string,
): Promise<ActionResult<{ ventaId: string }>> {
  try {
    const user = await requireUser()
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId!

    // Verificar que la venta esté en etapa con comisión
    const { ventasBmcorp } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')
    const { db } = await import('@/lib/db')
    const [venta] = await db
      .select({ estadoVenta: ventasBmcorp.estadoVenta })
      .from(ventasBmcorp)
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
      .limit(1)
    if (!venta) return { ok: false, error: 'Venta no encontrada' }
    if (!(ESTADOS_CON_COMISION_DISPERSIONES as readonly string[]).includes(venta.estadoVenta)) {
      return {
        ok: false,
        error: `La venta está en estado "${venta.estadoVenta}". Solo se calculan comisiones para ventas Finalizadas, Liberadas o Finalizadas y Liquidadas.`,
      }
    }

    await calcularYPersistirComision(tenantId, ventaId, { userId: user.id })
    revalidate(empresaId)
    return { ok: true, data: { ventaId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Recalcular TODAS las comisiones del tenant ─────────────────────────────
// Solo procesa ventas FINALIZADAS / LIBERADAS / FINALIZADAS_Y_LIQUIDADAS.
// Ventas aún en pipeline se ignoran — no tienen comisión real generada.

export async function recalcularTodasComisionesAction(
  empresaId: string,
): Promise<ActionResult<{ ok: number; errores: number; total: number; omitidas: number }>> {
  try {
    const user = await requireUser()
    if (!user.tenantId) return { ok: false, error: 'Sin tenant' }
    await requireEmpresaAccess(user, empresaId, 'comisiones')
    const tenantId = user.tenantId

    // Importar lazy para evitar circular
    const { db } = await import('@/lib/db')
    const { ventasBmcorp } = await import('@/lib/db/schema')
    const { eq, and, inArray } = await import('drizzle-orm')

    // SOLO ventas finalizadas — las de pipeline no generan dispersiones
    const ventas = await db
      .select({ id: ventasBmcorp.id })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
        ),
      )

    const totalConComision = ventas.length

    // Contar las omitidas (pipeline) para informar
    const [countTotal] = await db
      .select({ total: (await import('drizzle-orm')).sql<number>`COUNT(*)::int` })
      .from(ventasBmcorp)
      .where(eq(ventasBmcorp.tenantId, tenantId))
    const omitidas = (countTotal?.total ?? totalConComision) - totalConComision

    let ok = 0
    let errores = 0
    for (const v of ventas) {
      try {
        await calcularYPersistirComision(tenantId, v.id, { userId: user.id })
        ok++
      } catch {
        errores++
      }
    }

    revalidate(empresaId)
    revalidatePath(`/empresa/${empresaId}/comisiones/esquemas`)
    return { ok: true, data: { ok, errores, total: totalConComision, omitidas } }
  } catch (err) {
    return handleError(err)
  }
}
