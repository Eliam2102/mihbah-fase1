import ExcelJS from 'exceljs'
import type { ExcelRowInput } from '@/lib/validations/excel'
import type { ColumnMapping, ParseResult } from './excel.types'
import { detectColumns, unwrapCell, COLUMN_ALIASES } from './excel.helpers'

/**
 * Parses an Excel file buffer.
 * Priority: 'BASE' sheet first, then explicit sheetName, then first sheet.
 */
export async function parseExcelFile(
  buffer: ArrayBuffer | Buffer,
  customMapping?: ColumnMapping,
  sheetName?: string,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)

  const sheet =
    workbook.worksheets.find((s) => s.name.toUpperCase() === 'BASE') ??
    (sheetName ? workbook.worksheets.find((s) => s.name === sheetName) : undefined) ??
    workbook.worksheets[0]

  if (!sheet) throw new Error('Excel sin hojas')

  const rawRows: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]
    rawRows.push(values.slice(1))
  })

  if (rawRows.length === 0) throw new Error('Excel vacío')

  let bestHeaderIdx = 0
  let bestMapping: ColumnMapping = {}
  let maxMatches = -1

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const candidateHeaders = (rawRows[i] ?? []).map((c) => (c == null ? '' : String(c)))
    const mapping = detectColumns(candidateHeaders)
    const matches = Object.keys(mapping).length
    if (matches > maxMatches) {
      maxMatches = matches
      bestHeaderIdx = i
      bestMapping = mapping
    }
  }

  const headers = (rawRows[bestHeaderIdx] ?? []).map((c) => (c == null ? '' : String(c)))
  const mapping = customMapping ?? bestMapping

  const dataRows = rawRows.slice(bestHeaderIdx + 1)
  const rows: ExcelRowInput[] = dataRows.map((row) => mapRowToInput(row, mapping))

  return { headers, rows, rawRows: dataRows, mapping, sheetName: sheet.name }
}

/** Returns the list of sheet names from a workbook buffer. */
export async function getSheetNames(buffer: ArrayBuffer | Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)
  return workbook.worksheets.map((s) => s.name)
}

function mapRowToInput(
  row: unknown[],
  mapping: ColumnMapping,
): ExcelRowInput & { _empresa: string | undefined } {
  const get = (key: keyof typeof COLUMN_ALIASES) => {
    const idx = mapping[key as keyof ColumnMapping]
    const val = idx === undefined ? undefined : row[idx]
    return unwrapCell(val)
  }

  let anio = get('anio')
  let mes = get('mes')
  const fecha = get('fecha')

  if (fecha) {
    const d = new Date(fecha as string)
    if (!isNaN(d.getTime())) {
      anio = d.getUTCFullYear()
      mes = d.getUTCMonth() + 1
    }
  }

  const rawEmpresa = get('empresa')
  const empresaStr = rawEmpresa != null ? String(rawEmpresa).trim().toUpperCase() : undefined

  return {
    anio,
    mes,
    fecha,
    tipo:
      typeof get('tipo') === 'string' ? (get('tipo') as string).toUpperCase().trim() : get('tipo'),
    categoria: get('categoria'),
    grupo: get('grupo'),
    nombre: get('nombre'),
    concepto: get('concepto'),
    monto: get('monto'),
    cuenta: get('cuenta'),
    proyecto: get('proyecto'),
    comentarios: get('comentarios'),
    _empresa: empresaStr ?? undefined,
  }
}
