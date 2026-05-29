/**
 * Resuelve, para una venta, el esquema de comisión + matriz alianza × producto
 * que aplican. Es la capa que el servicio de cálculo consume antes de invocar
 * al motor puro.
 *
 * Heurística de tipoProducto desde ventasBmcorp:
 *   - Si loteAcciones o paqueteAccion no son null → ACCION
 *   - En cualquier otro caso → TERRENO
 *
 * El selector NO calcula nada. Solo lee. El motor puro recibe los valores y
 * trabaja sin DB.
 */

import { db } from '@/lib/db'
import { ventasBmcorp, afiliados, lideresAlianza, desarrollos } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'
import {
  getEsquemaActivoPorProducto,
  getMatrizActivo,
  type Esquema,
  type Matriz,
  type TipoProductoStr,
} from './esquemas.service'
import { getNivelDelMes, getMatrizOverride } from './niveles.service'
import type { EsquemaConfig, MatrizConfig } from './calculator'

export interface ResolucionEsquema {
  tipoProducto: TipoProductoStr
  esquema: EsquemaConfig
  matriz: MatrizConfig | null
  liderId: string | null
  liderNombre: string | null
  asesorNombre: string | null
  nivelAplicado: string | null
  ventaRaw: typeof ventasBmcorp.$inferSelect
  esquemaRowId: string
  matrizRowId: string | null
}

/**
 * Determina tipo producto según desarrolladora.
 *
 * Doc YESYUCAN v5:
 *   §1 Aliados del Universo (TERRENO): Grupo ARKA y Grupo RH
 *   §2 Partners YCD (ACCION): Yucandoit — Kooben / Huunal / Tixkokob
 *
 * Sin desarrolladora → fallback TERRENO (heurística + bandera para Joana).
 */
export function detectarTipoProductoPorDesarrolladora(
  desarrolladora: string | null | undefined,
): TipoProductoStr {
  if (!desarrolladora) return 'TERRENO'
  const dev = desarrolladora.toUpperCase().trim()
  // YCD: yucandoit y derivados
  if (
    dev.includes('YUCANDOIT') ||
    dev.includes('KOOBEN') ||
    dev.includes('HUUNAL') ||
    dev.includes('TIXKOKOB') ||
    dev.includes('RENTABILIDAD')
  ) {
    return 'ACCION'
  }
  // Terrenos: Grupo ARKA, Grupo RH y otros
  return 'TERRENO'
}

// Backward-compat — algunas ventas viejas usan loteAcciones como key, pero ya no es heurística primaria
export function detectarTipoProducto(venta: typeof ventasBmcorp.$inferSelect): TipoProductoStr {
  // Si tenemos desarrollo cargado, no aplica aquí (se hace en resolverParaVenta)
  // Fallback antiguo solo si no hay info
  if (venta.loteAcciones || venta.paqueteAccion) return 'ACCION'
  return 'TERRENO'
}

function esquemaRowToConfig(row: Esquema): EsquemaConfig {
  return {
    tipoProducto: row.tipoProducto,
    porcentajeTotalCliente: Number(row.porcentajeTotalCliente),
    porcentajeOpBmcorp: Number(row.porcentajeOpBmcorp),
    porcentajeOpYesyucan: Number(row.porcentajeOpYesyucan),
    porcentajeSocioFijoJorge: Number(row.porcentajeSocioFijoJorge),
    porcentajeSocioFijoKass: Number(row.porcentajeSocioFijoKass),
    porcentajeBolsaComercial: Number(row.porcentajeBolsaComercial),
    porcentajeAsesorEstandar: Number(row.porcentajeAsesorEstandar),
    porcentajeLiderTope: row.porcentajeLiderTope != null ? Number(row.porcentajeLiderTope) : null,
  }
}

function matrizRowToConfig(
  row: Matriz,
  liderNombre: string,
  asesorNombre: string | null,
): MatrizConfig {
  return {
    porcentajeAfiliacion: Number(row.porcentajeAfiliacion),
    porcentajeJorgeBolsa: Number(row.porcentajeJorgeBolsa),
    porcentajeKassBolsa: Number(row.porcentajeKassBolsa),
    porcentajeDianaBolsa: Number(row.porcentajeDianaBolsa),
    reglaEspecial: row.reglaEspecial,
    liderNombre,
    asesorNombre,
    requiereConfig: row.requiereConfig,
  }
}

/**
 * Resuelve esquema + matriz para una venta. Retorna null en venta si no existe.
 * Si la venta no tiene afiliado, matriz queda null (motor retornará sinConfig).
 */
export async function resolverParaVenta(
  tenantId: string,
  ventaId: string,
): Promise<ResolucionEsquema | null> {
  // 1. Cargar venta + desarrollo asociado (para detectar tipo por desarrolladora)
  const ventaConDev = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select({
        venta: ventasBmcorp,
        desarrolladora: desarrollos.desarrolladora,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
      .limit(1)
    return row ?? null
  })
  if (!ventaConDev) return null
  const venta = ventaConDev.venta

  // Tipo producto: override manual > desarrolladora > heurística fallback
  const tipoProducto: TipoProductoStr =
    venta.tipoProductoOverride ??
    (ventaConDev.desarrolladora
      ? detectarTipoProductoPorDesarrolladora(ventaConDev.desarrolladora)
      : detectarTipoProducto(venta))
  const fechaRef = venta.fechaApertura ? new Date(venta.fechaApertura) : new Date()

  // 2. Esquema global activo para ese tipoProducto en la fecha de la venta
  const esquemaRow = await getEsquemaActivoPorProducto(tenantId, tipoProducto, fechaRef)
  if (!esquemaRow) {
    throw new Error(
      `No hay esquema activo de tipo ${tipoProducto} en ${fechaRef.toISOString().split('T')[0]}. ` +
        `Configura los esquemas globales en /comisiones/esquemas.`,
    )
  }

  // 3. Matriz para (afiliadoId, tipoProducto) — opcional, si no hay queda null
  let matrizRow: Matriz | null = null
  let liderNombre: string | null = null
  if (venta.afiliadoId) {
    matrizRow = await getMatrizActivo(tenantId, venta.afiliadoId, tipoProducto)
    if (matrizRow?.liderId) {
      const lider = await db.transaction(async (tx) => {
        await setTenant(tx, tenantId)
        const [row] = await tx
          .select({ nombre: lideresAlianza.nombre })
          .from(lideresAlianza)
          .where(eq(lideresAlianza.id, matrizRow!.liderId!))
          .limit(1)
        return row ?? null
      })
      liderNombre = lider?.nombre ?? null
    }
    // Si la matriz no tiene líder asignado, intentar obtener el nombre del afiliado para mostrar
    if (!liderNombre && matrizRow) {
      const af = await db.transaction(async (tx) => {
        await setTenant(tx, tenantId)
        const [row] = await tx
          .select({ nombre: afiliados.nombre })
          .from(afiliados)
          .where(eq(afiliados.id, venta.afiliadoId!))
          .limit(1)
        return row ?? null
      })
      liderNombre = af?.nombre ?? 'Sin líder asignado'
    }
  }

  // 3b. Bono por nivel: si la alianza alcanzó un nivel ese mes y hay override de
  // matriz configurado, se usa la variante (cambia el reparto de la bolsa, no el
  // total). Config-driven: si no hay override, queda la matriz base.
  let nivelAplicado: string | null = null
  if (matrizRow && venta.afiliadoId && venta.fecha) {
    const nivelMes = await getNivelDelMes(tenantId, venta.afiliadoId, venta.fecha, tipoProducto)
    if (nivelMes) {
      const override = await getMatrizOverride(tenantId, matrizRow.id, nivelMes.nivel)
      if (override) {
        matrizRow = {
          ...matrizRow,
          porcentajeAfiliacion: override.porcentajeAfiliacion,
          porcentajeJorgeBolsa: override.porcentajeJorgeBolsa,
          porcentajeKassBolsa: override.porcentajeKassBolsa,
          porcentajeDianaBolsa: override.porcentajeDianaBolsa,
        }
        nivelAplicado = nivelMes.nivel
      }
    }
  }

  // 4. Nombre del asesor (texto libre desde Monday por ahora; entidad asesor opcional)
  const asesorNombre = venta.asesor ?? null

  const esquema = esquemaRowToConfig(esquemaRow)
  const matriz = matrizRow
    ? matrizRowToConfig(matrizRow, liderNombre ?? 'Líder', asesorNombre)
    : null

  return {
    tipoProducto,
    esquema,
    matriz,
    liderId: matrizRow?.liderId ?? null,
    liderNombre,
    asesorNombre,
    nivelAplicado,
    ventaRaw: venta,
    esquemaRowId: esquemaRow.id,
    matrizRowId: matrizRow?.id ?? null,
  }
}
