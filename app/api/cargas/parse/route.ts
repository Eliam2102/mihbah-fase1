import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { empresas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parseExcelFile, validateRow, type EmpresaRoutingInfo } from '@/lib/services/excel.service'
import { requireUser } from '@/lib/auth/helpers'
import { sql } from 'drizzle-orm'

/**
 * POST /api/cargas/parse
 *
 * Parses the Excel file and returns per-row validation + empresa routing preview.
 * For MK1 (maestro) files with a BASE sheet + EMPRESA column, this returns
 * rows tagged with _empresa so the UI can show per-company breakdown.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const mappingStr = formData.get('mapping') as string | null
    const customMapping = mappingStr ? JSON.parse(mappingStr) : undefined
    const sheetName = formData.get('sheetName') as string | null

    const buffer = await file.arrayBuffer()
    const { headers, rows, mapping } = await parseExcelFile(
      buffer,
      customMapping,
      sheetName ?? undefined,
    )

    // Load all EXCEL-source empresas for this tenant to provide routing preview
    const excelEmpresas: EmpresaRoutingInfo[] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
      const result = await tx
        .select({ id: empresas.id, nombre: empresas.name, fuenteDatos: empresas.fuenteDatos })
        .from(empresas)
        .where(eq(empresas.tenantId, tenantId))
      return result.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        fuenteDatos: e.fuenteDatos as 'EXCEL' | 'MONDAY' | 'MANUAL',
      }))
    })

    // Build routing lookup
    const routingMap = new Map<string, EmpresaRoutingInfo>()
    for (const emp of excelEmpresas) {
      routingMap.set(emp.nombre.toUpperCase().trim(), emp)
    }

    // Validate each row and attach routing metadata
    const validated = rows.map((raw, i) => {
      const rowWithEmpresa = raw as typeof raw & { _empresa?: string }
      const empresaLabel = rowWithEmpresa._empresa ?? ''

      // BM CORP — skip silently (not an error)
      const isBmCorp = empresaLabel === 'BM CORP' || empresaLabel.startsWith('BM')
      if (isBmCorp) {
        return {
          rowNumber: i + 2,
          raw,
          errors: [],
          isDuplicate: false,
          _omit: true,
          _empresaLabel: empresaLabel,
        }
      }

      const routing = routingMap.get(empresaLabel)
      if (routing?.fuenteDatos === 'MONDAY') {
        return {
          rowNumber: i + 2,
          raw,
          errors: [],
          isDuplicate: false,
          _omit: true,
          _empresaLabel: empresaLabel,
        }
      }

      const validated = validateRow(raw, i + 2)
      return {
        ...validated,
        _omit: false,
        _empresaLabel: empresaLabel,
        _empresaId: routing?.id ?? null,
      }
    })

    return NextResponse.json({ headers, rows: validated, mapping, excelEmpresas })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
