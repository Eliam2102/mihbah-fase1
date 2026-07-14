/**
 * Bonos por umbral mensual — función pura de cálculo.
 *
 * Reglas reales (PDFs abril 2026):
 *   • Flamingo (Alberto López): 11% base ARKA+RH + 0.5% bono al cruzar $10M
 *     acumulado mensual entre YCD+ARKA+RH del afiliado.
 *   • Hackers (Diana) F1: 12% base + 0.5% bono al cruzar $10M.
 *   • Hackers (Diana) F2: 1% override TODAS ventas Flamingo + 0.5% bono al
 *     cruzar $10M de Flamingo.
 *
 * Los PDFs tienen ejemplos ambiguos para la fórmula del bono, así que la
 * fórmula es CONFIGURABLE por regla. Joana/Carla la cambian desde UI.
 */

export type GrupoDesarrolladora = 'YCD' | 'ARKA' | 'RH' | 'OTRO'

export type FormulaBono = 'EXCEDENTE' | 'TOTAL_GRUPOS_APLICA' | 'EXCEDENTE_CAP_GRUPOS'

export type TipoFuenteBono = 'PROPIA' | 'OVERRIDE_AFILIADO'

export interface ConfigBonoUmbral {
  tipoFuente: TipoFuenteBono
  /** % override sobre TODAS las ventas del origen. NULL/0 si PROPIA. */
  overridePct: number
  umbralAcumuladoMensual: number
  bonoPct: number
  gruposAcumulan: GrupoDesarrolladora[]
  gruposAplicaBono: GrupoDesarrolladora[]
  formulaCalculo: FormulaBono
}

export interface VentasPorGrupo {
  YCD: number
  ARKA: number
  RH: number
  OTRO: number
}

export interface ResultadoBono {
  totalAcumulado: number
  excedente: number
  ventasGruposAplica: number
  montoOverride: number
  montoBono: number
  montoTotal: number
  cumplioUmbral: boolean
}

const round = (n: number): number => Math.round(n * 100) / 100

function sumarGrupos(ventas: VentasPorGrupo, grupos: GrupoDesarrolladora[]): number {
  return grupos.reduce((s, g) => s + (ventas[g] ?? 0), 0)
}

/**
 * Calcula override + bono para una regla y un set de ventas agregadas por grupo.
 * Función pura — no toca DB, ideal para tests.
 */
export function calcularBonoUmbral(
  ventas: VentasPorGrupo,
  config: ConfigBonoUmbral,
): ResultadoBono {
  const totalAcumulado = round(sumarGrupos(ventas, config.gruposAcumulan))
  const ventasGruposAplica = round(sumarGrupos(ventas, config.gruposAplicaBono))
  const cumplioUmbral = totalAcumulado >= config.umbralAcumuladoMensual
  const excedente = round(Math.max(0, totalAcumulado - config.umbralAcumuladoMensual))

  // Override: % fijo sobre TODAS las ventas del origen (sin condición de umbral).
  // Solo aplica si tipoFuente=OVERRIDE_AFILIADO y overridePct > 0.
  const montoOverride =
    config.tipoFuente === 'OVERRIDE_AFILIADO' && config.overridePct > 0
      ? round((totalAcumulado * config.overridePct) / 100)
      : 0

  // Bono: aplica solo al cruzar umbral. Fórmula depende de config.
  let montoBono = 0
  if (cumplioUmbral && config.bonoPct > 0) {
    let baseBono = 0
    switch (config.formulaCalculo) {
      case 'EXCEDENTE':
        baseBono = excedente
        break
      case 'TOTAL_GRUPOS_APLICA':
        baseBono = ventasGruposAplica
        break
      case 'EXCEDENTE_CAP_GRUPOS':
        baseBono = Math.min(excedente, ventasGruposAplica)
        break
    }
    montoBono = round((baseBono * config.bonoPct) / 100)
  }

  return {
    totalAcumulado,
    excedente,
    ventasGruposAplica,
    montoOverride,
    montoBono,
    montoTotal: round(montoOverride + montoBono),
    cumplioUmbral,
  }
}
