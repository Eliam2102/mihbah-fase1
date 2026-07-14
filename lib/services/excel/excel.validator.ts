import { db } from '@/lib/db'
import { movimientos } from '@/lib/db/schema'
import { excelRowSchema, type ExcelRowInput, type ValidatedRow } from '@/lib/validations/excel'
import { eq, inArray, sql } from 'drizzle-orm'

/** Validates a single row against the Zod schema. */
export function validateRow(input: ExcelRowInput, rowNumber: number): ValidatedRow {
  const result = excelRowSchema.safeParse(input)
  if (result.success) {
    return { rowNumber, raw: input, data: result.data, errors: [], isDuplicate: false }
  }
  const errors = result.error.errors.map((e) => `${e.path.join('.') || 'campo'}: ${e.message}`)
  return { rowNumber, raw: input, errors, isDuplicate: false }
}

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

/** Multi-empresa duplicate detection. */
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
