export interface ProyectoExcel {
  id: string
  name: string
  descripcion: string | null
  activo: boolean
  totalIngresos: number
  totalEgresos: number
  neto: number
  totalMovimientos: number
}

export interface MovimientoProyecto {
  id: string
  fecha: string
  tipo: string
  monto: number
  concepto: string | null
  nombre: string | null
  comentarios: string | null
}

export interface ProyectoDetalle {
  id: string
  name: string
  descripcion: string | null
  activo: boolean
  totalIngresos: number
  totalEgresos: number
  neto: number
  movimientos: MovimientoProyecto[]
}
