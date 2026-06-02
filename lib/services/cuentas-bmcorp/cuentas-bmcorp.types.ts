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

export interface DispersionPendiente {
  id: string
  beneficiarioNombre: string
  tipoBeneficiario: string
  cliente: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  estado: string
}

export interface CuentasBmcorpData {
  cxc: CuentaPorCobrar[]
  cxpAsesores: DispersionPendiente[]
}
