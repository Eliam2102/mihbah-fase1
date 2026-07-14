export interface PeriodFilter {
  anio?: number
  mes?: number
}

export interface BmcorpKpis {
  totalVendido: number
  totalVentas: number
  enProceso: { count: number; monto: number }
  aprobadoJuridico: { count: number; monto: number }
  finalizada: { count: number; monto: number }
  cancelada: { count: number; monto: number }
}

export interface RankingItem {
  id: string
  nombre: string
  monto: number
  ventas: number
  desarrolladora?: string | null
}

export interface FlujoSemana {
  semana: string // ISO week start (YYYY-MM-DD)
  ingresos: number // ventas con fechaCierre confirmada
  ingresosProyectados: number // ventas abiertas sin fechaCierre (por fechaApertura)
  egresos: number
  neto: number
}

export interface RepartosKpi {
  totalRealizado: number
  cantidadRealizados: number
  ultimoReparto: string | null
}

export interface RemanenteItem {
  afiliadoId: string
  nombre: string
  vendido: number
  vendidoPeriodo: number
  repartos: number
  remanente: number
}

export interface UltimaSyncInfo {
  fecha: string | null
  creados: number
  actualizados: number
  errores: number
  stale: boolean
}

export interface RepartosSplit {
  realizado: { count: number; monto: number }
  parcial: { count: number; monto: number }
  pendiente: { count: number; monto: number }
  totalMonto: number
  ultimoReparto: string | null
  sinDatos: boolean
}

export interface ComisionamientoConciliado {
  totalGenerado: number
  pagado: number
  parcial: number
  pendiente: number
  porcentajeConciliado: number
  sinDatos: boolean
}
