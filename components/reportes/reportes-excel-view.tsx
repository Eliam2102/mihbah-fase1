import { getMovimientosReporte } from '@/lib/services/reportes-excel.service'
import { FileText, Download } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
  empresaNombre: string
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

const TIPO_COLOR: Record<string, string> = {
  INGRESO: 'text-emerald-600 dark:text-emerald-400',
  EGRESO: 'text-red-600 dark:text-red-400',
  SALIDA: 'text-red-600 dark:text-red-400',
  PRESTAMO: 'text-amber-600 dark:text-amber-400',
  INTERNO: 'text-muted-foreground',
}

export async function ReportesExcelView({ empresaId, tenantId, empresaNombre }: Props) {
  const movimientos = await getMovimientosReporte(empresaId, tenantId, 200)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{empresaNombre} · últimos 200 movimientos</p>
        <button
          disabled
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar (Próximamente)
        </button>
      </div>

      <div className="border-border bg-card rounded-xl border shadow-sm">
        {movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="text-foreground text-lg font-medium">Sin movimientos</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Carga un Excel para ver los movimientos aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {['Fecha', 'Tipo', 'Concepto / Nombre', 'Proyecto', 'Monto', 'Comentarios'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr
                    key={m.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="text-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {m.fecha}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold uppercase ${TIPO_COLOR[m.tipo] ?? 'text-muted-foreground'}`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.concepto && <p className="text-foreground font-medium">{m.concepto}</p>}
                      {m.nombre && <p className="text-muted-foreground text-xs">{m.nombre}</p>}
                      {!m.concepto && !m.nombre && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {m.proyectoNombre || '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums ${TIPO_COLOR[m.tipo] ?? 'text-foreground'}`}
                    >
                      {formatMXN(m.monto)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {m.comentarios || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
