export interface CuentaPendienteExcel {
  id: string
  tipo: 'POR_COBRAR' | 'POR_PAGAR'
  tercero: string
  monto: number
  montoPagado: number
  saldoPendiente: number
  fechaVencimiento: string | null
  descripcion: string | null
  estado: string
  diasVencido: number | null
}

export interface CuentasExcel {
  cxc: CuentaPendienteExcel[]
  cxp: CuentaPendienteExcel[]
  totalCxc: number
  totalCxp: number
}
