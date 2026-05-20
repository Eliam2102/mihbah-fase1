/**
 * GET /api/comisiones/export-excel?empresaId=...
 *
 * Genera Excel con desglose completo de comisiones para validación contra
 * Excel manual de Joana.
 *
 * Columnas: Cliente | Alianza | Desarrollo | Tipo | Monto venta | Enganche
 *           Comisión bruta | OP BM Corp | OP YESYUCAN | Fijo Jorge | Fijo Kass
 *           Asesor | Líder saldo | Socio Jorge bolsa | Socio Kass bolsa | Socio Diana bolsa
 *           Liberable | Diferido
 */
import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { comisionesCalculadas, ventasBmcorp, afiliados, desarrollos } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, desc } from 'drizzle-orm'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null)
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const empresaId = req.nextUrl.searchParams.get('empresaId')
  if (!empresaId) {
    return NextResponse.json({ error: 'empresaId requerido' }, { status: 400 })
  }
  const tenantId = user.tenantId

  const rows = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select({
        c: comisionesCalculadas,
        v: ventasBmcorp,
        alianza: afiliados.nombre,
        desarrollo: desarrollos.nombre,
      })
      .from(comisionesCalculadas)
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(
        and(eq(comisionesCalculadas.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIG Jade'
  wb.created = new Date()
  const ws = wb.addWorksheet('Comisiones')

  const headers = [
    'Cliente',
    'Alianza',
    'Desarrollo',
    'Tipo',
    'Fecha venta',
    'Monto venta',
    'Enganche',
    '% Enganche',
    'Comisión bruta',
    'OP BM Corp (1%)',
    'OP YESYUCAN',
    'Fijo Jorge',
    'Fijo Kass',
    'Asesor',
    'Líder saldo',
    'Socio Jorge bolsa',
    'Socio Kass bolsa',
    'Socio Diana bolsa',
    'Liberable',
    'Diferido',
    'Estado',
  ]
  ws.columns = headers.map((h) => ({ header: h, width: 18 }))
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14532D' },
  }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  for (const r of rows) {
    ws.addRow([
      r.v.cliente,
      r.alianza ?? '—',
      r.desarrollo ?? '—',
      r.c.tipoProducto,
      r.v.fecha,
      Number(r.v.monto),
      Number(r.v.enganche ?? 0),
      r.c.porcentajeEnganche ? Number(r.c.porcentajeEnganche) / 100 : 0,
      Number(r.c.comisionBrutaTotal),
      Number(r.c.montoOpBmcorp),
      Number(r.c.montoOpYesyucan),
      Number(r.c.montoSocioFijoJorge),
      Number(r.c.montoSocioFijoKass),
      Number(r.c.montoAsesor),
      Number(r.c.montoLiderSaldo),
      Number(r.c.montoSocioBolsaJorge),
      Number(r.c.montoSocioBolsaKass),
      Number(r.c.montoSocioBolsaDiana),
      Number(r.c.montoLiberable),
      Number(r.c.montoDiferido),
      r.c.sinConfig ? 'SIN_CONFIG' : 'OK',
    ])
  }

  // Formato moneda para columnas numéricas
  const moneyCols = [6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  for (const idx of moneyCols) {
    ws.getColumn(idx).numFmt = '"$"#,##0.00'
  }
  ws.getColumn(8).numFmt = '0.00%'

  // Totales al final
  const totalRowIdx = rows.length + 3
  ws.getCell(`A${totalRowIdx}`).value = 'TOTAL'
  ws.getCell(`A${totalRowIdx}`).font = { bold: true }
  for (const col of [6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const letter = ws.getColumn(col).letter
    ws.getCell(`${letter}${totalRowIdx}`).value = {
      formula: `SUM(${letter}2:${letter}${rows.length + 1})`,
    }
    ws.getCell(`${letter}${totalRowIdx}`).font = { bold: true }
    ws.getCell(`${letter}${totalRowIdx}`).numFmt = '"$"#,##0.00'
  }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="comisiones-validacion-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
