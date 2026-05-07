export interface MovimientoReporte {
  id: string
  fecha: string
  tipo: string
  monto: number
  concepto: string | null
  nombre: string | null
  proyectoNombre: string | null
  comentarios: string | null
}
