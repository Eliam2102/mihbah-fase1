import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import { dispersiones, comisionesCalculadas, ventasBmcorp } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, ne } from 'drizzle-orm'
import { Wallet } from 'lucide-react'
import { DispersionRow } from '@/components/comisiones/dispersion-row'

export const metadata = { title: 'Dispersiones · BM CORP' }

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Operativa BM Corp',
  OP_YESYUCAN: 'Operativa YESYUCAN',
  ASESOR: 'Comisión Asesor',
  LIDER_SALDO: 'Saldo Líder',
  SOCIO_BOLSA_JORGE: 'Socio Bolsa — Jorge',
  SOCIO_BOLSA_KASS: 'Socio Bolsa — Kass',
  SOCIO_BOLSA_DIANA: 'Socio Bolsa — Diana',
  SOCIO_FIJO_JORGE: 'Socio Fijo — Jorge (mensual)',
  SOCIO_FIJO_KASS: 'Socio Fijo — Kass (mensual)',
}

const TIPO_ORDER = Object.keys(TIPO_LABELS)

export default async function DispersionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ pendientes?: string }>
}) {
  const { empresaId } = await params
  const sp = await searchParams
  const soloPendientes = sp.pendientes === 'true'
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const rows = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [eq(dispersiones.tenantId, tenantId), eq(ventasBmcorp.empresaId, empresaId)]
    if (soloPendientes) filters.push(ne(dispersiones.estado, 'PAGADO'))
    return tx
      .select({ d: dispersiones, venta: ventasBmcorp })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(and(...filters))
      .orderBy(dispersiones.tipoBeneficiario, dispersiones.estado)
  })

  // Agrupar por tipo
  const grupos = TIPO_ORDER.map((tipo) => ({
    tipo,
    label: TIPO_LABELS[tipo] ?? tipo,
    rows: rows.filter((r) => r.d.tipoBeneficiario === tipo),
    totalMonto: rows
      .filter((r) => r.d.tipoBeneficiario === tipo)
      .reduce((s, r) => s + Number(r.d.montoTotal), 0),
    totalPagado: rows
      .filter((r) => r.d.tipoBeneficiario === tipo)
      .reduce((s, r) => s + Number(r.d.montoPagado), 0),
  })).filter((g) => g.rows.length > 0)

  const totalGeneral = rows.reduce((s, r) => s + Number(r.d.montoTotal), 0)
  const totalPagadoGen = rows.reduce((s, r) => s + Number(r.d.montoPagado), 0)
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Dispersiones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pagos a beneficiarios — agrupado por tipo según cascada §4 del doc.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Total a dispersar" value={fmt(totalGeneral)} />
        <KPI label="Ya pagado" value={fmt(totalPagadoGen)} accent="success" />
        <KPI label="Pendiente" value={fmt(totalGeneral - totalPagadoGen)} accent="warning" />
      </div>

      <div className="flex gap-2">
        <a
          href="?"
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !soloPendientes
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Todas
        </a>
        <a
          href="?pendientes=true"
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            soloPendientes ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Solo pendientes
        </a>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
          <Wallet className="mx-auto mb-2 h-6 w-6 opacity-40" />
          Sin dispersiones que mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.tipo} className="bg-card overflow-hidden rounded-lg border">
              <div className="bg-muted/30 flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <span>
                    {g.rows.length} línea{g.rows.length === 1 ? '' : 's'}
                  </span>
                  <span>
                    Pagado <span className="text-success">{fmt(g.totalPagado)}</span> de{' '}
                    <span className="text-foreground">{fmt(g.totalMonto)}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/10 text-muted-foreground border-t">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium sm:px-3">Beneficiario</th>
                      <th className="hidden px-3 py-1.5 text-left font-medium md:table-cell">
                        Venta
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium sm:px-3">Total</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium sm:table-cell">
                        Pagado
                      </th>
                      <th className="px-2 py-1.5 text-center font-medium sm:px-3">Estado</th>
                      <th className="hidden px-3 py-1.5 text-center font-medium lg:table-cell">
                        Fecha pago
                      </th>
                      <th className="px-2 py-1.5 sm:px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {g.rows.map((r) => (
                      <DispersionRow
                        key={r.d.id}
                        empresaId={empresaId}
                        dispersion={r.d}
                        ventaCliente={r.venta.cliente}
                        ventaId={r.venta.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'success' | 'warning'
}) {
  const color =
    accent === 'success'
      ? 'text-success'
      : accent === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
