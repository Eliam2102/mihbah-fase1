import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import { comisionesCalculadas, ventasBmcorp, afiliados, desarrollos } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata = { title: 'Validación cálculos · Comisiones' }

export default async function ValidacionPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

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

  const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  const totalBruta = rows.reduce((s, r) => s + Number(r.c.comisionBrutaTotal), 0)
  const totalSinConfig = rows.filter((r) => r.c.sinConfig).length

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a Comisiones
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Validación de cálculos</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Compara los cálculos del sistema contra el Excel manual de Joana. Si todo cuadra el
            motor está correcto. Si difiere, ajustamos.
          </p>
        </div>
        <a
          href={`/api/comisiones/export-excel?empresaId=${empresaId}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm"
        >
          <Download className="h-4 w-4" />
          Descargar Excel con todos los cálculos
        </a>
      </div>

      {/* Cómo validar */}
      <div className="bg-muted/30 rounded-lg border p-4 text-sm">
        <p className="text-foreground mb-2 font-semibold">Cómo validar (3 pasos):</p>
        <ol className="text-muted-foreground ml-4 list-decimal space-y-1 text-xs">
          <li>
            Click <strong>Descargar Excel</strong> → abre el archivo con todos los desgloses
          </li>
          <li>Compara contra el Excel manual de Joana — venta por venta, línea por línea</li>
          <li>
            Marca en rojo las diferencias. Manda los casos a Eliam para ajustar motor o matriz.
          </li>
        </ol>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Ventas calculadas" value={String(rows.length)} />
        <KpiCard label="Comisión bruta total" value={fmt(totalBruta)} accent="primary" />
        <KpiCard
          label="Sin config (revisar)"
          value={String(totalSinConfig)}
          accent={totalSinConfig > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Tabla compact con desglose */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="border-b px-4 py-2">
          <h2 className="text-foreground text-sm font-semibold">
            Desglose por venta ({rows.length} ventas)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-left">Alianza</th>
                <th className="px-2 py-2 text-center">Tipo</th>
                <th className="px-2 py-2 text-right">Venta</th>
                <th className="px-2 py-2 text-right">Bruta</th>
                <th className="px-2 py-2 text-right">OP BM</th>
                <th className="px-2 py-2 text-right">OP YC</th>
                <th className="px-2 py-2 text-right">F. Jorge</th>
                <th className="px-2 py-2 text-right">F. Kass</th>
                <th className="px-2 py-2 text-right">Asesor</th>
                <th className="px-2 py-2 text-right">Líder</th>
                <th className="px-2 py-2 text-right">Jorge B.</th>
                <th className="px-2 py-2 text-right">Kass B.</th>
                <th className="px-2 py-2 text-right">Diana B.</th>
                <th className="px-2 py-2 text-right">Liberable</th>
                <th className="px-2 py-2 text-center">OK</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-muted-foreground px-3 py-8 text-center">
                    Sin comisiones calculadas.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.c.id} className="hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium">
                      <Link
                        href={`/empresa/${empresaId}/comisiones/ventas/${r.v.id}`}
                        className="hover:underline"
                      >
                        {r.v.cliente}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-2 py-1.5">{r.alianza ?? '—'}</td>
                    <td className="px-2 py-1.5 text-center">{r.c.tipoProducto}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.v.monto))}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {fmt(Number(r.c.comisionBrutaTotal))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoOpBmcorp))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoOpYesyucan))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoSocioFijoJorge))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoSocioFijoKass))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoAsesor))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoLiderSaldo))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoSocioBolsaJorge))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoSocioBolsaKass))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {fmt(Number(r.c.montoSocioBolsaDiana))}
                    </td>
                    <td className="text-success px-2 py-1.5 text-right font-semibold tabular-nums">
                      {fmt(Number(r.c.montoLiberable))}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {r.c.sinConfig ? (
                        <AlertTriangle
                          className="text-warning inline h-3.5 w-3.5"
                          aria-label="Sin config"
                        />
                      ) : (
                        <CheckCircle2 className="text-success inline h-3.5 w-3.5" aria-label="OK" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'primary' | 'success' | 'warning'
}) {
  const color =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'success'
        ? 'text-success'
        : accent === 'warning'
          ? 'text-warning'
          : 'text-foreground'
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
