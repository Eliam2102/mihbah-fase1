/**
 * Cascada de prioridad para repartir lo que paga el cliente entre beneficiarios.
 *
 * Master YESYUCAN v5 §4 + ejemplos de Joana: lo abonado por el cliente se reparte
 * llenando beneficiarios POR ORDEN DE PRIORIDAD (tiers). Cuando un tier no se
 * cubre completo, lo disponible se reparte PROPORCIONAL al peso de cada línea
 * dentro de ese tier (no secuencial). Lo que no alcanza queda diferido al
 * siguiente abono.
 *
 * Orden de tiers (modelo consolidado — se paga al líder, que dispersa interno):
 *   1. Comisión operativa (BM Corp + YESYUCAN)
 *   2. Saldo del líder / asesor (afiliación)
 *   3. Socios de bolsa (Jorge / Kass / Diana)
 *   4. Socios fijos (solo terrenos)
 */

export type TipoBeneficiarioCascada =
  | 'OP_BMCORP'
  | 'OP_YESYUCAN'
  | 'ASESOR'
  | 'LIDER_SALDO'
  | 'SOCIO_BOLSA_JORGE'
  | 'SOCIO_BOLSA_KASS'
  | 'SOCIO_BOLSA_DIANA'
  | 'SOCIO_FIJO_JORGE'
  | 'SOCIO_FIJO_KASS'

const TIER: Record<TipoBeneficiarioCascada, number> = {
  OP_BMCORP: 1,
  OP_YESYUCAN: 1,
  ASESOR: 2,
  LIDER_SALDO: 2,
  SOCIO_BOLSA_JORGE: 3,
  SOCIO_BOLSA_KASS: 3,
  SOCIO_BOLSA_DIANA: 3,
  SOCIO_FIJO_JORGE: 4,
  SOCIO_FIJO_KASS: 4,
}

export interface LineaCascada {
  id: string
  tipoBeneficiario: TipoBeneficiarioCascada
  montoTotal: number
}

const round = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Reparte `restoDisponible` entre las líneas siguiendo la cascada de prioridad.
 * Devuelve cuánto le toca a cada línea (Map por id). La suma de los montos
 * asignados = min(restoDisponible, suma de montoTotal de todas las líneas).
 */
export function repartirCascada(
  lineas: LineaCascada[],
  restoDisponible: number,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of lineas) out.set(l.id, 0)

  let restante = round(Math.max(0, restoDisponible))
  const tiers = [...new Set(lineas.map((l) => TIER[l.tipoBeneficiario]))].sort((a, b) => a - b)

  for (const t of tiers) {
    if (restante <= 0) break
    const grupo = lineas.filter((l) => TIER[l.tipoBeneficiario] === t)
    const totalGrupo = round(grupo.reduce((s, l) => s + l.montoTotal, 0))
    if (totalGrupo <= 0) continue

    if (restante >= totalGrupo) {
      // Alcanza para todo el tier
      for (const l of grupo) out.set(l.id, round(l.montoTotal))
      restante = round(restante - totalGrupo)
    } else {
      // Parcial: proporcional al peso de cada línea dentro del tier
      for (const l of grupo) {
        out.set(l.id, round((restante * l.montoTotal) / totalGrupo))
      }
      restante = 0
    }
  }

  return out
}

/**
 * Dispersión de un abono concreto = cascada(pagado acumulado nuevo) − cascada(pagado
 * acumulado previo). Así cada corte paga solo lo que se libera con ESE abono, y la
 * prioridad continúa donde quedó el abono anterior.
 */
export function deltaCascadaAbono(
  lineas: LineaCascada[],
  restoAcumuladoPrevio: number,
  restoAcumuladoNuevo: number,
): Map<string, number> {
  const fillPrevio = repartirCascada(lineas, restoAcumuladoPrevio)
  const fillNuevo = repartirCascada(lineas, restoAcumuladoNuevo)
  const delta = new Map<string, number>()
  for (const l of lineas) {
    delta.set(l.id, round((fillNuevo.get(l.id) ?? 0) - (fillPrevio.get(l.id) ?? 0)))
  }
  return delta
}
