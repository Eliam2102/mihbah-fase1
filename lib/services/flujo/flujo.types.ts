export interface FlujoMes {
  anio: number
  mes: number
  mesLabel: string
  ingresos: number
  egresos: number
  neto: number
  acumulado: number
}

export interface FlujoTrimestre {
  anio: number
  trimestre: number
  label: string
  ingresos: number
  egresos: number
  neto: number
}

export interface MovimientoDetalle {
  id: string
  fecha: string
  tipo: string
  monto: number
  concepto: string | null
  nombre: string | null
  comentarios: string | null
}
