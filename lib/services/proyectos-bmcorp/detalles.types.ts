export interface DesarrolloDetalle {
  id: string
  nombre: string
  desarrolladora: string | null
  ventasProceso: number
  ventasFinalizadas: number
  ventasCanceladas: number
  montoTotal: number
  comisionesTotal: number
  ventas: VentaDetalle[]
}

export interface VentaDetalle {
  id: string
  cliente: string
  asesor: string | null
  monto: number
  comision: number
  enganche: number
  estadoVenta: string
  fechaApertura: string | null
  lote: string | null
}
