export interface KpisMihbah {
  ingresos: number
  egresos: number
  neto: number
  cxc: number
  cxp: number
}

export interface FlujoMensual {
  mes: number
  mesLabel: string
  ingresos: number
  egresos: number
  neto: number
}

export interface AvanceProyecto {
  id: string
  nombre: string
  gastado: number
  ingresos?: number
}
