/**
 * Pautas digitales — compromiso vs ejecutado por líder × mes.
 *
 * - Compromiso lo define el nivel del líder (Jade $15k / Turquesa $10k / Ónix $5k).
 * - Ejecutado lo captura Niq (o quien sea designado) cada mes.
 * - Gap = (ejecutado - comprometido) / comprometido × 100. Negativo = bajo compromiso.
 * - Sin penalización: solo métrica informativa.
 */

import { db } from '@/lib/db'
import { afiliados, lideresAlianza, pautasDigitales } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'

export type PautaRegistro = typeof pautasDigitales.$inferSelect

export interface PautaMes {
  liderId: string
  liderNombre: string
  afiliadoId: string
  alianzaNombre: string
  nivel: 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | null
  montoComprometido: number
  montoEjecutado: number
  porcentajeGap: number | null
  pautaId: string | null
  observaciones: string | null
  // Última captura previa del líder (excluye periodo actual)
  ultimaCaptura: { anio: number; mes: number; ejecutado: number } | null
}

// Compromiso por nivel — doc YESYUCAN v5 §1 y §2
export const COMPROMISO_POR_NIVEL: Record<'JADE' | 'TURQUESA' | 'ONIX_NEGRO', number> = {
  JADE: 15000,
  TURQUESA: 10000,
  ONIX_NEGRO: 5000,
}

function calcularGap(comprometido: number, ejecutado: number): number | null {
  if (comprometido <= 0) return null
  return ((ejecutado - comprometido) / comprometido) * 100
}

// ─── Lista de líderes con su pauta del mes (admin) ──────────────────────────

export async function getPautasDelMes(
  tenantId: string,
  anio: number,
  mes: number,
): Promise<PautaMes[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const lideres = await tx
      .select({
        liderId: lideresAlianza.id,
        liderNombre: lideresAlianza.nombre,
        afiliadoId: lideresAlianza.afiliadoId,
        nivel: lideresAlianza.nivel,
        presupuestoCustom: lideresAlianza.presupuestoPautasMensual,
        alianzaNombre: afiliados.nombre,
      })
      .from(lideresAlianza)
      .innerJoin(afiliados, eq(lideresAlianza.afiliadoId, afiliados.id))
      .where(
        and(
          eq(lideresAlianza.tenantId, tenantId),
          eq(lideresAlianza.activo, true),
          isNull(lideresAlianza.deletedAt),
        ),
      )

    if (lideres.length === 0) return []

    const pautas = await tx
      .select()
      .from(pautasDigitales)
      .where(
        and(
          eq(pautasDigitales.tenantId, tenantId),
          eq(pautasDigitales.anio, anio),
          eq(pautasDigitales.mes, mes),
        ),
      )

    // Última captura previa al periodo actual, por líder
    const periodoActual = anio * 12 + mes
    const ultimasRaw = await tx
      .select({
        liderId: pautasDigitales.liderId,
        anio: pautasDigitales.anio,
        mes: pautasDigitales.mes,
        montoEjecutado: pautasDigitales.montoEjecutado,
      })
      .from(pautasDigitales)
      .where(
        and(
          eq(pautasDigitales.tenantId, tenantId),
          lt(sql`${pautasDigitales.anio} * 12 + ${pautasDigitales.mes}`, periodoActual),
        ),
      )
      .orderBy(desc(sql`${pautasDigitales.anio} * 12 + ${pautasDigitales.mes}`))

    const ultimaPorLider = new Map<string, (typeof ultimasRaw)[number]>()
    for (const u of ultimasRaw) {
      if (!u.liderId) continue
      if (!ultimaPorLider.has(u.liderId)) ultimaPorLider.set(u.liderId, u)
    }

    const pautaPorLider = new Map(pautas.map((p) => [p.liderId, p]))

    return lideres
      .map((l) => {
        const pauta = pautaPorLider.get(l.liderId)
        // Siempre recalcula desde el estado ACTUAL del líder
        // (nivel o presupuesto custom), ignorando el valor histórico
        // guardado en la pauta para evitar que quede desactualizado
        // cuando se edita el líder.
        let comprometido = 0
        if (l.nivel) comprometido = COMPROMISO_POR_NIVEL[l.nivel]
        else if (l.presupuestoCustom !== null && l.presupuestoCustom !== undefined)
          comprometido = Number(l.presupuestoCustom)

        const ejecutado = pauta ? Number(pauta.montoEjecutado) : 0
        const gap = calcularGap(comprometido, ejecutado)

        const ult = ultimaPorLider.get(l.liderId)
        const ultimaCaptura = ult
          ? { anio: ult.anio, mes: ult.mes, ejecutado: Number(ult.montoEjecutado) }
          : null

        return {
          liderId: l.liderId,
          liderNombre: l.liderNombre,
          afiliadoId: l.afiliadoId,
          alianzaNombre: l.alianzaNombre,
          nivel: l.nivel,
          montoComprometido: comprometido,
          montoEjecutado: ejecutado,
          porcentajeGap: gap,
          pautaId: pauta?.id ?? null,
          observaciones: pauta?.observaciones ?? null,
          ultimaCaptura,
        }
      })
      .sort((a, b) =>
        `${a.alianzaNombre} ${a.liderNombre}`.localeCompare(`${b.alianzaNombre} ${b.liderNombre}`),
      )
  })
}

// ─── Upsert pauta de un líder en un mes ─────────────────────────────────────

export interface UpsertPautaInput {
  liderId: string
  anio: number
  mes: number
  montoEjecutado: number
  observaciones?: string | null
}

export async function upsertPautaEjecutada(
  tenantId: string,
  input: UpsertPautaInput,
  userId: string,
): Promise<PautaRegistro> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [lider] = await tx
      .select({
        afiliadoId: lideresAlianza.afiliadoId,
        nivel: lideresAlianza.nivel,
        presupuestoCustom: lideresAlianza.presupuestoPautasMensual,
      })
      .from(lideresAlianza)
      .where(and(eq(lideresAlianza.tenantId, tenantId), eq(lideresAlianza.id, input.liderId)))
      .limit(1)

    if (!lider) throw new Error('Líder no encontrado')
    if (!lider.nivel) {
      throw new Error(
        'El líder no tiene nivel asignado. Asigna nivel en /comisiones/niveles antes de capturar pauta.',
      )
    }

    const comprometido = lider.nivel
      ? COMPROMISO_POR_NIVEL[lider.nivel]
      : Number(lider.presupuestoCustom ?? 0)
    const gap = calcularGap(comprometido, input.montoEjecutado)

    // ¿Existe ya pauta para ese líder/periodo?
    const [existente] = await tx
      .select()
      .from(pautasDigitales)
      .where(
        and(
          eq(pautasDigitales.tenantId, tenantId),
          eq(pautasDigitales.liderId, input.liderId),
          eq(pautasDigitales.anio, input.anio),
          eq(pautasDigitales.mes, input.mes),
        ),
      )
      .limit(1)

    if (existente) {
      const [row] = await tx
        .update(pautasDigitales)
        .set({
          montoEjecutado: input.montoEjecutado.toFixed(2),
          montoComprometido: comprometido.toFixed(2),
          porcentajeGap: gap === null ? null : gap.toFixed(2),
          nivelVigente: lider.nivel,
          observaciones: input.observaciones ?? null,
          capturadoPor: userId,
          updatedAt: new Date(),
        })
        .where(eq(pautasDigitales.id, existente.id))
        .returning()
      return row!
    }

    const [row] = await tx
      .insert(pautasDigitales)
      .values({
        tenantId,
        afiliadoId: lider.afiliadoId,
        liderId: input.liderId,
        anio: input.anio,
        mes: input.mes,
        nivelVigente: lider.nivel,
        montoComprometido: comprometido.toFixed(2),
        montoEjecutado: input.montoEjecutado.toFixed(2),
        porcentajeGap: gap === null ? null : gap.toFixed(2),
        observaciones: input.observaciones ?? null,
        capturadoPor: userId,
      })
      .returning()
    return row!
  })
}

// ─── Pauta actual de un líder (portal externo) ──────────────────────────────

export interface PautaPortal {
  anio: number
  mes: number
  nivel: 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'
  montoComprometido: number
  montoEjecutado: number
  porcentajeGap: number | null
  capturada: boolean
}

export async function getPautaMesActualLider(liderId: string): Promise<PautaPortal | null> {
  // Sin setTenant — userId del portal es la guardia.
  // El llamador (portal) ya verificó perfil.liderId === liderId solicitado.
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1

  const [lider] = await db
    .select({ nivel: lideresAlianza.nivel })
    .from(lideresAlianza)
    .where(eq(lideresAlianza.id, liderId))
    .limit(1)

  if (!lider?.nivel) return null

  const [pauta] = await db
    .select()
    .from(pautasDigitales)
    .where(
      and(
        eq(pautasDigitales.liderId, liderId),
        eq(pautasDigitales.anio, anio),
        eq(pautasDigitales.mes, mes),
      ),
    )
    .limit(1)

  const comprometido = COMPROMISO_POR_NIVEL[lider.nivel]
  if (pauta) {
    return {
      anio,
      mes,
      nivel: lider.nivel,
      // Siempre usa el comprometido calculado desde el nivel ACTUAL,
      // no el valor histórico guardado en la pauta (puede estar stale).
      montoComprometido: comprometido,
      montoEjecutado: Number(pauta.montoEjecutado),
      porcentajeGap: calcularGap(comprometido, Number(pauta.montoEjecutado)),
      capturada: true,
    }
  }

  return {
    anio,
    mes,
    nivel: lider.nivel,
    montoComprometido: comprometido,
    montoEjecutado: 0,
    porcentajeGap: calcularGap(comprometido, 0),
    capturada: false,
  }
}
