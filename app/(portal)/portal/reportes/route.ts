/**
 * GET /portal/reportes?formato=csv
 *
 * Descarga un reporte de comisiones del usuario portal autenticado.
 * - Líder / Administrativo: todas las ventas de su afiliación.
 * - Asesor: solo sus ventas.
 *
 * Formato: CSV (default) — fácil de abrir en Excel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePortalUser } from '@/lib/auth/portal-helpers'
import {
  getVentasPortalLider,
  getComisionesPortalAsesor,
} from '@/lib/services/comisiones/portal.service'

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const { user, perfil } = await requirePortalUser()

    const fecha = new Date().toISOString().slice(0, 10)
    const filename = `comisiones_${perfil.alianzaNombre ?? 'mi_afiliacion'}_${fecha}.csv`

    if (perfil.rolPortal === 'ASESOR') {
      const dispersiones = await getComisionesPortalAsesor(user.id)

      const header = [
        'Cliente',
        'Lote/Acciones',
        'Desarrollo',
        'Tipo',
        'Total comisión',
        'Pagado',
        'Diferido',
        'Estado',
        'Fecha pago',
      ]
      const rows = dispersiones.map((d) => [
        d.ventaCliente,
        d.ventaLoteAcciones ?? '',
        d.desarrolloNombre ?? '',
        d.tipoProducto,
        d.montoTotal.toFixed(2),
        d.montoPagado.toFixed(2),
        d.montoDiferido.toFixed(2),
        d.estado,
        d.fechaPago ?? '',
      ])

      const csv = toCsv([header, ...rows])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Líder / Administrativo
    const ventas = await getVentasPortalLider(user.id)

    const header = [
      'Cliente',
      'Lote',
      'Desarrollo',
      'Alianza',
      'Estado venta',
      'Comisión total',
      'Pagado total',
      'Pendiente',
      'Beneficiario',
      'Tipo',
      'Monto linea',
      'Pagado línea',
      'Estado línea',
      'Fecha pago',
    ]

    const rows: string[][] = []
    for (const v of ventas) {
      const pagadoTotal = v.dispersiones.reduce((s, d) => s + d.montoPagado, 0)
      for (const d of v.dispersiones) {
        rows.push([
          v.cliente,
          v.loteAcciones ?? '',
          v.desarrolloNombre ?? '',
          v.alianzaNombre ?? '',
          v.estadoVenta,
          v.comisionTotal.toFixed(2),
          pagadoTotal.toFixed(2),
          Math.max(0, v.comisionTotal - pagadoTotal).toFixed(2),
          d.beneficiarioNombre,
          d.tipoBeneficiario,
          d.montoTotal.toFixed(2),
          d.montoPagado.toFixed(2),
          d.estado,
          d.fechaPago ?? '',
        ])
      }
    }

    const csv = toCsv([header, ...rows])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
