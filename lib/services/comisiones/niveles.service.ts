/**
 * Niveles de membresía — config dinámica de umbrales + bono.
 *
 * Reemplaza los umbrales hardcoded por una tabla editable. Dado el promedio
 * mensual de ventas de una alianza y el tipo de producto, devuelve el nivel
 * alcanzado (JADE/TURQUESA/ONIX_NEGRO) y el % de bono.
 */

import { db } from '@/lib/db'
import { nivelesMembresiaConfig, matrizNivelOverride, ventasBmcorp } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

export type NivelConfig = typeof nivelesMembresiaConfig.$inferSelect
export type MatrizOverride = typeof matrizNivelOverride.$inferSelect
export type TipoProductoStr = 'TERRENO' | 'ACCION'
export type NivelStr = 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'

// Valores del doc YESYUCAN v5 (umbrales en MXN/mes, bono %).
const DEFAULTS: Array<{
  nivel: NivelStr
  tipoProducto: TipoProductoStr
  umbralMin: string
  umbralMax: string | null
  porcentajeBono: string
}> = [
  // Terrenos (Aliados del Universo)
  {
    nivel: 'ONIX_NEGRO',
    tipoProducto: 'TERRENO',
    umbralMin: '2000000',
    umbralMax: '3499999.99',
    porcentajeBono: '1',
  },
  {
    nivel: 'TURQUESA',
    tipoProducto: 'TERRENO',
    umbralMin: '3500000',
    umbralMax: '4999999.99',
    porcentajeBono: '2',
  },
  {
    nivel: 'JADE',
    tipoProducto: 'TERRENO',
    umbralMin: '5000000',
    umbralMax: null,
    porcentajeBono: '3',
  },
  // YCD (Partners Yucandoit)
  {
    nivel: 'ONIX_NEGRO',
    tipoProducto: 'ACCION',
    umbralMin: '1000000',
    umbralMax: '1999999.99',
    porcentajeBono: '0.5',
  },
  {
    nivel: 'TURQUESA',
    tipoProducto: 'ACCION',
    umbralMin: '2000000',
    umbralMax: '2999999.99',
    porcentajeBono: '1',
  },
  {
    nivel: 'JADE',
    tipoProducto: 'ACCION',
    umbralMin: '3000000',
    umbralMax: null,
    porcentajeBono: '1.5',
  },
]

export async function getNivelesConfig(tenantId: string): Promise<NivelConfig[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(nivelesMembresiaConfig)
      .where(eq(nivelesMembresiaConfig.tenantId, tenantId))
      .orderBy(asc(nivelesMembresiaConfig.tipoProducto), asc(nivelesMembresiaConfig.umbralMin))
  })
}

/**
 * Crea las 6 filas default si la config está vacía. Idempotente.
 */
export async function seedNivelesDefault(tenantId: string): Promise<number> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const existentes = await tx
      .select({ id: nivelesMembresiaConfig.id })
      .from(nivelesMembresiaConfig)
      .where(eq(nivelesMembresiaConfig.tenantId, tenantId))
    if (existentes.length > 0) return 0
    await tx.insert(nivelesMembresiaConfig).values(DEFAULTS.map((d) => ({ tenantId, ...d })))
    return DEFAULTS.length
  })
}

export async function actualizarNivelConfig(
  tenantId: string,
  id: string,
  data: {
    umbralMin?: number | undefined
    umbralMax?: number | null | undefined
    porcentajeBono?: number | undefined
    activo?: boolean | undefined
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.umbralMin !== undefined) patch.umbralMin = data.umbralMin.toFixed(2)
    if (data.umbralMax !== undefined)
      patch.umbralMax = data.umbralMax === null ? null : data.umbralMax.toFixed(2)
    if (data.porcentajeBono !== undefined) patch.porcentajeBono = data.porcentajeBono.toFixed(2)
    if (data.activo !== undefined) patch.activo = data.activo
    await tx
      .update(nivelesMembresiaConfig)
      .set(patch)
      .where(and(eq(nivelesMembresiaConfig.tenantId, tenantId), eq(nivelesMembresiaConfig.id, id)))
  })
}

/**
 * Dado un promedio mensual y producto, resuelve nivel + bono según la config.
 * Función pura — recibe las filas ya cargadas. Devuelve null si no alcanza
 * ningún umbral (sin nivel, sin bono).
 */
/**
 * Nivel alcanzado por una alianza en el MES de una venta, según sus ventas
 * cerradas (finalizadas) de ese mes vs los umbrales configurados. Joana: el
 * nivel del mes determina qué bono aplica a las ventas cerradas en ese mes.
 */
export async function getNivelDelMes(
  tenantId: string,
  afiliadoId: string,
  fechaRef: string, // YYYY-MM-DD de la venta
  tipoProducto: TipoProductoStr,
): Promise<{ nivel: NivelStr; porcentajeBono: number } | null> {
  const config = await getNivelesConfig(tenantId)
  const [yStr, mStr] = fechaRef.split('-')
  const anio = Number(yStr)
  const mes = Number(mStr)
  if (!anio || !mes) return null

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select({ suma: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text` })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.afiliadoId, afiliadoId),
          inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
          sql`EXTRACT(YEAR FROM ${ventasBmcorp.fecha}) = ${anio}`,
          sql`EXTRACT(MONTH FROM ${ventasBmcorp.fecha}) = ${mes}`,
        ),
      )
    return resolverNivel(Number(row?.suma ?? 0), tipoProducto, config)
  })
}

/** Override de matriz para (matriz base, nivel). Null si no hay variante configurada. */
export async function getMatrizOverride(
  tenantId: string,
  matrizId: string,
  nivel: NivelStr,
): Promise<MatrizOverride | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(matrizNivelOverride)
      .where(
        and(
          eq(matrizNivelOverride.tenantId, tenantId),
          eq(matrizNivelOverride.matrizId, matrizId),
          eq(matrizNivelOverride.nivel, nivel),
          eq(matrizNivelOverride.activo, true),
        ),
      )
      .limit(1)
    return row ?? null
  })
}

export function resolverNivel(
  promedioMensual: number,
  tipoProducto: TipoProductoStr,
  config: NivelConfig[],
): { nivel: NivelStr; porcentajeBono: number } | null {
  const candidatos = config
    .filter((c) => c.tipoProducto === tipoProducto && c.activo)
    .sort((a, b) => Number(b.umbralMin) - Number(a.umbralMin)) // mayor umbral primero
  for (const c of candidatos) {
    const min = Number(c.umbralMin)
    const max = c.umbralMax != null ? Number(c.umbralMax) : Infinity
    if (promedioMensual >= min && promedioMensual <= max) {
      return { nivel: c.nivel as NivelStr, porcentajeBono: Number(c.porcentajeBono) }
    }
  }
  return null
}
