import ExcelJS from 'exceljs'
import { db } from '@/lib/db'
import { excelUploads, excelUploadSummaries, movimientos } from '@/lib/db/schema'
import { excelRowSchema, type ExcelRowInput, type ValidatedRow } from '@/lib/validations/excel'
import { and, eq, sql, inArray } from 'drizzle-orm'

// ─── Column detection ───────────────────────────────────────────────────────

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

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
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

function normalize(s: string): string {
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

// ─── Parse ──────────────────────────────────────────────────────────────────

export interface ParseResult {
  headers: string[]
  rows: ExcelRowInput[]
  rawRows: unknown[][]
  mapping: ColumnMapping
  sheetName: string
}

export async function parseExcelFile(
  buffer: ArrayBuffer | Buffer,
  customMapping?: ColumnMapping,
  sheetName?: string,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)

  // Priority: look for 'BASE' sheet first, then use sheetName param, then fallback to first sheet
  const sheet =
    workbook.worksheets.find((s) => s.name.toUpperCase() === 'BASE') ??
    (sheetName ? workbook.worksheets.find((s) => s.name === sheetName) : undefined) ??
    workbook.worksheets[0]

  if (!sheet) throw new Error('Excel sin hojas')

  const rawRows: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]
    // ExcelJS row.values is 1-indexed; drop the [0] slot
    rawRows.push(values.slice(1))
  })

  if (rawRows.length === 0) throw new Error('Excel vacío')

  // Scan first 10 rows to find the one with the most column matches
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

function unwrapCell(val: unknown): unknown {
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

function mapRowToInput(
  row: unknown[],
  mapping: ColumnMapping,
): ExcelRowInput & { _empresa: string | undefined } {
  const get = (key: ColumnKey) => {
    const idx = mapping[key]
    const val = idx === undefined ? undefined : row[idx]
    return unwrapCell(val)
  }

  let anio = get('anio')
  let mes = get('mes')
  const fecha = get('fecha')

  // Auto-completar o sobreescribir año y mes si tenemos una fecha válida
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

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateRow(input: ExcelRowInput, rowNumber: number): ValidatedRow {
  const result = excelRowSchema.safeParse(input)
  if (result.success) {
    return { rowNumber, raw: input, data: result.data, errors: [], isDuplicate: false }
  }
  const errors = result.error.errors.map((e) => `${e.path.join('.') || 'campo'}: ${e.message}`)
  return { rowNumber, raw: input, errors, isDuplicate: false }
}

// ─── Duplicate detection ────────────────────────────────────────────────────

/** Marks rows as duplicate when (empresa, fecha, monto, concepto, anio, mes) already exists in DB. */
export async function detectDuplicates(
  rows: ValidatedRow[],
  empresaId: string,
  tenantId: string,
): Promise<ValidatedRow[]> {
  if (rows.length === 0) return rows

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    const valid = rows.filter((r) => r.data)
    if (valid.length === 0) return rows

    const existing = await tx
      .select({
        fecha: movimientos.fecha,
        monto: movimientos.monto,
        concepto: movimientos.concepto,
        anio: movimientos.anio,
        mes: movimientos.mes,
      })
      .from(movimientos)
      .where(eq(movimientos.empresaId, empresaId))

    const keys = new Set(
      existing.map(
        (e) => `${e.fecha}|${e.monto}|${e.concepto ?? ''}|${e.anio ?? ''}|${e.mes ?? ''}`,
      ),
    )

    return rows.map((r) => {
      if (!r.data) return r
      const fechaIso = r.data.fecha.toISOString().slice(0, 10)
      const k = `${fechaIso}|${r.data.monto.toFixed(2)}|${r.data.concepto}|${r.data.anio}|${r.data.mes}`
      return { ...r, isDuplicate: keys.has(k) }
    })
  })
}

// ─── Multi-empresa duplicate detection ──────────────────────────────────────

export async function detectDuplicatesMulti(
  rows: ValidatedRow[],
  empresaIds: string[],
  tenantId: string,
): Promise<ValidatedRow[]> {
  if (rows.length === 0 || empresaIds.length === 0) return rows

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    const valid = rows.filter((r) => r.data)
    if (valid.length === 0) return rows

    const existing = await tx
      .select({
        empresaId: movimientos.empresaId,
        fecha: movimientos.fecha,
        monto: movimientos.monto,
        concepto: movimientos.concepto,
        anio: movimientos.anio,
        mes: movimientos.mes,
      })
      .from(movimientos)
      .where(inArray(movimientos.empresaId, empresaIds))

    const keys = new Set(
      existing.map(
        (e) =>
          `${e.empresaId}|${e.fecha}|${e.monto}|${e.concepto ?? ''}|${e.anio ?? ''}|${e.mes ?? ''}`,
      ),
    )

    return rows.map((r) => {
      if (!r.data) return r
      const raw = r.raw as ExcelRowInput & { _empresaId?: string }
      const eId = raw._empresaId ?? ''
      const fechaIso = r.data.fecha.toISOString().slice(0, 10)
      const k = `${eId}|${fechaIso}|${r.data.monto.toFixed(2)}|${r.data.concepto}|${r.data.anio}|${r.data.mes}`
      return { ...r, isDuplicate: keys.has(k) }
    })
  })
}

// ─── Import (single empresa — legacy) ────────────────────────────────────────

export interface ImportSummary {
  uploadId: string
  total: number
  imported: number
  errors: number
  duplicates: number
}

export async function importMovimientos(
  rows: ValidatedRow[],
  params: {
    empresaId: string
    tenantId: string
    userId: string
    filename: string
    fileSize?: number
  },
): Promise<ImportSummary> {
  const validRows = rows.filter((r) => r.data && !r.isDuplicate)
  const errorCount = rows.filter((r) => r.errors.length > 0).length
  const dupCount = rows.filter((r) => r.isDuplicate).length

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${params.tenantId}, true)`)

    const [upload] = await tx
      .insert(excelUploads)
      .values({
        tenantId: params.tenantId,
        empresaId: params.empresaId,
        userId: params.userId,
        filename: params.filename,
        fileSize: params.fileSize?.toString() ?? null,
        totalRows: rows.length.toString(),
        validRows: validRows.length.toString(),
        errorRows: errorCount.toString(),
        duplicateRows: dupCount.toString(),
        importedRows: '0',
        omittedRows: '0',
        estado: 'PROCESANDO',
      })
      .returning({ id: excelUploads.id })

    const uploadId = upload!.id

    let imported = 0
    if (validRows.length > 0) {
      const BATCH_SIZE = 1000
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE)
        await tx.insert(movimientos).values(
          batch.map((r) => {
            const d = r.data!
            return {
              tenantId: params.tenantId,
              empresaId: params.empresaId,
              fecha: d.fecha.toISOString().slice(0, 10),
              anio: d.anio.toString(),
              mes: d.mes.toString(),
              tipo: mapTipoToEnum(d.tipo),
              monto: d.monto.toFixed(2),
              nombre: d.nombre ?? null,
              concepto: d.concepto,
              comentarios: d.comentarios ?? null,
              descripcion: d.concepto,
              uploadId,
            }
          }),
        )
      }
      imported = validRows.length
    }

    await tx
      .update(excelUploads)
      .set({
        importedRows: imported.toString(),
        estado: 'COMPLETADO',
        updatedAt: new Date(),
      })
      .where(and(eq(excelUploads.id, uploadId), eq(excelUploads.tenantId, params.tenantId)))

    return {
      uploadId,
      total: rows.length,
      imported,
      errors: errorCount,
      duplicates: dupCount,
    }
  })
}

// ─── Import Maestro (multi-empresa desde archivo MK1) ───────────────────────

/**
 * BM CORP_LABEL — valor que aparece en la columna EMPRESA del Excel maestro
 * que debe ser silenciosamente omitido (sus datos vienen de Monday.com).
 */
const FUENTE_MONDAY_LABEL = 'BM CORP'

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

/**
 * Importa un archivo Excel maestro (MK1) que contiene filas de múltiples empresas.
 * - Lee columna EMPRESA para rutear cada fila
 * - Ignora BM CORP (fuente = MONDAY)
 * - Inserta movimientos para MIHBAH y YCDI
 * - Genera resumen por empresa
 */
export async function importMaestro(
  rows: Array<ValidatedRow & { _empresa: string | undefined }>,
  params: {
    tenantId: string
    userId: string
    filename: string
    fileSize?: number
    empresaRouting: EmpresaRoutingInfo[]
  },
): Promise<MaestroImportSummary> {
  const { tenantId, userId, filename, fileSize, empresaRouting } = params

  // Build lookup: empresa nombre (uppercase) → routing info
  const routingMap = new Map<string, EmpresaRoutingInfo>()
  for (const emp of empresaRouting) {
    routingMap.set(emp.nombre.toUpperCase().trim(), emp)
  }

  // Classify rows
  interface RowBucket {
    rows: ValidatedRow[]
    info: EmpresaRoutingInfo
  }
  const buckets = new Map<string, RowBucket>()
  let omittedCount = 0
  let errorCount = 0

  for (const row of rows) {
    const empresaLabel = row._empresa ?? ''

    // Skip BM CORP silently
    if (empresaLabel === FUENTE_MONDAY_LABEL || empresaLabel.startsWith('BM')) {
      omittedCount++
      continue
    }

    // Error rows are counted but not routed
    if (row.errors.length > 0) {
      errorCount++
      continue
    }

    const routing = routingMap.get(empresaLabel)
    if (!routing) {
      // Unknown company — mark as error
      errorCount++
      continue
    }

    // Skip MONDAY-source companies silently
    if (routing.fuenteDatos === 'MONDAY') {
      omittedCount++
      continue
    }

    if (!buckets.has(routing.id)) {
      buckets.set(routing.id, { rows: [], info: routing })
    }
    buckets.get(routing.id)!.rows.push(row)
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)

    // Create master upload record (no specific empresaId)
    const [upload] = await tx
      .insert(excelUploads)
      .values({
        tenantId,
        empresaId: null,
        userId,
        filename,
        fileSize: fileSize?.toString() ?? null,
        totalRows: rows.length.toString(),
        validRows: '0', // will update
        errorRows: errorCount.toString(),
        duplicateRows: '0', // will update
        importedRows: '0', // will update
        omittedRows: omittedCount.toString(),
        estado: 'PROCESANDO',
      })
      .returning({ id: excelUploads.id })

    const uploadId = upload!.id

    let totalImported = 0
    let totalDuplicates = 0
    const porEmpresa: MaestroImportSummary['porEmpresa'] = []

    // Insert per-company
    for (const [empresaId, bucket] of buckets) {
      const { rows: empRows, info } = bucket

      // Detect duplicates for this company
      const existingMov = await tx
        .select({
          fecha: movimientos.fecha,
          monto: movimientos.monto,
          concepto: movimientos.concepto,
          anio: movimientos.anio,
          mes: movimientos.mes,
        })
        .from(movimientos)
        .where(eq(movimientos.empresaId, empresaId))

      const existingKeys = new Set(
        existingMov.map(
          (e) => `${e.fecha}|${e.monto}|${e.concepto ?? ''}|${e.anio ?? ''}|${e.mes ?? ''}`,
        ),
      )

      const toInsert = empRows.filter((r) => {
        if (!r.data) return false
        const fechaIso = r.data.fecha.toISOString().slice(0, 10)
        const k = `${fechaIso}|${r.data.monto.toFixed(2)}|${r.data.concepto}|${r.data.anio}|${r.data.mes}`
        return !existingKeys.has(k)
      })

      const dupCount = empRows.length - toInsert.length

      // Batch insert
      const BATCH_SIZE = 1000
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE)
        await tx.insert(movimientos).values(
          batch.map((r) => {
            const d = r.data!
            return {
              tenantId,
              empresaId,
              fecha: d.fecha.toISOString().slice(0, 10),
              anio: d.anio.toString(),
              mes: d.mes.toString(),
              tipo: mapTipoToEnum(d.tipo),
              monto: d.monto.toFixed(2),
              nombre: d.nombre ?? null,
              concepto: d.concepto,
              comentarios: d.comentarios ?? null,
              descripcion: d.concepto,
              uploadId,
            }
          }),
        )
      }

      // Insert per-company summary
      await tx.insert(excelUploadSummaries).values({
        uploadId,
        empresaId,
        empresaNombre: info.nombre,
        filasImportadas: toInsert.length.toString(),
        filasError: '0',
        filasOmitidas: dupCount.toString(),
      })

      totalImported += toInsert.length
      totalDuplicates += dupCount

      porEmpresa.push({
        empresaNombre: info.nombre,
        empresaId,
        importadas: toInsert.length,
        errores: 0,
        omitidas: 0,
        duplicadas: dupCount,
      })
    }

    // Add BM CORP omitted to summary for display
    const bmCorpLabel = FUENTE_MONDAY_LABEL
    if (omittedCount > 0) {
      porEmpresa.push({
        empresaNombre: bmCorpLabel,
        empresaId: '',
        importadas: 0,
        errores: 0,
        omitidas: omittedCount,
        duplicadas: 0,
      })
    }

    // Update upload record
    await tx
      .update(excelUploads)
      .set({
        validRows: (totalImported + totalDuplicates).toString(),
        importedRows: totalImported.toString(),
        duplicateRows: totalDuplicates.toString(),
        omittedRows: omittedCount.toString(),
        estado: 'COMPLETADO',
        updatedAt: new Date(),
      })
      .where(eq(excelUploads.id, uploadId))

    return {
      uploadId,
      total: rows.length,
      imported: totalImported,
      errors: errorCount,
      duplicates: totalDuplicates,
      omitted: omittedCount,
      porEmpresa,
    }
  })
}

function mapTipoToEnum(
  tipo: string,
): 'INGRESO' | 'EGRESO' | 'TRASPASO' | 'SALIDA' | 'INTERNO' | 'PRESTAMO' {
  return tipo as 'INGRESO' | 'EGRESO' | 'TRASPASO' | 'SALIDA' | 'INTERNO' | 'PRESTAMO'
}

// ─── Listing ────────────────────────────────────────────────────────────────

export async function listUploads(tenantId: string, empresaId?: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    const query = tx
      .select()
      .from(excelUploads)
      .orderBy(sql`${excelUploads.createdAt} desc`)

    if (empresaId) {
      return query.where(
        sql`(${excelUploads.empresaId} = ${empresaId} OR ${excelUploads.empresaId} IS NULL)`,
      )
    }
    return query.where(eq(excelUploads.tenantId, tenantId))
  })
}

export async function getUploadById(uploadId: string, tenantId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    const [row] = await tx
      .select()
      .from(excelUploads)
      .where(and(eq(excelUploads.id, uploadId), eq(excelUploads.tenantId, tenantId)))
    return row ?? null
  })
}

export async function getUploadSummaries(uploadId: string, tenantId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    return tx.select().from(excelUploadSummaries).where(eq(excelUploadSummaries.uploadId, uploadId))
  })
}
