export interface PeriodFilter {
  anio?: number
  mes?: number
}

export interface EmpresaResumen {
  empresaId: string
  nombre: string
  tipo: 'CONSTRUCTORA' | 'CAPITAL' | 'COMERCIAL'
  ingresos: number
  egresos: number
  neto: number
  cxc: number
  cxp: number
  parcial?: boolean
}

export interface ResumenGeneral {
  empresas: EmpresaResumen[]
  totalIngresos: number
  totalEgresos: number
  totalNeto: number
  totalCxc: number
  totalCxp: number
  periodo: { anio: number; mes?: number }
}

export interface CorrelacionFlow {
  from: string
  to: string
  concepto: string
  monto: number
  tipo: 'CAPITAL_TO_OBRA' | 'VENTA_TO_CAPITAL' | 'COMISION_TO_OBRA'
}

export interface CuentasConsolidado {
  cxcPorEmpresa: { empresaId: string; nombre: string; total: number; vencidas: number }[]
  cxpPorEmpresa: { empresaId: string; nombre: string; total: number; vencidas: number }[]
  totalCxc: number
  totalCxp: number
  totalCxcVencidas: number
  totalCxpVencidas: number
}

export interface MihbahEstimadoVsAvance {
  empresaId: string | null
  estimadoMes: number
  gastadoMes: number
  porcentajeAvance: number
  sinDatos: boolean
}

export interface ResumenDelResumen {
  ventasBmcorpFinalizadas: number
  comisionGeneradaBmcorp: number
  capitalLevantadoYcdi: number
  capitalPendienteYcdi: number
  hipotesis: string
}
