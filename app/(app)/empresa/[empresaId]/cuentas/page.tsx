import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getCuentasBmcorp } from '@/lib/services/cuentas-bmcorp.service'
import { getCuentasExcel } from '@/lib/services/cuentas-excel.service'
import { CuentasTabs } from '@/components/cuentas/cuentas-tabs'
import { AlertCircle, Receipt, WalletCards } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

function AgingBadge({ dias }: { dias: number | null }) {
  if (dias === null) return null
  const cls =
    dias > 90
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      : dias > 60
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
        : dias > 30
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  return (
    <span
      className={`ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cls}`}
    >
      <AlertCircle className="h-2.5 w-2.5" />
      {dias}d
    </span>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    PARCIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    LIQUIDADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    EN_PROCESO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    APROBADO_VENTAS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    APROBADO_JURIDICO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    ESPERANDO_AUTORIZACION:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    LIBERADO: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    FINALIZADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    FINALIZADO_Y_LIQUIDADO:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    RECHAZADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  const label =
    estado === 'LIQUIDADA'
      ? 'Liquidada'
      : estado === 'PARCIAL'
        ? 'Parcial'
        : estado === 'PENDIENTE'
          ? 'Pendiente'
          : estado === 'EN_PROCESO'
            ? 'En Proceso'
            : estado === 'APROBADO_VENTAS'
              ? 'Ap. Ventas'
              : estado === 'APROBADO_JURIDICO'
                ? 'Ap. Jurídico'
                : estado === 'ESPERANDO_AUTORIZACION'
                  ? 'En Autorización'
                  : estado === 'LIBERADO'
                    ? 'Liberado'
                    : estado === 'FINALIZADA'
                      ? 'Finalizada'
                      : estado === 'FINALIZADO_Y_LIQUIDADO'
                        ? 'Finalizado y Liquidado'
                        : estado === 'CANCELADA'
                          ? 'Cancelada'
                          : estado === 'RECHAZADO'
                            ? 'Rechazado'
                            : estado
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${map[estado] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
    >
      {label}
    </span>
  )
}

export default async function CuentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { empresaId } = await params
  const { tab = 'cxc' } = await searchParams

  const user = await requireUser()
  const empresa = await requireEmpresaAccess(user, empresaId, 'cuentas')
  const tenantId = user.tenantId!

  const esBmcorp = empresa.tipo === 'COMERCIAL'

  // Load data based on empresa type
  let totalCxc = 0
  let totalCxp = 0
  let vencidasCxc = 0
  let vencidasCxp = 0

  type CxcRow =
    | { tipo: 'bmcorp'; data: Awaited<ReturnType<typeof getCuentasBmcorp>>['cxc'][0] }
    | { tipo: 'excel'; data: Awaited<ReturnType<typeof getCuentasExcel>>['cxc'][0] }

  type CxpRow =
    | { tipo: 'bmcorp'; data: Awaited<ReturnType<typeof getCuentasBmcorp>>['cxpAsesores'][0] }
    | { tipo: 'excel'; data: Awaited<ReturnType<typeof getCuentasExcel>>['cxp'][0] }

  let cxcRows: CxcRow[] = []
  let cxpRows: CxpRow[] = []

  if (esBmcorp) {
    const data = await getCuentasBmcorp(empresaId, tenantId)
    totalCxc = data.cxc.reduce((s, c) => s + c.saldoPendiente, 0)
    totalCxp = data.cxpAsesores.reduce((s, c) => s + c.saldoPendiente, 0)
    cxcRows = data.cxc.map((d) => ({ tipo: 'bmcorp' as const, data: d }))
    cxpRows = data.cxpAsesores.map((d) => ({ tipo: 'bmcorp' as const, data: d }))
  } else {
    const data = await getCuentasExcel(empresaId, tenantId)
    totalCxc = data.totalCxc
    totalCxp = data.totalCxp
    vencidasCxc = data.cxc
      .filter((c) => c.diasVencido !== null && c.estado !== 'LIQUIDADA')
      .reduce((s, c) => s + c.saldoPendiente, 0)
    vencidasCxp = data.cxp
      .filter((c) => c.diasVencido !== null && c.estado !== 'LIQUIDADA')
      .reduce((s, c) => s + c.saldoPendiente, 0)
    cxcRows = data.cxc.map((d) => ({ tipo: 'excel' as const, data: d }))
    cxpRows = data.cxp.map((d) => ({ tipo: 'excel' as const, data: d }))
  }

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Cuentas por Cobrar y Pagar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {empresa.name} · {esBmcorp ? 'Datos de Monday.com' : 'Importado desde Excel'}
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXC</p>
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{formatMXN(totalCxc)}</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <WalletCards className="h-4 w-4 text-red-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXP</p>
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{formatMXN(totalCxp)}</p>
        </div>
        {!esBmcorp && (
          <>
            <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  CXC Vencidas
                </p>
              </div>
              <p
                className={`text-xl font-bold tabular-nums ${vencidasCxc > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}
              >
                {formatMXN(vencidasCxc)}
              </p>
            </div>
            <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  CXP Vencidas
                </p>
              </div>
              <p
                className={`text-xl font-bold tabular-nums ${vencidasCxp > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
              >
                {formatMXN(vencidasCxp)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <CuentasTabs totalCxc={totalCxc} totalCxp={totalCxp} />

      {/* Tabla CXC */}
      {tab !== 'cxp' && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Cuentas por Cobrar ({cxcRows.length})
            </h3>
          </div>
          {cxcRows.length === 0 ? (
            <p className="text-muted-foreground p-8 text-sm">Sin cuentas por cobrar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/50 border-b">
                    {(esBmcorp
                      ? [
                          { label: 'Cliente / Desarrollo', align: 'text-left' },
                          { label: 'Monto Total', align: 'text-right' },
                          { label: 'Enganche', align: 'text-right' },
                          { label: 'Saldo', align: 'text-right' },
                          { label: 'Estado', align: 'text-center' },
                        ]
                      : [
                          { label: 'Tercero', align: 'text-left' },
                          { label: 'Monto', align: 'text-right' },
                          { label: 'Pagado', align: 'text-right' },
                          { label: 'Saldo', align: 'text-right' },
                          { label: 'Vencimiento', align: 'text-left' },
                          { label: 'Estado', align: 'text-center' },
                        ]
                    ).map((h) => (
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
                  {cxcRows.map((row) => {
                    if (row.tipo === 'bmcorp') {
                      const c = row.data
                      return (
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
                            <EstadoBadge estado={c.estadoVenta} />
                          </td>
                        </tr>
                      )
                    }
                    const c = row.data
                    return (
                      <tr
                        key={c.id}
                        className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                      >
                        <td className="px-6 py-4">
                          <p className="text-foreground font-medium">{c.tercero}</p>
                          {c.descripcion && (
                            <p className="text-muted-foreground text-xs">{c.descripcion}</p>
                          )}
                        </td>
                        <td className="text-foreground px-6 py-4 text-right tabular-nums">
                          {formatMXN(c.monto)}
                        </td>
                        <td className="text-muted-foreground px-6 py-4 text-right tabular-nums">
                          {formatMXN(c.montoPagado)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                          {formatMXN(c.saldoPendiente)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {c.fechaVencimiento ? (
                            <span className="text-foreground">
                              {c.fechaVencimiento}
                              <AgingBadge dias={c.diasVencido} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <EstadoBadge estado={c.estado} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabla CXP */}
      {tab === 'cxp' && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <WalletCards className="h-4 w-4 text-red-500" />
              Cuentas por Pagar ({cxpRows.length})
            </h3>
          </div>
          {cxpRows.length === 0 ? (
            <p className="text-muted-foreground p-8 text-sm">Sin cuentas por pagar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/50 border-b">
                    {(esBmcorp
                      ? [
                          { label: 'Beneficiario', align: 'text-left' },
                          { label: 'Venta', align: 'text-left' },
                          { label: 'Comisión calculada', align: 'text-right' },
                          { label: 'Pagado', align: 'text-right' },
                          { label: 'Saldo', align: 'text-right' },
                          { label: 'Estado', align: 'text-center' },
                        ]
                      : [
                          { label: 'Tercero', align: 'text-left' },
                          { label: 'Monto', align: 'text-right' },
                          { label: 'Pagado', align: 'text-right' },
                          { label: 'Saldo', align: 'text-right' },
                          { label: 'Vencimiento', align: 'text-left' },
                          { label: 'Estado', align: 'text-center' },
                        ]
                    ).map((h) => (
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
                  {cxpRows.map((row) => {
                    if (row.tipo === 'bmcorp') {
                      const c = row.data
                      const TIPO_LABEL: Record<string, string> = {
                        LIDER_SALDO: 'Líder',
                        ASESOR_COMISION: 'Asesor',
                        ASESOR_FLAMINGO: 'Asesor directo',
                        KASS: 'Kass',
                        JORGE: 'Jorge',
                        BOLSA_COMERCIAL: 'Bolsa',
                        SOCIO_FIJO: 'Socio',
                      }
                      return (
                        <tr
                          key={c.id}
                          className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                        >
                          <td className="px-6 py-4">
                            <p className="text-foreground font-medium">{c.beneficiarioNombre}</p>
                            <p className="text-muted-foreground text-xs">
                              {TIPO_LABEL[c.tipoBeneficiario] ?? c.tipoBeneficiario}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-foreground">{c.cliente}</p>
                          </td>
                          <td className="text-foreground px-6 py-4 text-right tabular-nums">
                            {formatMXN(c.montoTotal)}
                          </td>
                          <td className="text-muted-foreground px-6 py-4 text-right tabular-nums">
                            {formatMXN(c.montoPagado)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-red-600 tabular-nums dark:text-red-400">
                            {formatMXN(c.saldoPendiente)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <EstadoBadge estado={c.estado} />
                          </td>
                        </tr>
                      )
                    }
                    const c = row.data
                    return (
                      <tr
                        key={c.id}
                        className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                      >
                        <td className="px-6 py-4">
                          <p className="text-foreground font-medium">{c.tercero}</p>
                          {c.descripcion && (
                            <p className="text-muted-foreground text-xs">{c.descripcion}</p>
                          )}
                        </td>
                        <td className="text-foreground px-6 py-4 text-right tabular-nums">
                          {formatMXN(c.monto)}
                        </td>
                        <td className="text-muted-foreground px-6 py-4 text-right tabular-nums">
                          {formatMXN(c.montoPagado)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-600 tabular-nums dark:text-red-400">
                          {formatMXN(c.saldoPendiente)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {c.fechaVencimiento ? (
                            <span className="text-foreground">
                              {c.fechaVencimiento}
                              <AgingBadge dias={c.diasVencido} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <EstadoBadge estado={c.estado} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
