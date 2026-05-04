import { type NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireUser } from '@/lib/auth/helpers'

export async function POST(req: NextRequest) {
  try {
    await requireUser()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as ArrayBuffer)

    const sheets = workbook.worksheets.map((s) => s.name)

    return NextResponse.json({ sheets })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
