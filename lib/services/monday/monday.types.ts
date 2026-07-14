export interface SyncStats {
  syncId: string
  creados: number
  actualizados: number
  errores: number
  errorDetails: string[]
  totalItems: number
  boardName: string
  duration: number
  // Cuántas ventas Monday-sync mantuvo sus campos editables intactos
  // porque fueron editadas previamente en el sistema (conflict resolution).
  preservadasPorEdicion: number
}
