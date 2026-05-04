import type { KpisMihbah } from './dashboard.service'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SemaforoEstado = 'SALUDABLE' | 'PRECAUCION' | 'EN_RIESGO' | 'CRITICO'

export interface SemaforoResult {
  estado: SemaforoEstado
  label: string
  descripcion: string
  color: string
  bgColor: string
  pulseColor: string
}

export interface SemaforoConfig {
  // colchon mínimo: neto / |egresos| ratio
  colchonSaludable: number // ej. >= 0.3 → saludable
  colchonPrecaucion: number // ej. >= 0.1
  colchonRiesgo: number // ej. >= 0
  // CxP / ingresos ratio crítico
  cxpCritico: number // ej. > 0.8
}

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SemaforoConfig = {
  colchonSaludable: 0.3,
  colchonPrecaucion: 0.1,
  colchonRiesgo: 0,
  cxpCritico: 0.8,
}

const ESTADOS: Record<SemaforoEstado, Omit<SemaforoResult, 'estado'>> = {
  SALUDABLE: {
    label: 'Saludable',
    descripcion: 'El flujo de caja cubre holgadamente los compromisos.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    pulseColor: 'bg-emerald-400',
  },
  PRECAUCION: {
    label: 'Precaución',
    descripcion: 'El colchón financiero es ajustado. Monitorear de cerca.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-400',
    pulseColor: 'bg-amber-300',
  },
  EN_RIESGO: {
    label: 'En riesgo',
    descripcion: 'Los egresos superan o igualan a los ingresos del periodo.',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500',
    pulseColor: 'bg-orange-400',
  },
  CRITICO: {
    label: 'Crítico',
    descripcion: 'Flujo negativo y cuentas por pagar elevadas. Acción inmediata.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-600',
    pulseColor: 'bg-red-500',
  },
}

// ─── Calcular semáforo ────────────────────────────────────────────────────────

export function calcularSemaforo(
  kpis: KpisMihbah,
  config: Partial<SemaforoConfig> = {},
): SemaforoResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const { ingresos, egresos, neto, cxp } = kpis

  // Check CxP crítico first
  const cxpRatio = ingresos > 0 ? cxp / ingresos : cxp > 0 ? 1 : 0
  if (cxpRatio > cfg.cxpCritico && neto < 0) {
    const estado: SemaforoEstado = 'CRITICO'
    return { estado, ...ESTADOS[estado] }
  }

  // Colchon ratio: neto / egresos
  const colchon = egresos > 0 ? neto / egresos : neto >= 0 ? 1 : -1

  let estado: SemaforoEstado
  if (colchon >= cfg.colchonSaludable) estado = 'SALUDABLE'
  else if (colchon >= cfg.colchonPrecaucion) estado = 'PRECAUCION'
  else if (colchon >= cfg.colchonRiesgo) estado = 'EN_RIESGO'
  else estado = 'CRITICO'

  return { estado, ...ESTADOS[estado] }
}

export const SEMAFORO_ORDER: SemaforoEstado[] = ['SALUDABLE', 'PRECAUCION', 'EN_RIESGO', 'CRITICO']
