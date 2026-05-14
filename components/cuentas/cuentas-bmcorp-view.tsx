import { getCuentasBmcorp } from '@/lib/services/cuentas-bmcorp.service'
import { WalletCards, Receipt } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
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

export async function CuentasBmcorpView({ empresaId, tenantId }: Props) {
  const cuentas = await getCuentasBmcorp(empresaId, tenantId)
  const totalCobrar = cuentas.cxc.reduce((acc, c) => acc + c.saldoPendiente, 0)
  const totalPagar = cuentas.cxpAsesores.reduce((acc, c) => acc + c.saldoPendiente, 0)

  return (
    <div className="space-y-8">
      {/* CXC */}
      <div className="border-border bg-card rounded-xl border shadow-sm">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-500" />
            <h3 className="text-foreground font-semibold">
              Cuentas por Cobrar (Mensualidades Clientes)
            </h3>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 tabular-nums dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            Total: {formatMXN(totalCobrar)}
          </div>
        </div>

        {cuentas.cxc.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-muted-foreground text-sm">No hay cuentas por cobrar pendientes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {[
                    { label: 'Cliente / Desarrollo', align: 'text-left' },
                    { label: 'Monto Total', align: 'text-right' },
                    { label: 'Enganche', align: 'text-right' },
                    { label: 'Saldo Pendiente', align: 'text-right' },
                    { label: 'Estado Pipeline', align: 'text-center' },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`text-muted-foreground px-6 py-3 ${h.align} text-xs font-semibold tracking-wider whitespace-nowrap uppercase`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuentas.cxc.map((c) => (
                  <tr
                    key={c.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="text-foreground font-medium">{c.cliente}</p>
                      <p className="text-muted-foreground text-xs">{c.desarrollo || '—'}</p>
                    </td>
                    <td className="text-foreground px-6 py-4 text-right tabular-nums">
                      {formatMXN(c.montoTotal)}
                    </td>
                    <td className="text-foreground px-6 py-4 text-right tabular-nums">
                      {formatMXN(c.enganche)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                      {formatMXN(c.saldoPendiente)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={c.estadoVenta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CXP */}
      <div className="border-border bg-card rounded-xl border shadow-sm">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-red-500" />
            <h3 className="text-foreground font-semibold">
              Cuentas por Pagar (Comisiones a Asesores)
            </h3>
          </div>
          <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 tabular-nums dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Total Pendiente: {formatMXN(totalPagar)}
          </div>
        </div>

        {cuentas.cxpAsesores.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-muted-foreground text-sm">No hay comisiones pendientes de pago.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {[
                    { label: 'Asesor', align: 'text-left' },
                    { label: 'Venta Asociada', align: 'text-left' },
                    { label: 'Comisión Total (2%)', align: 'text-right' },
                    { label: 'Saldo Pendiente', align: 'text-right' },
                    { label: 'Estado Pipeline', align: 'text-center' },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`text-muted-foreground px-6 py-3 ${h.align} text-xs font-semibold tracking-wider whitespace-nowrap uppercase`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuentas.cxpAsesores.map((c) => (
                  <tr
                    key={c.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="px-6 py-4">
                      <p className="text-foreground font-medium">{c.asesor || 'Sin asignar'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-foreground font-medium">{c.cliente}</p>
                      <p className="text-muted-foreground text-xs">{c.desarrollo || '—'}</p>
                    </td>
                    <td className="text-foreground px-6 py-4 text-right tabular-nums">
                      {formatMXN(c.comisionTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600 tabular-nums dark:text-red-400">
                      {formatMXN(c.saldoPendiente)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={c.estadoVenta} />
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
