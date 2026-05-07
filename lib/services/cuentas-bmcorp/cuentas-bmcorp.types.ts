export interface CuentaPorCobrar {
  id: string
  cliente: string
  desarrollo: string | null
  montoTotal: number
  enganche: number
  saldoPendiente: number
  estadoVenta: string
  fechaApertura: string | null
}

export interface CuentaPorPagarAsesor {
  id: string
  asesor: string | null
  cliente: string
  desarrollo: string | null
  comisionTotal: number
  saldoPendiente: number
  estadoVenta: string
}

export interface CuentasBmcorpData {
  cxc: CuentaPorCobrar[]
  cxpAsesores: CuentaPorPagarAsesor[]
}
