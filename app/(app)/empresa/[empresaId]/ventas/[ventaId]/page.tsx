import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import { comisionesCalculadas, ventasBmcorp, dispersiones, afiliados, users } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react'
import { RecalcularBoton } from '@/components/comisiones/recalcular-boton'
import { VentaEditForm } from '@/components/ventas/venta-edit-form'

export default async function VentaDetalle({
  params,
}: {
  params: Promise<{ empresaId: string; ventaId: string }>
}) {
  const { empresaId, ventaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'ventas')
  const tenantId = user.tenantId!

  const data = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [venta] = await tx
      .select({
        venta: ventasBmcorp,
        afiliado: afiliados.nombre,
        editorNombre: users.name,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(users, eq(ventasBmcorp.editadoPor, users.id))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
      .limit(1)
    if (!venta) return null
    const [comision] = await tx
      .select()
      .from(comisionesCalculadas)
      .where(
        and(eq(comisionesCalculadas.tenantId, tenantId), eq(comisionesCalculadas.ventaId, ventaId)),
      )
      .limit(1)
    const lines = comision
      ? await tx
          .select()
          .from(dispersiones)
          .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.comisionId, comision.id)))
          .orderBy(dispersiones.tipoBeneficiario)
      : []
    return {
      venta: venta.venta,
      afiliadoNombre: venta.afiliado,
      editorNombre: venta.editorNombre,
      comision,
      lines,
    }
  })

  if (!data) notFound()
  const { venta, afiliadoNombre, editorNombre, comision, lines } = data
  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/ventas`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a ventas
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">{venta.cliente}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {afiliadoNombre ?? 'Sin alianza'} · {venta.asesor ?? 'sin asesor'} ·{' '}
            {venta.loteAcciones ? `Lote ${venta.loteAcciones}` : 'Terreno'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecalcularBoton empresaId={empresaId} ventaId={ventaId} />
        </div>
      </div>

      <VentaEditForm
        empresaId={empresaId}
        venta={{
          id: venta.id,
          cliente: venta.cliente,
          estadoVenta: venta.estadoVenta,
          fechaApertura: venta.fechaApertura,
          fechaCierre: venta.fechaCierre,
          monto: String(venta.monto),
          enganche: venta.enganche ? String(venta.enganche) : null,
          loteAcciones: venta.loteAcciones,
          asesor: venta.asesor,
          notasInternas: venta.notasInternas,
          editadoEnSistema: venta.editadoEnSistema,
          editadoPorNombre: editorNombre,
          editadoEn: venta.editadoEn ? venta.editadoEn.toISOString() : null,
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card label="Monto venta" value={fmt(venta.monto)} />
        <Card label="Enganche pagado" value={fmt(venta.enganche ?? '0')} />
        <Card
          label="Comisión bruta"
          value={comision ? fmt(comision.comisionBrutaTotal) : '—'}
          accent
        />
      </div>

      {!comision ? (
        <div className="bg-card border-warning/40 text-warning rounded-lg border p-4 text-sm">
          Sin comisión calculada. Click <RefreshCw className="inline h-3 w-3" /> Recalcular arriba.
        </div>
      ) : comision.sinConfig ? (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Comisión calculada como SIN_CONFIG porque la alianza no tiene matriz configurada para
            este tipo de producto ({comision.tipoProducto}). Configura matriz en{' '}
            <Link href={`/empresa/${empresaId}/comisiones/alianzas`} className="underline">
              Alianzas
            </Link>{' '}
            y recalcula.
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Liberable" value={fmt(comision.montoLiberable)} accent />
            <Card label="Diferido" value={fmt(comision.montoDiferido)} />
            <Card label="Tipo producto" value={comision.tipoProducto} />
          </div>

          <div className="bg-card overflow-hidden rounded-lg border">
            <h2 className="border-b px-4 py-2 text-sm font-semibold">
              Desglose por beneficiario ({lines.length} líneas)
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Beneficiario</th>
                  <th className="px-3 py-2 text-right font-medium">Monto total</th>
                  <th className="px-3 py-2 text-right font-medium">Pagado</th>
                  <th className="px-3 py-2 text-right font-medium">Diferido</th>
                  <th className="px-3 py-2 text-center font-medium">Estado</th>
                  <th className="px-3 py-2 text-center font-medium">Acumula</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                      {l.tipoBeneficiario}
                    </td>
                    <td className="px-3 py-2">{l.beneficiarioNombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(l.montoTotal)}</td>
                    <td className="text-success px-3 py-2 text-right tabular-nums">
                      {fmt(l.montoPagado)}
                    </td>
                    <td className="text-warning px-3 py-2 text-right tabular-nums">
                      {fmt(l.montoDiferido)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <EstadoBadge estado={l.estado} />
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {l.acumulaMensual ? '✓ Mensual' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-muted text-muted-foreground',
    PARCIAL: 'bg-amber-100 text-amber-800',
    PAGADO: 'bg-jade-100 text-jade-800',
    DIFERIDO: 'bg-blue-100 text-blue-800',
  }
  return <span className={`rounded-full px-2 py-0.5 ${map[estado] ?? 'bg-muted'}`}>{estado}</span>
}
