import type { ColumnKey, ColumnMapping } from './excel.types'

export const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  anio: ['año', 'anio', 'ano', 'year'],
  mes: ['mes', 'month'],
  fecha: ['fecha', 'date'],
  tipo: ['tipo', 'type'],
  empresa: ['empresa', 'company', 'compañia', 'entidad'],
  categoria: ['categoría', 'categoria', 'category'],
  grupo: ['grupo', 'group'],
  nombre: ['nombre', 'name'],
  concepto: ['concepto', 'concept', 'descripción', 'descripcion'],
  monto: ['monto', 'amount', 'importe', 'cantidad'],
  cuenta: ['cuenta', 'account', 'banco'],
  proyecto: ['proyecto', 'project', 'obra'],
  comentarios: ['comentarios', 'comments', 'observaciones', 'notas'],
}

/** Normalizes a string: lowercase, remove accents, trim. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Detects column positions automatically from header row. */
export function detectColumns(headerRow: (string | null | undefined)[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i]
    if (!cell) continue
    const norm = normalize(String(cell))
    for (const key of Object.keys(COLUMN_ALIASES) as ColumnKey[]) {
      if (mapping[key] !== undefined) continue
      if (
        COLUMN_ALIASES[key].some(
          (alias) => norm === normalize(alias) || norm.includes(normalize(alias)),
        )
      ) {
        mapping[key] = i
        break
      }
    }
  }
  return mapping
}

/** Unwraps ExcelJS cell values (formulas, richText, errors). */
export function unwrapCell(val: unknown): unknown {
  while (val && typeof val === 'object' && !(val instanceof Date)) {
    if ('result' in val) val = (val as Record<string, unknown>).result
    else if ('richText' in val)
      val = (val as { richText: Array<{ text: string }> }).richText.map((rt) => rt.text).join('')
    else if ('text' in val) val = (val as Record<string, unknown>).text
    else if ('error' in val) val = String((val as Record<string, unknown>).error)
    else break
  }
  return val
}
