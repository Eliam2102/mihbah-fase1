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
  users,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, gt, inArray, isNotNull, or, isNull, not } from 'drizzle-orm'

export interface PerfilPortal {
  rolPortal: 'LIDER_ALIANZA' | 'ASESOR' | 'ADMINISTRATIVO'
  tenantId: string
  // Líder primario (compat con UI / tests). Para queries usa liderIds.
  liderId: string | null
  asesorId: string | null
  // Todos los IDs lideres_alianza donde el email del user coincide (email o email_alterno).
  // Un líder puede tener N alianzas; ve TODAS las dispersiones de sus alianzas.
  liderIds: string[]
  asesorIds: string[]
  alianzasIds: string[]
  liderNombre: string | null
  asesorNombre: string | null
  alianzaNombre: string | null
  // Nombres de TODAS las alianzas del líder/asesor (para UI multi-alianza).
  alianzasNombres: string[]
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
  ventaLoteAcciones: string | null
  desarrolloNombre: string | null
  tipoProducto: string
  // Si la dispersión tiene un asesor asociado distinto, para contexto del líder
  asesorNombre: string | null
  // Alianza (afiliado) a la que pertenece esta dispersión — útil cuando un
  // líder tiene N alianzas para distinguir de cuál viene cada dispersión.
  alianzaNombre: string | null
}

// ─── Perfil del usuario portal autenticado ───────────────────────────────────

export async function getPerfilPortal(userId: string): Promise<PerfilPortal | null> {
  // Sin setTenant — bridge query, userId es la clave de seguridad
  const [row] = await db
    .select({
      usuario: usuariosPortal,
      lider: lideresAlianza,
      asesor: asesores,
      userEmail: users.email,
    })
    .from(usuariosPortal)
    .innerJoin(users, eq(usuariosPortal.userId, users.id))
    .leftJoin(lideresAlianza, eq(usuariosPortal.liderId, lideresAlianza.id))
    .leftJoin(asesores, eq(usuariosPortal.asesorId, asesores.id))
    .where(and(eq(usuariosPortal.userId, userId), eq(usuariosPortal.activo, true)))
    .limit(1)
  if (!row) return null

  // Líder puede tener N alianzas (N rows en lideres_alianza con el mismo email).
  // Asesor igual (raro pero soportado). Buscar TODOS los IDs por email matching.
  const tenantId = row.usuario.tenantId
  const userEmailLower = row.userEmail.toLowerCase()

  let liderIds: string[] = []
  let asesorIds: string[] = []
  let alianzasIds: string[] = []

  if (row.usuario.rolPortal === 'LIDER_ALIANZA') {
    const lideres = await db
      .select({ id: lideresAlianza.id, afiliadoId: lideresAlianza.afiliadoId })
      .from(lideresAlianza)
      .where(
        and(
          eq(lideresAlianza.tenantId, tenantId),
          isNull(lideresAlianza.deletedAt),
          eq(lideresAlianza.activo, true),
          or(
            eq(lideresAlianza.email, userEmailLower),
            eq(lideresAlianza.emailAlterno, userEmailLower),
          ),
        ),
      )
    liderIds = lideres.map((l) => l.id)
    alianzasIds = lideres.map((l) => l.afiliadoId)
    // Fallback al liderId del usuariosPortal si email matching no encontró nada.
    if (liderIds.length === 0 && row.usuario.liderId) {
      liderIds = [row.usuario.liderId]
      if (row.lider?.afiliadoId) alianzasIds = [row.lider.afiliadoId]
    }
  } else if (row.usuario.rolPortal === 'ADMINISTRATIVO') {
    // Administrativo se basa estrictamente en el liderId asignado
    if (row.usuario.liderId) {
      liderIds = [row.usuario.liderId]
      if (row.lider?.afiliadoId) alianzasIds = [row.lider.afiliadoId]
    }
  } else {
    const ases = await db
      .select({ id: asesores.id, afiliadoId: asesores.afiliadoId })
      .from(asesores)
      .where(
        and(
          eq(asesores.tenantId, tenantId),
          eq(asesores.activo, true),
          eq(asesores.email, userEmailLower),
        ),
      )
    asesorIds = ases.map((a) => a.id)
    alianzasIds = ases.map((a) => a.afiliadoId)
    if (asesorIds.length === 0 && row.usuario.asesorId) {
      asesorIds = [row.usuario.asesorId]
      if (row.asesor?.afiliadoId) alianzasIds = [row.asesor.afiliadoId]
    }
  }

  // Obtener nombres de TODAS las alianzas asociadas.
  let alianzasNombres: string[] = []
  if (alianzasIds.length > 0) {
    const afs = await db
      .select({ id: afiliados.id, nombre: afiliados.nombre })
      .from(afiliados)
      .where(inArray(afiliados.id, alianzasIds))
    alianzasNombres = afs.map((a) => a.nombre).sort((a, b) => a.localeCompare(b))
  }

  return {
    rolPortal: row.usuario.rolPortal,
    tenantId,
    liderId: row.usuario.liderId,
    asesorId: row.usuario.asesorId,
    liderIds,
    asesorIds,
    alianzasIds,
    liderNombre: row.lider?.nombre ?? null,
    asesorNombre: row.asesor?.nombre ?? null,
    alianzaNombre: alianzasNombres[0] ?? null,
    alianzasNombres,
  }
}

// ─── Vista ASESOR ────────────────────────────────────────────────────────────
// Solo dispersiones tipoBeneficiario=ASESOR del asesor autenticado.

export async function getComisionesPortalAsesor(userId: string): Promise<DispersionPortal[]> {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'ASESOR' || perfil.asesorIds.length === 0) return []
  const asesorIds = perfil.asesorIds

  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    const rows = await tx
      .select({
        d: dispersiones,
        v: ventasBmcorp,
        c: comisionesCalculadas,
        desarrolloNombre: desarrollos.nombre,
        asesorNombre: asesores.nombre,
        alianzaNombre: afiliados.nombre,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(asesores, eq(dispersiones.asesorId, asesores.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .where(
        and(
          eq(dispersiones.tenantId, perfil.tenantId),
          eq(dispersiones.tipoBeneficiario, 'ASESOR'),
          inArray(dispersiones.asesorId, asesorIds),
          not(eq(dispersiones.estado, 'PENDIENTE')),
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
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA' || perfil.liderIds.length === 0) return []
  const liderIds = perfil.liderIds

  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    // Dispersiones de TODAS las alianzas que lidera (LIDER_SALDO + ASESOR de su red)
    const rows = await tx
      .select({
        d: dispersiones,
        v: ventasBmcorp,
        c: comisionesCalculadas,
        desarrolloNombre: desarrollos.nombre,
        asesorNombre: asesores.nombre,
        alianzaNombre: afiliados.nombre,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(asesores, eq(dispersiones.asesorId, asesores.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .where(
        and(
          eq(dispersiones.tenantId, perfil.tenantId),
          inArray(dispersiones.liderId, liderIds),
          inArray(dispersiones.tipoBeneficiario, ['LIDER_SALDO', 'ASESOR']),
          not(eq(dispersiones.estado, 'PENDIENTE')),
        ),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))
    return rows.map(toDispersionPortal)
  })
}

export async function getAsesoresPortalLider(userId: string) {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA' || perfil.liderIds.length === 0) return []
  const liderIds = perfil.liderIds
  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    return tx
      .select()
      .from(asesores)
      .where(
        and(
          eq(asesores.tenantId, perfil.tenantId),
          inArray(asesores.liderId, liderIds),
          eq(asesores.activo, true),
        ),
      )
  })
}

// ─── Comprobantes (con validación de pertenencia) ────────────────────────────

// ─── Vista completa del líder por venta ─────────────────────────────────────

export interface VentaLiderPortal {
  ventaId: string
  cliente: string
  loteAcciones: string | null
  monto: number
  desarrolloNombre: string | null
  alianzaNombre: string | null
  estadoVenta: string
  fecha: string
  comisionTotal: number
  dispersiones: {
    id: string
    tipoBeneficiario: string
    beneficiarioNombre: string
    montoTotal: number
    montoPagado: number
    estado: string
    fechaPago: string | null
  }[]
}

// Tipos de beneficiario que NO se muestran a líderes/asesores.
// OP_BMCORP y OP_YESYUCAN son comisiones internas de la empresa.
const TIPOS_INTERNOS = ['OP_BMCORP', 'OP_YESYUCAN'] as const

export async function getVentasPortalLider(userId: string): Promise<VentaLiderPortal[]> {
  const perfil = await getPerfilPortal(userId)
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA') return []

  // Usar alianzasIds (ventas de TODA la alianza) no solo liderIds
  // para que el líder vea el panorama completo de su red.
  const alianzasIds = perfil.alianzasIds ?? []
  if (alianzasIds.length === 0 && perfil.liderIds.length === 0) return []

  return db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)

    // Dispersiones hija de las ventas de la alianza del líder
    // Excluye OP (internos) y $0 (no alcanzados por cascada)
    const rows = await tx
      .select({
        v: ventasBmcorp,
        c: comisionesCalculadas,
        d: dispersiones,
        desarrolloNombre: desarrollos.nombre,
        alianzaNombre: afiliados.nombre,
      })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .where(
        and(
          eq(dispersiones.tenantId, perfil.tenantId),
          isNotNull(dispersiones.corteId),
          // Por alianza (no solo por liderId — incluye socios, asesores, etc.)
          alianzasIds.length > 0
            ? inArray(ventasBmcorp.afiliadoId, alianzasIds)
            : inArray(dispersiones.liderId, perfil.liderIds),
          // Excluir comisiones internas de la empresa
          not(inArray(dispersiones.tipoBeneficiario, [...TIPOS_INTERNOS])),
          // Solo dispersiones con monto real
          gt(dispersiones.montoTotal, '0'),
        ),
      )
      .orderBy(desc(ventasBmcorp.fecha), desc(comisionesCalculadas.createdAt))

    // Agrupar por venta
    const ventaMap = new Map<string, VentaLiderPortal>()
    for (const r of rows) {
      const vid = r.v.id
      if (!ventaMap.has(vid)) {
        ventaMap.set(vid, {
          ventaId: vid,
          cliente: r.v.cliente,
          loteAcciones: r.v.loteAcciones,
          monto: Number(r.v.monto),
          desarrolloNombre: r.desarrolloNombre,
          alianzaNombre: r.alianzaNombre,
          estadoVenta: r.v.estadoVenta,
          fecha: r.v.fecha,
          comisionTotal: Number(r.c.comisionBrutaTotal),
          dispersiones: [],
        })
      }
      const venta = ventaMap.get(vid)!
      venta.dispersiones.push({
        id: r.d.id,
        tipoBeneficiario: r.d.tipoBeneficiario,
        beneficiarioNombre: r.d.beneficiarioNombre,
        montoTotal: Number(r.d.montoTotal),
        montoPagado: Number(r.d.montoPagado),
        estado: r.d.estado,
        fechaPago: r.d.fechaPago,
      })
    }

    return Array.from(ventaMap.values())
  })
}

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
        estado: dispersiones.estado,
      })
      .from(dispersiones)
      .where(and(eq(dispersiones.tenantId, perfil.tenantId), eq(dispersiones.id, dispersionId)))
      .limit(1)
    if (!row || row.estado === 'PENDIENTE') return false
    if (perfil.rolPortal === 'ASESOR' && perfil.asesorIds.length > 0) {
      return (
        row.tipoBeneficiario === 'ASESOR' &&
        row.asesorId !== null &&
        perfil.asesorIds.includes(row.asesorId)
      )
    }
    if (perfil.rolPortal === 'LIDER_ALIANZA' && perfil.liderIds.length > 0) {
      return row.liderId !== null && perfil.liderIds.includes(row.liderId)
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
  alianzaNombre: string | null
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
    ventaLoteAcciones: r.v.loteAcciones,
    desarrolloNombre: r.desarrolloNombre,
    tipoProducto: r.c.tipoProducto,
    asesorNombre: r.asesorNombre,
    alianzaNombre: r.alianzaNombre,
  }
}
