export interface SyncStats {
  syncId: string
  creados: number
  actualizados: number
  errores: number
  errorDetails: string[]
  totalItems: number
  boardName: string
  duration: number
}
