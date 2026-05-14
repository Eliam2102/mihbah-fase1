export type SemaforoEstado = 'SALUDABLE' | 'PRECAUCION' | 'EN_RIESGO' | 'CRITICO'

export type SubIndicadorEstado = 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS'

export interface SubIndicador {
  estado: SubIndicadorEstado
  label: string
  valor: string | null
}

export interface SemaforoResult {
  estado: SemaforoEstado
  label: string
  descripcion: string
  color: string
  bgColor: string
  pulseColor: string
  subIndicadores: {
    flujoNeto: SubIndicador
    cobranza: SubIndicador
    avanceFisico: SubIndicador
    pipeline: SubIndicador
  }
}
