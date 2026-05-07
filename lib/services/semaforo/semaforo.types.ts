export type SemaforoEstado = 'SALUDABLE' | 'PRECAUCION' | 'EN_RIESGO' | 'CRITICO'

export interface SemaforoResult {
  estado: SemaforoEstado
  label: string
  descripcion: string
  color: string
  bgColor: string
  pulseColor: string
}

export interface SemaforoConfig {
  colchonSaludable: number
  colchonPrecaucion: number
  colchonRiesgo: number
  cxpCritico: number
}
