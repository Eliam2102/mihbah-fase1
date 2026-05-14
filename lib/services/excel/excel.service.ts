/**
 * lib/services/excel/excel.service.ts
 *
 * Importa movimientos desde archivos Excel.
 * Usa parser y validador separados.
 */

import { db } from '@/lib/db'
import { excelUploads, excelUploadSummaries, movimientos } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { setTenant } from '../_shared/db.helpers'
import type { ValidatedRow } from '@/lib/validations/excel'
import type { ImportSummary, MaestroImportSummary, EmpresaRoutingInfo } from './excel.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FUENTE_MONDAY_LABEL = 'BM CORP'

// ─── Import (single empresa) ──────────────────────────────────────────────────

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
    await setTenant(tx, params.tenantId)

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
              proyectoNombre: d.proyecto ? d.proyecto.trim().toUpperCase() : null,
              categoriaNombre: d.categoria ? d.categoria.trim().toUpperCase() : null,
              grupoNombre: d.grupo ? d.grupo.trim().toUpperCase() : null,
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

// ─── Import Maestro (multi-empresa) ───────────────────────────────────────────

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

  const routingMap = new Map<string, EmpresaRoutingInfo>()
  for (const emp of empresaRouting) {
    routingMap.set(emp.nombre.toUpperCase().trim(), emp)
  }

  interface RowBucket {
    rows: ValidatedRow[]
    info: EmpresaRoutingInfo
  }
  const buckets = new Map<string, RowBucket>()
  let omittedCount = 0
  let errorCount = 0

  for (const row of rows) {
    const empresaLabel = row._empresa ?? ''

    if (empresaLabel === FUENTE_MONDAY_LABEL || empresaLabel.startsWith('BM')) {
      omittedCount++
      continue
    }

    if (row.errors.length > 0) {
      errorCount++
      continue
    }

    const routing = routingMap.get(empresaLabel)
    if (!routing) {
      errorCount++
      continue
    }

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
    await setTenant(tx, tenantId)

    const [upload] = await tx
      .insert(excelUploads)
      .values({
        tenantId,
        empresaId: null,
        userId,
        filename,
        fileSize: fileSize?.toString() ?? null,
        totalRows: rows.length.toString(),
        validRows: '0',
        errorRows: errorCount.toString(),
        duplicateRows: '0',
        importedRows: '0',
        omittedRows: omittedCount.toString(),
        estado: 'PROCESANDO',
      })
      .returning({ id: excelUploads.id })

    const uploadId = upload!.id

    let totalImported = 0
    let totalDuplicates = 0
    const porEmpresa: MaestroImportSummary['porEmpresa'] = []

    for (const [empresaId, bucket] of buckets) {
      const { rows: empRows, info } = bucket

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
              proyectoNombre: d.proyecto ? d.proyecto.trim().toUpperCase() : null,
              categoriaNombre: d.categoria ? d.categoria.trim().toUpperCase() : null,
              grupoNombre: d.grupo ? d.grupo.trim().toUpperCase() : null,
              uploadId,
            }
          }),
        )
      }

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

    if (omittedCount > 0) {
      porEmpresa.push({
        empresaNombre: FUENTE_MONDAY_LABEL,
        empresaId: '',
        importadas: 0,
        errores: 0,
        omitidas: omittedCount,
        duplicadas: 0,
      })
    }

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapTipoToEnum(
  tipo: string,
): 'INGRESO' | 'EGRESO' | 'TRASPASO' | 'SALIDA' | 'INTERNO' | 'PRESTAMO' {
  return tipo as 'INGRESO' | 'EGRESO' | 'TRASPASO' | 'SALIDA' | 'INTERNO' | 'PRESTAMO'
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export async function listUploads(tenantId: string, empresaId?: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
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
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(excelUploads)
      .where(and(eq(excelUploads.id, uploadId), eq(excelUploads.tenantId, tenantId)))
    return row ?? null
  })
}

export async function getUploadSummaries(uploadId: string, tenantId: string) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx.select().from(excelUploadSummaries).where(eq(excelUploadSummaries.uploadId, uploadId))
  })
}

// Re-export types for convenience
export type { ImportSummary, MaestroImportSummary, EmpresaRoutingInfo } from './excel.types'
