import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { empresas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  parseExcelFile,
  validateRow,
  importMaestro,
  type EmpresaRoutingInfo,
} from '@/lib/services/excel.service'
import { requireUser } from '@/lib/auth/helpers'

/**
 * POST /api/cargas/import
 *
 * Processes and imports the Excel MK1 maestro file.
 * Routes rows by EMPRESA column. BM CORP rows are silently omitted.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file requerido' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const mappingStr = formData.get('mapping') as string | null
    const customMapping = mappingStr ? JSON.parse(mappingStr) : undefined

    const { rows } = await parseExcelFile(buffer, customMapping)

    // Load all empresas for this tenant for routing
    const empresasData: EmpresaRoutingInfo[] = await db.transaction(async (tx) => {
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

    // Validate rows
    const validated = rows.map((raw, i) => ({
      ...validateRow(raw, i + 2),
      _empresa: (raw as typeof raw & { _empresa: string | undefined })._empresa,
    }))

    const summary = await importMaestro(validated, {
      tenantId,
      userId: user.id,
      filename: file.name,
      fileSize: file.size,
      empresaRouting: empresasData,
    })

    return NextResponse.json(summary)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
