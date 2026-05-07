export interface KpisYcdi {
  totalIngresos: number
  totalEgresos: number
  saldo: number
  prestamos: number
  totalCapitalAportado: number
  totalAcabadoGastar: number
  porcentajeLevantamiento: number
  acuerdosActivos: number
  totalRecaudado: number
  metaTotal: number
  totalAcciones: number
  precioPromedioAccion: number
  cxc: number
  cxp: number
}

export interface FlujomensualYcdi {
  anio: number
  mes: number
  ingresos: number
  egresos: number
  saldo: number
}

export interface IngresadoVsFaltante {
  proyectoId: string
  proyectoNombre: string
  meta: number
  ingresado: number
  faltante: number
  porcentaje: number
}

export interface TablaConceptoProyecto {
  concepto: string
  proyectos: Record<string, number>
  total: number
}
