import { getVentasReporteBmcorp } from '@/lib/services/reportes-bmcorp.service'
import { Download, FileText, Calendar } from 'lucide-react'

interface Props {
  empresaId: string
  tenantId: string
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    EN_PROCESO: {
      label: 'En Proceso',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    },
    APROBADO_VENTAS: {
      label: 'Ap. Ventas',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    APROBADO_JURIDICO: {
      label: 'Ap. Jurídico',
      className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    },
    ESPERANDO_AUTORIZACION: {
      label: 'En Autorización',
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    },
    LIBERADO: {
      label: 'Liberado',
      className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    },
    FINALIZADA: {
      label: 'Finalizada',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    FINALIZADO_Y_LIQUIDADO: {
      label: 'Finalizado y Liquidado',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    CANCELADA: {
      label: 'Cancelada',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    RECHAZADO: {
      label: 'Rechazado',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
  }
  const match = map[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  }
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${match.className}`}
    >
      {match.label}
    </span>
  )
}

export async function ReportesBmcorpView({ empresaId, tenantId }: Props) {
  const ventas = await getVentasReporteBmcorp(empresaId, tenantId)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          disabled
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar a Excel (Próximamente)
        </button>
      </div>

      <div className="border-border bg-card rounded-xl border shadow-sm">
        {ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="text-foreground text-lg font-medium">Sin datos para el reporte</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              No hay ventas registradas. Intenta sincronizar con Monday primero.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {[
                    'Cliente',
                    'Lote/Acción',
                    'Desarrollo',
                    'Alianza',
                    'Monto Total',
                    'Comisión (15%)',
                    'Apertura',
                    'Estado',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr
                    key={v.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{v.cliente}</p>
                      {v.asesor && (
                        <p className="text-muted-foreground text-xs">Asesor: {v.asesor}</p>
                      )}
                    </td>
                    <td className="text-foreground px-4 py-3 font-medium">{v.lote || '—'}</td>
                    <td className="text-foreground px-4 py-3 font-medium">{v.desarrollo || '—'}</td>
                    <td className="text-foreground px-4 py-3">{v.afiliado || '—'}</td>
                    <td className="text-foreground px-4 py-3 font-semibold whitespace-nowrap tabular-nums">
                      {formatMXN(v.monto)}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-emerald-600 tabular-nums dark:text-emerald-400">
                      {formatMXN(v.comision)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {v.fechaApertura ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {v.fechaApertura}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={v.estadoVenta} />
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
