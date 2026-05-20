/**
 * Servicio del portal externo — datos para líderes y asesores.
 *
 * AISLAMIENTO ESTRICTO: cada función verifica que el usuario autenticado tiene
 * acceso SOLO a sus propios datos:
 *   - ASESOR: ve únicamente dispersiones donde tipoBeneficiario=ASESOR y asesorId=su.asesorId
 *   - LIDER: ve dispersiones de cualquier asesor de su alianza
 *
 * Tests de aislamiento son OBLIGATORIOS (Día 12).
 */

import { db } from '@/lib/db'
import {
  asesores,
  comisionesCalculadas,
  desarrollos,
  dispersiones,
  lideresAlianza,
  usuariosPortal,
  ventasBmcorp,
  afiliados,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, inArray } from 'drizzle-orm'

export interface PerfilPortal {
  rolPortal: 'LIDER_ALIANZA' | 'ASESOR'
  tenantId: string
  liderId: string | null
  asesorId: string | null
  liderNombre: string | null
  asesorNombre: string | null
  alianzaNombre: string | null
}

export interface DispersionPortal {
  id: string
  tipoBeneficiario: string
  beneficiarioNombre: string
  montoTotal: number
  montoPagado: number
  montoDiferido: number
  estado: string
  acumulaMensual: boolean
  fechaEstimadaPago: string | null
  fechaPago: string | null
  // Datos de venta asociada
  ventaId: string
  ventaCliente: string
  ventaMonto: number
  desarrolloNombre: string | null
  tipoProducto: string
  // Si la dispersión tiene un asesor asociado distinto, para contexto del líder
  asesorNombre: string | null
}

// ─── Perfil del usuario portal autenticado ───────────────────────────────────

export async function getPerfilPortal(userId: string): Promise<PerfilPortal | null> {
  // Sin setTenant — bridge query, userId es la clave de seguridad
  const [row] = await db
    .select({
      usuario: usuariosPortal,
      lider: lideresAlianza,
      asesor: asesores,
    })
    .from(usuariosPortal)
    .leftJoin(lideresAlianza, eq(usuariosPortal.liderId, lideresAlianza.id))
    .leftJoin(asesores, eq(usuariosPortal.asesorId, asesores.id))
    .where(and(eq(usuariosPortal.userId, userId), eq(usuariosPortal.activo, true)))
    .limit(1)
  if (!row) return null

  // Obtener alianza nombre
  const afId = row.lider?.afiliadoId ?? row.asesor?.afiliadoId
  let alianzaNombre: string | null = null
  if (afId) {
    const [af] = await db
      .select({ nombre: afiliados.nombre })
      .from(afiliados)
      .where(eq(afiliados.id, afId))
      .limit(1)
    alianzaNombre = af?.nombre ?? null
  }

  return {
    rolPortal: row.usuario.rolPortal,
    tenantId: row.usuario.tenantId,
    liderId: row.usuario.liderId,
    asesorId: row.usuario.asesorId,
    liderNombre: row.lider?.nombre ?? null,
    asesorNombre: row.asesor?.nombre ?? null,
    alianzaNombre,
  }
}

// ─── Vista ASESOR ────────────────────────────────────────────────────────────
// Solo dispersiones tipoBeneficiario=ASESOR del asesor autenticado.

export async function getComisionesPortalAsesor(userId: string): Promise<DispersionPortal[]> {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'ASESOR' || !perfil.asesorId) return []
  const asesorId = perfil.asesorId

  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    const rows = await tx
      .select({
        d: dispersiones,
        v: ventasBmcorp,
        c: comisionesCalculadas,
        desarrolloNombre: desarrollos.nombre,
        asesorNombre: asesores.nombre,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(asesores, eq(dispersiones.asesorId, asesores.id))
      .where(
        and(
          eq(dispersiones.tenantId, perfil.tenantId),
          eq(dispersiones.tipoBeneficiario, 'ASESOR'),
          eq(dispersiones.asesorId, asesorId),
        ),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))
    return rows.map(toDispersionPortal)
  })
}

// ─── Vista LIDER ─────────────────────────────────────────────────────────────
// Todas las dispersiones de asesores de su alianza + sus propias LIDER_SALDO.

export async function getComisionesPortalLider(userId: string): Promise<DispersionPortal[]> {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA' || !perfil.liderId) return []
  const liderId = perfil.liderId

  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    // Dispersiones asociadas a este líder (LIDER_SALDO + ASESOR si fueron asignados)
    const rows = await tx
      .select({
        d: dispersiones,
        v: ventasBmcorp,
        c: comisionesCalculadas,
        desarrolloNombre: desarrollos.nombre,
        asesorNombre: asesores.nombre,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(asesores, eq(dispersiones.asesorId, asesores.id))
      .where(
        and(
          eq(dispersiones.tenantId, perfil.tenantId),
          eq(dispersiones.liderId, liderId),
          // Solo tipos que pertenecen al líder/su red
          inArray(dispersiones.tipoBeneficiario, ['LIDER_SALDO', 'ASESOR']),
        ),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))
    return rows.map(toDispersionPortal)
  })
}

export async function getAsesoresPortalLider(userId: string) {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA' || !perfil.liderId) return []
  const liderId = perfil.liderId
  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    return tx
      .select()
      .from(asesores)
      .where(
        and(
          eq(asesores.tenantId, perfil.tenantId),
          eq(asesores.liderId, liderId),
          eq(asesores.activo, true),
        ),
      )
  })
}

// ─── Comprobantes (con validación de pertenencia) ────────────────────────────

export async function verificarPertenenciaDispersion(
  userId: string,
  dispersionId: string,
): Promise<boolean> {
  const perfil = await getPerfilPortal(userId)
  if (!perfil) return false
  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    const [row] = await tx
      .select({
        liderId: dispersiones.liderId,
        asesorId: dispersiones.asesorId,
        tipoBeneficiario: dispersiones.tipoBeneficiario,
      })
      .from(dispersiones)
      .where(and(eq(dispersiones.tenantId, perfil.tenantId), eq(dispersiones.id, dispersionId)))
      .limit(1)
    if (!row) return false
    if (perfil.rolPortal === 'ASESOR' && perfil.asesorId) {
      return row.tipoBeneficiario === 'ASESOR' && row.asesorId === perfil.asesorId
    }
    if (perfil.rolPortal === 'LIDER_ALIANZA' && perfil.liderId) {
      return row.liderId === perfil.liderId
    }
    return false
  })
}

// ─── Helper ──────────────────────────────────────────────────────────────────

type Row = {
  d: typeof dispersiones.$inferSelect
  v: typeof ventasBmcorp.$inferSelect
  c: typeof comisionesCalculadas.$inferSelect
  desarrolloNombre: string | null
  asesorNombre: string | null
}

function toDispersionPortal(r: Row): DispersionPortal {
  return {
    id: r.d.id,
    tipoBeneficiario: r.d.tipoBeneficiario,
    beneficiarioNombre: r.d.beneficiarioNombre,
    montoTotal: Number(r.d.montoTotal),
    montoPagado: Number(r.d.montoPagado),
    montoDiferido: Number(r.d.montoDiferido),
    estado: r.d.estado,
    acumulaMensual: r.d.acumulaMensual,
    fechaEstimadaPago: r.d.fechaEstimadaPago,
    fechaPago: r.d.fechaPago,
    ventaId: r.v.id,
    ventaCliente: r.v.cliente,
    ventaMonto: Number(r.v.monto),
    desarrolloNombre: r.desarrolloNombre,
    tipoProducto: r.c.tipoProducto,
    asesorNombre: r.asesorNombre,
  }
}
