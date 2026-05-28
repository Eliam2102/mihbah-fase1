/**
 * Servicio de esquemas de comisión y matriz alianza × producto.
 *
 * - esquemasComision: 2 plantillas globales (TERRENOS, YCD) según doc YESYUCAN v5.
 * - matrizAlianzaProducto: cómo reparte la bolsa comercial cada alianza
 *   en cada tipo de producto (terreno/acción).
 */

import { db } from '@/lib/db'
import { esquemasComision, matrizAlianzaProducto, matrizNivelOverride } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, asc, eq, isNull, lte, or, gte, sql } from 'drizzle-orm'

export type Esquema = typeof esquemasComision.$inferSelect
export type EsquemaInsert = typeof esquemasComision.$inferInsert
export type Matriz = typeof matrizAlianzaProducto.$inferSelect
export type MatrizInsert = typeof matrizAlianzaProducto.$inferInsert
export type NivelOverride = typeof matrizNivelOverride.$inferSelect
export type NivelStr = 'ONIX_NEGRO' | 'TURQUESA' | 'JADE'

export type TipoProductoStr = 'TERRENO' | 'ACCION'

// ─── Esquemas globales ───────────────────────────────────────────────────────

export async function getEsquemas(tenantId: string): Promise<Esquema[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(esquemasComision)
      .where(and(eq(esquemasComision.tenantId, tenantId), isNull(esquemasComision.deletedAt)))
      .orderBy(asc(esquemasComision.tipoProducto))
  })
}

export async function getEsquemaActivoPorProducto(
  tenantId: string,
  tipoProducto: TipoProductoStr,
  fecha: Date = new Date(),
): Promise<Esquema | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const fechaStr = fecha.toISOString().slice(0, 10)
    const [row] = await tx
      .select()
      .from(esquemasComision)
      .where(
        and(
          eq(esquemasComision.tenantId, tenantId),
          eq(esquemasComision.tipoProducto, tipoProducto),
          eq(esquemasComision.activo, true),
          isNull(esquemasComision.deletedAt),
          lte(esquemasComision.fechaInicio, fechaStr),
          or(isNull(esquemasComision.fechaFin), gte(esquemasComision.fechaFin, fechaStr)),
        ),
      )
      .orderBy(sql`${esquemasComision.fechaInicio} DESC`)
      .limit(1)
    return row ?? null
  })
}

export async function getEsquemaById(tenantId: string, id: string): Promise<Esquema | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(esquemasComision)
      .where(and(eq(esquemasComision.tenantId, tenantId), eq(esquemasComision.id, id)))
      .limit(1)
    return row ?? null
  })
}

export async function crearEsquema(
  tenantId: string,
  data: Omit<EsquemaInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<Esquema> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(esquemasComision)
      .values({ ...data, tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return row
  })
}

export async function actualizarEsquema(
  tenantId: string,
  id: string,
  data: Partial<Omit<EsquemaInsert, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(esquemasComision)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(esquemasComision.tenantId, tenantId), eq(esquemasComision.id, id)))
  })
}

export async function desactivarEsquema(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(esquemasComision)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(esquemasComision.tenantId, tenantId), eq(esquemasComision.id, id)))
  })
}

// ─── Matriz Alianza × Producto ───────────────────────────────────────────────

export async function getMatrizPorAfiliado(
  tenantId: string,
  afiliadoId: string,
): Promise<Matriz[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(matrizAlianzaProducto)
      .where(
        and(
          eq(matrizAlianzaProducto.tenantId, tenantId),
          eq(matrizAlianzaProducto.afiliadoId, afiliadoId),
          isNull(matrizAlianzaProducto.deletedAt),
        ),
      )
      .orderBy(asc(matrizAlianzaProducto.tipoProducto))
  })
}

export async function getMatrizActivo(
  tenantId: string,
  afiliadoId: string,
  tipoProducto: TipoProductoStr,
): Promise<Matriz | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(matrizAlianzaProducto)
      .where(
        and(
          eq(matrizAlianzaProducto.tenantId, tenantId),
          eq(matrizAlianzaProducto.afiliadoId, afiliadoId),
          eq(matrizAlianzaProducto.tipoProducto, tipoProducto),
          eq(matrizAlianzaProducto.activo, true),
          isNull(matrizAlianzaProducto.deletedAt),
        ),
      )
      .limit(1)
    return row ?? null
  })
}

export async function getMatrizById(tenantId: string, id: string): Promise<Matriz | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(matrizAlianzaProducto)
      .where(and(eq(matrizAlianzaProducto.tenantId, tenantId), eq(matrizAlianzaProducto.id, id)))
      .limit(1)
    return row ?? null
  })
}

export async function crearMatriz(
  tenantId: string,
  data: Omit<MatrizInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<Matriz> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(matrizAlianzaProducto)
      .values({ ...data, tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return row
  })
}

export async function actualizarMatriz(
  tenantId: string,
  id: string,
  data: Partial<Omit<MatrizInsert, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(matrizAlianzaProducto)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(matrizAlianzaProducto.tenantId, tenantId), eq(matrizAlianzaProducto.id, id)))
  })
}

export async function desactivarMatriz(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(matrizAlianzaProducto)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(matrizAlianzaProducto.tenantId, tenantId), eq(matrizAlianzaProducto.id, id)))
  })
}

// ─── Nivel Override (bono por meta) ──────────────────────────────────────────

export async function getNivelOverrides(
  tenantId: string,
  matrizId: string,
): Promise<NivelOverride[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(matrizNivelOverride)
      .where(
        and(eq(matrizNivelOverride.tenantId, tenantId), eq(matrizNivelOverride.matrizId, matrizId)),
      )
      .orderBy(matrizNivelOverride.nivel)
  })
}

export interface NivelOverrideInput {
  porcentajeAfiliacion: number
  porcentajeJorgeBolsa: number
  porcentajeKassBolsa: number
  porcentajeDianaBolsa: number
}

export async function upsertNivelOverride(
  tenantId: string,
  matrizId: string,
  nivel: NivelStr,
  input: NivelOverrideInput,
): Promise<NivelOverride> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(matrizNivelOverride)
      .values({
        tenantId,
        matrizId,
        nivel,
        porcentajeAfiliacion: input.porcentajeAfiliacion.toFixed(2),
        porcentajeJorgeBolsa: input.porcentajeJorgeBolsa.toFixed(2),
        porcentajeKassBolsa: input.porcentajeKassBolsa.toFixed(2),
        porcentajeDianaBolsa: input.porcentajeDianaBolsa.toFixed(2),
      })
      .onConflictDoUpdate({
        target: [
          matrizNivelOverride.tenantId,
          matrizNivelOverride.matrizId,
          matrizNivelOverride.nivel,
        ],
        set: {
          porcentajeAfiliacion: input.porcentajeAfiliacion.toFixed(2),
          porcentajeJorgeBolsa: input.porcentajeJorgeBolsa.toFixed(2),
          porcentajeKassBolsa: input.porcentajeKassBolsa.toFixed(2),
          porcentajeDianaBolsa: input.porcentajeDianaBolsa.toFixed(2),
          updatedAt: new Date(),
        },
      })
      .returning()
    if (!row) throw new Error('No se pudo guardar el override de nivel')
    return row
  })
}

export async function eliminarNivelOverride(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .delete(matrizNivelOverride)
      .where(and(eq(matrizNivelOverride.tenantId, tenantId), eq(matrizNivelOverride.id, id)))
  })
}
