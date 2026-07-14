import { getCuentasExcel } from '@/lib/services/cuentas-excel.service'
import { Receipt, WalletCards, AlertCircle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
  empresaNombre: string
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDIENTE: {
      label: 'Pendiente',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    },
    PARCIAL: {
      label: 'Parcial',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    LIQUIDADA: {
      label: 'Liquidada',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
  }
  const match = map[estado] ?? {
    label: estado,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${match.className}`}
    >
      {match.label}
    </span>
  )
}

function CuentasTable({
  cuentas,
  tipo,
  total,
}: {
  cuentas: Awaited<ReturnType<typeof getCuentasExcel>>['cxc']
  tipo: 'CXC' | 'CXP'
  total: number
}) {
  const isCxc = tipo === 'CXC'
  return (
    <div className="border-border bg-card rounded-xl border shadow-sm">
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          {isCxc ? (
            <Receipt className="h-5 w-5 text-emerald-500" />
          ) : (
            <WalletCards className="h-5 w-5 text-red-500" />
          )}
          <h3 className="text-foreground font-semibold">
            {isCxc ? 'Cuentas por Cobrar' : 'Cuentas por Pagar'}
          </h3>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${
            isCxc
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          Pendiente: {formatMXN(total)}
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {isCxc ? 'Sin cuentas por cobrar.' : 'Sin cuentas por pagar.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {[
                  { label: 'Tercero', align: 'text-left' },
                  { label: 'Monto', align: 'text-right' },
                  { label: 'Pagado', align: 'text-right' },
                  { label: 'Saldo', align: 'text-right' },
                  { label: 'Vencimiento', align: 'text-left' },
                  { label: 'Estado', align: 'text-center' },
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
              {cuentas.map((c) => (
                <tr
                  key={c.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-6 py-4">
                    <p className="text-foreground font-medium">{c.tercero}</p>
                    {c.descripcion && (
                      <p className="text-muted-foreground mt-0.5 text-xs">{c.descripcion}</p>
                    )}
                  </td>
                  <td className="text-foreground px-6 py-4 text-right tabular-nums">
                    {formatMXN(c.monto)}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-right tabular-nums">
                    {formatMXN(c.montoPagado)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-bold tabular-nums ${
                      isCxc
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatMXN(c.saldoPendiente)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.fechaVencimiento ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground">{c.fechaVencimiento}</span>
                        {c.diasVencido !== null && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            {c.diasVencido}d
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <EstadoBadge estado={c.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export async function CuentasExcelView({ empresaId, tenantId, empresaNombre }: Props) {
  const cuentas = await getCuentasExcel(empresaId, tenantId)

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground text-sm">
        {empresaNombre} · CXC y CXP importados desde Excel
      </p>
      <CuentasTable cuentas={cuentas.cxc} tipo="CXC" total={cuentas.totalCxc} />
      <CuentasTable cuentas={cuentas.cxp} tipo="CXP" total={cuentas.totalCxp} />
    </div>
  )
}
