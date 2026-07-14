/**
 * lib/services/_shared/date.helpers.ts
 *
 * Utilidades de fechas compartidas entre todos los servicios.
 * Centraliza labels de meses, cálculo de rangos de período y utilidades
 * de formateo de fechas ISO.
 */

// ─── Labels de meses ─────────────────────────────────────────────────────────

export const MESES_LABEL = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

export type MesLabel = (typeof MESES_LABEL)[number]

// ─── Filtro de período ────────────────────────────────────────────────────────

export interface PeriodFilter {
  anio?: number
  mes?: number
}

export interface DateRange {
  from: string // ISO date YYYY-MM-DD
  to: string // ISO date YYYY-MM-DD
}

/**
 * Calcula el rango de fechas para un filtro de período.
 * Si no se especifica año, usa el año actual.
 * Si se especifica mes, retorna el rango del mes completo.
 * Si solo se especifica año, retorna el año completo (01-01 a 12-31).
 */
export function periodRange(p?: PeriodFilter): DateRange {
  const anio = p?.anio ?? new Date().getFullYear()
  if (p?.mes) {
    const mes = String(p.mes).padStart(2, '0')
    const lastDay = new Date(anio, p.mes, 0).getDate()
    return {
      from: `${anio}-${mes}-01`,
      to: `${anio}-${mes}-${String(lastDay).padStart(2, '0')}`,
    }
  }
  return { from: `${anio}-01-01`, to: `${anio}-12-31` }
}

/**
 * Variante de periodRange que retorna null si no hay año especificado.
 * Útil cuando el rango de fechas es opcional en las queries.
 */
export function periodRangeOrNull(p?: PeriodFilter): DateRange | null {
  if (!p?.anio) return null
  return periodRange(p)
}

/**
 * Construye el rango de fechas para un mes y año específicos.
 * Retorna desde el día 01 hasta el último día del mes.
 */
export function buildMonthRange(anio: number, mes: number): DateRange {
  const lastDay = new Date(anio, mes, 0).getDate()
  const mesStr = String(mes).padStart(2, '0')
  return {
    from: `${anio}-${mesStr}-01`,
    to: `${anio}-${mesStr}-${String(lastDay).padStart(2, '0')}`,
  }
}

/**
 * Retorna la fecha ISO (YYYY-MM-DD) de hoy.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
