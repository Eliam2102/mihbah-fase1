import type { ExcelRowInput } from '@/lib/validations/excel'

// Re-export.types from validation schema
export type { ExcelRowInput, ValidatedRow } from '@/lib/validations/excel'

export const EXPECTED_COLUMNS = [
  'AÑO',
  'MES',
  'FECHA',
  'TIPO',
  'EMPRESA',
  'CATEGORÍA',
  'GRUPO',
  'NOMBRE',
  'CONCEPTO',
  'MONTO',
  'CUENTA',
  'PROYECTO',
  'COMENTARIOS',
] as const

export type ExpectedColumn = (typeof EXPECTED_COLUMNS)[number]

export type ColumnKey =
  | 'anio'
  | 'mes'
  | 'fecha'
  | 'tipo'
  | 'empresa'
  | 'categoria'
  | 'grupo'
  | 'nombre'
  | 'concepto'
  | 'monto'
  | 'cuenta'
  | 'proyecto'
  | 'comentarios'

export type ColumnMapping = Partial<Record<ColumnKey, number>>

export interface ParseResult {
  headers: string[]
  rows: ExcelRowInput[]
  rawRows: unknown[][]
  mapping: ColumnMapping
  sheetName: string
}

export interface ImportSummary {
  uploadId: string
  total: number
  imported: number
  errors: number
  duplicates: number
}

export interface EmpresaRoutingInfo {
  id: string
  nombre: string
  fuenteDatos: 'EXCEL' | 'MONDAY' | 'MANUAL'
}

export interface MaestroImportSummary {
  uploadId: string
  total: number
  imported: number
  errors: number
  duplicates: number
  omitted: number
  porEmpresa: Array<{
    empresaNombre: string
    empresaId: string
    importadas: number
    errores: number
    omitidas: number
    duplicadas: number
  }>
}
