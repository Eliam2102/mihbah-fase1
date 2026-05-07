export interface VentaReporteItem {
  id: string
  cliente: string
  afiliado: string | null
  desarrollo: string | null
  asesor: string | null
  monto: number
  enganche: number
  comision: number
  estadoVenta: string
  fechaApertura: string | null
  fechaCierre: string | null
  lote: string | null
  paquete: string | null
}
