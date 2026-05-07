import { requireUser } from '@/lib/auth/helpers'
import { getCuentasConsolidado } from '@/lib/services/dashboard-general.service'
import { Receipt, WalletCards, AlertCircle, Building2 } from 'lucide-react'
import Link from 'next/link'

function fmt(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export default async function CuentasConsolidadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const sp = await searchParams
  const tab = sp.tab ?? 'cxc'

  const user = await requireUser()
  const tenantId = user.tenantId!

  const cuentas = await getCuentasConsolidado(tenantId)

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Cuentas por Cobrar y Pagar</h1>
        <p className="text-muted-foreground mt-1 text-sm">Vista consolidada — todas las empresas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXC</p>
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{fmt(cuentas.totalCxc)}</p>
          <p className="text-muted-foreground mt-1 text-[10px]">consolidado</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <WalletCards className="h-4 w-4 text-red-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">Total CXP</p>
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{fmt(cuentas.totalCxp)}</p>
          <p className="text-muted-foreground mt-1 text-[10px]">consolidado</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">CXC vencidas</p>
          </div>
          <p
            className={`text-xl font-bold tabular-nums ${cuentas.totalCxcVencidas > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}
          >
            {fmt(cuentas.totalCxcVencidas)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-muted-foreground text-xs font-semibold uppercase">CXP vencidas</p>
          </div>
          <p
            className={`text-xl font-bold tabular-nums ${cuentas.totalCxpVencidas > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
          >
            {fmt(cuentas.totalCxpVencidas)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-1 border-b">
        <Link
          href="?tab=cxc"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab !== 'cxp'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Por Cobrar (CXC)
        </Link>
        <Link
          href="?tab=cxp"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'cxp'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Por Pagar (CXP)
        </Link>
      </div>

      {/* CXC */}
      {tab !== 'cxp' && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Cuentas por Cobrar — por empresa
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                  Empresa
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                  Total CXC
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                  Vencidas
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {cuentas.cxcPorEmpresa.map((c, i) => (
                <tr
                  key={c.empresaId}
                  className={`border-border hover:bg-muted/20 border-b transition-colors last:border-0 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                      <span className="text-foreground font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {c.total > 0 ? fmt(c.total) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {c.vencidas > 0 ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {fmt(c.vencidas)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/empresa/${c.empresaId}/cuentas?tab=cxc`}
                      className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/40 border-border border-t font-bold">
                <td className="px-6 py-3 text-xs">TOTAL</td>
                <td className="px-6 py-3 text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                  {fmt(cuentas.totalCxc)}
                </td>
                <td className="px-6 py-3 text-right text-amber-600 tabular-nums dark:text-amber-400">
                  {cuentas.totalCxcVencidas > 0 ? fmt(cuentas.totalCxcVencidas) : '—'}
                </td>
                <td className="px-6 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* CXP */}
      {tab === 'cxp' && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b px-6 py-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <WalletCards className="h-4 w-4 text-red-500" />
              Cuentas por Pagar — por empresa
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                  Empresa
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                  Total CXP
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase">
                  Vencidas
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {cuentas.cxpPorEmpresa.map((c, i) => (
                <tr
                  key={c.empresaId}
                  className={`border-border hover:bg-muted/20 border-b transition-colors last:border-0 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                      <span className="text-foreground font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600 tabular-nums dark:text-red-400">
                    {c.total > 0 ? fmt(c.total) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {c.vencidas > 0 ? (
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {fmt(c.vencidas)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/empresa/${c.empresaId}/cuentas?tab=cxp`}
                      className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/40 border-border border-t font-bold">
                <td className="px-6 py-3 text-xs">TOTAL</td>
                <td className="px-6 py-3 text-right text-red-600 tabular-nums dark:text-red-400">
                  {fmt(cuentas.totalCxp)}
                </td>
                <td className="px-6 py-3 text-right text-red-600 tabular-nums dark:text-red-400">
                  {cuentas.totalCxpVencidas > 0 ? fmt(cuentas.totalCxpVencidas) : '—'}
                </td>
                <td className="px-6 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
